import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET ?? "fallback";

export function createSetupToken(email: string): string {
  const ts = Date.now();
  const sig = crypto.createHmac("sha256", SECRET).update(`${email}:${ts}`).digest("hex");
  return `${ts}.${sig}`;
}

export function verifySetupToken(email: string, token: string): boolean {
  const [tsStr, sig] = token.split(".");
  const ts = parseInt(tsStr);
  if (isNaN(ts) || Date.now() - ts > 5 * 60 * 1000) return false;
  const expected = crypto.createHmac("sha256", SECRET).update(`${email}:${ts}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig ?? ""), Buffer.from(expected));
}
