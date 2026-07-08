import crypto from "crypto";

// Token để ứng viên theo dõi hồ sơ ứng tuyển của mình (KH4). Ký HMAC, không hết hạn.
const SECRET = process.env.NEXTAUTH_SECRET || process.env.CRON_SECRET || "timio_application_fallback";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function makeApplicationToken(candidateId: string): string {
  const body = b64url(Buffer.from(candidateId, "utf8"));
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(body).digest()).slice(0, 16);
  return `${body}.${sig}`;
}

export function verifyApplicationToken(token: string): string | null {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return null;
  const expect = b64url(crypto.createHmac("sha256", SECRET).update(body).digest()).slice(0, 16);
  if (sig !== expect) return null;
  try {
    return Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return null;
  }
}
