import { prisma } from "@/lib/prisma";
import { computeTrustScore } from "@/lib/trustScore";
import { candidateDisplayName } from "@/lib/candidateVisibility";

export type PublicCandidate = {
  name: string; employed: boolean; handle: string | null;
  position: string; area: string; score: number | null; level: string; exp: number; tags: string[];
};

// Lấy ứng viên công khai (opt-in) + áp quy tắc che tên (đang đi làm → che nửa tên, không lộ link).
export async function getPublicCandidates(limit = 24): Promise<PublicCandidate[]> {
  const workers = await prisma.workerAccount.findMany({
    where: { openToWork: true, profilePublic: true, activatedAt: { not: null } },
    select: { id: true, name: true, handle: true, desiredArea: true, desiredPosition: true, keywords: true, shareTrustScore: true },
    take: limit,
  });
  if (workers.length === 0) return [];

  const ids = workers.map((w) => w.id);
  const emps = await prisma.employee.findMany({ where: { workerAccountId: { in: ids } }, select: { id: true, workerAccountId: true, status: true, position: true, joinDate: true } });
  const activeSet = new Set(emps.filter((e) => e.status === "active").map((e) => e.workerAccountId!));
  const empIds = emps.map((e) => e.id);
  const empToW = new Map(emps.map((e) => [e.id, e.workerAccountId!]));

  const [totalG, onTimeG] = empIds.length ? await Promise.all([
    prisma.attendanceLog.groupBy({ by: ["employeeId"], where: { employeeId: { in: empIds }, checkInAt: { not: null } }, _count: { _all: true } }),
    prisma.attendanceLog.groupBy({ by: ["employeeId"], where: { employeeId: { in: empIds }, checkInAt: { not: null }, minutesLate: 0 }, _count: { _all: true } }),
  ]) : [[], []];

  const now = Date.now();
  const totalByW = new Map<string, number>(), onTimeByW = new Map<string, number>(), earliestByW = new Map<string, number>(), posByW = new Map<string, string>();
  for (const g of totalG as { employeeId: string; _count: { _all: number } }[]) { const w = empToW.get(g.employeeId); if (w) totalByW.set(w, (totalByW.get(w) ?? 0) + g._count._all); }
  for (const g of onTimeG as { employeeId: string; _count: { _all: number } }[]) { const w = empToW.get(g.employeeId); if (w) onTimeByW.set(w, (onTimeByW.get(w) ?? 0) + g._count._all); }
  for (const e of emps) { if (e.joinDate) { const t = e.joinDate.getTime(); const c = earliestByW.get(e.workerAccountId!); if (c === undefined || t < c) earliestByW.set(e.workerAccountId!, t); } if (e.position && !posByW.has(e.workerAccountId!)) posByW.set(e.workerAccountId!, e.position); }

  return workers.map((w) => {
    const total = totalByW.get(w.id) ?? 0;
    const onTime = onTimeByW.get(w.id) ?? 0;
    const rate = total > 0 ? Math.round((onTime / total) * 100) : null;
    const earliest = earliestByW.get(w.id);
    const exp = earliest ? Math.max(0, Math.round((now - earliest) / (30 * 86400000))) : 0;
    const trust = computeTrustScore({ punctualityRate: rate, totalDaysWorked: total, experienceMonths: exp });
    const employed = activeSet.has(w.id);
    return {
      name: candidateDisplayName(w.name, employed),
      employed,
      handle: !employed ? w.handle : null,
      position: w.desiredPosition || posByW.get(w.id) || "Chưa ghi vị trí",
      area: w.desiredArea || "",
      score: w.shareTrustScore ? trust.score : null,
      level: w.shareTrustScore ? trust.level : "new",
      exp, tags: (w.keywords || "").split(",").map((k) => k.trim()).filter(Boolean),
    };
  }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
