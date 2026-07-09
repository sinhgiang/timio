import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Task { title: string; done: boolean; doneAt: string | null }
interface AssetItem { assetId: string; code: string; name: string; action: "transfer" | "recall"; done?: boolean }

// POST /api/kiosk/checklists/[id]/confirm  body: { slug, employeeId, tasks }
// Người vừa quét mặt xác nhận. Tự suy vai trò từ employeeId:
//  - self  : như cũ (set confirmedAt, done nếu tick hết)
//  - giver : người nghỉ xác nhận GIAO → set giverConfirmedAt
//  - receiver: người kế nhiệm xác nhận NHẬN (chỉ khi giver đã giao) → set receiverConfirmedAt,
//              XỬ LÝ TÀI SẢN (transfer sang người nhận / recall về công ty), rồi status = done.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { slug?: string; employeeId?: string; tasks?: Task[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 }); }
  const { slug, employeeId, tasks } = body;
  if (!slug || !employeeId || !Array.isArray(tasks)) return NextResponse.json({ error: "Thiếu slug, employeeId hoặc tasks" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { slug }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });

  const cl = await prisma.employeeChecklist.findFirst({ where: { id: params.id, companyId: company.id } });
  if (!cl) return NextResponse.json({ error: "Không tìm thấy checklist" }, { status: 404 });

  const isHandover = !!cl.handoverToEmployeeId;
  const isGiver = cl.employeeId === employeeId;
  const isReceiver = cl.handoverToEmployeeId === employeeId;
  if (!isGiver && !isReceiver) return NextResponse.json({ error: "Đây không phải bàn giao của bạn." }, { status: 403 });

  const now = new Date();
  const nowIso = now.toISOString();
  const normalized: Task[] = tasks.map((t) => ({ title: String(t.title ?? ""), done: Boolean(t.done), doneAt: t.done ? (t.doneAt ?? nowIso) : null }));
  const allTicked = normalized.length === 0 || normalized.every((t) => t.done);

  // ── Không phải bàn giao 2 chiều → giữ nguyên hành vi cũ ──
  if (!isHandover) {
    await prisma.employeeChecklist.update({ where: { id: cl.id }, data: { tasks: JSON.stringify(normalized), status: allTicked ? "done" : "in_progress", confirmedAt: now } });
    return NextResponse.json({ ok: true, role: "self", allDone: allTicked });
  }

  // ── GIVER: người nghỉ xác nhận GIAO ──
  if (isGiver) {
    await prisma.employeeChecklist.update({ where: { id: cl.id }, data: { tasks: JSON.stringify(normalized), giverConfirmedAt: now } });
    return NextResponse.json({ ok: true, role: "giver", waitingReceiver: !cl.receiverConfirmedAt });
  }

  // ── RECEIVER: người kế nhiệm xác nhận NHẬN ──
  if (!cl.giverConfirmedAt) return NextResponse.json({ error: "Người bàn giao chưa xác nhận giao. Vui lòng đợi họ quét mặt trước." }, { status: 409 });

  // Xử lý tài sản theo action đã cấu hình
  let assets: AssetItem[] = [];
  try { assets = cl.assets ? JSON.parse(cl.assets) : []; } catch { assets = []; }
  for (const a of assets) {
    if (!a.assetId) continue;
    if (a.action === "transfer") {
      await prisma.asset.updateMany({ where: { id: a.assetId, companyId: company.id }, data: { employeeId: cl.handoverToEmployeeId, assignedAt: now, returnedAt: null, status: "assigned" } });
    } else {
      await prisma.asset.updateMany({ where: { id: a.assetId, companyId: company.id }, data: { employeeId: null, returnedAt: now, status: "available" } });
    }
    a.done = true;
  }

  await prisma.employeeChecklist.update({
    where: { id: cl.id },
    data: { tasks: JSON.stringify(normalized), assets: JSON.stringify(assets), receiverConfirmedAt: now, confirmedAt: now, status: "done" },
  });
  return NextResponse.json({ ok: true, role: "receiver", allDone: true, assetsProcessed: assets.length });
}
