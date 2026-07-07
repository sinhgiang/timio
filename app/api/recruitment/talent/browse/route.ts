import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

// Nhà tuyển dụng duyệt kho ứng viên xác thực — ẨN DANH, loại người của chính công ty mình
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  if (company?.plan !== "business") {
    return NextResponse.json({ error: "Tìm ứng viên trong cộng đồng chỉ có ở gói Business.", locked: true }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const viTri = stripAccents(searchParams.get("vi_tri") || "");
  const khuVuc = stripAccents(searchParams.get("khu_vuc") || "");
  const diemMin = parseInt(searchParams.get("diem_min") || "0", 10) || 0;

  // Danh sách SĐT/email nhân viên ĐANG LÀM ở công ty này → để loại (không cho sếp thấy người của mình)
  const myActive = await prisma.employee.findMany({
    where: { companyId, status: "active" },
    select: { phone: true, email: true },
  });
  const myPhones = new Set(myActive.map((e) => (e.phone || "").replace(/[\s.]/g, "")).filter(Boolean));
  const myEmails = new Set(myActive.map((e) => (e.email || "").toLowerCase().trim()).filter(Boolean));

  // Hồ sơ đang mở, KHÔNG thuộc công ty đang xem (nguồn)
  const profiles = await prisma.talentProfile.findMany({
    where: { isOpen: true, sourceCompanyId: { not: companyId } },
    select: {
      id: true, employeeId: true, desiredTitle: true, desiredArea: true, desiredSalaryMin: true, desiredSalaryMax: true,
      skills: true, bio: true, vScore: true, vAttendance: true, vPunctuality: true, vTenureMonths: true,
      vDevScore: true, vDevTrend: true, vPromotions: true, vReviewCount: true, createdAt: true,
    },
    orderBy: [{ vScore: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  // Lấy phone/email của các employee này để loại người đang làm ở công ty mình
  const empIds = profiles.map((p) => p.employeeId);
  const emps = await prisma.employee.findMany({ where: { id: { in: empIds } }, select: { id: true, phone: true, email: true } });
  const empMap = new Map(emps.map((e) => [e.id, e]));

  const items = profiles
    .filter((p) => {
      const e = empMap.get(p.employeeId);
      if (!e) return true;
      const ph = (e.phone || "").replace(/[\s.]/g, "");
      const em = (e.email || "").toLowerCase().trim();
      if (ph && myPhones.has(ph)) return false; // đang làm ở công ty mình
      if (em && myEmails.has(em)) return false;
      return true;
    })
    .filter((p) => {
      if (viTri && !stripAccents(p.desiredTitle || "").includes(viTri) && !stripAccents(p.skills || "").includes(viTri)) return false;
      if (khuVuc && !stripAccents(p.desiredArea || "").includes(khuVuc)) return false;
      if (diemMin && Math.max(p.vScore ?? 0, p.vDevScore ?? 0) < diemMin) return false;
      return true;
    })
    .map((p) => ({
      id: p.id,
      maskedName: `Ứng viên #${p.id.slice(-4).toUpperCase()}`,
      desiredTitle: p.desiredTitle,
      desiredArea: p.desiredArea,
      desiredSalaryMin: p.desiredSalaryMin,
      desiredSalaryMax: p.desiredSalaryMax,
      skills: p.skills,
      bio: p.bio,
      vScore: p.vScore, vAttendance: p.vAttendance, vPunctuality: p.vPunctuality, vTenureMonths: p.vTenureMonths,
      vDevScore: p.vDevScore, vDevTrend: p.vDevTrend, vPromotions: p.vPromotions, vReviewCount: p.vReviewCount,
    }));

  return NextResponse.json({ total: items.length, candidates: items });
}
