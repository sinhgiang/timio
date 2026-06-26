import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));
  if (!year || !month) return NextResponse.json({ error: "Thiếu year/month" }, { status: 400 });

  try {
    const payments = await prisma.salaryPayment.findMany({
      where: { companyId, year, month },
      select: { employeeId: true, status: true, paidAt: true, amount: true, note: true },
    });
    return NextResponse.json(payments);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "DB error", detail: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, year, month, amount, status, note } = await req.json();
  if (!employeeId || !year || !month) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  const isPaid = (status ?? "paid") === "paid";

  try {
    const payment = await prisma.salaryPayment.upsert({
      where: { employeeId_year_month: { employeeId, year, month } },
      create: {
        companyId,
        employeeId,
        year,
        month,
        amount: amount ?? 0,
        status: isPaid ? "paid" : "unpaid",
        paidAt: isPaid ? new Date() : null,
        note: note ?? null,
      },
      update: {
        amount: amount !== undefined ? amount : undefined,
        status: isPaid ? "paid" : "unpaid",
        paidAt: isPaid ? new Date() : null,
        note: note !== undefined ? note : undefined,
      },
    });
    return NextResponse.json(payment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "DB error", detail: msg }, { status: 500 });
  }
}
