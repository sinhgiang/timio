// Zalo Official Account (OA) API integration
// Docs: https://developers.zalo.me/docs/api/official-account-api
//
// Flow tổng quan:
//   1. Công ty tạo Zalo OA + tạo App tại developers.zalo.me, liên kết App với OA
//   2. Uỷ quyền 1 lần → lấy access_token + refresh_token (dán vào Cài đặt)
//   3. Timio tự gia hạn access_token bằng refresh_token (token OA sống ~25h)
//   4. Nhân viên follow OA → lấy zaloUserId (map trong Dashboard)
//   5. Gửi tin tư vấn (free-text) tới zaloUserId

import { prisma } from "@/lib/prisma";

const OAUTH_URL = "https://oauth.zaloapp.com/v4/oa/access_token";
const CS_MESSAGE_URL = "https://openapi.zalo.me/v3.0/oa/message/cs";
const FOLLOWERS_URL = "https://openapi.zalo.me/v2.0/oa/getfollowers";
const PROFILE_URL = "https://openapi.zalo.me/v3.0/oa/user/detail";

export interface ZaloCompanyAuth {
  id: string;
  zaloOaToken: string | null;
  zaloAppId: string | null;
  zaloSecretKey: string | null;
  zaloRefreshToken: string | null;
  zaloTokenExpiresAt: Date | null;
}

interface RefreshResult {
  access_token?: string;
  refresh_token?: string;
  expires_in?: string | number;
  error?: number;
  error_name?: string;
  error_description?: string;
}

/**
 * Gia hạn access token bằng refresh token. Zalo XOAY refresh token mỗi lần
 * gọi → phải lưu lại cả access_token + refresh_token mới.
 */
async function refreshOaToken(auth: ZaloCompanyAuth): Promise<string | null> {
  if (!auth.zaloAppId || !auth.zaloSecretKey || !auth.zaloRefreshToken) return null;

  const body = new URLSearchParams({
    refresh_token: auth.zaloRefreshToken,
    app_id: auth.zaloAppId,
    grant_type: "refresh_token",
  });

  try {
    const res = await fetch(OAUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: auth.zaloSecretKey,
      },
      body,
    });
    const data = (await res.json()) as RefreshResult;
    if (!data.access_token) {
      console.error("[zalo] Gia hạn token thất bại:", data.error_description ?? data.error_name ?? JSON.stringify(data));
      return null;
    }

    const expiresInSec = Number(data.expires_in ?? 90000);
    const expiresAt = new Date(Date.now() + expiresInSec * 1000);
    await prisma.company.update({
      where: { id: auth.id },
      data: {
        zaloOaToken: data.access_token,
        zaloRefreshToken: data.refresh_token ?? auth.zaloRefreshToken,
        zaloTokenExpiresAt: expiresAt,
      },
    });
    return data.access_token;
  } catch (err) {
    console.error("[zalo] Lỗi kết nối khi gia hạn token:", err);
    return null;
  }
}

/**
 * Lấy access token còn hạn. Nếu sắp hết hạn (còn <5 phút) thì tự gia hạn.
 * Trả null nếu công ty chưa cấu hình Zalo hoặc gia hạn thất bại.
 */
export async function getValidOaToken(auth: ZaloCompanyAuth): Promise<string | null> {
  const hasRefresh = auth.zaloAppId && auth.zaloSecretKey && auth.zaloRefreshToken;
  const stillValid =
    auth.zaloOaToken &&
    auth.zaloTokenExpiresAt &&
    auth.zaloTokenExpiresAt.getTime() - Date.now() > 5 * 60 * 1000;

  if (stillValid) return auth.zaloOaToken;
  if (hasRefresh) return refreshOaToken(auth);
  // Không có refresh token → chỉ dùng token tĩnh (sẽ hết hạn sau ~25h)
  return auth.zaloOaToken ?? null;
}

export interface ZaloSendResult {
  ok: boolean;
  error?: string;
}

/** Gửi tin tư vấn (free-text) tới 1 nhân viên đã follow OA */
export async function sendZaloMessage({
  oaToken,
  userId,
  text,
}: {
  oaToken: string;
  userId: string;
  text: string;
}): Promise<ZaloSendResult> {
  try {
    const res = await fetch(CS_MESSAGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: oaToken },
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: { text },
      }),
    });
    const data = (await res.json()) as { error: number; message?: string };
    if (data.error !== 0) {
      return { ok: false, error: data.message ?? `Zalo error ${data.error}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export interface ZaloFollower {
  userId: string;
  displayName: string;
  avatar: string | null;
}

/** Lấy danh sách người đã follow OA (kèm tên hiển thị) để map với nhân viên */
export async function getOaFollowers(oaToken: string, max = 200): Promise<ZaloFollower[]> {
  const followers: ZaloFollower[] = [];
  let offset = 0;
  const count = 50;

  try {
    while (followers.length < max) {
      const data = encodeURIComponent(JSON.stringify({ offset, count }));
      const res = await fetch(`${FOLLOWERS_URL}?data=${data}`, {
        headers: { access_token: oaToken },
      });
      const json = (await res.json()) as {
        error: number;
        data?: { total: number; followers: { user_id: string }[] };
      };
      if (json.error !== 0 || !json.data) break;
      const batch = json.data.followers ?? [];
      if (batch.length === 0) break;

      // Lấy tên hiển thị từng người
      for (const f of batch) {
        const name = await getFollowerName(oaToken, f.user_id);
        followers.push({ userId: f.user_id, displayName: name.name, avatar: name.avatar });
      }
      offset += batch.length;
      if (offset >= json.data.total) break;
    }
  } catch (err) {
    console.error("[zalo] Lỗi lấy followers:", err);
  }
  return followers;
}

async function getFollowerName(oaToken: string, userId: string): Promise<{ name: string; avatar: string | null }> {
  try {
    const data = encodeURIComponent(JSON.stringify({ user_id: userId }));
    const res = await fetch(`${PROFILE_URL}?data=${data}`, {
      headers: { access_token: oaToken },
    });
    const json = (await res.json()) as {
      error: number;
      data?: { display_name?: string; avatar?: string };
    };
    return {
      name: json.data?.display_name ?? "(không tên)",
      avatar: json.data?.avatar ?? null,
    };
  } catch {
    return { name: "(không tên)", avatar: null };
  }
}
