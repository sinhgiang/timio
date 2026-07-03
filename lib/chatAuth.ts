import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagerAuth } from "@/lib/mobileAuth";

export interface AuthedChatUser {
  adminId: string;
  companyId: string;
  companyName: string;
  role: string; // owner | accountant | manager
  branchId: string | null;
  branchName: string | null;
  name: string;
  email: string;
}

/** Xác thực chat: web dashboard (NextAuth) hoặc mobile app (Bearer HMAC token) */
export async function authenticateChatUser(req: Request): Promise<AuthedChatUser | null> {
  // 1. Mobile: Authorization: Bearer <token>
  const mobile = getManagerAuth(req);
  if (mobile) {
    const admin = await prisma.admin.findUnique({
      where: { id: mobile.adminId },
      include: { company: { select: { name: true } }, branch: { select: { name: true } } },
    });
    if (!admin || admin.companyId !== mobile.companyId) return null;
    return {
      adminId: admin.id,
      companyId: admin.companyId,
      companyName: admin.company.name,
      role: admin.role === "owner" ? "owner" : admin.role,
      branchId: admin.branchId,
      branchName: admin.branch?.name ?? null,
      name: admin.name,
      email: admin.email,
    };
  }

  // 2. Web: NextAuth session
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  const admin = await prisma.admin.findUnique({
    where: { email },
    include: { company: { select: { name: true } }, branch: { select: { name: true } } },
  });
  if (!admin) return null;

  // Nếu super admin đang impersonate → dùng companyId từ session
  const sessCompanyId = (session.user as { companyId?: string }).companyId;
  const companyId = sessCompanyId ?? admin.companyId;
  let companyName = admin.company.name;
  if (companyId !== admin.companyId) {
    const c = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
    companyName = c?.name ?? companyName;
  }

  return {
    adminId: admin.id,
    companyId,
    companyName,
    role: admin.role === "owner" ? "owner" : admin.role,
    branchId: admin.branchId,
    branchName: admin.branch?.name ?? null,
    name: admin.name,
    email: admin.email,
  };
}
