import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTalentToken } from "@/lib/talentToken";
import { computeTalentStats } from "@/lib/talentStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cựu nhân viên đồng ý tham gia cộng đồng + điền mong muốn (token bảo vệ, không cần đăng nhập)
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); }

  const token = String(body.token ?? "");
  const payload = verifyTalentToken(token);
  if (!payload) return NextResponse.json({ error: "Link đã hết hạn hoặc không hợp lệ." }, { status: 401 });

  // action: "opt_in" (đồng ý + lưu) | "opt_out" (rút khỏi cộng đồng)
  const action = body.action === "opt_out" ? "opt_out" : "opt_in";
  const str = (v: unknown) => { const s = typeof v === "string" ? v.trim() : ""; return s || null; };
  const num = (v: unknown) => { const n = typeof v === "number" ? v : parseInt(String(v), 10); return Number.isFinite(n) ? n : null; };

  const emp = await prisma.employee.findFirst({ where: { id: payload.employeeId, companyId: payload.companyId }, select: { id: true } });
  if (!emp) return NextResponse.json({ error: "Không tìm thấy hồ sơ." }, { status: 404 });

  if (action === "opt_out") {
    await prisma.talentProfile.updateMany({ where: { employeeId: emp.id }, data: { isOpen: false } });
    await prisma.talentInvite.updateMany({ where: { employeeId: emp.id }, data: { status: "declined" } });
    return NextResponse.json({ ok: true, optedOut: true });
  }

  if (body.consent !== true) {
    return NextResponse.json({ error: "Vui lòng đồng ý điều khoản để tham gia." }, { status: 400 });
  }

  // Snapshot chỉ số (lấy lại lúc opt-in để chắc chắn)
  const stats = await computeTalentStats(emp.id);

  await prisma.talentProfile.upsert({
    where: { employeeId: emp.id },
    create: {
      employeeId: emp.id, sourceCompanyId: payload.companyId, isOpen: true,
      desiredTitle: str(body.desiredTitle), desiredArea: str(body.desiredArea),
      desiredSalaryMin: num(body.desiredSalaryMin), desiredSalaryMax: num(body.desiredSalaryMax),
      skills: str(body.skills), bio: str(body.bio), showAvatar: body.showAvatar === true,
      vAttendance: stats.vAttendance, vPunctuality: stats.vPunctuality, vTenureMonths: stats.vTenureMonths, vScore: stats.vScore, vStatsAt: new Date(),
    },
    update: {
      isOpen: true,
      desiredTitle: str(body.desiredTitle), desiredArea: str(body.desiredArea),
      desiredSalaryMin: num(body.desiredSalaryMin), desiredSalaryMax: num(body.desiredSalaryMax),
      skills: str(body.skills), bio: str(body.bio), showAvatar: body.showAvatar === true,
    },
  });

  await prisma.talentInvite.updateMany({ where: { employeeId: emp.id }, data: { status: "opted_in", optedInAt: new Date() } });

  return NextResponse.json({ ok: true });
}
