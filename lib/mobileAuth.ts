import crypto from "crypto";

const SECRET = process.env.CRON_SECRET ?? "timio_mobile_fallback_2025";
const SEP = "||";
const PART = "::";
const TTL = 30 * 24 * 60 * 60 * 1000; // 30 ngày

export type ManagerAuth = {
  adminId: string;
  companyId: string;
  email: string;
  branchId: string | null;
  role: string;
};

export function createManagerToken(
  adminId: string,
  companyId: string,
  email: string,
  branchId: string | null = null,
  role: string = "owner"
): string {
  const exp = Date.now() + TTL;
  // Format: adminId::companyId::email::branchId::role::exp
  // branchId encoded as "" when null. exp luôn ở vị trí cuối cùng.
  const data = [adminId, companyId, email, branchId ?? "", role, String(exp)].join(PART);
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
  return Buffer.from(`${data}${SEP}${sig}`).toString("base64url");
}

export function verifyManagerToken(token: string): ManagerAuth | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const sepIdx = raw.lastIndexOf(SEP);
    if (sepIdx < 0) return null;
    const data = raw.slice(0, sepIdx);
    const sig = raw.slice(sepIdx + SEP.length);
    const expected = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
    if (expected !== sig) return null;
    const parts = data.split(PART);

    // Backward compat: token cũ có 4 phần [adminId, companyId, email, exp].
    // Token mới có 6 phần [adminId, companyId, email, branchId, role, exp].
    if (parts.length === 4) {
      const [adminId, companyId, email, expStr] = parts;
      if (Date.now() > parseInt(expStr, 10)) return null;
      return { adminId, companyId, email, branchId: null, role: "owner" };
    }

    if (parts.length >= 6) {
      const [adminId, companyId, email, branchIdRaw, role, expStr] = parts;
      if (Date.now() > parseInt(expStr, 10)) return null;
      return {
        adminId,
        companyId,
        email,
        branchId: branchIdRaw ? branchIdRaw : null,
        role: role || "owner",
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function getManagerAuth(req: Request): ManagerAuth | null {
  const auth = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  return verifyManagerToken(token);
}
