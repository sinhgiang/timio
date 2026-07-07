import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { signTalentToken } from "@/lib/talentToken";
import { computeTalentStats } from "@/lib/talentStats";
import { computeTalentDevStats } from "@/lib/talentDevStats";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c)); }

// Admin mời một cựu nhân viên (đã nghỉ) vào cộng đồng ứng viên Timio
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { employeeId, reason } = await req.json();
  if (!employeeId) return NextResponse.json({ error: "Thiếu nhân viên." }, { status: 400 });

  const b = scopedBranchId(user);
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, companyId, ...(b ? { branchId: b } : {}) },
    select: { id: true, name: true, email: true, status: true },
  });
  if (!emp) return NextResponse.json({ error: "Không tìm thấy nhân viên." }, { status: 404 });
  if (emp.status === "active") {
    return NextResponse.json({ error: "Chỉ mời được nhân viên ĐÃ NGHỈ (đánh dấu 'Đã nghỉ' trước)." }, { status: 400 });
  }

  const [stats, dev] = await Promise.all([computeTalentStats(emp.id), computeTalentDevStats(emp.id)]);

  await prisma.talentInvite.upsert({
    where: { employeeId: emp.id },
    create: {
      employeeId: emp.id, companyId, reason: reason === "inactive" ? "inactive" : "resigned",
      vAttendance: stats.vAttendance, vPunctuality: stats.vPunctuality, vTenureMonths: stats.vTenureMonths, vScore: stats.vScore,
      vDevScore: dev.vDevScore, vDevTrend: dev.vDevTrend, vPromotions: dev.vPromotions, vReviewCount: dev.vReviewCount,
      status: "invited",
    },
    update: {
      vAttendance: stats.vAttendance, vPunctuality: stats.vPunctuality, vTenureMonths: stats.vTenureMonths, vScore: stats.vScore,
      vDevScore: dev.vDevScore, vDevTrend: dev.vDevTrend, vPromotions: dev.vPromotions, vReviewCount: dev.vReviewCount,
    },
  });

  const token = signTalentToken(emp.id, companyId);
  const link = `https://timio.vn/talent/${encodeURIComponent(token)}`;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, logoUrl: true } });
  const cName = company?.name ?? "Công ty";

  let emailed = false;
  if (emp.email) {
    try {
      const head = company?.logoUrl
        ? `<div style="text-align:center;margin-bottom:18px"><img src="${company.logoUrl}" alt="${esc(cName)}" style="max-height:52px;max-width:180px"></div>`
        : `<div style="font-weight:bold;font-size:18px;color:#111827;margin-bottom:14px">${esc(cName)}</div>`;
      const stat = stats.enough && stats.vScore != null
        ? `<div style="background:#eef6ff;border:1px solid #d7e8ff;border-radius:12px;padding:14px;margin:12px 0">
             <p style="margin:0 0 6px;font-weight:700;color:#1e3a8a">Hồ sơ của bạn được Timio xác thực ✔</p>
             <p style="margin:0;color:#334155;font-size:14px">Điểm tin cậy <b>${stats.vScore}/100</b> · Chuyên cần ${stats.vAttendance}% · Đúng giờ ${stats.vPunctuality}%${stats.vTenureMonths ? ` · Thâm niên ${stats.vTenureMonths} tháng` : ""}</p>
           </div>`
        : "";
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
        ${head}
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Chào ${esc(emp.name)},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Cảm ơn bạn đã đồng hành cùng <b>${esc(cName)}</b>. Chúc bạn thật nhiều may mắn ở chặng đường mới!</p>
        ${stat}
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Bạn có một hồ sơ đẹp — và <b>Timio muốn giới thiệu những công việc tốt, phù hợp cho bạn</b> trong tương lai (hoàn toàn miễn phí). Bấm nút bên dưới để hoàn thiện hồ sơ tìm việc của bạn:</p>
        <p style="text-align:center;margin:22px 0">
          <a href="${link}" style="background:#2563eb;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">Hoàn thiện hồ sơ tìm việc &rarr;</a>
        </p>
        <p style="font-size:12px;color:#9ca3af;margin:0">Hồ sơ của bạn được giữ ẩn danh; bạn toàn quyền quyết định ai được liên hệ. Nếu không quan tâm, bạn có thể bỏ qua email này.</p>
      </div>`;
      await sendEmail({ to: emp.email, subject: `Timio: hoàn thiện hồ sơ tìm việc — hồ sơ của bạn rất đẹp!`, html });
      emailed = true;
    } catch (e) {
      console.error("[talent/invite] email lỗi:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    emailed,
    hasEmail: !!emp.email,
    inviteLink: link,
    stats: { vScore: stats.vScore, vAttendance: stats.vAttendance, vPunctuality: stats.vPunctuality, vTenureMonths: stats.vTenureMonths, enough: stats.enough, vDevScore: dev.vDevScore, vDevTrend: dev.vDevTrend, vPromotions: dev.vPromotions },
  });
}
