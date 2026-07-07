import { verifyOnboardingToken } from "@/lib/faceToken";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const payload = verifyOnboardingToken(token);

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-center p-8">
        <div>
          <div className="text-5xl mb-4">⏱️</div>
          <h1 className="text-xl font-bold mb-2">Link đã hết hạn</h1>
          <p className="text-slate-400 text-sm">Vui lòng liên hệ công ty để nhận link mới (hiệu lực 7 ngày).</p>
        </div>
      </div>
    );
  }

  const [emp, company] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: payload.employeeId, companyId: payload.companyId },
      select: {
        name: true, dateOfBirth: true, email: true, phone: true, zalo: true, facebook: true,
        cccd: true, avatarUrl: true, bankName: true, bankAccount: true, bankBranch: true,
        faceDescriptors: true, code: true, position: true, department: true,
        branch: { select: { name: true } },
      },
    }),
    prisma.company.findUnique({ where: { id: payload.companyId }, select: { name: true, logoUrl: true } }),
  ]);

  if (!emp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-center p-8">
        <div>
          <div className="text-5xl mb-4">❓</div>
          <h1 className="text-xl font-bold mb-2">Không tìm thấy hồ sơ</h1>
          <p className="text-slate-400 text-sm">Vui lòng liên hệ công ty.</p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingClient
      token={token}
      companyName={company?.name ?? "Công ty"}
      logoUrl={company?.logoUrl ?? null}
      hasFace={!!emp.faceDescriptors}
      initial={{
        name: emp.name ?? "",
        dateOfBirth: emp.dateOfBirth ?? "",
        email: emp.email ?? "",
        phone: emp.phone ?? "",
        zalo: emp.zalo ?? "",
        facebook: emp.facebook ?? "",
        cccd: emp.cccd ?? "",
        avatarUrl: emp.avatarUrl ?? "",
        bankName: emp.bankName ?? "",
        bankAccount: emp.bankAccount ?? "",
        bankBranch: emp.bankBranch ?? "",
        code: emp.code ?? "",
        position: emp.position ?? "",
        department: emp.department ?? "",
        branchName: emp.branch?.name ?? "",
      }}
    />
  );
}
