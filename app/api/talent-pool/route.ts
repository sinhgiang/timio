import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeTrustScore } from "@/lib/trustScore";
import { notifyWorkerById } from "@/lib/workerNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — kho ứng viên xác thực (NV đang tìm việc, opt-in). Ẩn danh; lộ liên hệ khi NV đã đồng ý kết nối.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const minTrust = parseInt(searchParams.get("minTrust") ?? "0") || 0;
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const occupation = (searchParams.get("occupation") ?? "").trim();
  const area = (searchParams.get("area") ?? "").trim();

  const workers = await prisma.workerAccount.findMany({
    where: { openToWork: true, activatedAt: { not: null } },
    select: { id: true, name: true, avatarUrl: true, desiredArea: true, desiredPosition: true, keywords: true, shareTrustScore: true, shareContact: true, phone: true },
    take: 120,
  });
  if (workers.length === 0) return NextResponse.json({ candidates: [] });

  const workerIds = workers.map((w) => w.id);
  const emps = await prisma.employee.findMany({
    where: { workerAccountId: { in: workerIds } },
    select: { id: true, workerAccountId: true, position: true, joinDate: true, companyId: true, status: true },
  });

  // ⚠️ QUAN TRỌNG: KHÔNG cho công ty thấy nhân viên ĐANG LÀM cho chính mình mà bật "tìm việc".
  // (Cựu NV đã nghỉ vẫn hiện để tái tuyển; chỉ ẩn người đang active tại công ty này.)
  const excludeSet = new Set(
    emps.filter((e) => e.companyId === user.companyId && e.status === "active").map((e) => e.workerAccountId!)
  );
  const visibleWorkers = workers.filter((w) => !excludeSet.has(w.id));
  if (visibleWorkers.length === 0) return NextResponse.json({ candidates: [] });

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

  const candidates = visibleWorkers.map((w) => {
    const total = totalByWorker.get(w.id) ?? 0;
    const onTime = onTimeByWorker.get(w.id) ?? 0;
    const punctualityRate = total > 0 ? Math.round((onTime / total) * 100) : null;
    const earliest = earliestByWorker.get(w.id);
    const expMonths = earliest ? Math.max(0, Math.round((now - earliest) / (30 * 86400000))) : 0;
    const trust = computeTrustScore({ punctualityRate, totalDaysWorked: total, experienceMonths: expMonths });
    const connStatus = connByWorker.get(w.id) ?? null;
    const revealed = connStatus === "accepted";
    const kw = (w.keywords || "").split(",").map((k) => k.trim()).filter(Boolean);
    return {
      workerAccountId: w.id,
      name: w.name,                        // họ tên đầy đủ (NV đã bật "đang tìm việc")
      avatarUrl: w.avatarUrl,
      trustScore: w.shareTrustScore ? trust.score : null,
      trustLevel: w.shareTrustScore ? trust.level : "new",
      trustLabel: w.shareTrustScore ? trust.levelLabel : "",
      daysWorked: total,
      experienceMonths: expMonths,
      desiredPosition: w.desiredPosition || posByWorker.get(w.id) || null,
      desiredArea: w.desiredArea || null,
      keywords: kw,
      connectionStatus: connStatus,
      phone: revealed && w.shareContact ? w.phone : null,
    };
  }).filter((c) => (c.trustScore ?? 0) >= minTrust)
    .filter((c) => !occupation || c.desiredPosition === occupation)
    .filter((c) => !area || c.desiredArea === area)
    .filter((c) => !q || (c.desiredPosition ?? "").toLowerCase().includes(q) || (c.desiredArea ?? "").toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q)))
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

  const w = await prisma.workerAccount.findUnique({ where: { id: workerAccountId }, select: { openToWork: true, autoAcceptRecruiters: true } });
  if (!w?.openToWork) return NextResponse.json({ error: "Ứng viên không còn tìm việc." }, { status: 400 });

  // Chặn: không kết nối với chính nhân viên đang làm cho mình
  const ownActive = await prisma.employee.findFirst({ where: { workerAccountId, companyId: user.companyId, status: "active" }, select: { id: true } });
  if (ownActive) return NextResponse.json({ error: "Đây là nhân viên đang làm cho công ty bạn." }, { status: 400 });

  const existing = await prisma.workerConnection.findFirst({ where: { companyId: user.companyId, workerAccountId, status: { in: ["pending", "accepted"] } } });
  if (existing) return NextResponse.json({ ok: true, status: existing.status, already: true });

  const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { name: true } });
  const companyName = company?.name ?? "Công ty";
  // NV bật "cho mọi NTD liên hệ" → tự đồng ý ngay; ngược lại chờ NV duyệt
  const status = w.autoAcceptRecruiters ? "accepted" : "pending";
  await prisma.workerConnection.create({
    data: { companyId: user.companyId, companyName, workerAccountId, note: (note || "").slice(0, 200) || null, status, respondedAt: status === "accepted" ? new Date() : null },
  });
  await notifyWorkerById(workerAccountId, {
    type: "recruiter",
    title: status === "accepted" ? `${companyName} muốn liên hệ với bạn` : `${companyName} quan tâm đến bạn`,
    body: status === "accepted" ? "Bạn đã bật cho phép mọi nhà tuyển dụng — họ đã có thể liên hệ." : "Bấm \"Cho phép liên hệ\" để chia sẻ số điện thoại.",
    link: "profile", email: true,
  });
  return NextResponse.json({ ok: true, status });
}
