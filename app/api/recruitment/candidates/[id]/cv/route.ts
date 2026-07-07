import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Xem/tải file CV của ứng viên (chỉ owner/manager trong phạm vi chi nhánh)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const b = scopedBranchId(user);
  const cand = await prisma.candidate.findFirst({
    where: { id: params.id, companyId, ...(b ? { job: { OR: [{ branchId: b }, { branchId: null }] } } : {}) },
    select: { cvFile: true, cvFileName: true },
  });
  if (!cand?.cvFile) return NextResponse.json({ error: "Không có file CV" }, { status: 404 });

  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(cand.cvFile);
  if (!m) return NextResponse.json({ error: "File CV không hợp lệ" }, { status: 400 });

  const mediaType = m[1];
  const buf = Buffer.from(m[2], "base64");
  const ext = mediaType === "application/pdf" ? "pdf" : mediaType.split("/")[1] || "bin";
  const fileName = cand.cvFileName || `CV.${ext}`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": mediaType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
