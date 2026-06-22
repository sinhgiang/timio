import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.NEXTAUTH_SECRET ?? "timio-aff-secret-fallback";
const COOKIE  = "aff_auth";
const TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 ngày

export function signAffToken(code: string, email: string): string {
  const payload = JSON.stringify({ code, email, exp: Date.now() + TTL_MS });
  const b64     = Buffer.from(payload).toString("base64url");
  const sig     = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyAffToken(token: string): { code: string; email: string } | null {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString()) as {
      code: string; email: string; exp: number;
    };
    if (payload.exp < Date.now()) return null;
    return { code: payload.code, email: payload.email };
  } catch {
    return null;
  }
}

// Server component: đọc session từ cookie
export function getAffSession(): { code: string; email: string } | null {
  try {
    const token = cookies().get(COOKIE)?.value;
    if (!token) return null;
    return verifyAffToken(token);
  } catch {
    return null;
  }
}

export const AFF_COOKIE = COOKIE;
export const AFF_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge:   TTL_MS / 1000,
  path:     "/",
};
