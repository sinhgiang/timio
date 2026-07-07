import { verifyTalentToken } from "@/lib/talentToken";
import { prisma } from "@/lib/prisma";
import { computeTalentDevStats } from "@/lib/talentDevStats";
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

  const [emp, invite, profile, company, dev] = await Promise.all([
    prisma.employee.findFirst({ where: { id: payload.employeeId, companyId: payload.companyId }, select: { name: true } }),
    prisma.talentInvite.findUnique({ where: { employeeId: payload.employeeId }, select: { vScore: true, vAttendance: true, vPunctuality: true, vTenureMonths: true } }),
    prisma.talentProfile.findUnique({ where: { employeeId: payload.employeeId }, select: { id: true, isOpen: true, desiredTitle: true, desiredArea: true, desiredSalaryMin: true, desiredSalaryMax: true, skills: true, bio: true, showAvatar: true } }),
    prisma.company.findUnique({ where: { id: payload.companyId }, select: { name: true } }),
    computeTalentDevStats(payload.employeeId),
  ]);

  // Lời quan tâm đang chờ (double opt-in) — kèm tên công ty tuyển
  let interests: { id: string; companyName: string; jobTitle: string | null; message: string | null }[] = [];
  if (profile?.id) {
    const rows = await prisma.talentInterest.findMany({
      where: { profileId: profile.id, status: "pending" },
      select: { id: true, companyId: true, jobId: true, message: true },
      orderBy: { createdAt: "desc" },
    });
    if (rows.length) {
      const [cos, jobs] = await Promise.all([
        prisma.company.findMany({ where: { id: { in: rows.map((r) => r.companyId) } }, select: { id: true, name: true } }),
        prisma.jobPosting.findMany({ where: { id: { in: rows.map((r) => r.jobId).filter((x): x is string => !!x) } }, select: { id: true, title: true } }),
      ]);
      const coMap = new Map(cos.map((c) => [c.id, c.name]));
      const jobMap = new Map(jobs.map((j) => [j.id, j.title]));
      interests = rows.map((r) => ({ id: r.id, companyName: coMap.get(r.companyId) ?? "Nhà tuyển dụng", jobTitle: r.jobId ? (jobMap.get(r.jobId) ?? null) : null, message: r.message }));
    }
  }

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
      dev={{
        vDevScore: dev.vDevScore,
        vDevTrend: dev.vDevTrend,
        vPromotions: dev.vPromotions,
        vReviewCount: dev.vReviewCount,
        timeline: dev.timeline,
      }}
      interests={interests}
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
