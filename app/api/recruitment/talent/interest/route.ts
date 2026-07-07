import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { signTalentToken } from "@/lib/talentToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COST_PER_UNLOCK = 1; // 1 credit / lượt quan tâm

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c)); }

// Nhà tuyển dụng bày tỏ quan tâm 1 hồ sơ → trừ credit + báo ứng viên (double opt-in, CHƯA lộ liên hệ)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true, name: true } });
  if (company?.plan !== "business") return NextResponse.json({ error: "Chỉ gói Business dùng được cộng đồng ứng viên." }, { status: 403 });

  const { profileId, jobId, message } = await req.json();
  if (!profileId) return NextResponse.json({ error: "Thiếu hồ sơ." }, { status: 400 });

  const profile = await prisma.talentProfile.findFirst({
    where: { id: profileId, isOpen: true, sourceCompanyId: { not: companyId } },
    select: { id: true, employeeId: true, desiredTitle: true },
  });
  if (!profile) return NextResponse.json({ error: "Không tìm thấy hồ sơ (hoặc đã đóng)." }, { status: 404 });

  // Không tính phí trùng: nếu đã có quan tâm pending/accepted từ công ty này tới hồ sơ này
  const existing = await prisma.talentInterest.findFirst({
    where: { profileId, companyId, status: { in: ["pending", "accepted"] } },
    select: { id: true, status: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true, status: existing.status, message: "Bạn đã bày tỏ quan tâm hồ sơ này rồi." });
  }

  // Kiểm tra + trừ credit
  const credit = await prisma.talentCredit.findUnique({ where: { companyId }, select: { balance: true } });
  const balance = credit?.balance ?? 0;
  if (balance < COST_PER_UNLOCK) {
    return NextResponse.json({ error: "Không đủ credit. Vui lòng nạp thêm để mở khóa liên hệ ứng viên.", needCredit: true, balance }, { status: 402 });
  }
  await prisma.talentCredit.update({ where: { companyId }, data: { balance: { decrement: COST_PER_UNLOCK } } });

  await prisma.talentInterest.create({
    data: { profileId, companyId, jobId: jobId || null, message: message || null, status: "pending", chargedCredits: COST_PER_UNLOCK },
  });

  // Báo ứng viên qua email (KÍN — dùng email cá nhân của cựu NV, không qua công ty cũ)
  let notified = false;
  const emp = await prisma.employee.findUnique({ where: { id: profile.employeeId }, select: { name: true, email: true, companyId: true } });
  if (emp?.email) {
    try {
      const token = signTalentToken(profile.employeeId, emp.companyId);
      const link = `https://timio.vn/talent/${encodeURIComponent(token)}`;
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
        <div style="font-weight:bold;font-size:18px;color:#2563eb;margin-bottom:12px">Cộng đồng ứng viên Timio</div>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Chào ${esc(emp.name)},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Có <b>một nhà tuyển dụng quan tâm hồ sơ của bạn</b>${profile.desiredTitle ? ` cho vị trí <b>${esc(profile.desiredTitle)}</b>` : ""}. Thông tin của bạn vẫn <b>ẩn danh</b> cho đến khi bạn đồng ý.</p>
        <p style="text-align:center;margin:22px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">Xem &amp; phản hồi →</a></p>
        <p style="font-size:12px;color:#9ca3af;margin:0">Bạn toàn quyền Đồng ý hoặc Từ chối. Chỉ khi bạn đồng ý, nhà tuyển dụng mới thấy liên hệ của bạn.</p>
      </div>`;
      await sendEmail({ to: emp.email, subject: `Có nhà tuyển dụng quan tâm bạn — Timio`, html });
      notified = true;
    } catch (e) { console.error("[talent/interest] email lỗi:", e); }
  }

  return NextResponse.json({ ok: true, notified, balanceLeft: balance - COST_PER_UNLOCK });
}
