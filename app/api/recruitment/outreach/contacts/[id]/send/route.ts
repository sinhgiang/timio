import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";
import { makeUnsubToken } from "@/lib/outreachToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}
function normPhone(p: string | null | undefined) { return (p || "").replace(/[\s.]/g, ""); }
function normEmail(e: string | null | undefined) { return (e || "").toLowerCase().trim(); }

interface SentMsg { step: number; channel: string; subject: string; body: string; sentAt: string }

// POST — gửi 1 tin cho 1 contact (con người bấm gửi). body: { subject, body, channel? }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const contact = await prisma.outreachContact.findFirst({ where: { id: params.id, companyId } });
  if (!contact) return NextResponse.json({ error: "Không tìm thấy ứng viên." }, { status: 404 });

  // Branch scope: kiểm qua campaign
  const b = scopedBranchId(user);
  if (b) {
    const camp = await prisma.outreachCampaign.findFirst({ where: { id: contact.campaignId, OR: [{ branchId: b }, { branchId: null }] }, select: { id: true } });
    if (!camp) return NextResponse.json({ error: "Không có quyền với chiến dịch này." }, { status: 403 });
  }

  const { subject, body, channel = "email" } = await req.json().catch(() => ({}));
  if (!body || !String(body).trim()) return NextResponse.json({ error: "Nội dung tin trống." }, { status: 400 });

  const emailNorm = normEmail(contact.email);
  const phoneNorm = normPhone(contact.phone);

  // Kiểm sổ từ chối nhận tin (NĐ 91/2020) — không gửi lại người đã từ chối
  const optedOut = await prisma.outreachOptOut.findFirst({
    where: { companyId, contact: { in: [emailNorm, phoneNorm].filter(Boolean) } },
    select: { id: true },
  });
  if (optedOut) {
    await prisma.outreachContact.update({ where: { id: contact.id }, data: { status: "opted_out" } }).catch(() => {});
    return NextResponse.json({ error: "Người này đã từ chối nhận tin — không thể gửi." }, { status: 409 });
  }

  const now = new Date();
  const step = contact.step + 1;

  // ── Kênh Zalo/thủ công: không tự gửi, chỉ ghi nhận đã gửi tay ──
  if (channel !== "email") {
    const prev: SentMsg[] = contact.messages ? safeParse(contact.messages) : [];
    prev.push({ step, channel, subject: subject ?? "", body: String(body), sentAt: now.toISOString() });
    await prisma.outreachContact.update({
      where: { id: contact.id },
      data: { messages: JSON.stringify(prev), step, status: "sent", lastSentAt: now, draftSubject: null, draftBody: null },
    });
    return NextResponse.json({ ok: true, channel, manual: true });
  }

  // ── Kênh email ──
  if (!contact.email) return NextResponse.json({ error: "Ứng viên chưa có email — dùng kênh Zalo/thủ công." }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, logoUrl: true, slug: true } });
  const companyName = company?.name ?? "Công ty";
  const origin = process.env.NEXTAUTH_URL || "https://timio.vn";
  const unsubToken = makeUnsubToken(companyId, emailNorm);
  const unsubUrl = `${origin}/outreach/unsubscribe/${unsubToken}`;

  const header = company?.logoUrl
    ? `<div style="text-align:center;margin-bottom:18px"><img src="${company.logoUrl}" alt="${esc(companyName)}" style="max-height:52px;max-width:180px"></div>`
    : `<div style="font-weight:bold;font-size:18px;color:#111827;margin-bottom:14px">${esc(companyName)}</div>`;

  const bodyHtml = esc(String(body)).replace(/\n/g, "<br>");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
    ${header}
    <p style="font-size:15px;line-height:1.7;margin:0 0 14px">${bodyHtml}</p>
    <p style="font-size:14px;color:#4b5563;margin:16px 0 0">Trân trọng,<br>${esc(companyName)}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0">
    <p style="font-size:11px;color:#9ca3af;margin:0">
      Bạn nhận email này vì từng có liên hệ với ${esc(companyName)}.
      Nếu không muốn nhận tin tuyển dụng nữa, <a href="${unsubUrl}" style="color:#6b7280">bấm vào đây để từ chối</a>.
    </p>
  </div>`;

  const subj = (subject && String(subject).trim()) || `Cơ hội việc làm tại ${companyName}`;

  try {
    await sendEmail({ to: contact.email, subject: subj, html });
  } catch (e) {
    console.error("[outreach/send] lỗi gửi:", e);
    return NextResponse.json({ error: "Gửi email thất bại. Kiểm tra cấu hình email." }, { status: 502 });
  }

  const prev: SentMsg[] = contact.messages ? safeParse(contact.messages) : [];
  prev.push({ step, channel: "email", subject: subj, body: String(body), sentAt: now.toISOString() });
  await prisma.outreachContact.update({
    where: { id: contact.id },
    data: { messages: JSON.stringify(prev), step, status: "sent", lastSentAt: now, draftSubject: null, draftBody: null },
  });

  return NextResponse.json({ ok: true, channel: "email", sentTo: contact.email });
}

function safeParse(s: string): SentMsg[] {
  try { return JSON.parse(s) as SentMsg[]; } catch { return []; }
}
