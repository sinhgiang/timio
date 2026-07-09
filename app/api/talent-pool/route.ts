import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeTrustScore } from "@/lib/trustScore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function anonName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  const last = parts.pop()!;
  return [...parts, last[0] + "."].join(" ");
}

// GET — kho ứng viên xác thực (NV đang tìm việc, opt-in). Ẩn danh; lộ liên hệ khi NV đã đồng ý kết nối.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const minTrust = parseInt(searchParams.get("minTrust") ?? "0") || 0;
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();

  const workers = await prisma.workerAccount.findMany({
    where: { openToWork: true, activatedAt: { not: null } },
    select: { id: true, name: true, avatarUrl: true, desiredArea: true, desiredPosition: true, shareTrustScore: true, shareContact: true, phone: true },
    take: 80,
  });
  if (workers.length === 0) return NextResponse.json({ candidates: [] });

  const workerIds = workers.map((w) => w.id);
  const emps = await prisma.employee.findMany({
    where: { workerAccountId: { in: workerIds } },
    select: { id: true, workerAccountId: true, position: true, joinDate: true },
  });
  const allEmpIds = emps.map((e) => e.id);
  const empToWorker = new Map(emps.map((e) => [e.id, e.workerAccountId!]));

  const [totalG, onTimeG, conns] = await Promise.all([
    allEmpIds.length ? prisma.attendanceLog.groupBy({ by: ["employeeId"], where: { employeeId: { in: allEmpIds }, checkInAt: { not: null } }, _count: { _all: true } }) : Promise.resolve([]),
    allEmpIds.length ? prisma.attendanceLog.groupBy({ by: ["employeeId"], where: { employeeId: { in: allEmpIds }, checkInAt: { not: null }, minutesLate: 0 }, _count: { _all: true } }) : Promise.resolve([]),
    prisma.workerConnection.findMany({ where: { companyId: user.companyId, workerAccountId: { in: workerIds } }, select: { workerAccountId: true, status: true } }),
  ]);

  const now = Date.now();
  const totalByWorker = new Map<string, number>();
  const onTimeByWorker = new Map<string, number>();
  const earliestByWorker = new Map<string, number>();
  for (const g of totalG as { employeeId: string; _count: { _all: number } }[]) {
    const w = empToWorker.get(g.employeeId); if (w) totalByWorker.set(w, (totalByWorker.get(w) ?? 0) + g._count._all);
  }
  for (const g of onTimeG as { employeeId: string; _count: { _all: number } }[]) {
    const w = empToWorker.get(g.employeeId); if (w) onTimeByWorker.set(w, (onTimeByWorker.get(w) ?? 0) + g._count._all);
  }
  for (const e of emps) {
    if (e.joinDate) { const t = e.joinDate.getTime(); const cur = earliestByWorker.get(e.workerAccountId!); if (cur === undefined || t < cur) earliestByWorker.set(e.workerAccountId!, t); }
  }
  const posByWorker = new Map<string, string>();
  for (const e of emps) { if (e.position && !posByWorker.has(e.workerAccountId!)) posByWorker.set(e.workerAccountId!, e.position); }
  const connByWorker = new Map(conns.map((c) => [c.workerAccountId, c.status]));

  const candidates = workers.map((w) => {
    const total = totalByWorker.get(w.id) ?? 0;
    const onTime = onTimeByWorker.get(w.id) ?? 0;
    const punctualityRate = total > 0 ? Math.round((onTime / total) * 100) : null;
    const earliest = earliestByWorker.get(w.id);
    const expMonths = earliest ? Math.max(0, Math.round((now - earliest) / (30 * 86400000))) : 0;
    const trust = computeTrustScore({ punctualityRate, totalDaysWorked: total, experienceMonths: expMonths });
    const connStatus = connByWorker.get(w.id) ?? null;
    const revealed = connStatus === "accepted";
    return {
      workerAccountId: w.id,
      name: revealed ? w.name : anonName(w.name),
      avatarUrl: revealed ? w.avatarUrl : null,
      trustScore: w.shareTrustScore ? trust.score : null,
      trustLevel: w.shareTrustScore ? trust.level : "new",
      trustLabel: w.shareTrustScore ? trust.levelLabel : "",
      daysWorked: total,
      experienceMonths: expMonths,
      desiredPosition: w.desiredPosition || posByWorker.get(w.id) || null,
      desiredArea: w.desiredArea || null,
      connectionStatus: connStatus,
      phone: revealed && w.shareContact ? w.phone : null,
    };
  }).filter((c) => (c.trustScore ?? 0) >= minTrust)
    .filter((c) => !q || (c.desiredPosition ?? "").toLowerCase().includes(q) || (c.desiredArea ?? "").toLowerCase().includes(q))
    .sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0));

  return NextResponse.json({ candidates });
}

// POST — công ty bày tỏ quan tâm 1 ứng viên. body: { workerAccountId, note? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { workerAccountId, note } = await req.json().catch(() => ({}));
  if (!workerAccountId) return NextResponse.json({ error: "Thiếu ứng viên." }, { status: 400 });

  const w = await prisma.workerAccount.findUnique({ where: { id: workerAccountId }, select: { openToWork: true } });
  if (!w?.openToWork) return NextResponse.json({ error: "Ứng viên không còn tìm việc." }, { status: 400 });

  const existing = await prisma.workerConnection.findFirst({ where: { companyId: user.companyId, workerAccountId, status: { in: ["pending", "accepted"] } } });
  if (existing) return NextResponse.json({ ok: true, status: existing.status, already: true });

  const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { name: true } });
  await prisma.workerConnection.create({
    data: { companyId: user.companyId, companyName: company?.name ?? "Công ty", workerAccountId, note: (note || "").slice(0, 200) || null, status: "pending" },
  });
  return NextResponse.json({ ok: true, status: "pending" });
}
