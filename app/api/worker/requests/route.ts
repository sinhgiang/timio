import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Đơn từ của nhân viên — TỰ TẠO + THEO DÕI ngay trong app (không cần quét mặt vì đã đăng nhập).
// Ghi vào ĐÚNG các model đơn mà công ty đang duyệt → đồng bộ 2 chiều.

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Nghỉ phép năm", sick: "Nghỉ ốm", unpaid: "Nghỉ không lương",
  maternity: "Nghỉ thai sản", wedding: "Nghỉ cưới", funeral: "Nghỉ tang", other: "Khác",
};
const CORR_TYPE_LABELS: Record<string, string> = { check_in: "Giờ vào", check_out: "Giờ ra", both: "Cả vào & ra" };
const daysBetween = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);

// GET — liệt kê MỌI đơn của tôi (gộp 4 loại) + danh sách công ty đang làm (để chọn khi tạo đơn)
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const emps = await prisma.employee.findMany({
    where: { workerAccountId: id },
    select: { id: true, companyId: true, status: true, company: { select: { name: true } } },
  });
  if (emps.length === 0) return NextResponse.json({ requests: [], companies: [] });

  const empIds = emps.map((e) => e.id);
  const coByEmp = new Map(emps.map((e) => [e.id, e.company?.name ?? "Công ty"]));

  const [leaves, earlies, corrections, overtimes] = await Promise.all([
    prisma.leaveRequest.findMany({ where: { employeeId: { in: empIds } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.earlyLeaveRequest.findMany({ where: { employeeId: { in: empIds } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.correctionRequest.findMany({ where: { employeeId: { in: empIds } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.overtimeRequest.findMany({ where: { employeeId: { in: empIds } }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  type Row = { id: string; kind: string; kindLabel: string; when: string; detail: string; status: string; note: string | null; companyName: string; createdAt: string };
  const rows: Row[] = [];
  for (const l of leaves) rows.push({ id: l.id, kind: "leave", kindLabel: "Nghỉ phép", when: `${l.fromDate} → ${l.toDate}`, detail: `${LEAVE_TYPE_LABELS[l.type] ?? l.type} · ${l.days} ngày${l.reason ? " · " + l.reason : ""}`, status: l.status, note: l.note, companyName: coByEmp.get(l.employeeId) ?? "", createdAt: l.createdAt.toISOString() });
  for (const e of earlies) rows.push({ id: e.id, kind: "early_leave", kindLabel: "Về sớm", when: e.date, detail: `Về lúc ${e.leaveTime}${e.reason ? " · " + e.reason : ""}`, status: e.status, note: e.note, companyName: coByEmp.get(e.employeeId) ?? "", createdAt: e.createdAt.toISOString() });
  for (const c of corrections) rows.push({ id: c.id, kind: "correction", kindLabel: "Điều chỉnh chấm công", when: c.date, detail: `${CORR_TYPE_LABELS[c.type] ?? c.type}${c.requestedCheckIn ? " · vào " + c.requestedCheckIn : ""}${c.requestedCheckOut ? " · ra " + c.requestedCheckOut : ""} · ${c.reason}`, status: c.status, note: c.adminNote, companyName: coByEmp.get(c.employeeId) ?? "", createdAt: c.createdAt.toISOString() });
  for (const o of overtimes) rows.push({ id: o.id, kind: "overtime", kindLabel: "Tăng ca", when: o.date, detail: `${o.startTime}–${o.endTime} · ${o.hours}g${o.reason ? " · " + o.reason : ""}`, status: o.status, note: o.note, companyName: coByEmp.get(o.employeeId) ?? "", createdAt: o.createdAt.toISOString() });

  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const companies = emps.filter((e) => e.status === "active").map((e) => ({ companyId: e.companyId, companyName: e.company?.name ?? "Công ty" }));
  return NextResponse.json({ requests: rows, companies });
}

// POST — nhân viên tự tạo 1 đơn. body: { kind, companyId?, ...fields }
export async function POST(req: NextRequest) {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || "");
  const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

  // Xác định nhân viên đang làm (verify chủ sở hữu) — theo công ty được chọn, mặc định công ty đầu tiên
  const emps = await prisma.employee.findMany({ where: { workerAccountId: id, status: "active" }, select: { id: true, companyId: true } });
  if (emps.length === 0) return NextResponse.json({ error: "Bạn chưa được công ty nào xác nhận là nhân viên đang làm." }, { status: 400 });
  const target = body.companyId ? emps.find((e) => e.companyId === body.companyId) : emps[0];
  if (!target) return NextResponse.json({ error: "Không tìm thấy công ty phù hợp." }, { status: 400 });

  try {
    if (kind === "leave") {
      const fromDate = clip(body.fromDate, 10), toDate = clip(body.toDate, 10);
      if (!fromDate || !toDate) return NextResponse.json({ error: "Chọn ngày bắt đầu và kết thúc." }, { status: 400 });
      if (toDate < fromDate) return NextResponse.json({ error: "Ngày kết thúc phải sau ngày bắt đầu." }, { status: 400 });
      const created = await prisma.leaveRequest.create({
        data: { employeeId: target.id, companyId: target.companyId, type: clip(body.type, 20) || "annual", fromDate, toDate, days: daysBetween(fromDate, toDate), reason: clip(body.reason, 300) || null, status: "pending" },
      });
      return NextResponse.json({ ok: true, id: created.id });
    }
    if (kind === "early_leave") {
      const date = clip(body.date, 10), leaveTime = clip(body.leaveTime, 5);
      if (!date || !leaveTime) return NextResponse.json({ error: "Chọn ngày và giờ về sớm." }, { status: 400 });
      const created = await prisma.earlyLeaveRequest.create({
        data: { companyId: target.companyId, employeeId: target.id, date, leaveTime, reason: clip(body.reason, 300) || null, status: "pending" },
      });
      return NextResponse.json({ ok: true, id: created.id });
    }
    if (kind === "correction") {
      const date = clip(body.date, 10), type = clip(body.type, 12) || "check_in", reason = clip(body.reason, 300);
      if (!date) return NextResponse.json({ error: "Chọn ngày cần điều chỉnh." }, { status: 400 });
      if (!reason) return NextResponse.json({ error: "Nhập lý do điều chỉnh." }, { status: 400 });
      const dup = await prisma.correctionRequest.findFirst({ where: { employeeId: target.id, date, type, status: "pending" }, select: { id: true } });
      if (dup) return NextResponse.json({ error: "Bạn đã có đơn điều chỉnh chờ duyệt cho ngày & loại này." }, { status: 400 });
      const created = await prisma.correctionRequest.create({
        data: { employeeId: target.id, date, type, requestedCheckIn: clip(body.requestedCheckIn, 5) || null, requestedCheckOut: clip(body.requestedCheckOut, 5) || null, reason, status: "pending" },
      });
      return NextResponse.json({ ok: true, id: created.id });
    }
    if (kind === "overtime") {
      const date = clip(body.date, 10), startTime = clip(body.startTime, 5), endTime = clip(body.endTime, 5);
      if (!date || !startTime || !endTime) return NextResponse.json({ error: "Nhập ngày, giờ bắt đầu và kết thúc." }, { status: 400 });
      const hours = Math.max(0, Math.min(24, Number(body.hours) || 0));
      const created = await prisma.overtimeRequest.create({
        data: { companyId: target.companyId, employeeId: target.id, date, startTime, endTime, hours, reason: clip(body.reason, 300) || null, status: "pending" },
      });
      return NextResponse.json({ ok: true, id: created.id });
    }
    return NextResponse.json({ error: "Loại đơn không hợp lệ." }, { status: 400 });
  } catch (e) {
    console.error("[worker/requests] POST lỗi:", e);
    return NextResponse.json({ error: "Không tạo được đơn." }, { status: 500 });
  }
}
