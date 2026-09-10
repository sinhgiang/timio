import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export type NotifType = "recruiter" | "leave" | "correction" | "advance" | "salary" | "announcement" | "generic";
export interface NotifPayload { type: NotifType; title: string; body?: string; link?: string; email?: boolean }

function emailHtml(name: string, title: string, body?: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
    <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);color:#fff;padding:20px 24px;border-radius:14px 14px 0 0">
      <b style="font-size:16px">Timio</b>
    </div>
    <div style="border:1px solid #eee;border-top:none;padding:22px 24px;border-radius:0 0 14px 14px">
      <p style="margin:0 0 6px;color:#111;font-size:16px;font-weight:600">${title}</p>
      ${body ? `<p style="margin:0;color:#555;font-size:14px;line-height:1.5">${body}</p>` : ""}
      <p style="margin:18px 0 0;font-size:12px;color:#999">Xin chào ${name}, bạn nhận email này từ app nhân viên Timio.</p>
    </div>
  </div>`;
}

// Gửi thông báo cho 1 tài khoản nhân viên (in-app; kèm email nếu email=true và NV có email). Fire-and-forget.
export async function notifyWorkerById(workerAccountId: string, n: NotifPayload): Promise<void> {
  try {
    await prisma.workerNotification.create({
      data: { workerAccountId, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null },
    });
    if (n.email) {
      const wa = await prisma.workerAccount.findUnique({ where: { id: workerAccountId }, select: { email: true, name: true } });
      if (wa?.email) await sendEmail({ to: wa.email, subject: `Timio · ${n.title}`, html: emailHtml(wa.name, n.title, n.body) }).catch(() => {});
    }
  } catch { /* không chặn hành động chính */ }
}

// Gửi theo employeeId (tự tìm workerAccount gắn với nhân viên đó).
export async function notifyWorkerByEmployee(employeeId: string, n: NotifPayload): Promise<void> {
  try {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { workerAccountId: true } });
    if (emp?.workerAccountId) await notifyWorkerById(emp.workerAccountId, n);
  } catch { /* */ }
}

// Sếp đăng bản tin mới → báo cho TẤT CẢ nhân viên đang làm việc của công ty đó (đã có tài
// khoản NV trên app). Không gửi email (tránh spam mỗi lần đăng bài) — chỉ chuông in-app,
// người dùng bấm vào là đánh dấu đã đọc và số trên chuông tự mất (xem PATCH
// /api/worker/notifications), không hiện lại nữa. 1 workerAccount có thể gắn nhiều Employee
// trong cùng công ty (hiếm) → dedupe theo workerAccountId để khỏi bắn trùng thông báo.
export async function notifyCompanyAnnouncement(companyId: string, announcementTitle: string): Promise<void> {
  try {
    const emps = await prisma.employee.findMany({
      where: { companyId, status: "active", workerAccountId: { not: null } },
      select: { workerAccountId: true },
    });
    const workerAccountIds = Array.from(new Set(emps.map((e) => e.workerAccountId).filter((v): v is string => !!v)));
    if (!workerAccountIds.length) return;
    await prisma.workerNotification.createMany({
      data: workerAccountIds.map((workerAccountId) => ({
        workerAccountId,
        type: "announcement",
        title: "Bản tin công ty mới",
        body: announcementTitle,
        link: "announcements",
      })),
    });
  } catch { /* không chặn hành động chính */ }
}
