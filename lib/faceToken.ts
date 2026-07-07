import { createHmac } from "crypto";

const secret = () => process.env.NEXTAUTH_SECRET ?? "dev-fallback-change-in-prod";

interface FaceTokenPayload {
  employeeId: string;
  companyId: string;
  employeeName: string;
  exp: number;
}

export function signFaceToken(employeeId: string, companyId: string, employeeName: string): string {
  const payload: FaceTokenPayload = { employeeId, companyId, employeeName, exp: Date.now() + 20 * 60 * 1000 };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyFaceToken(token: string): Omit<FaceTokenPayload, "exp"> | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = createHmac("sha256", secret()).update(data).digest("base64url");
    if (sig !== expected) return null;
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as FaceTokenPayload;
    if (Date.now() > p.exp) return null;
    return { employeeId: p.employeeId, companyId: p.companyId, employeeName: p.employeeName };
  } catch {
    return null;
  }
}

// ─── Token onboarding (nhân viên mới tự hoàn thiện hồ sơ) — hạn 7 ngày ───────────
interface OnboardingTokenPayload extends FaceTokenPayload { purpose: "onboarding" }

export function signOnboardingToken(employeeId: string, companyId: string, employeeName: string): string {
  const payload: OnboardingTokenPayload = {
    employeeId, companyId, employeeName, purpose: "onboarding",
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyOnboardingToken(token: string): Omit<FaceTokenPayload, "exp"> | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = createHmac("sha256", secret()).update(data).digest("base64url");
    if (sig !== expected) return null;
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as OnboardingTokenPayload;
    if (p.purpose !== "onboarding") return null;
    if (Date.now() > p.exp) return null;
    return { employeeId: p.employeeId, companyId: p.companyId, employeeName: p.employeeName };
  } catch {
    return null;
  }
}
