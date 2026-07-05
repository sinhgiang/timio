import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId } from "@/lib/branchScope";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx"; // chỉ dùng cho CSV

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtTime(val: Date | string | null | undefined): string {
  if (!val) return "—";
  const d = val instanceof Date ? val : new Date(val);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function statusLabel(status: string, minutesLate: number): string {
  if (status === "on_time") return "Đúng giờ";
  if (status === "late" || status === "very_late") return `Trễ ${minutesLate}p`;
  if (status === "absent") return "Vắng";
  return "Chưa chấm";
}

// Màu sắc
const C = {
  navyBg:   "1E3A5F",
  blueBg:   "1D4ED8",
  blueLight:"EFF6FF",
  gray50:   "FAFAFA",
  gray100:  "F3F4F6",
  white:    "FFFFFF",
  green:    "16A34A",
  orange:   "D97706",
  red:      "DC2626",
  gray400:  "9CA3AF",
  redLight: "FEF2F2",
};

function applyHeaderStyle(cell: ExcelJS.Cell, bgColor = C.blueBg) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
  cell.font = { bold: true, color: { argb: C.white }, size: 11 };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = {
    top: { style: "thin", color: { argb: "CCCCCC" } },
    bottom: { style: "thin", color: { argb: "CCCCCC" } },
    left: { style: "thin", color: { argb: "CCCCCC" } },
    right: { style: "thin", color: { argb: "CCCCCC" } },
  };
}

function applyDataBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "E5E7EB" } },
    bottom: { style: "thin", color: { argb: "E5E7EB" } },
    left: { style: "thin", color: { argb: "E5E7EB" } },
    right: { style: "thin", color: { argb: "E5E7EB" } },
  };
}

