import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { signTalentToken } from "@/lib/talentToken";
import { fallbackRank, type MatchProfile } from "@/lib/talentMatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c)); }

const MATCH_THRESHOLD = 45;      // độ khớp tối thiểu để gửi (0-100)
const MAX_ALERTS_PER_PROFILE = 2; // tối đa việc mỗi cựu NV nhận / lần chạy
const LOOKBACK_DAYS = 3;

// Cron hằng ngày: giới thiệu việc phù hợp (từ tin tuyển dụng mới) cho cựu NV trong cộng đồng.
// Riêng tư: KHÔNG gửi tin của chính công ty cũ; mỗi hồ sơ/1 tin chỉ 1 lần (TalentJobAlert).
export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // Tin tuyển dụng mới, đang mở, công khai — từ công ty gói Business
  const jobs = await prisma.jobPosting.findMany({
    where: {
      status: "open", isPublic: true, createdAt: { gte: since },
      company: { plan: "business" },
    },
    select: {
      id: true, companyId: true, title: true, department: true, location: true, requirements: true, description: true,
      salaryMin: true, salaryMax: true,
      company: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  if (jobs.length === 0) return NextResponse.json({ ok: true, jobs: 0, emailsSent: 0 });

  // Hồ sơ cộng đồng đang mở
  const profiles = await prisma.talentProfile.findMany({
    where: { isOpen: true },
    select: {
      id: true, employeeId: true, sourceCompanyId: true, desiredTitle: true, desiredArea: true,
      desiredSalaryMin: true, desiredSalaryMax: true, skills: true, bio: true, vScore: true, vDevScore: true,
    },
    take: 1000,
  });
  if (profiles.length === 0) return NextResponse.json({ ok: true, jobs: jobs.length, emailsSent: 0 });

  const empIds = profiles.map((p) => p.employeeId);
  const emps = await prisma.employee.findMany({ where: { id: { in: empIds } }, select: { id: true, name: true, email: true, companyId: true } });
  const empMap = new Map(emps.map((e) => [e.id, e]));

  // Đã gửi trước đó → bỏ qua
  const existingAlerts = await prisma.talentJobAlert.findMany({
    where: { jobId: { in: jobs.map((j) => j.id) } },
    select: { profileId: true, jobId: true },
  });
  const alerted = new Set(existingAlerts.map((a) => `${a.profileId}:${a.jobId}`));

  const sentCountPerProfile = new Map<string, number>();
  let emailsSent = 0;

  for (const job of jobs) {
    const matchInput: MatchProfile[] = profiles
      .filter((p) => p.sourceCompanyId !== job.companyId) // không gửi tin công ty cũ
      .map((p) => ({
        id: p.id, desiredTitle: p.desiredTitle, desiredArea: p.desiredArea, skills: p.skills, bio: p.bio,
        desiredSalaryMin: p.desiredSalaryMin, desiredSalaryMax: p.desiredSalaryMax, vScore: p.vScore, vDevScore: p.vDevScore,
      }));
    const ranked = fallbackRank(job, matchInput).filter((r) => r.matchScore >= MATCH_THRESHOLD);

    for (const r of ranked) {
      if (alerted.has(`${r.id}:${job.id}`)) continue;
      if ((sentCountPerProfile.get(r.id) ?? 0) >= MAX_ALERTS_PER_PROFILE) continue;
      const prof = profiles.find((p) => p.id === r.id);
      if (!prof) continue;
      const emp = empMap.get(prof.employeeId);
      if (!emp?.email) continue;

      // Ghi nhận trước (unique) để không gửi trùng kể cả khi email lỗi
      try {
        await prisma.talentJobAlert.create({ data: { profileId: r.id, jobId: job.id } });
      } catch {
        continue; // trùng (unique) → bỏ qua
      }

      const token = signTalentToken(prof.employeeId, emp.companyId);
      const profileLink = `https://timio.vn/talent/${encodeURIComponent(token)}`;
      const jobLink = `https://timio.vn/tuyendung/${encodeURIComponent(job.company.slug)}/${job.id}`;
      const sal = job.salaryMin || job.salaryMax
        ? `${job.salaryMin?.toLocaleString("vi-VN") ?? "?"} - ${job.salaryMax?.toLocaleString("vi-VN") ?? "?"} VND/tháng`
        : "Thỏa thuận";
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
        <div style="font-weight:bold;font-size:18px;color:#2563eb;margin-bottom:12px">Cộng đồng ứng viên Timio</div>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Chào ${esc(emp.name)},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Timio thấy một công việc <b>có thể phù hợp với bạn</b>:</p>
        <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:12px;padding:16px;margin:12px 0">
          <p style="margin:0 0 6px;font-weight:700;font-size:16px;color:#1e3a8a">${esc(job.title)}</p>
          <p style="margin:0;color:#334155;font-size:14px">${esc(job.company.name)}${job.location ? ` · ${esc(job.location)}` : ""}</p>
          <p style="margin:6px 0 0;color:#334155;font-size:14px">Mức lương: ${esc(sal)}</p>
        </div>
        <p style="text-align:center;margin:20px 0">
          <a href="${jobLink}" style="background:#2563eb;color:#fff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">Xem &amp; ứng tuyển →</a>
        </p>
        <p style="font-size:13px;line-height:1.6;color:#64748b;margin:0 0 6px">Không quan tâm việc này? Không sao cả. Bạn có thể <a href="${profileLink}" style="color:#2563eb">cập nhật mong muốn tìm việc</a> để Timio giới thiệu chuẩn hơn, hoặc tạm ẩn hồ sơ.</p>
        <p style="font-size:12px;color:#9ca3af;margin:10px 0 0">Hồ sơ của bạn luôn ẩn danh cho đến khi bạn đồng ý. Timio giới thiệu việc miễn phí cho bạn.</p>
      </div>`;
      try {
        await sendEmail({ to: emp.email, subject: `Có việc phù hợp với bạn: ${job.title} — Timio`, html });
        emailsSent++;
        sentCountPerProfile.set(r.id, (sentCountPerProfile.get(r.id) ?? 0) + 1);
      } catch (e) {
        console.error("[cron/talent-job-alerts] email lỗi:", prof.id, job.id, e);
      }
    }
  }

  return NextResponse.json({ ok: true, jobs: jobs.length, emailsSent });
}
