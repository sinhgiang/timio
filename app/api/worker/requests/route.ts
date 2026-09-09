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
  holiday: "Nghỉ lễ",
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
    prisma.leaveRequest.findMany({ where: { employeeId: { in: empIds } }, include: { holiday: { select: { name: true, description: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.earlyLeaveRequest.findMany({ where: { employeeId: { in: empIds } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.correctionRequest.findMany({ where: { employeeId: { in: empIds } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.overtimeRequest.findMany({ where: { employeeId: { in: empIds } }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  type Row = { id: string; kind: string; kindLabel: string; when: string; detail: string; status: string; note: string | null; companyName: string; createdAt: string };
  const rows: Row[] = [];
  for (const l of leaves) {
    const isHoliday = l.type === "holiday";
    const pickedDates = isHoliday && l.dates ? (JSON.parse(l.dates) as string[]) : null;
    const label = isHoliday && l.holiday?.name ? `${LEAVE_TYPE_LABELS[l.type]} · ${l.holiday.name}` : (LEAVE_TYPE_LABELS[l.type] ?? l.type);
    // Nghỉ lễ tự chọn không thu "Lý do" từ NV — dùng mô tả chi tiết đợt lễ (sếp khai) thay thế, để
    // danh sách đơn không hiện trống trơn.
    const extra = l.reason || (isHoliday ? l.holiday?.description : null);
    rows.push({ id: l.id, kind: "leave", kindLabel: "Nghỉ phép", when: pickedDates ? pickedDates.join(", ") : `${l.fromDate} → ${l.toDate}`, detail: `${label} · ${l.days} ngày${extra ? " · " + extra : ""}`, status: l.status, note: l.note, companyName: coByEmp.get(l.employeeId) ?? "", createdAt: l.createdAt.toISOString() });
  }
  for (const e of earlies) {
    const isLateArrival = e.kind === "late_arrival";
    rows.push({
      id: e.id,
      kind: isLateArrival ? "late_arrival" : "early_leave",
      kindLabel: isLateArrival ? "Đến muộn" : "Về sớm",
      when: e.date,
      detail: `${isLateArrival ? "Đến lúc" : "Về lúc"} ${e.leaveTime}${e.reason ? " · " + e.reason : ""}`,
      status: e.status, note: e.note, companyName: coByEmp.get(e.employeeId) ?? "", createdAt: e.createdAt.toISOString(),
    });
  }
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
    if (kind === "holiday") {
      // Nghỉ lễ tự chọn (Holiday.mode="flexible"): NV chọn ngày cụ thể trong khoảng công ty cho
      // phép, tối đa Holiday.maxDays ngày — có thể chọn rời rạc, không nhất thiết liền kề.
      const holidayId = clip(body.holidayId, 50);
      if (!holidayId) return NextResponse.json({ error: "Chọn đợt nghỉ lễ." }, { status: 400 });
      const datesRaw: unknown[] = Array.isArray(body.dates) ? body.dates : [];
      const dates = Array.from(new Set(datesRaw.map((d) => clip(d, 10)).filter(Boolean))).sort();
      if (dates.length === 0) return NextResponse.json({ error: "Chọn ít nhất 1 ngày muốn nghỉ." }, { status: 400 });

      const holiday = await prisma.holiday.findFirst({ where: { id: holidayId, companyId: target.companyId, mode: "flexible" } });
      if (!holiday) return NextResponse.json({ error: "Không tìm thấy đợt nghỉ lễ này." }, { status: 404 });
      // holiday.date/endDate giờ chỉ là ngày neo nội bộ (sếp không còn khai "Từ ngày"/"Đến ngày"
      // — xem findFreeAnchorDate ở lib/holidayAttendance.ts), KHÔNG phải khoảng NV được chọn thật.
      // Khoảng thật = từ hôm nay tới hết năm mà đợt này thuộc về — PHẢI tính giống hệt
      // /api/worker/holidays (GET) để FE và validate server khớp nhau, tránh NV chọn được ở FE
      // nhưng gửi lên lại bị từ chối "không nằm trong khoảng".
      const year = holiday.date.slice(0, 4);
      const jan1 = `${year}-01-01`;
      const dec31 = `${year}-12-31`;
      const todayStr = new Date().toISOString().slice(0, 10);
      const rangeStart = todayStr > jan1 ? todayStr : jan1;
      const rangeEnd = dec31;
      const outOfRange = dates.find((d) => d < rangeStart || d > rangeEnd);
      if (outOfRange) return NextResponse.json({ error: `Ngày ${outOfRange} không hợp lệ — chỉ được chọn từ ${rangeStart} đến ${rangeEnd}.` }, { status: 400 });

      if (holiday.maxDays != null) {
        const existingUsed = await prisma.leaveRequest.findMany({
          where: { holidayId: holiday.id, employeeId: target.id, status: { in: ["pending", "approved"] } },
          select: { dates: true },
        });
        const usedDates = new Set<string>();
        for (const r of existingUsed) if (r.dates) (JSON.parse(r.dates) as string[]).forEach((d) => usedDates.add(d));
        const dup = dates.find((d) => usedDates.has(d));
        if (dup) return NextResponse.json({ error: `Bạn đã chọn ngày ${dup} rồi (đang chờ hoặc đã duyệt).` }, { status: 400 });
        if (usedDates.size + dates.length > holiday.maxDays) {
          return NextResponse.json({ error: `Chỉ được chọn tối đa ${holiday.maxDays} ngày cho đợt lễ này (đã dùng ${usedDates.size} ngày).` }, { status: 400 });
        }
      }

      const created = await prisma.leaveRequest.create({
        data: {
          employeeId: target.id, companyId: target.companyId, type: "holiday",
          fromDate: dates[0], toDate: dates[dates.length - 1], days: dates.length,
          dates: JSON.stringify(dates), holidayId: holiday.id,
          reason: clip(body.reason, 300) || null, status: "pending",
        },
      });
      return NextResponse.json({ ok: true, id: created.id });
    }
    if (kind === "early_leave" || kind === "late_arrival") {
      // 2 loại đơn dùng chung 1 model (EarlyLeaveRequest.kind) — leaveTime nghĩa khác nhau tùy kind
      // (giờ muốn về sớm | giờ dự kiến đến muộn), xem lib/approvedException.ts.
      const date = clip(body.date, 10), leaveTime = clip(body.leaveTime, 5);
      const isLateArrival = kind === "late_arrival";
      if (!date || !leaveTime) return NextResponse.json({ error: `Chọn ngày và giờ ${isLateArrival ? "dự kiến đến" : "về sớm"}.` }, { status: 400 });
      const created = await prisma.earlyLeaveRequest.create({
        data: { companyId: target.companyId, employeeId: target.id, date, leaveTime, kind, reason: clip(body.reason, 300) || null, status: "pending" },
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
