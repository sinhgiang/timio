import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTax } from "@/lib/taxCalculator";
import { scopedBranchId as scopedBranchIdFn } from "@/lib/branchScope";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner" && user.role !== "accountant") {
    return NextResponse.json({ error: "Chỉ admin và kế toán mới xuất được bảng lương." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
  // Owner + tổng kế toán → toàn công ty (null); kế toán chi nhánh → chỉ chi nhánh mình
  const scopedBranchId = scopedBranchIdFn(user);

  const [employees, company] = await Promise.all([
    prisma.employee.findMany({
      where: {
        companyId: user.companyId,
        status: "active",
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, code: true, department: true, position: true,
        baseSalary: true, dependents: true,
        branch: { select: { name: true } },
        summaries: {
          where: { year, month },
          select: {
            daysPresent: true, daysLate: true, daysAbsent: true,
            totalMinutesLate: true, totalPenalty: true, totalReward: true,
            totalOvertimeAmount: true, totalMinutesOvertime: true,
          },
        },
      },
    }),
    prisma.company.findUnique({ where: { id: user.companyId }, select: { name: true } }),
  ]);

  const rows = employees.map((e) => {
    const s = e.summaries[0];
    const base    = e.baseSalary ?? 0;
    const penalty = s?.totalPenalty ?? 0;
    const reward  = s?.totalReward ?? 0;
    const overtime = s?.totalOvertimeAmount ?? 0;
    const gross   = base - penalty + reward + overtime;
    const tax     = calculateTax({ baseSalary: base, grossIncome: gross, dependents: e.dependents ?? 0 });

    return {
      "Mã NV":              e.code,
      "Họ và tên":          e.name,
      "Phòng ban":          e.department ?? "",
      "Chức vụ":            e.position ?? "",
      "Chi nhánh":          e.branch.name,
      "Lương cơ bản":       base,
      "Ngày công":          s?.daysPresent ?? 0,
      "Ngày trễ":           s?.daysLate ?? 0,
      "Ngày vắng":          s?.daysAbsent ?? 0,
      "Phụ cấp / Thưởng":  reward,
      "Tăng ca":            overtime,
      "Phạt":               penalty,
      "Thu nhập gộp":       gross,
      "BHXH+BHYT+BHTN (10.5%)": tax.bhxhEmployee,
      "Thuế TNCN":          tax.tncn,
      "Thực nhận":          tax.netTakeHome,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 8 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 22 }, { wch: 14 }, { wch: 14 },
  ];

  // Bold header row
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellAddr]) ws[cellAddr].s = { font: { bold: true } };
  }

  const wb = XLSX.utils.book_new();
  const sheetName = `Bảng lương T${month}-${year}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const companySlug = (company?.name ?? "timio").toLowerCase().replace(/\s+/g, "-");

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bang-luong-T${month}-${year}-${companySlug}.xlsx"`,
    },
  });
}
