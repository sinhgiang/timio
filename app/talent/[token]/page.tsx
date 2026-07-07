import { verifyTalentToken } from "@/lib/talentToken";
import { prisma } from "@/lib/prisma";
import TalentOptInClient from "./TalentOptInClient";

export const dynamic = "force-dynamic";

export default async function TalentPage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const payload = verifyTalentToken(token);

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-center p-8">
        <div>
          <div className="text-5xl mb-4">⏱️</div>
          <h1 className="text-xl font-bold mb-2">Link đã hết hạn</h1>
          <p className="text-slate-400 text-sm">Vui lòng liên hệ công ty cũ để nhận link mới (hiệu lực 90 ngày).</p>
        </div>
      </div>
    );
  }

  const [emp, invite, profile, company] = await Promise.all([
    prisma.employee.findFirst({ where: { id: payload.employeeId, companyId: payload.companyId }, select: { name: true } }),
    prisma.talentInvite.findUnique({ where: { employeeId: payload.employeeId }, select: { vScore: true, vAttendance: true, vPunctuality: true, vTenureMonths: true } }),
    prisma.talentProfile.findUnique({ where: { employeeId: payload.employeeId }, select: { isOpen: true, desiredTitle: true, desiredArea: true, desiredSalaryMin: true, desiredSalaryMax: true, skills: true, bio: true, showAvatar: true } }),
    prisma.company.findUnique({ where: { id: payload.companyId }, select: { name: true } }),
  ]);

  if (!emp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-center p-8">
        <div><div className="text-5xl mb-4">❓</div><h1 className="text-xl font-bold">Không tìm thấy hồ sơ</h1></div>
      </div>
    );
  }

  return (
    <TalentOptInClient
      token={token}
      name={emp.name}
      companyName={company?.name ?? "công ty cũ"}
      stats={{
        vScore: invite?.vScore ?? null,
        vAttendance: invite?.vAttendance ?? null,
        vPunctuality: invite?.vPunctuality ?? null,
        vTenureMonths: invite?.vTenureMonths ?? null,
      }}
      alreadyIn={!!profile?.isOpen}
      initial={{
        desiredTitle: profile?.desiredTitle ?? "",
        desiredArea: profile?.desiredArea ?? "",
        desiredSalaryMin: profile?.desiredSalaryMin ?? null,
        desiredSalaryMax: profile?.desiredSalaryMax ?? null,
        skills: profile?.skills ?? "",
        bio: profile?.bio ?? "",
        showAvatar: profile?.showAvatar ?? false,
      }}
    />
  );
}
