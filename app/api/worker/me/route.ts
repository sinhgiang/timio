import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — hồ sơ nhân viên + danh sách công ty đang/đã làm
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const wa = await prisma.workerAccount.findUnique({
    where: { id },
    select: { id: true, name: true, phone: true, email: true, avatarUrl: true, consentFinanceAt: true, handle: true },
  });
  if (!wa) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });

  const employees = await prisma.employee.findMany({
    where: { workerAccountId: id },
    select: { id: true, status: true, position: true, department: true, company: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    name: wa.name,
    phone: wa.phone,
    email: wa.email,
    avatarUrl: wa.avatarUrl,
    handle: wa.handle,
    consentFinance: !!wa.consentFinanceAt,
    companies: employees.map((e) => ({
      companyName: e.company?.name ?? "Công ty",
      position: e.position,
      department: e.department,
      active: e.status === "active",
    })),
  });
}
