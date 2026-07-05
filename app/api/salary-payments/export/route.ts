import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTax } from "@/lib/taxCalculator";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner" && user.role !== "accountant") {
    return NextResponse.json({ error: "Chỉ admin và kế toán mới xuất được dữ liệu lương." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
  const filter = searchParams.get("filter") ?? "all"; // "all" | "unpaid"
  // Chỉ owner/accountant tới được đây → xem toàn công ty (không lọc chi nhánh)
  const scopedBranchId: string | null = null;

  let advances: { employeeId: string; amount: number }[] = [];
  try {
    advances = await prisma.salaryAdvance.findMany({
      where: { companyId: user.companyId, year, month, status: "approved" },
      select: { employeeId: true, amount: true },
    });
  } catch { /* table not migrated yet */ }

  const [employees, payments] = await Promise.all([
    prisma.employee.findMany({
      where: {
        companyId: user.companyId,
        status: "active",
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, code: true, department: true,
        bankName: true, bankAccount: true, bankBranch: true,
        baseSalary: true, dependents: true,
        branch: { select: { name: true } },
        summaries: {
          where: { year, month },
          select: { totalPenalty: true, totalReward: true, totalOvertimeAmount: true },
        },
      },
    }),
    prisma.salaryPayment.findMany({
      where: { companyId: user.companyId, year, month },
      select: { employeeId: true, status: true },
    }),
  ]);

  const advanceMap = new Map<string, number>();
  for (const a of advances) {
    advanceMap.set(a.employeeId, (advanceMap.get(a.employeeId) ?? 0) + a.amount);
  }
  const paidSet = new Set(payments.filter((p) => p.status === "paid").map((p) => p.employeeId));

  const rows = employees
    .filter((e) => filter === "all" || !paidSet.has(e.id))
    .map((e) => {
      const s = e.summaries[0];
      const base    = e.baseSalary ?? 0;
      const penalty = s?.totalPenalty ?? 0;
      const reward  = s?.totalReward ?? 0;
      const overtime = s?.totalOvertimeAmount ?? 0;
      const gross   = base - penalty + reward + overtime;
      const tax     = calculateTax({ baseSalary: base, grossIncome: gross, dependents: e.dependents ?? 0 });
      const advance = advanceMap.get(e.id) ?? 0;
      const netAfterAdvance = Math.max(0, tax.netTakeHome - advance);

      return {
        "Mã NV":           e.code,
        "Họ và tên":       e.name,
        "Phòng ban":       e.department ?? "",
        "Chi nhánh":       e.branch.name,
        "Ngân hàng":       e.bankName ?? "",
        "Số tài khoản":    e.bankAccount ?? "",
        "Chi nhánh NH":    e.bankBranch ?? "",
        "Lương cơ bản":    base,
        "Tạm ứng":         advance,
        "Thực nhận (CK)":  netAfterAdvance,
        "Nội dung CK":     `TRALG T${month}/${year} ${e.code}`,
      };
    });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Widen columns
  ws["!cols"] = [
    { wch: 8 }, { wch: 24 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 18 }, { wch: 16 },
    { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 28 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Chi luong T${month}-${year}`);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filterLabel = filter === "unpaid" ? "chua-tra" : "tat-ca";
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="chuyen-khoan-T${month}-${year}-${filterLabel}.xlsx"`,
    },
  });
}
