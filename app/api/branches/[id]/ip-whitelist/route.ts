import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branch = await prisma.branch.findFirst({
    where: { id: params.id, companyId },
    select: { allowedIPs: true },
  });
  if (!branch) return NextResponse.json({ error: "Không tìm thấy chi nhánh" }, { status: 404 });

  let ips: string[] = [];
  try { ips = branch.allowedIPs ? JSON.parse(branch.allowedIPs) : []; } catch { /* ignore */ }
  return NextResponse.json({ ips });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ips } = await req.json();
  if (!Array.isArray(ips)) return NextResponse.json({ error: "ips phải là mảng" }, { status: 400 });

  const branch = await prisma.branch.findFirst({ where: { id: params.id, companyId } });
  if (!branch) return NextResponse.json({ error: "Không tìm thấy chi nhánh" }, { status: 404 });

  try {
    const cleaned = ips.map((ip: string) => ip.trim()).filter(Boolean);
    await prisma.branch.update({
      where: { id: params.id },
      data: { allowedIPs: cleaned.length > 0 ? JSON.stringify(cleaned) : null },
    });
    return NextResponse.json({ ok: true, ips: cleaned });
  } catch {
    return NextResponse.json({ error: "Lỗi lưu — vui lòng chạy SQL migration" }, { status: 500 });
  }
}
