import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { managerBranchId } from "@/lib/branchScope";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const status = req.nextUrl.searchParams.get("status") ?? undefined;

    const requests = await prisma.shiftSwapRequest.findMany({
      where: {
        companyId,
        ...(managerBranchId(user) ? { requester: { branchId: managerBranchId(user)! } } : {}),
        ...(status && status !== "all" ? { status } : {}),
      },
      include: {
        requester: {
          select: { id: true, name: true, code: true, department: true },
        },
        target: {
          select: { id: true, name: true, code: true, department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET /api/shift-swap-requests error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { companyId?: string } | undefined;
    const companyId = user?.companyId;
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      requesterId?: string;
      targetId?: string;
      requesterDate?: string;
      targetDate?: string;
      reason?: string;
    };

    const { requesterId, targetId, requesterDate, targetDate, reason } = body;

    if (!requesterId || !targetId || !requesterDate || !targetDate) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc (requesterId, targetId, requesterDate, targetDate)" },
        { status: 400 }
      );
    }

    if (requesterId === targetId) {
      return NextResponse.json({ error: "Người xin đổi và người đổi với không thể là cùng một người" }, { status: 400 });
    }

    // Validate both employees exist in same company
    const [requester, target] = await Promise.all([
      prisma.employee.findFirst({ where: { id: requesterId, companyId }, select: { id: true } }),
      prisma.employee.findFirst({ where: { id: targetId, companyId }, select: { id: true } }),
    ]);

    if (!requester) return NextResponse.json({ error: "Người xin đổi không tồn tại" }, { status: 404 });
    if (!target) return NextResponse.json({ error: "Người đổi với không tồn tại" }, { status: 404 });

    const created = await prisma.shiftSwapRequest.create({
      data: {
        companyId,
        requesterId,
        targetId,
        requesterDate,
        targetDate,
        reason: reason ?? null,
        status: "pending",
      },
      include: {
        requester: { select: { id: true, name: true, code: true, department: true } },
        target: { select: { id: true, name: true, code: true, department: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/shift-swap-requests error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
