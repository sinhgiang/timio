import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const b = scopedBranchId(user);
  const cand = await prisma.candidate.findFirst({
    where: { id: params.id, companyId, ...(b ? { job: { OR: [{ branchId: b }, { branchId: null }] } } : {}) },
    select: { id: true, name: true, email: true, interviewAt: true, job: { select: { title: true } } },
  });
  if (!cand) return NextResponse.json({ sentOk: false, error: "Không tìm thấy ứng viên." }, { status: 404 });
  if (!cand.email) {
    return NextResponse.json({ sentOk: false, error: "Ứng viên này chưa có email — không gửi được." }, { status: 400 });
  }

  const { type, message, interviewAt } = await req.json();
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, logoUrl: true } });
  const companyName = company?.name ?? "Công ty";
  const jobTitle = cand.job?.title ?? "vị trí ứng tuyển";

  let subject = "";
  let bodyLines: string[] = [];

  if (type === "interview") {
    const when = interviewAt ? new Date(interviewAt) : cand.interviewAt;
    subject = `Thư mời phỏng vấn — ${jobTitle} — ${companyName}`;
    bodyLines = [
      `Chào ${cand.name},`,
      `Cảm ơn bạn đã ứng tuyển vị trí <b>${esc(jobTitle)}</b> tại <b>${esc(companyName)}</b>.`,
      `Chúng tôi rất ấn tượng với hồ sơ của bạn và trân trọng mời bạn tham gia buổi phỏng vấn.`,
      when ? `<b>Thời gian phỏng vấn: ${esc(fmtDateTime(when))}</b>` : "Chúng tôi sẽ liên hệ để hẹn lịch phỏng vấn cụ thể.",
      message ? esc(String(message)) : "",
      `Vui lòng phản hồi email này hoặc liên hệ lại để xác nhận. Rất mong được gặp bạn!`,
    ].filter(Boolean);
  } else if (type === "reject") {
    subject = `Kết quả ứng tuyển — ${jobTitle} — ${companyName}`;
    bodyLines = [
      `Chào ${cand.name},`,
      `Cảm ơn bạn đã quan tâm và ứng tuyển vị trí <b>${esc(jobTitle)}</b> tại <b>${esc(companyName)}</b>.`,
      message ? esc(String(message)) : `Sau khi cân nhắc kỹ, hiện tại chúng tôi chưa thể tiếp tục với hồ sơ của bạn cho vị trí này.`,
      `Chúng tôi rất trân trọng thời gian của bạn và sẽ lưu hồ sơ để liên hệ khi có vị trí phù hợp hơn. Chúc bạn sớm tìm được công việc như ý!`,
    ].filter(Boolean);
  } else if (type === "received") {
    subject = `Đã nhận hồ sơ ứng tuyển — ${jobTitle} — ${companyName}`;
    bodyLines = [
      `Chào ${cand.name},`,
      `${esc(companyName)} đã nhận được hồ sơ ứng tuyển vị trí <b>${esc(jobTitle)}</b> của bạn.`,
      `Chúng tôi sẽ xem xét và liên hệ lại với bạn sớm nhất. Cảm ơn bạn đã quan tâm!`,
    ];
  } else {
    // custom
    if (!message || !String(message).trim()) {
      return NextResponse.json({ sentOk: false, error: "Nội dung email trống." }, { status: 400 });
    }
    subject = `Thông tin từ ${companyName} — ${jobTitle}`;
    bodyLines = [`Chào ${cand.name},`, esc(String(message))];
  }

  const header = company?.logoUrl
    ? `<div style="text-align:center;margin-bottom:18px"><img src="${company.logoUrl}" alt="${esc(companyName)}" style="max-height:52px;max-width:180px"></div>`
    : `<div style="font-weight:bold;font-size:18px;color:#111827;margin-bottom:14px">${esc(companyName)}</div>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
    ${header}
    ${bodyLines.map((l) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${l}</p>`).join("")}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0">
    <p style="font-size:12px;color:#9ca3af;margin:0">Email gửi từ ${esc(companyName)} qua hệ thống tuyển dụng Timio.</p>
  </div>`;

  try {
    await sendEmail({ to: cand.email, subject, html });
  } catch (e) {
    console.error("[candidate/email] lỗi gửi:", e);
    return NextResponse.json({ sentOk: false, error: "Gửi email thất bại. Kiểm tra cấu hình email." }, { status: 502 });
  }

  // Đồng bộ trạng thái/lịch theo loại email (để mọi nơi gọi đều nhất quán)
  if (type === "interview") {
    const when = interviewAt ? new Date(interviewAt) : undefined;
    await prisma.candidate.update({
      where: { id: cand.id },
      data: { status: "interview", ...(when ? { interviewAt: when } : {}) },
    }).catch(() => {});
  } else if (type === "reject") {
    await prisma.candidate.update({ where: { id: cand.id }, data: { status: "rejected" } }).catch(() => {});
  }

  return NextResponse.json({ sentOk: true, sentTo: cand.email });
}
