import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeOvertimeConfig, DEFAULT_OVERTIME_CONFIG } from "@/lib/overtime";

function sessionUser(session: unknown) {
  return (session as { user?: { companyId?: string; role?: string } } | null)?.user;
}

// GET — đọc cấu hình tăng ca (hệ số + ngưỡng phút tối thiểu). Tái dùng field Company.overtimeRates.
export async function GET() {
  const user = sessionUser(await getServerSession(authOptions));
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { overtimeRates: true },
  });
  let config = DEFAULT_OVERTIME_CONFIG;
  if (company?.overtimeRates) {
    try {
      config = sanitizeOvertimeConfig(JSON.parse(company.overtimeRates));
    } catch {
      config = DEFAULT_OVERTIME_CONFIG;
    }
  }
  return NextResponse.json({ config });
}

// POST — lưu cấu hình (chỉ owner)
export async function POST(req: Request) {
  const user = sessionUser(await getServerSession(authOptions));
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "owner") return NextResponse.json({ error: "Chỉ chủ tài khoản mới chỉnh được" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const config = sanitizeOvertimeConfig(body?.config ?? body);

  await prisma.company.update({
    where: { id: user.companyId },
    data: { overtimeRates: JSON.stringify(config) },
  });
  return NextResponse.json({ ok: true, config });
}
