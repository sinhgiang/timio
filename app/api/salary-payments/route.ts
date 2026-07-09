import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeBranchWhere, employeeInScope } from "@/lib/branchScope";
import { notifyWorkerByEmployee } from "@/lib/workerNotify";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sUser = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = sUser?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sUser?.role === "manager") return NextResponse.json({ error: "Quản lý không xem được dữ liệu lương." }, { status: 403 });

  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));
  if (!year || !month) return NextResponse.json({ error: "Thiếu year/month" }, { status: 400 });

  try {
    const payments = await prisma.salaryPayment.findMany({
      where: { companyId, year, month, ...employeeBranchWhere(sUser) },
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
  const sUser = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = sUser?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sUser?.role === "manager") return NextResponse.json({ error: "Quản lý không được thao tác dữ liệu lương." }, { status: 403 });

  const { employeeId, year, month, amount, status, note } = await req.json();
  if (!employeeId || !year || !month) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  if (!(await employeeInScope(sUser, employeeId))) {
    return NextResponse.json({ error: "Nhân viên không thuộc chi nhánh của bạn." }, { status: 403 });
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
    if (isPaid) {
      void notifyWorkerByEmployee(employeeId, {
        type: "salary", title: `Công ty đã trả lương tháng ${month}/${year}`,
        body: amount ? `Số tiền ${Number(amount).toLocaleString("vi-VN")}đ đã được chi trả.` : "Lương của bạn đã được chi trả.",
        link: "income", email: true,
      });
    }
    return NextResponse.json(payment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "DB error", detail: msg }, { status: 500 });
  }
}
