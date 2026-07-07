import { createHmac } from "crypto";

const secret = () => process.env.NEXTAUTH_SECRET ?? "dev-fallback-change-in-prod";

interface TalentTokenPayload {
  employeeId: string;
  companyId: string;
  purpose: "talent";
  exp: number;
}

// Token mời cựu nhân viên vào cộng đồng — hiệu lực 90 ngày (họ có thể xử lý muộn)
export function signTalentToken(employeeId: string, companyId: string): string {
  const payload: TalentTokenPayload = {
    employeeId, companyId, purpose: "talent",
    exp: Date.now() + 90 * 24 * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyTalentToken(token: string): { employeeId: string; companyId: string } | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = createHmac("sha256", secret()).update(data).digest("base64url");
    if (sig !== expected) return null;
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as TalentTokenPayload;
    if (p.purpose !== "talent") return null;
    if (Date.now() > p.exp) return null;
    return { employeeId: p.employeeId, companyId: p.companyId };
  } catch {
    return null;
  }
}
