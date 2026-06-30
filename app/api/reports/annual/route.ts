import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthRow {
  month: number;
  totalEmployees: number;
  avgPresent: number;
  avgLate: number;
  totalPenalty: number;
  totalOT: number;        // sum OT hours (minutes / 60)
  totalSalary: number;    // sum from SalaryPayment
}

interface TopEntry {
  name: string;
  code: string;
  totalDaysLate: number;
}

interface TopAbsentEntry {
  name: string;
  code: string;
  totalDaysAbsent: number;
}

interface AnnualReport {
  year: number;
  months: MonthRow[];
  topLate: TopEntry[];
  topAbsent: TopAbsentEntry[];
}

// ─── Excel helpers ────────────────────────────────────────────────────────────

const C = {
  navyBg:   "1E3A5F",
  blueBg:   "1D4ED8",
  blueLight:"EFF6FF",
  gray50:   "FAFAFA",
  white:    "FFFFFF",
  green:    "16A34A",
  orange:   "D97706",
  red:      "DC2626",
};

function applyHeaderStyle(cell: ExcelJS.Cell, bgColor = C.blueBg) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
  cell.font = { bold: true, color: { argb: C.white }, size: 11 };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top:    { style: "thin", color: { argb: "CCCCCC" } },
    bottom: { style: "thin", color: { argb: "CCCCCC" } },
    left:   { style: "thin", color: { argb: "CCCCCC" } },
    right:  { style: "thin", color: { argb: "CCCCCC" } },
  };
}

function applyDataBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top:    { style: "thin", color: { argb: "E5E7EB" } },
    bottom: { style: "thin", color: { argb: "E5E7EB" } },
    left:   { style: "thin", color: { argb: "E5E7EB" } },
    right:  { style: "thin", color: { argb: "E5E7EB" } },
  };
}

