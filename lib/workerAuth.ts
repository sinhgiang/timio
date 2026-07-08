import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SECRET = process.env.NEXTAUTH_SECRET || process.env.CRON_SECRET || "timio_worker_fallback";
const TTL = 60 * 24 * 60 * 60 * 1000; // 60 ngày
export const WORKER_COOKIE = "worker_session";

// ── Token phiên nhân viên (HMAC ký, hết hạn 60 ngày) ──
export function makeWorkerToken(workerAccountId: string): string {
  const exp = Date.now() + TTL;
  const data = `${workerAccountId}::${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("hex").slice(0, 32);
  return Buffer.from(`${data}::${sig}`).toString("base64url");
}

export function verifyWorkerToken(token: string): string | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split("::");
    if (parts.length !== 3) return null;
    const [id, expStr, sig] = parts;
    const expect = crypto.createHmac("sha256", SECRET).update(`${id}::${expStr}`).digest("hex").slice(0, 32);
    if (sig !== expect) return null;
    if (Date.now() > parseInt(expStr, 10)) return null;
    return id;
  } catch {
    return null;
  }
}

// Đọc tài khoản nhân viên từ cookie (dùng trong server component / route)
export function getWorkerAccountId(): string | null {
  const token = cookies().get(WORKER_COOKIE)?.value;
  if (!token) return null;
  return verifyWorkerToken(token);
}

// ── Mật khẩu ──
export async function hashWorkerPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
export async function compareWorkerPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

// ── Token kích hoạt (ngẫu nhiên) ──
export function makeActivationToken(): string {
  return crypto.randomBytes(18).toString("base64url");
}

// Chuẩn hoá SĐT VN (bỏ khoảng trắng, chấm, gạch)
export function normPhone(p: string | null | undefined): string {
  return (p || "").replace(/[\s.\-()]/g, "");
}
