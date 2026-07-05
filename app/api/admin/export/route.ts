import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { companyId?: string; role?: string; branchId?: string | null }
    | undefined;

  if (!user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = user.companyId;
  // Quản lý: chỉ chi nhánh mình + KHÔNG có dữ liệu lương
  const isManager = user.role === "manager";
  const scopedBranchId = isManager && user.branchId ? user.branchId : null;
  const branchWhere = scopedBranchId ? { branchId: scopedBranchId } : {};

  // Date helpers
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().slice(0, 10);

  // Filename date stamp YYYYMMDD
  const datestamp =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  try {
    // Fetch all data in parallel
    const [employees, attendanceLogs, leaveRequests, contracts, salaryPayments] =
      await Promise.all([
        prisma.employee.findMany({
          where: { companyId, ...branchWhere },
          select: {
            id: true,
            name: true,
            code: true,
            department: true,
            position: true,
            email: true,
            phone: true,
            baseSalary: true,
            joinDate: true,
            status: true,
            branch: { select: { name: true } },
          },
          orderBy: { name: "asc" },
        }),
        prisma.attendanceLog.findMany({
          where: {
            employee: { companyId },
            date: { gte: threeMonthsAgoStr },
            ...branchWhere,
          },
          select: {
            date: true,
            checkInAt: true,
            checkOutAt: true,
            status: true,
            minutesLate: true,
            penaltyAmount: true,
            note: true,
            employee: { select: { name: true, code: true } },
            branch: { select: { name: true } },
          },
          orderBy: [{ date: "desc" }, { employee: { name: "asc" } }],
        }),
        prisma.leaveRequest.findMany({
          where: { companyId, ...(scopedBranchId ? { employee: { branchId: scopedBranchId } } : {}) },
          select: {
            fromDate: true,
            toDate: true,
            days: true,
            type: true,
            status: true,
            reason: true,
            createdAt: true,
            employee: { select: { name: true, code: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.contract.findMany({
          where: { employee: { companyId, ...branchWhere } },
          select: {
            type: true,
            startDate: true,
            endDate: true,
            note: true,
            createdAt: true,
            employee: { select: { name: true, code: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.salaryPayment.findMany({
          // Quản lý KHÔNG được xuất dữ liệu lương → truy vấn rỗng
          where: isManager ? { id: "___never___" } : { companyId },
          select: {
            year: true,
            month: true,
            amount: true,
            status: true,
            paidAt: true,
            note: true,
            employee: { select: { name: true, code: true } },
          },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        }),
      ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Timio";
    workbook.created = now;

    // ── Sheet 1: Nhân viên ──
    const sheetEmp = workbook.addWorksheet("Nhân viên");
    sheetEmp.columns = [
      { header: "Họ tên", key: "name", width: 25 },
      { header: "Mã NV", key: "code", width: 12 },
      { header: "Chi nhánh", key: "branch", width: 20 },
      { header: "Phòng ban", key: "department", width: 20 },
      { header: "Chức vụ", key: "position", width: 20 },
      { header: "Email", key: "email", width: 28 },
      { header: "Điện thoại", key: "phone", width: 15 },
      ...(isManager ? [] : [{ header: "Lương cơ bản", key: "baseSalary", width: 16 }]),
      { header: "Ngày vào làm", key: "joinDate", width: 16 },
      { header: "Trạng thái", key: "status", width: 12 },
    ];
    sheetEmp.getRow(1).font = { bold: true };
    sheetEmp.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    sheetEmp.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    for (const e of employees) {
      sheetEmp.addRow({
        name: e.name,
        code: e.code,
        branch: e.branch.name,
        department: e.department ?? "",
        position: e.position ?? "",
        email: e.email ?? "",
        phone: e.phone ?? "",
        baseSalary: e.baseSalary ?? 0,
        joinDate: e.joinDate ? e.joinDate.toISOString().slice(0, 10) : "",
        status: e.status === "active" ? "Đang làm" : "Đã nghỉ",
      });
    }

    // ── Sheet 2: Chấm công (3 tháng) ──
    const sheetAtt = workbook.addWorksheet("Chấm công (3 tháng)");
    sheetAtt.columns = [
      { header: "Ngày", key: "date", width: 14 },
      { header: "Nhân viên", key: "empName", width: 25 },
      { header: "Mã NV", key: "empCode", width: 12 },
      { header: "Chi nhánh", key: "branch", width: 20 },
      { header: "Giờ vào", key: "checkIn", width: 20 },
      { header: "Giờ ra", key: "checkOut", width: 20 },
      { header: "Trạng thái", key: "status", width: 14 },
      { header: "Trễ (phút)", key: "minutesLate", width: 12 },
      { header: "Phạt (đ)", key: "penalty", width: 14 },
      { header: "Ghi chú", key: "note", width: 30 },
    ];
    sheetAtt.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheetAtt.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF16A34A" },
    };

    const statusLabels: Record<string, string> = {
      present: "Có mặt",
      late: "Đi trễ",
      absent: "Vắng",
      leave: "Nghỉ phép",
      holiday: "Ngày lễ",
    };

    for (const log of attendanceLogs) {
      sheetAtt.addRow({
        date: log.date,
        empName: log.employee.name,
        empCode: log.employee.code,
        branch: log.branch.name,
        checkIn: log.checkInAt
          ? log.checkInAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
          : "",
        checkOut: log.checkOutAt
          ? log.checkOutAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
          : "",
        status: statusLabels[log.status] ?? log.status,
        minutesLate: log.minutesLate,
        penalty: log.penaltyAmount,
        note: log.note ?? "",
      });
    }

    // ── Sheet 3: Nghỉ phép ──
    const sheetLeave = workbook.addWorksheet("Nghỉ phép");
    sheetLeave.columns = [
      { header: "Nhân viên", key: "empName", width: 25 },
      { header: "Mã NV", key: "empCode", width: 12 },
      { header: "Loại nghỉ", key: "type", width: 16 },
      { header: "Từ ngày", key: "fromDate", width: 14 },
      { header: "Đến ngày", key: "toDate", width: 14 },
      { header: "Số ngày", key: "days", width: 10 },
      { header: "Trạng thái", key: "status", width: 14 },
      { header: "Lý do", key: "reason", width: 35 },
      { header: "Ngày tạo", key: "createdAt", width: 20 },
    ];
    sheetLeave.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheetLeave.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD97706" },
    };

    const leaveTypeLabels: Record<string, string> = {
      annual: "Phép năm",
      sick: "Nghỉ bệnh",
      unpaid: "Không lương",
      maternity: "Thai sản",
      other: "Khác",
    };
    const leaveStatusLabels: Record<string, string> = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      rejected: "Từ chối",
    };

    for (const lr of leaveRequests) {
      sheetLeave.addRow({
        empName: lr.employee.name,
        empCode: lr.employee.code,
        type: leaveTypeLabels[lr.type] ?? lr.type,
        fromDate: lr.fromDate,
        toDate: lr.toDate,
        days: lr.days,
        status: leaveStatusLabels[lr.status] ?? lr.status,
        reason: lr.reason ?? "",
        createdAt: lr.createdAt.toISOString().slice(0, 10),
      });
    }

    // ── Sheet 4: Hợp đồng ──
    const sheetContract = workbook.addWorksheet("Hợp đồng");
    sheetContract.columns = [
      { header: "Nhân viên", key: "empName", width: 25 },
      { header: "Mã NV", key: "empCode", width: 12 },
      { header: "Loại hợp đồng", key: "type", width: 20 },
      { header: "Ngày bắt đầu", key: "startDate", width: 16 },
      { header: "Ngày kết thúc", key: "endDate", width: 16 },
      { header: "Ghi chú", key: "note", width: 35 },
      { header: "Ngày tạo", key: "createdAt", width: 16 },
    ];
    sheetContract.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheetContract.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7C3AED" },
    };

    const contractTypeLabels: Record<string, string> = {
      probation: "Thử việc",
      fixed_term: "Xác định thời hạn",
      indefinite: "Không xác định thời hạn",
      seasonal: "Thời vụ",
      part_time: "Bán thời gian",
    };

    for (const c of contracts) {
      sheetContract.addRow({
        empName: c.employee.name,
        empCode: c.employee.code,
        type: contractTypeLabels[c.type] ?? c.type,
        startDate: c.startDate,
        endDate: c.endDate ?? "Không thời hạn",
        note: c.note ?? "",
        createdAt: c.createdAt.toISOString().slice(0, 10),
      });
    }

    // ── Sheet 5: Lương (chỉ admin & kế toán — quản lý không có) ──
    if (!isManager) {
    const sheetSalary = workbook.addWorksheet("Lương");
    sheetSalary.columns = [
      { header: "Nhân viên", key: "empName", width: 25 },
      { header: "Mã NV", key: "empCode", width: 12 },
      { header: "Năm", key: "year", width: 8 },
      { header: "Tháng", key: "month", width: 8 },
      { header: "Số tiền (đ)", key: "amount", width: 18 },
      { header: "Trạng thái", key: "status", width: 14 },
      { header: "Ngày trả", key: "paidAt", width: 16 },
      { header: "Ghi chú", key: "note", width: 35 },
    ];
    sheetSalary.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheetSalary.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" },
    };

    const salaryStatusLabels: Record<string, string> = {
      paid: "Đã trả",
      unpaid: "Chưa trả",
    };

    for (const sp of salaryPayments) {
      sheetSalary.addRow({
        empName: sp.employee.name,
        empCode: sp.employee.code,
        year: sp.year,
        month: sp.month,
        amount: sp.amount,
        status: salaryStatusLabels[sp.status] ?? sp.status,
        paidAt: sp.paidAt ? sp.paidAt.toISOString().slice(0, 10) : "",
        note: sp.note ?? "",
      });
    }
    } // hết if (!isManager) — bỏ sheet Lương cho quản lý

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="timio-export-${datestamp}.xlsx"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Lỗi xuất dữ liệu", detail: msg }, { status: 500 });
  }
}
