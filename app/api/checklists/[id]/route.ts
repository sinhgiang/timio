import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH: update task completion or overall status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.isTemplate) {
    // Update template
    await prisma.checklistTemplate.updateMany({
      where: { id: params.id, companyId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.tasks !== undefined && { tasks: JSON.stringify(body.tasks) }),
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Update employee checklist tasks
  const { tasks, status } = body;
  const checklist = await prisma.employeeChecklist.findFirst({ where: { id: params.id, companyId } });
  if (!checklist) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const now = new Date().toISOString();
  let updatedTasks = tasks;
  if (tasks) {
    updatedTasks = tasks.map((t: { title: string; done: boolean; doneAt: string | null }) => ({
      ...t,
      doneAt: t.done && !t.doneAt ? now : t.doneAt,
    }));
  }

  const allDone = updatedTasks ? updatedTasks.every((t: { done: boolean }) => t.done) : false;

  await prisma.employeeChecklist.updateMany({
    where: { id: params.id, companyId },
    data: {
      ...(updatedTasks !== undefined && { tasks: JSON.stringify(updatedTasks) }),
      status: status || (allDone ? "done" : "in_progress"),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  if (searchParams.get("isTemplate") === "true") {
    await prisma.checklistTemplate.deleteMany({ where: { id: params.id, companyId } });
  } else {
    await prisma.employeeChecklist.deleteMany({ where: { id: params.id, companyId } });
  }
  return NextResponse.json({ ok: true });
}
