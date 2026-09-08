import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllVNHolidays } from "@/lib/holidays";
import { markHolidayAttendance, dateRange } from "@/lib/holidayAttendance";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const holidays = await prisma.holiday.findMany({
    where: { companyId, date: { gte: `${year}-01-01`, lte: `${year}-12-31` } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(holidays);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Bulk import preset
  if (body.preset === true) {
    const year = Number(body.year ?? new Date().getFullYear());
    const presets = getAllVNHolidays(year);
    let imported = 0;
    for (const h of presets) {
      try {
        await prisma.holiday.upsert({
          where: { companyId_date: { companyId, date: h.date } },
          create: { companyId, date: h.date, name: h.name, isNational: true },
          update: { name: h.name },
        });
        imported++;
      } catch {
        // skip duplicates
      }
    }
    return NextResponse.json({ ok: true, imported });
  }

  // Single holiday — hỗ trợ 2 chế độ:
  // - mode "fixed": nghỉ cố định đúng ngày/khoảng cho CẢ công ty (date..endDate, totalDays chỉ để hiển thị)
  // - mode "flexible": chỉ khai báo khoảng thời gian + số ngày tối đa (maxDays); nhân viên tự
  //   chọn ngày cụ thể trong khoảng đó ở app "Nghỉ phép" (xem /api/worker/holidays + kind="holiday"
  //   ở /api/worker/requests) rồi gửi để sếp duyệt từng đơn.
  const {
    date, name, isNational = false, penalizeLate = false,
    mode = "fixed", endDate = null, totalDays = null, maxDays = null,
  } = body;
  if (!date || !name) return NextResponse.json({ error: "Thiếu ngày hoặc tên" }, { status: 400 });
  if (mode !== "fixed" && mode !== "flexible") {
    return NextResponse.json({ error: "Chế độ không hợp lệ" }, { status: 400 });
  }
  if (endDate && endDate < date) {
    return NextResponse.json({ error: "Ngày kết thúc phải sau ngày bắt đầu" }, { status: 400 });
  }

  const holiday = await prisma.holiday.upsert({
    where: { companyId_date: { companyId, date } },
    create: {
      companyId, date, name, isNational, penalizeLate: Boolean(penalizeLate),
      mode, endDate: endDate || null,
      totalDays: totalDays != null && totalDays !== "" ? Number(totalDays) : null,
      maxDays: maxDays != null && maxDays !== "" ? Number(maxDays) : null,
    },
    update: {
      name, isNational, penalizeLate: Boolean(penalizeLate),
      mode, endDate: endDate || null,
      totalDays: totalDays != null && totalDays !== "" ? Number(totalDays) : null,
      maxDays: maxDays != null && maxDays !== "" ? Number(maxDays) : null,
    },
  });

  // mode "fixed" (áp dụng cả công ty): ghi nhận NGAY cho mọi nhân viên đang hoạt động là được
  // nghỉ, không tính vắng/không trừ lương những ngày này — không cần từng người làm đơn xin nghỉ
  // (khác với mode "flexible", nơi từng NV tự chọn ngày + phải được duyệt riêng, xem
  // /api/leave-requests/[id] PATCH). Giới hạn: nếu công ty tuyển thêm NV MỚI sau khi đã tạo ngày
  // lễ này, người mới sẽ không tự động được áp — cần sếp lưu lại ngày lễ (bấm Lưu lần nữa) để
  // chạy lại cho toàn bộ nhân viên hiện tại.
  if (mode === "fixed") {
    const dates = dateRange(date, endDate || date);
    const activeEmployees = await prisma.employee.findMany({
      where: { companyId, status: "active" },
      select: { id: true },
    });
    for (const emp of activeEmployees) {
      for (const d of dates) {
        await markHolidayAttendance(emp.id, d, `Nghỉ lễ: ${name}`);
      }
    }
  }

  return NextResponse.json(holiday);
}
