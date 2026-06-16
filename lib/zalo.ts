// Zalo Official Account (OA) API integration
// Docs: https://developers.zalo.me/docs/api/official-account-api
//
// Flow:
//   1. Company tạo Zalo OA tại https://oa.zalo.me
//   2. Lấy Access Token từ Zalo Developer Console
//   3. Lưu token vào Company.zaloOaToken
//   4. Nhân viên/admin follow OA để nhận tin nhắn
//   5. Lấy Zalo User ID của từng người → lưu vào Admin.zaloUserId

const ZALO_API = "https://openapi.zalo.me/v2.0/oa/message";

export interface ZaloTextMessage {
  recipient: { user_id: string };
  message: { text: string };
}

export async function sendZaloMessage({
  oaToken,
  userId,
  text,
}: {
  oaToken: string;
  userId: string;
  text: string;
}): Promise<boolean> {
  try {
    const body: ZaloTextMessage = {
      recipient: { user_id: userId },
      message: { text },
    };

    const res = await fetch(ZALO_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: oaToken,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json() as { error: number; message: string };
    if (data.error !== 0) {
      console.error("[zalo] Gửi thất bại:", data.message, "→ userId:", userId);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[zalo] Lỗi kết nối:", err);
    return false;
  }
}
