import crypto from "crypto";

// Token hủy nhận tin (unsubscribe) — ký HMAC để không giả mạo hàng loạt được.
// Payload: "<companyId>::<contact>" (contact = email/phone đã chuẩn hóa lowercase).
const SECRET = process.env.NEXTAUTH_SECRET || process.env.CRON_SECRET || "timio_outreach_fallback";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function makeUnsubToken(companyId: string, contact: string): string {
  const payload = `${companyId}::${contact.toLowerCase().trim()}`;
  const body = b64url(Buffer.from(payload, "utf8"));
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(body).digest()).slice(0, 16);
  return `${body}.${sig}`;
}

export function verifyUnsubToken(token: string): { companyId: string; contact: string } | null {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return null;
  const expect = b64url(crypto.createHmac("sha256", SECRET).update(body).digest()).slice(0, 16);
  if (sig !== expect) return null;
  try {
    const payload = fromB64url(body).toString("utf8");
    const idx = payload.indexOf("::");
    if (idx === -1) return null;
    return { companyId: payload.slice(0, idx), contact: payload.slice(idx + 2) };
  } catch {
    return null;
  }
}
