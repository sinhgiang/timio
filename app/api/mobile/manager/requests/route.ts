import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getManagerAuth } from "@/lib/mobileAuth";
import { scopedBranchId } from "@/lib/branchScope";

type NormalizedRequest = {
  id: string;
  type: "overtime" | "early_leave" | "correction" | "shift_swap";
  employeeName: string;
  detail: string;
  reason: string;
  status: string;
  createdAt: string;
};

/**
 * GET /api/mobile/manager/requests?type=overtime|early_leave|correction|shift_swap&status=pending|approved|rejected|all
 * Danh sách đơn (ngoài nghỉ phép) đã lọc theo chi nhánh của quản lý.
 * Trả về mảng normalized: [{ id, type, employeeName, detail, reason, status, createdAt }]
 */
export async function GET(req: NextRequest) {
  const auth = getManagerAuth(req);
  if (!auth) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const mgrBranch = scopedBranchId(auth);

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "";
    const status = searchParams.get("status") ?? "pending";

    const statusWhere = status !== "all" ? { status } : {};

    if (type === "overtime") {
      const rows = await prisma.overtimeRequest.findMany({
        where: {
          companyId: auth.companyId,
          ...statusWhere,
          ...(mgrBranch ? { employee: { branchId: mgrBranch } } : {}),
        },
        include: { employee: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      const out: NormalizedRequest[] = rows.map((r) => ({
        id: r.id,
        type: "overtime",
        employeeName: r.employee.name,
        detail: `${r.date} ${r.startTime}-${r.endTime} (${r.hours}h)`,
        reason: r.reason ?? "",
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }));
      return NextResponse.json(out);
    }

    if (type === "early_leave") {
      const rows = await prisma.earlyLeaveRequest.findMany({
        where: {
          companyId: auth.companyId,
          ...statusWhere,
          ...(mgrBranch ? { employee: { branchId: mgrBranch } } : {}),
        },
        include: { employee: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      const out: NormalizedRequest[] = rows.map((r) => ({
        id: r.id,
        type: "early_leave",
        employeeName: r.employee.name,
        detail: `${r.date} về lúc ${r.leaveTime}`,
        reason: r.reason ?? "",
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }));
      return NextResponse.json(out);
    }

    if (type === "correction") {
      // CorrectionRequest KHÔNG có cột companyId → lọc qua quan hệ employee.
      const rows = await prisma.correctionRequest.findMany({
        where: {
          ...statusWhere,
          employee: {
            companyId: auth.companyId,
            ...(mgrBranch ? { branchId: mgrBranch } : {}),
          },
        },
        include: { employee: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      const out: NormalizedRequest[] = rows.map((r) => ({
        id: r.id,
        type: "correction",
        employeeName: r.employee.name,
        detail: `${r.date} · ${r.type} · vào ${r.requestedCheckIn ?? "--"} ra ${r.requestedCheckOut ?? "--"}`,
        reason: r.reason ?? "",
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }));
      return NextResponse.json(out);
    }

    if (type === "shift_swap") {
      const rows = await prisma.shiftSwapRequest.findMany({
        where: {
          companyId: auth.companyId,
          ...statusWhere,
          ...(mgrBranch ? { requester: { branchId: mgrBranch } } : {}),
        },
        include: {
          requester: { select: { name: true } },
          target: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      const out: NormalizedRequest[] = rows.map((r) => ({
        id: r.id,
        type: "shift_swap",
        employeeName: r.requester.name,
        detail: `${r.requesterDate} ↔ ${r.targetDate} với ${r.target.name}`,
        reason: r.reason ?? "",
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }));
      return NextResponse.json(out);
    }

    return NextResponse.json({ error: "Loại đơn không hợp lệ" }, { status: 400 });
  } catch (err) {
    console.error("[mobile/manager/requests]", err);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
