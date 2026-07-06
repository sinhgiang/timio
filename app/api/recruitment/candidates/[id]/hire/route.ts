import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";
import { signFaceToken } from "@/lib/faceToken";

// Tuyển-1-chạm: biến ứng viên thành nhân viên chấm công + trả link đăng ký khuôn mặt
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const b = scopedBranchId(user);
  const candidate = await prisma.candidate.findFirst({
    where: {
      id: params.id,
      companyId,
      ...(b ? { job: { OR: [{ branchId: b }, { branchId: null }] } } : {}),
    },
    select: { id: true, name: true, email: true, phone: true, hiredEmpId: true },
  });
  if (!candidate) return NextResponse.json({ error: "Không tìm thấy ứng viên hoặc không có quyền" }, { status: 404 });
  if (candidate.hiredEmpId) {
    return NextResponse.json({ error: "Ứng viên này đã được tạo hồ sơ nhân viên rồi." }, { status: 400 });
  }

  const { branchId, department, position, code, baseSalary, joinDate, pin } = await req.json();

  // Manager chi nhánh: ép chi nhánh của họ
  const finalBranchId = b ?? (branchId || null);
  if (!finalBranchId) return NextResponse.json({ error: "Vui lòng chọn chi nhánh cho nhân viên." }, { status: 400 });
  if (!code || !String(code).trim()) return NextResponse.json({ error: "Vui lòng nhập mã nhân viên." }, { status: 400 });

  // Chi nhánh phải thuộc công ty
  const branch = await prisma.branch.findFirst({ where: { id: finalBranchId, companyId }, select: { id: true } });
  if (!branch) return NextResponse.json({ error: "Chi nhánh không hợp lệ." }, { status: 400 });

  const plainPin = pin && /^\d{4}$/.test(String(pin)) ? String(pin) : "0000";

  let employee;
  try {
    employee = await prisma.employee.create({
      data: {
        name: candidate.name,
        code: String(code).trim(),
        pin: plainPin,
        department: department || null,
        position: position || null,
        branchId: finalBranchId,
        companyId,
        baseSalary: baseSalary ? Number(baseSalary) : 0,
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        email: candidate.email || null,
        phone: candidate.phone || null,
        annualLeaveBalance: 12,
      },
      select: { id: true, name: true, code: true },
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Mã nhân viên đã tồn tại. Vui lòng chọn mã khác." }, { status: 409 });
    }
    console.error("[hire] Lỗi tạo nhân viên:", error);
    return NextResponse.json({ error: "Lỗi tạo hồ sơ nhân viên." }, { status: 500 });
  }

  // Đánh dấu ứng viên đã tuyển
  await prisma.candidate.update({
    where: { id: candidate.id },
    data: { status: "hired", hiredEmpId: employee.id },
  });

  // Link đăng ký khuôn mặt (hiệu lực 20 phút)
  const token = signFaceToken(employee.id, companyId, employee.name);

  return NextResponse.json({
    ok: true,
    employee,
    faceToken: token,
    faceRegisterPath: `/register-face/${encodeURIComponent(token)}`,
  });
}
