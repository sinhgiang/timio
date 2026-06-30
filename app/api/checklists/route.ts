import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/checklists?type=onboarding|offboarding  → list templates
// GET /api/checklists?employeeId=...               → list employee checklists
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const employeeId = searchParams.get("employeeId");

  if (employeeId) {
    const checklists = await prisma.employeeChecklist.findMany({
      where: { companyId, employeeId },
      include: { template: true, employee: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(checklists);
  }

  if (searchParams.has("templates")) {
    const templates = await prisma.checklistTemplate.findMany({
      where: { companyId, ...(type ? { type } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  }

  const checklists = await prisma.employeeChecklist.findMany({
    where: { companyId, ...(type ? { type } : {}) },
    include: { template: true, employee: { select: { id: true, name: true, code: true, department: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(checklists);
}

// POST /api/checklists + body.isTemplate=true → create template
// POST /api/checklists → assign checklist to employee
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.isTemplate) {
    const { type, name, tasks } = body;
    if (!type || !name || !tasks) return NextResponse.json({ error: "Thiếu thông tin template" }, { status: 400 });
    const tpl = await prisma.checklistTemplate.create({
      data: { companyId, type, name, tasks: JSON.stringify(tasks) },
    });
    return NextResponse.json(tpl, { status: 201 });
  }

  // Assign to employee
  const { employeeId, templateId, dueDate } = body;
  if (!employeeId || !templateId) return NextResponse.json({ error: "Thiếu employeeId hoặc templateId" }, { status: 400 });

  const tpl = await prisma.checklistTemplate.findFirst({ where: { id: templateId, companyId } });
  if (!tpl) return NextResponse.json({ error: "Template không tồn tại" }, { status: 404 });

  const rawTasks: string[] = JSON.parse(tpl.tasks);
  const tasks = rawTasks.map((title) => ({ title, done: false, doneAt: null }));

  const checklist = await prisma.employeeChecklist.create({
    data: {
      companyId,
      employeeId,
      templateId,
      type: tpl.type,
      tasks: JSON.stringify(tasks),
      dueDate: dueDate || null,
    },
    include: { template: true, employee: { select: { id: true, name: true, code: true } } },
  });

  return NextResponse.json(checklist, { status: 201 });
}
