import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkerAccountId } from "@/lib/workerAuth";
import { getEwaOptions, computeFee, MIN_ADVANCE } from "@/lib/ewa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — số có thể ứng theo từng công ty + lịch sử ứng tháng này
export async function GET() {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const wa = await prisma.workerAccount.findUnique({ where: { id }, select: { consentFinanceAt: true } });
  const consentFinance = !!wa?.consentFinanceAt;

  const { month, monthLabel, options } = await getEwaOptions(id);

  const now = new Date();
  const empIds = options.map((o) => o.employeeId);
  const history = empIds.length
    ? await prisma.salaryAdvance.findMany({
        where: { employeeId: { in: empIds }, source: "worker", year: now.getFullYear(), month: now.getMonth() + 1 },
        select: { id: true, amount: true, fee: true, status: true, disbursedAt: true, requestedAt: true, employeeId: true },
        orderBy: { requestedAt: "desc" },
      })
    : [];
  const nameByEmp = new Map(options.map((o) => [o.employeeId, o.companyName]));

  return NextResponse.json({
    consentFinance,
    month, monthLabel,
    options,
    history: history.map((h) => ({
      id: h.id, amount: h.amount, fee: h.fee, status: h.status,
      disbursed: !!h.disbursedAt, requestedAt: h.requestedAt,
      companyName: nameByEmp.get(h.employeeId) ?? "Công ty",
    })),
  });
}

// POST — gửi yêu cầu ứng lương. body: { employeeId, amount }
export async function POST(req: NextRequest) {
  const id = getWorkerAccountId();
  if (!id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const wa = await prisma.workerAccount.findUnique({ where: { id }, select: { consentFinanceAt: true } });
  if (!wa?.consentFinanceAt) return NextResponse.json({ error: "Bạn cần đồng ý tính năng tài chính để dùng ứng lương.", needConsent: true }, { status: 403 });

  const { employeeId, amount } = await req.json().catch(() => ({}));
  const amt = Math.floor(Number(amount));
  if (!employeeId || !amt || amt <= 0) return NextResponse.json({ error: "Số tiền không hợp lệ." }, { status: 400 });
  if (amt < MIN_ADVANCE) return NextResponse.json({ error: `Ứng tối thiểu ${MIN_ADVANCE.toLocaleString("vi-VN")}đ.` }, { status: 400 });

  // Kiểm tra employeeId thuộc về chính worker này (chống ứng hộ người khác)
  const { month, options } = await getEwaOptions(id);
  const opt = options.find((o) => o.employeeId === employeeId);
  if (!opt) return NextResponse.json({ error: "Không tìm thấy nơi làm việc phù hợp." }, { status: 404 });
  if (!opt.ewaEnabled) return NextResponse.json({ error: "Công ty chưa bật ứng lương." }, { status: 403 });
  if (opt.advancesThisMonth >= opt.maxPerMonth) return NextResponse.json({ error: `Đã dùng hết ${opt.maxPerMonth} lần ứng trong tháng.` }, { status: 400 });
  if (amt > opt.available) return NextResponse.json({ error: `Chỉ có thể ứng tối đa ${opt.available.toLocaleString("vi-VN")}đ.` }, { status: 400 });

  const [year, monthNum] = month.split("-").map((x) => parseInt(x, 10));
  const fee = computeFee(opt.feeType, opt.feeValue, amt);
  // Tự duyệt nếu công ty chọn chế độ auto (vẫn cần công ty chi tiền — disbursedAt để null tới khi chi)
  const status = opt.approvalMode === "auto" ? "approved" : "pending";

  const created = await prisma.salaryAdvance.create({
    data: {
      companyId: opt.companyId, employeeId, year, month: monthNum,
      amount: amt, fee, source: "worker", status,
      approvedAt: status === "approved" ? new Date() : null,
      note: "NV tự ứng qua app",
    },
    select: { id: true, amount: true, fee: true, status: true },
  });

  return NextResponse.json({
    ok: true,
    advance: created,
    autoApproved: status === "approved",
    message: status === "approved"
      ? "Yêu cầu được duyệt tự động. Công ty sẽ chuyển tiền cho bạn."
      : "Đã gửi yêu cầu. Chờ công ty duyệt và chuyển tiền.",
  }, { status: 201 });
}
