import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllVNHolidays } from "@/lib/holidays";
import { markHolidayAttendance, dateRange, revertHolidayAttendanceRange } from "@/lib/holidayAttendance";

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

  // Bulk import preset — mặc định mode="fixed"/penalizeLate=false (theo default schema), tức là
  // nghỉ cố định không tính phạt cho cả công ty giống hệt khi tự tạo 1 ngày lễ ở nhánh dưới, nên
  // PHẢI ghi nhận chấm công ngay như nhánh dưới — nếu không, ngày lễ nhập preset sẽ hiện nhãn "Cố
  // định" trên bảng nhưng không ai được tự động miễn vắng (đúng lỗ hổng gốc mà tính năng này sinh
  // ra để vá). Nếu ngày đó đã có sẵn (nhập lại năm cũ, hoặc admin đã tuỳ biến mode/penalizeLate
  // riêng cho ngày đó) thì tôn trọng cấu hình hiện có, không ghi đè.
  if (body.preset === true) {
    const year = Number(body.year ?? new Date().getFullYear());
    const presets = getAllVNHolidays(year);
    const activeEmployees = await prisma.employee.findMany({ where: { companyId, status: "active" }, select: { id: true } });
    let imported = 0;
    for (const h of presets) {
      try {
        const row = await prisma.holiday.upsert({
          where: { companyId_date: { companyId, date: h.date } },
          create: { companyId, date: h.date, name: h.name, isNational: true },
          update: { name: h.name },
        });
        imported++;
        if (row.mode === "fixed" && !row.penalizeLate) {
          for (const emp of activeEmployees) {
            await markHolidayAttendance(emp.id, row.date, `Nghỉ lễ: ${row.name}`);
          }
        }
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

  // Lưu lại khoảng ngày CŨ (nếu ngày lễ này đã tồn tại) trước khi upsert — để biết cần dọn log
  // "nghỉ lễ tự động" ở những ngày nào (sửa khoảng ngày, đổi mode, hoặc bật lại "vẫn tính phạt"
  // đều có thể để sót log giả từ lần lưu trước, xem revertHolidayAttendanceRange).
  const before = await prisma.holiday.findUnique({ where: { companyId_date: { companyId, date } } });

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

  // Dọn log "nghỉ lễ tự động" của khoảng ngày CŨ trước — bảo đảm sửa/đổi mode/bật lại phạt luôn
  // cho ra trạng thái đúng, không để sót ngày công ảo hay log giả chặn chấm công thật.
  if (before) {
    await revertHolidayAttendanceRange(companyId, dateRange(before.date, before.endDate || before.date));
  }

  // mode "fixed" + không tính phạt (penalizeLate=false, "Không phạt — nghỉ lễ"): CẢ CÔNG TY nghỉ
  // thật, không ai đi làm → ghi nhận NGAY cho mọi nhân viên đang hoạt động là được nghỉ, không
  // tính vắng/không trừ lương những ngày này, không cần từng người làm đơn xin nghỉ (khác với mode
  // "flexible", nơi từng NV tự chọn ngày + phải được duyệt riêng, xem /api/leave-requests/[id]
  // PATCH). NGƯỢC LẠI, nếu penalizeLate=true ("Đi làm ngày này" — vẫn tính muộn/phạt bình thường)
  // thì đây thực chất vẫn là ngày làm việc bình thường, chỉ gắn nhãn lễ để tham khảo — TUYỆT ĐỐI
  // không được tự điền chấm công trước, vì markHolidayAttendance gán sẵn checkInAt+checkOutAt sẽ
  // khiến kiosk từ chối chấm công thật ("đã chấm công đủ hôm nay") của nhân viên khi họ tới làm.
  // NV tuyển MỚI sau khi ngày lễ này đã tồn tại vẫn được tự động áp đúng các ngày lễ "cố định"
  // tính từ ngày vào làm — xem backfillFixedHolidaysForNewEmployee (lib/holidayAttendance.ts),
  // gọi ở app/api/employees, app/api/employees/import, app/api/recruitment/.../hire.
  if (mode === "fixed" && !penalizeLate) {
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