// ─── Main handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sUser = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = sUser?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sUser?.role === "manager") {
    return NextResponse.json({ error: "Báo cáo lương chỉ dành cho admin và kế toán. Quản lý dùng Báo cáo tùy chỉnh (chấm công) thay thế." }, { status: 403 });
  }
  // Kế toán chi nhánh → chỉ chi nhánh mình (null = owner/tổng kế toán → toàn công ty)
  const scopeBranch = scopedBranchId(sUser);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);
  const employeeId = searchParams.get("employeeId") ?? null;
  const format = searchParams.get("format") ?? "xlsx";

  // ══════════════════════════════════════════════════════════════════════════
  // LƯƠNG THÁNG 13 EXPORT
  // ══════════════════════════════════════════════════════════════════════════
  if (type === "13th-month") {
    const minDays = Number(searchParams.get("minDays") ?? "15");
    const { calculate13thMonth } = await import("@/lib/attendance");

    const employees = await prisma.employee.findMany({
      where: { companyId, status: "active", ...(scopeBranch ? { branchId: scopeBranch } : {}) },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, code: true, department: true,
        baseSalary: true, joinDate: true,
        summaries: { where: { year }, select: { month: true, year: true, daysPresent: true } },
      },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Lương T13 ${year}`);

    const MONTHS_VI = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

    // Column widths
    ws.columns = [
      { width: 8 },   // STT
      { width: 22 },  // Tên
      { width: 10 },  // Mã
      { width: 18 },  // Phòng ban
      { width: 16 },  // Lương CB
      { width: 12 },  // Ngày vào
      ...MONTHS_VI.map(() => ({ width: 5 })),
      { width: 10 },  // Tháng đủ
      { width: 16 },  // Lương T13
    ];

    // Title row
    const titleRow = ws.addRow([`LƯƠNG THÁNG 13 NĂM ${year}`]);
    ws.mergeCells(1, 1, 1, 6 + 12 + 2);
    titleRow.height = 32;
    applyHeaderStyle(titleRow.getCell(1), C.navyBg);
    titleRow.getCell(1).font = { bold: true, color: { argb: C.white }, size: 14 };

    // Info row
    const infoRow = ws.addRow([`Ngưỡng điều kiện: ≥ ${minDays} ngày/tháng · Công thức: Lương CB × (Số tháng đủ / 12)`]);
    ws.mergeCells(2, 1, 2, 6 + 12 + 2);
    infoRow.height = 20;
    infoRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blueLight } };
    infoRow.getCell(1).font = { italic: true, color: { argb: C.blueBg }, size: 10 };
    infoRow.getCell(1).alignment = { horizontal: "center" };

    // Header row
    const headers = ["STT", "Họ tên", "Mã NV", "Phòng ban", "Lương cơ bản", "Ngày vào làm",
      ...MONTHS_VI, "Tháng đủ", "Lương T13"];
    const headerRow = ws.addRow(headers);
    headerRow.height = 22;
    headerRow.eachCell((cell) => applyHeaderStyle(cell, C.blueBg));

    // Data rows
    let totalAmount = 0;
    employees.forEach((emp, idx) => {
      const th13 = calculate13thMonth({
        baseSalary: emp.baseSalary ?? 0,
        joinDate: emp.joinDate,
        year,
        monthlySummaries: emp.summaries,
        minDaysThreshold: minDays,
      });
      totalAmount += th13.amount;

      const joinDateStr = emp.joinDate
        ? `${emp.joinDate.getDate().toString().padStart(2, "0")}/${(emp.joinDate.getMonth() + 1).toString().padStart(2, "0")}/${emp.joinDate.getFullYear()}`
        : "";

      const rowData = [
        idx + 1,
        emp.name,
        emp.code,
        emp.department ?? "",
        emp.baseSalary ?? 0,
        joinDateStr,
        ...th13.breakdown.map((b) => {
          if (b.daysPresent === 0 && !b.eligible) return "";
          return b.eligible ? "✓" : b.daysPresent;
        }),
        th13.eligibleMonths,
        th13.amount,
      ];

      const row = ws.addRow(rowData);
      row.height = 18;
      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? C.white : C.gray50 } };
        applyDataBorder(cell);
        cell.alignment = { vertical: "middle", horizontal: colNum <= 2 ? "left" : "center" };
      });

      // Color month cells
      th13.breakdown.forEach((b, mi) => {
        const cell = row.getCell(7 + mi);
        if (b.eligible) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCFCE7" } };
          cell.font = { color: { argb: "16A34A" }, bold: true };
        } else if (b.daysPresent > 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF2F2" } };
          cell.font = { color: { argb: "DC2626" } };
        }
      });

      // Lương T13 column
      const lastCol = row.getCell(row.cellCount);
      if ((emp.baseSalary ?? 0) > 0) {
        lastCol.font = { bold: true, color: { argb: "16A34A" } };
        lastCol.numFmt = '#,##0';
      }
      // Lương CB format
      row.getCell(5).numFmt = '#,##0';
    });

    // Total row
    const totalRow = ws.addRow(["", "TỔNG CỘNG", "", "", "", "",
      ...Array(12).fill(""), "", totalAmount]);
    totalRow.height = 24;
    totalRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navyBg } };
      cell.font = { bold: true, color: { argb: C.white }, size: 12 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    totalRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
    totalRow.getCell(totalRow.cellCount).numFmt = '#,##0';

    ws.views = [{ state: "frozen", ySplit: 3 }];

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="luong-thang-13-${year}.xlsx"`,
      },
    });
  }

  const monthStr = String(month).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  const [employees, logs, leaveRequests] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: "active", ...(employeeId ? { id: employeeId } : {}), ...(scopeBranch ? { branchId: scopeBranch } : {}) },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
    prisma.attendanceLog.findMany({
      where: {
        employee: { companyId },
        date: { gte: `${year}-${monthStr}-01`, lte: `${year}-${monthStr}-31` },
        ...(employeeId ? { employeeId } : {}),
        ...(scopeBranch ? { branchId: scopeBranch } : {}),
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        companyId,
        status: "approved",
        type: "unpaid",
        fromDate: { lte: `${year}-${monthStr}-31` },
        toDate: { gte: `${year}-${monthStr}-01` },
        ...(employeeId ? { employeeId } : {}),
        ...(scopeBranch ? { employee: { branchId: scopeBranch } } : {}),
      },
      select: { employeeId: true, fromDate: true, toDate: true },
    }),
  ]);

  function calcUnpaidDays(empId: string): number {
    const pad = (n: number) => String(n).padStart(2, "0");
    const mStart = `${year}-${pad(month)}-01`;
    const mEnd   = `${year}-${pad(month)}-31`;
    return leaveRequests
      .filter((l) => l.employeeId === empId)
      .reduce((sum, l) => {
        const from = l.fromDate < mStart ? mStart : l.fromDate;
        const to   = l.toDate   > mEnd   ? mEnd   : l.toDate;
        if (to < from) return sum;
        return sum + Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
      }, 0);
  }

  const logMap = new Map<string, typeof logs[0]>();
  logs.forEach((l) => logMap.set(`${l.employeeId}-${l.date}`, l));

  // ════════════════════════════════════════════════════════════════════════════
  // 1. CHI TIẾT TỪNG NGƯỜI — bảng ngày
  // ════════════════════════════════════════════════════════════════════════════
  if (employeeId && employees.length === 1) {
    const emp = employees[0];

    // ── CSV (Google Sheets) — không cần style ────────────────────────────────
    if (format === "csv") {
      const rows: Record<string, string | number>[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${monthStr}-${String(d).padStart(2, "0")}`;
        const log = logMap.get(`${emp.id}-${dateStr}`);
        const dow = new Date(dateStr).getDay();
        const isWeekend = dow === 0 || dow === 6;
        rows.push({
          "Ngày": `${d}/${month}/${year}`,
          "Thứ": DOW[dow],
          "Vào": log?.checkInAt ? fmtTime(log.checkInAt) : isWeekend ? "Nghỉ" : "—",
          "Ra": log?.checkOutAt ? fmtTime(log.checkOutAt) : isWeekend ? "Nghỉ" : "—",
          "Trạng thái": log ? statusLabel(log.status, log.minutesLate) : isWeekend ? "Nghỉ" : "Chưa chấm",
          "Phạt (VND)": log?.penaltyAmount ?? 0,
        });
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = "﻿" + XLSX.utils.sheet_to_csv(ws);
      const safeName = emp.name.replace(/\s+/g, "-");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=${safeName}-thang${month}-${year}.csv`,
        },
      });
    }

    // ── XLSX với styling ─────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "Timio";
    const ws = wb.addWorksheet(`${emp.name} T${month}-${year}`);

    ws.columns = [
      { key: "ngay",      width: 14 },
      { key: "thu",       width: 6  },
      { key: "vao",       width: 9  },
      { key: "ra",        width: 9  },
      { key: "trangthai", width: 16 },
      { key: "phat",      width: 16 },
    ];

    // Row 1: Tiêu đề lớn
    ws.mergeCells("A1:F1");
    const titleCell = ws.getCell("A1");
    titleCell.value = `BÁO CÁO CHẤM CÔNG THÁNG ${month}/${year}`;
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navyBg } };
    titleCell.font = { bold: true, color: { argb: C.white }, size: 14 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 32;

    // Row 2: Thông tin nhân viên
    ws.mergeCells("A2:F2");
    const infoCell = ws.getCell("A2");
    infoCell.value = `Nhân viên: ${emp.name}   |   Phòng ban: ${emp.department ?? "—"}   |   Chi nhánh: ${emp.branch.name}`;
    infoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blueLight } };
    infoCell.font = { color: { argb: C.navyBg }, size: 10 };
    infoCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getRow(2).height = 20;

    // Row 3: Header cột
    const headers = ["Ngày", "Thứ", "Vào", "Ra", "Trạng thái", "Phạt (VND)"];
    const headerRow = ws.getRow(3);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      applyHeaderStyle(cell);
    });
    headerRow.height = 22;

    // Row 4+: Data
    let totalPenalty = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${monthStr}-${String(d).padStart(2, "0")}`;
      const log = logMap.get(`${emp.id}-${dateStr}`);
      const dow = new Date(dateStr).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const status = log ? statusLabel(log.status, log.minutesLate) : isWeekend ? "Nghỉ" : "Chưa chấm";
      const penalty = log?.penaltyAmount ?? 0;
      totalPenalty += penalty;

      const row = ws.addRow({
        ngay: `${d}/${month}/${year}`,
        thu: DOW[dow],
        vao: log?.checkInAt ? fmtTime(log.checkInAt) : isWeekend ? "Nghỉ" : "—",
        ra: log?.checkOutAt ? fmtTime(log.checkOutAt) : isWeekend ? "Nghỉ" : "—",
        trangthai: status,
        phat: penalty > 0 ? penalty : 0,
      });
      row.height = 18;

      // Màu nền hàng
      const rowBg = isWeekend ? C.gray100 : d % 2 === 0 ? C.gray50 : C.white;
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
        cell.alignment = { vertical: "middle" };
        applyDataBorder(cell);
        if (isWeekend) cell.font = { color: { argb: C.gray400 }, italic: true };
      });

      // Màu cột Trạng thái
      const statusCell = row.getCell(5);
      if (!isWeekend && log) {
        if (log.status === "on_time") {
          statusCell.font = { color: { argb: C.green }, bold: true };
        } else if (log.status === "late" || log.status === "very_late") {
          statusCell.font = { color: { argb: C.orange }, bold: true };
        } else {
          statusCell.font = { color: { argb: C.red }, bold: true };
        }
      }

      // Cột Phạt: đỏ nếu có tiền phạt
      const penaltyCell = row.getCell(6);
      penaltyCell.numFmt = "#,##0";
      penaltyCell.alignment = { horizontal: "right", vertical: "middle" };
      if (penalty > 0) {
        penaltyCell.font = { color: { argb: C.red }, bold: true };
        penaltyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redLight } };
        penaltyCell.value = penalty;
      } else {
        penaltyCell.value = "";
      }
    }

    // Hàng tổng
    const totalRow = ws.addRow(["", "", "", "", "TỔNG PHẠT", totalPenalty]);
    totalRow.height = 22;
    totalRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navyBg } };
      cell.font = { bold: true, color: { argb: C.white } };
      cell.border = { top: { style: "medium", color: { argb: C.blueBg } } };
    });
    const sumCell = totalRow.getCell(5);
    sumCell.alignment = { horizontal: "right", vertical: "middle" };
    const sumValCell = totalRow.getCell(6);
    sumValCell.numFmt = "#,##0";
    sumValCell.alignment = { horizontal: "right", vertical: "middle" };

    const buf = await wb.xlsx.writeBuffer();
    const safeName = emp.name.replace(/\s+/g, "-");
    return new NextResponse(buf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${safeName}-thang${month}-${year}.xlsx`,
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. TỔNG KẾT TẤT CẢ NHÂN VIÊN
  // ════════════════════════════════════════════════════════════════════════════
  type SummaryRow = Record<string, string | number>;
  const rows: SummaryRow[] = [];
  for (const emp of employees) {
    let daysPresent = 0, daysLate = 0, totalMinutesLate = 0, totalPenalty = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${monthStr}-${String(d).padStart(2, "0")}`;
      const log = logMap.get(`${emp.id}-${dateStr}`);
      if (log?.checkInAt) {
        daysPresent++;
        if (log.minutesLate > 0) daysLate++;
        totalMinutesLate += log.minutesLate;
        totalPenalty += log.penaltyAmount;
      }
    }
    const baseSalary = emp.baseSalary ?? 0;
    const unpaidDays = calcUnpaidDays(emp.id);
    const unpaidDeduction = baseSalary > 0 ? Math.round((baseSalary / 26) * unpaidDays) : 0;
    const netSalary = baseSalary - totalPenalty - unpaidDeduction;
    rows.push({
      "Mã NV": emp.code,
      "Họ tên": emp.name,
      "Phòng ban": emp.department ?? "",
      "Chi nhánh": emp.branch.name,
      "Ngày đi làm": daysPresent,
      "Ngày trễ": daysLate,
      "Ngày vắng": Math.max(0, daysInMonth - daysPresent),
      "Tổng phút trễ": totalMinutesLate,
      "Tiền phạt (VND)": totalPenalty,
      "Nghỉ KLương (ngày)": unpaidDays,
      "Trừ KLương (VND)": unpaidDeduction,
      "Lương CB (VND)": baseSalary,
      "Thực nhận (VND)": netSalary,
    });
  }

  // ── CSV ──────────────────────────────────────────────────────────────────
  if (format === "csv") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = "﻿" + XLSX.utils.sheet_to_csv(ws);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=bao-cao-${year}-${monthStr}.csv`,
      },
    });
  }

  // ── XLSX với styling ──────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "Timio";
  const ws = wb.addWorksheet(`Tháng ${month}-${year}`);

  ws.columns = [
    { key: "ma",       width: 10 },
    { key: "ten",      width: 26 },
    { key: "phongban", width: 18 },
    { key: "chinhanh", width: 18 },
    { key: "dilam",    width: 10 },
    { key: "tre",      width: 8  },
    { key: "vang",     width: 8  },
    { key: "phut",     width: 12 },
    { key: "phat",     width: 18 },
    { key: "klngay",   width: 16 },
    { key: "kltien",   width: 18 },
    { key: "luongcb",  width: 18 },
    { key: "thucnhan", width: 20 },
  ];

  // Row 1: Tiêu đề
  ws.mergeCells("A1:M1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `BÁO CÁO LƯƠNG THÁNG ${month}/${year} — TẤT CẢ NHÂN VIÊN`;
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navyBg } };
  titleCell.font = { bold: true, color: { argb: C.white }, size: 13 };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // Row 2: Thông tin
  ws.mergeCells("A2:M2");
  const infoCell = ws.getCell("A2");
  infoCell.value = `Tháng ${month}/${year}   |   Tổng: ${employees.length} nhân viên   |   Xuất bởi Timio`;
  infoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blueLight } };
  infoCell.font = { color: { argb: C.navyBg }, size: 10 };
  infoCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  ws.getRow(2).height = 18;

  // Row 3: Headers
  const colHeaders = [
    "Mã NV", "Họ tên", "Phòng ban", "Chi nhánh",
    "Đi làm", "Trễ", "Vắng", "Phút trễ",
    "Tiền phạt (VND)", "Nghỉ KLương (ngày)", "Trừ KLương (VND)",
    "Lương CB (VND)", "Thực nhận (VND)",
  ];
  const headerRow = ws.getRow(3);
  colHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    // Highlight lương thực nhận
    applyHeaderStyle(cell, i === 12 ? "15803D" : C.blueBg);
  });
  headerRow.height = 22;

  // Data rows
  rows.forEach((r, idx) => {
    const row = ws.addRow({
      ma:       r["Mã NV"],
      ten:      r["Họ tên"],
      phongban: r["Phòng ban"],
      chinhanh: r["Chi nhánh"],
      dilam:    r["Ngày đi làm"],
      tre:      r["Ngày trễ"],
      vang:     r["Ngày vắng"],
      phut:     r["Tổng phút trễ"],
      phat:     r["Tiền phạt (VND)"],
      klngay:   r["Nghỉ KLương (ngày)"],
      kltien:   r["Trừ KLương (VND)"],
      luongcb:  r["Lương CB (VND)"],
      thucnhan: r["Thực nhận (VND)"],
    });
    row.height = 20;

    const bg = idx % 2 === 0 ? C.white : C.gray50;
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.alignment = { vertical: "middle" };
      applyDataBorder(cell);
    });

    const treCell = row.getCell(6);
    treCell.alignment = { horizontal: "center", vertical: "middle" };
    if ((r["Ngày trễ"] as number) > 0) treCell.font = { color: { argb: C.orange }, bold: true };

    const vangCell = row.getCell(7);
    vangCell.alignment = { horizontal: "center", vertical: "middle" };
    if ((r["Ngày vắng"] as number) > 0) vangCell.font = { color: { argb: C.red }, bold: true };

    const phatCell = row.getCell(9);
    phatCell.numFmt = "#,##0";
    phatCell.alignment = { horizontal: "right", vertical: "middle" };
    if ((r["Tiền phạt (VND)"] as number) > 0) {
      phatCell.font = { color: { argb: C.red }, bold: true };
      phatCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redLight } };
    }

    // Nghỉ KLương ngày
    const klNgayCell = row.getCell(10);
    klNgayCell.alignment = { horizontal: "center", vertical: "middle" };
    if ((r["Nghỉ KLương (ngày)"] as number) > 0) klNgayCell.font = { color: { argb: "D97706" }, bold: true };

    // Trừ KLương tiền
    const klTienCell = row.getCell(11);
    klTienCell.numFmt = "#,##0";
    klTienCell.alignment = { horizontal: "right", vertical: "middle" };
    if ((r["Trừ KLương (VND)"] as number) > 0) {
      klTienCell.font = { color: { argb: "D97706" }, bold: true };
    }

    // Lương CB
    const luongCBCell = row.getCell(12);
    luongCBCell.numFmt = "#,##0";
    luongCBCell.alignment = { horizontal: "right", vertical: "middle" };
    luongCBCell.font = { color: { argb: C.navyBg } };

    // Thực nhận — green bold
    const thucNhanCell = row.getCell(13);
    thucNhanCell.numFmt = "#,##0";
    thucNhanCell.alignment = { horizontal: "right", vertical: "middle" };
    thucNhanCell.font = { color: { argb: C.green }, bold: true, size: 11 };

    const dilamCell = row.getCell(5);
    dilamCell.alignment = { horizontal: "center", vertical: "middle" };
    if ((r["Ngày đi làm"] as number) > 0) dilamCell.font = { color: { argb: C.green }, bold: true };
  });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=bao-cao-${year}-${monthStr}.xlsx`,
    },
  });
}
