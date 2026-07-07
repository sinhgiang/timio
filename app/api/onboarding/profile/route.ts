import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOnboardingToken, signFaceToken } from "@/lib/faceToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nhân viên mới tự điền hồ sơ (bước 1) qua link onboarding — không cần đăng nhập, token bảo vệ
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const token = String(body.token ?? "");
  const payload = verifyOnboardingToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Link đã hết hạn hoặc không hợp lệ." }, { status: 401 });
  }

  const str = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s || null;
  };
  const name = str(body.name);
  if (!name) return NextResponse.json({ error: "Vui lòng nhập họ tên." }, { status: 400 });

  const phone = str(body.phone);
  if (phone && !/^0\d{9}$/.test(phone.replace(/[\s.]/g, ""))) {
    return NextResponse.json({ error: "Số điện thoại chưa hợp lệ (10 số, bắt đầu bằng 0)." }, { status: 400 });
  }

  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : null;
  if (avatarUrl && avatarUrl.length > 600_000) {
    return NextResponse.json({ error: "Ảnh đại diện quá lớn (tối đa ~400KB)." }, { status: 400 });
  }

  // Bảo đảm nhân viên thuộc đúng công ty của token
  const emp = await prisma.employee.findFirst({
    where: { id: payload.employeeId, companyId: payload.companyId },
    select: { id: true },
  });
  if (!emp) return NextResponse.json({ error: "Không tìm thấy hồ sơ nhân viên." }, { status: 404 });

  try {
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        name,
        dateOfBirth: str(body.dateOfBirth),
        email: str(body.email),
        phone: phone ? phone.replace(/[\s.]/g, "") : null,
        zalo: str(body.zalo),
        facebook: str(body.facebook),
        cccd: str(body.cccd),
        ...(avatarUrl ? { avatarUrl } : {}),
        bankName: str(body.bankName),
        bankAccount: str(body.bankAccount),
        bankBranch: str(body.bankBranch),
      },
    });
  } catch (e) {
    console.error("[onboarding/profile] lỗi cập nhật:", e);
    return NextResponse.json({ error: "Không lưu được hồ sơ. Vui lòng thử lại." }, { status: 500 });
  }

  // Cấp face token (20 phút) cho bước 2 quét khuôn mặt ngay sau đó
  const faceToken = signFaceToken(emp.id, payload.companyId, name);
  return NextResponse.json({ ok: true, faceToken });
}
