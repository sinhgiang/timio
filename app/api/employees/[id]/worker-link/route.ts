import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureWorkerAccount } from "@/lib/workerAccount";
import { makeActivationToken } from "@/lib/workerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — link kích hoạt app cho 1 nhân viên (admin gửi cho họ). Trả token để client dựng URL.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const emp = await prisma.employee.findFirst({
    where: { id: params.id, companyId },
    select: { id: true, name: true, phone: true, email: true, workerAccountId: true },
  });
  if (!emp) return NextResponse.json({ error: "Không tìm thấy nhân viên." }, { status: 404 });
  if (!emp.phone) return NextResponse.json({ hasPhone: false, error: "Nhân viên chưa có số điện thoại — thêm SĐT để mời dùng app." }, { status: 400 });

  // Đảm bảo đã có tài khoản (nối/tạo)
  let waId = emp.workerAccountId;
  if (!waId) waId = await ensureWorkerAccount(emp.id, emp.name, emp.phone, emp.email);
  if (!waId) return NextResponse.json({ hasPhone: false, error: "Không tạo được tài khoản." }, { status: 400 });

  let wa = await prisma.workerAccount.findUnique({ where: { id: waId }, select: { activatedAt: true, activationToken: true, phone: true } });
  // Nếu đã kích hoạt rồi thì không có token; nếu chưa mà mất token thì cấp lại
  if (wa && !wa.activatedAt && !wa.activationToken) {
    const t = makeActivationToken();
    await prisma.workerAccount.update({ where: { id: waId }, data: { activationToken: t } });
    wa = { ...wa, activationToken: t };
  }

  return NextResponse.json({
    hasPhone: true,
    phone: wa?.phone ?? emp.phone,
    activated: !!wa?.activatedAt,
    activationToken: wa?.activatedAt ? null : (wa?.activationToken ?? null),
  });
}
