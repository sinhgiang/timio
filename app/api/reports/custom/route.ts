import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeRow {
  id: string;
  name: string;
  code: string;
  department: string;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  totalMinutesLate: number;
  totalPenalty: number;
  totalMinutesOvertime: number;
  totalOvertimeAmount: number;
  checkIns: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Count Mon–Fri days in [from, to] inclusive */
function countWorkingDays(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

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
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const employeeIdFilter = searchParams.get("employeeId") ?? null;
    let branchIdFilter = searchParams.get("branchId") ?? null;
    // Quản lý & kế toán chi nhánh chỉ được xuất dữ liệu chi nhánh mình — ép branchId về chi nhánh của họ
    if ((user?.role === "manager" || user?.role === "accountant") && user.branchId) branchIdFilter = user.branchId;
    const format = searchParams.get("format") ?? null;

    if (!from || !to) {
      return NextResponse.json({ error: "Missing from/to params" }, { status: 400 });
    }

    // Validate date format YYYY-MM-DD
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(from) || !dateRe.test(to)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (from > to) {
      return NextResponse.json({ error: "from must be <= to" }, { status: 400 });
    }

    // Build employee filter
    const empWhere: {
      companyId: string;
      status: string;
      id?: string;
      branchId?: string;
    } = { companyId, status: "active" };
    if (employeeIdFilter) empWhere.id = employeeIdFilter;
    if (branchIdFilter) empWhere.branchId = branchIdFilter;

    // Fetch employees and logs in parallel
    const [employees, logs] = await Promise.all([
      prisma.employee.findMany({
        where: empWhere,
        select: { id: true, name: true, code: true, department: true },
        orderBy: { name: "asc" },
      }),
      prisma.attendanceLog.findMany({
        where: {
          employee: { companyId },
          date: { gte: from, lte: to },
          ...(employeeIdFilter ? { employeeId: employeeIdFilter } : {}),
          ...(branchIdFilter ? { branchId: branchIdFilter } : {}),
        },
        select: {
          employeeId: true,
          checkInAt: true,
          minutesLate: true,
          penaltyAmount: true,
          minutesOvertime: true,
          overtimeAmount: true,
          status: true,
        },
      }),
    ]);

    // Build log map: employeeId -> aggregated stats
    const logMap = new Map<string, {
      daysPresent: number;
      daysLate: number;
      totalMinutesLate: number;
      totalPenalty: number;
      totalMinutesOvertime: number;
      totalOvertimeAmount: number;
      checkIns: number;
    }>();

    for (const log of logs) {
      if (!logMap.has(log.employeeId)) {
        logMap.set(log.employeeId, {
          daysPresent: 0,
          daysLate: 0,
          totalMinutesLate: 0,
          totalPenalty: 0,
          totalMinutesOvertime: 0,
          totalOvertimeAmount: 0,
          checkIns: 0,
        });
      }
      const agg = logMap.get(log.employeeId)!;
      if (log.status !== "absent") agg.daysPresent++;
      if (log.minutesLate > 0) agg.daysLate++;
      agg.totalMinutesLate += log.minutesLate;
      agg.totalPenalty += log.penaltyAmount;
      agg.totalMinutesOvertime += log.minutesOvertime;
      agg.totalOvertimeAmount += log.overtimeAmount;
      if (log.checkInAt) agg.checkIns++;
    }

    const totalDays = countWorkingDays(from, to);

    const employeeRows: EmployeeRow[] = employees.map((emp) => {
      const agg = logMap.get(emp.id);
      const daysPresent = agg?.daysPresent ?? 0;
      return {
        id: emp.id,
        name: emp.name,
        code: emp.code,
        department: emp.department ?? "(Chưa phân bổ)",
        daysPresent,
        daysAbsent: Math.max(0, totalDays - daysPresent),
        daysLate: agg?.daysLate ?? 0,
        totalMinutesLate: agg?.totalMinutesLate ?? 0,
        totalPenalty: agg?.totalPenalty ?? 0,
        totalMinutesOvertime: agg?.totalMinutesOvertime ?? 0,
        totalOvertimeAmount: agg?.totalOvertimeAmount ?? 0,
        checkIns: agg?.checkIns ?? 0,
      };
    });

    // ── Excel export ─────────────────────────────────────────────────────────
    if (format === "excel") {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Timio";
      const ws = wb.addWorksheet(`Báo cáo ${from} - ${to}`);

      ws.columns = [
        { width: 6  },  // STT
        { width: 22 },  // Họ tên
        { width: 10 },  // Mã NV
        { width: 18 },  // Phòng ban
        { width: 10 },  // Có mặt
        { width: 8  },  // Vắng
        { width: 8  },  // Trễ
        { width: 14 },  // Phút trễ
        { width: 18 },  // Phạt (đ)
        { width: 12 },  // OT (phút)
        { width: 18 },  // OT (đ)
      ];

      // Title
      ws.mergeCells(1, 1, 1, 11);
      const titleCell = ws.getCell("A1");
      titleCell.value = `BÁO CÁO TÙY CHỈNH: ${from} → ${to}`;
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navyBg } };
      titleCell.font = { bold: true, color: { argb: C.white }, size: 13 };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 30;

      // Info
      ws.mergeCells(2, 1, 2, 11);
      const infoCell = ws.getCell("A2");
      infoCell.value = `Tổng ngày làm việc: ${totalDays} ngày   |   Tổng nhân viên: ${employees.length}   |   Xuất bởi Timio`;
      infoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blueLight } };
      infoCell.font = { color: { argb: C.navyBg }, size: 10 };
      infoCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      ws.getRow(2).height = 18;

      // Headers
      const colHeaders = [
        "STT", "Họ tên", "Mã NV", "Phòng ban",
        "Có mặt", "Vắng", "Trễ", "Phút trễ",
        "Phạt (đ)", "OT (phút)", "OT (đ)",
      ];
      const headerRow = ws.getRow(3);
      colHeaders.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        applyHeaderStyle(cell);
      });
      headerRow.height = 22;

      // Data
      let sumPresent = 0, sumAbsent = 0, sumLate = 0, sumPenalty = 0, sumOT = 0, sumOTAmt = 0;
      employeeRows.forEach((r, idx) => {
        sumPresent += r.daysPresent;
        sumAbsent += r.daysAbsent;
        sumLate += r.daysLate;
        sumPenalty += r.totalPenalty;
        sumOT += r.totalMinutesOvertime;
        sumOTAmt += r.totalOvertimeAmount;

        const row = ws.addRow([
          idx + 1, r.name, r.code, r.department,
          r.daysPresent, r.daysAbsent, r.daysLate, r.totalMinutesLate,
          r.totalPenalty, r.totalMinutesOvertime, r.totalOvertimeAmount,
        ]);
        row.height = 18;
        const bg = idx % 2 === 0 ? C.white : C.gray50;
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          cell.alignment = { vertical: "middle" };
          applyDataBorder(cell);
        });
        row.getCell(9).numFmt = "#,##0";
        row.getCell(11).numFmt = "#,##0";
        if (r.totalPenalty > 0) row.getCell(9).font = { color: { argb: C.red }, bold: true };
        if (r.daysLate > 0) row.getCell(7).font = { color: { argb: C.orange }, bold: true };
      });

      // Totals row
      const totRow = ws.addRow([
        "", "TỔNG CỘNG", "", "",
        sumPresent, sumAbsent, sumLate, "",
        sumPenalty, sumOT, sumOTAmt,
      ]);
      totRow.height = 22;
      totRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navyBg } };
        cell.font = { bold: true, color: { argb: C.white } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      totRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
      totRow.getCell(9).numFmt = "#,##0";
      totRow.getCell(11).numFmt = "#,##0";

      ws.views = [{ state: "frozen", ySplit: 3 }];

      const buf = await wb.xlsx.writeBuffer();
      return new NextResponse(buf as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="bao-cao-tuy-chinh-${from}-${to}.xlsx"`,
        },
      });
    }

    // ── JSON response ─────────────────────────────────────────────────────────
    return NextResponse.json({ employees: employeeRows, from, to, totalDays });
  } catch (e) {
    console.error("[custom report]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
