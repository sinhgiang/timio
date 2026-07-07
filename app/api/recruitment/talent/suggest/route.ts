import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rankTalentForJob, matchAiConfigured, type MatchProfile } from "@/lib/talentMatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AI gợi ý cựu NV trong cộng đồng phù hợp với MỘT tin tuyển dụng của công ty (ẩn danh)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  if (company?.plan !== "business") {
    return NextResponse.json({ error: "Gợi ý ứng viên chỉ có ở gói Business.", locked: true }, { status: 403 });
  }

  const jobId = new URL(req.url).searchParams.get("jobId") || "";
  if (!jobId) return NextResponse.json({ error: "Thiếu tin tuyển dụng." }, { status: 400 });

  const job = await prisma.jobPosting.findFirst({
    where: { id: jobId, companyId },
    select: { id: true, title: true, department: true, location: true, requirements: true, description: true, salaryMin: true, salaryMax: true },
  });
  if (!job) return NextResponse.json({ error: "Không tìm thấy tin tuyển dụng." }, { status: 404 });

  // Nhân viên đang làm ở công ty này → loại (giữ riêng tư, không lộ người của mình)
  const myActive = await prisma.employee.findMany({ where: { companyId, status: "active" }, select: { phone: true, email: true } });
  const myPhones = new Set(myActive.map((e) => (e.phone || "").replace(/[\s.]/g, "")).filter(Boolean));
  const myEmails = new Set(myActive.map((e) => (e.email || "").toLowerCase().trim()).filter(Boolean));

  const profiles = await prisma.talentProfile.findMany({
    where: { isOpen: true, sourceCompanyId: { not: companyId } },
    select: {
      id: true, employeeId: true, desiredTitle: true, desiredArea: true, desiredSalaryMin: true, desiredSalaryMax: true,
      skills: true, bio: true, vScore: true, vAttendance: true, vPunctuality: true, vTenureMonths: true,
      vDevScore: true, vDevTrend: true, vPromotions: true, vReviewCount: true,
    },
    take: 300,
  });

  const empIds = profiles.map((p) => p.employeeId);
  const emps = await prisma.employee.findMany({ where: { id: { in: empIds } }, select: { id: true, phone: true, email: true } });
  const empMap = new Map(emps.map((e) => [e.id, e]));

  const eligible = profiles.filter((p) => {
    const e = empMap.get(p.employeeId);
    if (!e) return true;
    const ph = (e.phone || "").replace(/[\s.]/g, "");
    const em = (e.email || "").toLowerCase().trim();
    if (ph && myPhones.has(ph)) return false;
    if (em && myEmails.has(em)) return false;
    return true;
  });

  if (eligible.length === 0) {
    return NextResponse.json({ total: 0, candidates: [], ai: matchAiConfigured() });
  }

  const matchInput: MatchProfile[] = eligible.map((p) => ({
    id: p.id, desiredTitle: p.desiredTitle, desiredArea: p.desiredArea, skills: p.skills, bio: p.bio,
    desiredSalaryMin: p.desiredSalaryMin, desiredSalaryMax: p.desiredSalaryMax, vScore: p.vScore, vDevScore: p.vDevScore,
  }));

  const ranked = await rankTalentForJob(job, matchInput);
  const rankMap = new Map(ranked.map((r) => [r.id, r]));
  const pMap = new Map(eligible.map((p) => [p.id, p]));

  // Top 20, chỉ lấy hồ sơ có độ khớp đáng kể
  const items = ranked
    .filter((r) => r.matchScore >= 20)
    .slice(0, 20)
    .map((r) => {
      const p = pMap.get(r.id)!;
      return {
        id: p.id,
        maskedName: `Ứng viên #${p.id.slice(-4).toUpperCase()}`,
        matchScore: r.matchScore,
        matchReason: r.reason,
        desiredTitle: p.desiredTitle,
        desiredArea: p.desiredArea,
        desiredSalaryMin: p.desiredSalaryMin,
        desiredSalaryMax: p.desiredSalaryMax,
        skills: p.skills,
        bio: p.bio,
        vScore: p.vScore, vAttendance: p.vAttendance, vPunctuality: p.vPunctuality, vTenureMonths: p.vTenureMonths,
        vDevScore: p.vDevScore, vDevTrend: p.vDevTrend, vPromotions: p.vPromotions, vReviewCount: p.vReviewCount,
      };
    });

  return NextResponse.json({ total: items.length, candidates: items, ai: matchAiConfigured(), jobTitle: job.title });
}
