import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Task { title: string; done: boolean; doneAt: string | null }

// POST /api/kiosk/checklists/[id]/confirm
// body: { slug, employeeId, tasks: Task[] }
// Public (kiosk): nhân viên đã quét mặt -> tự tích từng mục -> xác nhận đã nhận bàn giao.
// Lưu trạng thái tick + đánh dấu confirmedAt. Nếu tất cả mục đã tick -> status "done".
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { slug?: string; employeeId?: string; tasks?: Task[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { slug, employeeId, tasks } = body;
  if (!slug || !employeeId || !Array.isArray(tasks)) {
    return NextResponse.json({ error: "Thiếu slug, employeeId hoặc tasks" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({ where: { slug }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "Không tìm thấy công ty" }, { status: 404 });

  // Checklist phải thuộc đúng công ty VÀ đúng nhân viên vừa quét mặt
  const checklist = await prisma.employeeChecklist.findFirst({
    where: { id: params.id, companyId: company.id, employeeId },
  });
  if (!checklist) {
    return NextResponse.json({ error: "Không tìm thấy checklist của bạn" }, { status: 404 });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const normalized: Task[] = tasks.map((t) => ({
    title: String(t.title ?? ""),
    done: Boolean(t.done),
    doneAt: t.done ? (t.doneAt ?? nowIso) : null,
  }));

  const allDone = normalized.length > 0 && normalized.every((t) => t.done);

  await prisma.employeeChecklist.updateMany({
    where: { id: params.id, companyId: company.id, employeeId },
    data: {
      tasks: JSON.stringify(normalized),
      status: allDone ? "done" : "in_progress",
      confirmedAt: now,
    },
  });

  return NextResponse.json({ ok: true, allDone, confirmedAt: nowIso });
}