const MONTH_VI = [
  "Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
  "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12",
];

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string; branchId?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
    const format = searchParams.get("format") ?? null;

    if (isNaN(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    // Fetch all monthly summaries for year, all employees in company
    const [summaries, salaryPayments, employees] = await Promise.all([
      prisma.monthlySummary.findMany({
        where: { employee: { companyId }, year },
        select: {
          employeeId: true,
          month: true,
          daysPresent: true,
          daysLate: true,
          daysAbsent: true,
          totalPenalty: true,
          totalMinutesOvertime: true,
          employee: { select: { name: true, code: true } },
        },
      }),
      prisma.salaryPayment.findMany({
        where: { companyId, year },
        select: { month: true, amount: true, status: true },
      }),
      prisma.employee.findMany({
        where: { companyId, status: "active" },
        select: { id: true },
      }),
    ]);

    const totalEmployees = employees.length;

    // Build per-month aggregation
    const monthMap = new Map<number, {
      employeeIds: Set<string>;
      totalPresent: number;
      totalLate: number;
      totalPenalty: number;
      totalMinutesOT: number;
    }>();

    for (let m = 1; m <= 12; m++) {
      monthMap.set(m, {
        employeeIds: new Set(),
        totalPresent: 0,
        totalLate: 0,
        totalPenalty: 0,
        totalMinutesOT: 0,
      });
    }

    for (const s of summaries) {
      const mm = monthMap.get(s.month);
      if (!mm) continue;
      mm.employeeIds.add(s.employeeId);
      mm.totalPresent += s.daysPresent;
      mm.totalLate += s.daysLate;
      mm.totalPenalty += s.totalPenalty;
      mm.totalMinutesOT += s.totalMinutesOvertime;
    }

    // Build salary per month
    const salaryByMonth = new Map<number, number>();
    for (const sp of salaryPayments) {
      salaryByMonth.set(sp.month, (salaryByMonth.get(sp.month) ?? 0) + sp.amount);
    }

    const months: MonthRow[] = [];
    for (let m = 1; m <= 12; m++) {
      const mm = monthMap.get(m)!;
      const empCount = mm.employeeIds.size || totalEmployees || 1;
      months.push({
        month: m,
        totalEmployees: mm.employeeIds.size,
        avgPresent: mm.employeeIds.size > 0 ? Math.round((mm.totalPresent / empCount) * 10) / 10 : 0,
        avgLate: mm.employeeIds.size > 0 ? Math.round((mm.totalLate / empCount) * 10) / 10 : 0,
        totalPenalty: mm.totalPenalty,
        totalOT: Math.round((mm.totalMinutesOT / 60) * 10) / 10,
        totalSalary: salaryByMonth.get(m) ?? 0,
      });
    }

    // Top 5 late across all summaries in this year
    const lateByEmp = new Map<string, { name: string; code: string; total: number }>();
    for (const s of summaries) {
      if (!lateByEmp.has(s.employeeId)) {
        lateByEmp.set(s.employeeId, { name: s.employee.name, code: s.employee.code, total: 0 });
      }
      lateByEmp.get(s.employeeId)!.total += s.daysLate;
    }
    const topLate: TopEntry[] = Array.from(lateByEmp.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((e) => ({ name: e.name, code: e.code, totalDaysLate: e.total }));

    // Top 5 absent
    const absentByEmp = new Map<string, { name: string; code: string; total: number }>();
    for (const s of summaries) {
      if (!absentByEmp.has(s.employeeId)) {
        absentByEmp.set(s.employeeId, { name: s.employee.name, code: s.employee.code, total: 0 });
      }
      absentByEmp.get(s.employeeId)!.total += s.daysAbsent;
    }
    const topAbsent: TopAbsentEntry[] = Array.from(absentByEmp.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((e) => ({ name: e.name, code: e.code, totalDaysAbsent: e.total }));

    const report: AnnualReport = { year, months, topLate, topAbsent };

    // ── Excel export ─────────────────────────────────────────────────────────
    if (format === "excel") {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Timio";

      // Sheet 1: Monthly summary
      const ws1 = wb.addWorksheet(`Tổng kết năm ${year}`);
      ws1.columns = [
        { width: 14 },  // Tháng
        { width: 14 },  // NV có mặt TB
        { width: 12 },  // NV trễ TB
        { width: 18 },  // Tổng phạt
        { width: 12 },  // Tổng OT (h)
        { width: 20 },  // Tổng lương đã trả
      ];

      ws1.mergeCells(1, 1, 1, 6);
      const t1 = ws1.getCell("A1");
      t1.value = `TỔNG KẾT NĂM ${year}`;
      t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navyBg } };
      t1.font = { bold: true, color: { argb: C.white }, size: 14 };
      t1.alignment = { horizontal: "center", vertical: "middle" };
      ws1.getRow(1).height = 32;

      const h1 = ws1.getRow(2);
      ["Tháng", "NV có mặt TB", "NV trễ TB", "Tổng phạt (đ)", "Tổng OT (giờ)", "Tổng lương đã trả (đ)"].forEach((h, i) => {
        const cell = h1.getCell(i + 1);
        cell.value = h;
        applyHeaderStyle(cell);
      });
      h1.height = 22;

      months.forEach((m, idx) => {
        const row = ws1.addRow([
          MONTH_VI[m.month - 1],
          m.avgPresent, m.avgLate,
          m.totalPenalty, m.totalOT, m.totalSalary,
        ]);
        row.height = 18;
        const bg = idx % 2 === 0 ? C.white : C.gray50;
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          applyDataBorder(cell);
        });
        row.getCell(4).numFmt = "#,##0";
        row.getCell(6).numFmt = "#,##0";
        if (m.totalPenalty > 0) row.getCell(4).font = { color: { argb: C.red }, bold: true };
      });

      // Sheet 2: Top late/absent
      const ws2 = wb.addWorksheet("Top vi phạm");
      ws2.columns = [{ width: 6 }, { width: 24 }, { width: 10 }, { width: 14 }];

      ws2.mergeCells(1, 1, 1, 4);
      const t2 = ws2.getCell("A1");
      t2.value = `TOP 5 ĐI TRỄ NHIỀU NHẤT — NĂM ${year}`;
      t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navyBg } };
      t2.font = { bold: true, color: { argb: C.white }, size: 12 };
      t2.alignment = { horizontal: "center", vertical: "middle" };
      ws2.getRow(1).height = 26;

      const lh = ws2.getRow(2);
      ["STT", "Họ tên", "Mã NV", "Số ngày trễ"].forEach((h, i) => {
        const cell = lh.getCell(i + 1);
        cell.value = h;
        applyHeaderStyle(cell, C.orange);
      });
      lh.height = 20;

      topLate.forEach((e, i) => {
        const row = ws2.addRow([i + 1, e.name, e.code, e.totalDaysLate]);
        row.height = 18;
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? C.white : C.gray50 } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          applyDataBorder(cell);
        });
        row.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
      });

      ws2.addRow([]);

      ws2.mergeCells(topLate.length + 4, 1, topLate.length + 4, 4);
      const t3 = ws2.getCell(topLate.length + 4, 1);
      t3.value = `TOP 5 VẮNG NHIỀU NHẤT — NĂM ${year}`;
      t3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navyBg } };
      t3.font = { bold: true, color: { argb: C.white }, size: 12 };
      t3.alignment = { horizontal: "center", vertical: "middle" };
      ws2.getRow(topLate.length + 4).height = 26;

      const ah = ws2.getRow(topLate.length + 5);
      ["STT", "Họ tên", "Mã NV", "Số ngày vắng"].forEach((h, i) => {
        const cell = ah.getCell(i + 1);
        cell.value = h;
        applyHeaderStyle(cell, C.red);
      });
      ah.height = 20;

      topAbsent.forEach((e, i) => {
        const row = ws2.addRow([i + 1, e.name, e.code, e.totalDaysAbsent]);
        row.height = 18;
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? C.white : C.gray50 } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
          applyDataBorder(cell);
        });
        row.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
      });

      const buf = await wb.xlsx.writeBuffer();
      return new NextResponse(buf as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="tong-ket-nam-${year}.xlsx"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (e) {
    console.error("[annual report]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
