import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeTrustScore, levelFromScore } from "@/lib/trustScore";
import { notifyWorkerById } from "@/lib/workerNotify";
import { sendEmail } from "@/lib/email";
import { signTalentToken } from "@/lib/talentToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COST_PER_CONNECT = 1;   // 1 credit / lượt "Quan tâm" (hoàn nếu ứng viên từ chối)
const WELCOME_CREDITS = 3;    // tặng khi công ty lần đầu dùng kho ứng viên

function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c)); }
const mask = (id: string) => `Ứng viên #${id.slice(-4).toUpperCase()}`;

// Ví credit dùng CHUNG cho cả 2 nguồn; lần đầu tặng WELCOME_CREDITS.
async function ensureBalance(companyId: string): Promise<number> {
  const row = await prisma.talentCredit.upsert({
    where: { companyId },
    create: { companyId, balance: WELCOME_CREDITS },
    update: {},
    select: { balance: true },
  });
  return row.balance;
}

type Cand = {
  source: "worker" | "talent";
  id: string;
  name: string;
  avatarUrl: string | null;
  trustScore: number | null;
  trustLevel: string;
  trustLabel: string;
  daysWorked: number;
  experienceMonths: number;
  desiredPosition: string | null;
  desiredArea: string | null;
  keywords: string[];
  connectionStatus: string | null;
  phone: string | null;
  zalo: string | null;
  handle: string | null;
  email: string | null;
};

// GET — KHO ỨNG VIÊN XÁC THỰC gộp 2 nguồn:
//   • worker: NLĐ tự đăng ký tài khoản + bật "đang tìm việc" (họ tên đầy đủ, opt-in)
//   • talent: cựu NV được công ty mời vào cộng đồng (ẩn danh đến khi đồng ý)
// Cả hai đều consent-first; lộ liên hệ chỉ khi ứng viên đồng ý.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const companyId = user.companyId;

  const { searchParams } = new URL(req.url);
  const minTrust = parseInt(searchParams.get("minTrust") ?? "0") || 0;
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const occupation = (searchParams.get("occupation") ?? "").trim();
  const area = (searchParams.get("area") ?? "").trim();
  const sourceFilter = (searchParams.get("source") ?? "").trim(); // "" | "worker" | "talent"

  const balance = await ensureBalance(companyId);
  const now = Date.now();
  const out: Cand[] = [];
  const shownWorkerIds = new Set<string>(); // để dedup: 1 người vừa có WorkerAccount vừa có TalentProfile chỉ hiện 1 lần

  // ─── Nguồn 1: WorkerAccount (NLĐ tự đăng ký) ───
  if (sourceFilter !== "talent") {
    const workers = await prisma.workerAccount.findMany({
      where: { openToWork: true, activatedAt: { not: null } },
      select: { id: true, name: true, avatarUrl: true, desiredArea: true, desiredPosition: true, keywords: true, shareTrustScore: true, phone: true, zalo: true, handle: true },
      take: 120,
    });
    if (workers.length > 0) {
      const workerIds = workers.map((w) => w.id);
      const emps = await prisma.employee.findMany({
        where: { workerAccountId: { in: workerIds } },
        select: { id: true, workerAccountId: true, position: true, joinDate: true, companyId: true, status: true },
      });
      // KHÔNG cho công ty thấy nhân viên ĐANG LÀM cho chính mình mà bật "tìm việc".
      const excludeSet = new Set(
        emps.filter((e) => e.companyId === companyId && e.status === "active").map((e) => e.workerAccountId!)
      );
      const visible = workers.filter((w) => !excludeSet.has(w.id));
      const allEmpIds = emps.map((e) => e.id);
      const empToWorker = new Map(emps.map((e) => [e.id, e.workerAccountId!]));

      const [totalG, onTimeG, conns] = await Promise.all([
        allEmpIds.length ? prisma.attendanceLog.groupBy({ by: ["employeeId"], where: { employeeId: { in: allEmpIds }, checkInAt: { not: null } }, _count: { _all: true } }) : Promise.resolve([]),
        allEmpIds.length ? prisma.attendanceLog.groupBy({ by: ["employeeId"], where: { employeeId: { in: allEmpIds }, checkInAt: { not: null }, minutesLate: 0 }, _count: { _all: true } }) : Promise.resolve([]),
        prisma.workerConnection.findMany({ where: { companyId, workerAccountId: { in: workerIds } }, select: { workerAccountId: true, status: true } }),
      ]);

      const totalByW = new Map<string, number>();
      const onTimeByW = new Map<string, number>();
      const earliestByW = new Map<string, number>();
      const posByW = new Map<string, string>();
      for (const g of totalG as { employeeId: string; _count: { _all: number } }[]) { const w = empToWorker.get(g.employeeId); if (w) totalByW.set(w, (totalByW.get(w) ?? 0) + g._count._all); }
      for (const g of onTimeG as { employeeId: string; _count: { _all: number } }[]) { const w = empToWorker.get(g.employeeId); if (w) onTimeByW.set(w, (onTimeByW.get(w) ?? 0) + g._count._all); }
      for (const e of emps) { if (e.joinDate) { const t = e.joinDate.getTime(); const cur = earliestByW.get(e.workerAccountId!); if (cur === undefined || t < cur) earliestByW.set(e.workerAccountId!, t); } }
      for (const e of emps) { if (e.position && !posByW.has(e.workerAccountId!)) posByW.set(e.workerAccountId!, e.position); }
      const connByW = new Map(conns.map((c) => [c.workerAccountId, c.status]));

      for (const w of visible) {
        const total = totalByW.get(w.id) ?? 0;
        const onTime = onTimeByW.get(w.id) ?? 0;
        const punctualityRate = total > 0 ? Math.round((onTime / total) * 100) : null;
        const earliest = earliestByW.get(w.id);
        const expMonths = earliest ? Math.max(0, Math.round((now - earliest) / (30 * 86400000))) : 0;
        const trust = computeTrustScore({ punctualityRate, totalDaysWorked: total, experienceMonths: expMonths });
        const connStatus = connByW.get(w.id) ?? null;
        const revealed = connStatus === "accepted";
        out.push({
          source: "worker", id: w.id, name: w.name, avatarUrl: w.avatarUrl,
          trustScore: w.shareTrustScore ? trust.score : null,
          trustLevel: w.shareTrustScore ? trust.level : "new",
          trustLabel: w.shareTrustScore ? trust.levelLabel : "",
          daysWorked: total, experienceMonths: expMonths,
          desiredPosition: w.desiredPosition || posByW.get(w.id) || null,
          desiredArea: w.desiredArea || null,
          keywords: (w.keywords || "").split(",").map((k) => k.trim()).filter(Boolean),
          connectionStatus: connStatus,
          phone: revealed ? w.phone : null, zalo: revealed ? w.zalo : null, handle: revealed ? w.handle : null, email: null,
        });
        shownWorkerIds.add(w.id);
      }
    }
  }

  // ─── Nguồn 2: TalentProfile (cựu NV cộng đồng, ẩn danh đến khi đồng ý) ───
  if (sourceFilter !== "worker") {
    const profiles = await prisma.talentProfile.findMany({
      where: { isOpen: true, sourceCompanyId: { not: companyId } },
      select: { id: true, employeeId: true, desiredTitle: true, desiredArea: true, skills: true, vScore: true, vTenureMonths: true },
      take: 120,
    });
    if (profiles.length > 0) {
      const profileIds = profiles.map((p) => p.id);
      const interests = await prisma.talentInterest.findMany({
        where: { companyId, profileId: { in: profileIds } },
        select: { profileId: true, status: true },
      });
      const statusByProfile = new Map(interests.map((i) => [i.profileId, i.status]));
      // Lấy employee cho MỌI hồ sơ (để dedup theo workerAccountId + lấy liên hệ khi accepted)
      const allEmpIds = profiles.map((p) => p.employeeId);
      const emps = await prisma.employee.findMany({ where: { id: { in: allEmpIds } }, select: { id: true, name: true, phone: true, email: true, workerAccountId: true } });
      const empById = new Map(emps.map((e) => [e.id, e]));

      for (const p of profiles) {
        // Dedup: nếu người này đã hiện ở nguồn WorkerAccount thì bỏ qua bản cựu-NV
        const emp = empById.get(p.employeeId);
        if (emp?.workerAccountId && shownWorkerIds.has(emp.workerAccountId)) continue;
        const status = statusByProfile.get(p.id) ?? null;
        const revealed = status === "accepted";
        const contact = revealed ? emp : null;
        const lv = levelFromScore(p.vScore ?? null);
        out.push({
          source: "talent", id: p.id,
          name: revealed && contact ? contact.name : mask(p.id),
          avatarUrl: null,
          trustScore: p.vScore ?? null, trustLevel: lv.level, trustLabel: lv.levelLabel,
          daysWorked: 0, experienceMonths: p.vTenureMonths ?? 0,
          desiredPosition: p.desiredTitle || null, desiredArea: p.desiredArea || null,
          keywords: (p.skills || "").split(",").map((k) => k.trim()).filter(Boolean),
          connectionStatus: status,
          phone: revealed && contact ? contact.phone : null, zalo: null, handle: null,
          email: revealed && contact ? contact.email : null,
        });
      }
    }
  }

  const candidates = out
    .filter((c) => (c.trustScore ?? 0) >= minTrust)
    .filter((c) => !occupation || c.desiredPosition === occupation)
    .filter((c) => !area || c.desiredArea === area)
    .filter((c) => !q || (c.desiredPosition ?? "").toLowerCase().includes(q) || (c.desiredArea ?? "").toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q)))
    .sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0));

  return NextResponse.json({ candidates, balance, canTopup: user.role === "owner" });
}

// POST — công ty "Quan tâm" 1 ứng viên → TRỪ 1 CREDIT (hoàn nếu từ chối), báo ứng viên (consent-first).
// body: { source: "worker"|"talent", id, note? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string; role?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const companyId = user.companyId;

  const { source, id, note } = await req.json().catch(() => ({}));
  if (!id || (source !== "worker" && source !== "talent")) return NextResponse.json({ error: "Thiếu ứng viên." }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  const companyName = company?.name ?? "Công ty";
  const cleanNote = (note || "").toString().slice(0, 200) || null;

  if (source === "worker") {
    const w = await prisma.workerAccount.findUnique({ where: { id }, select: { openToWork: true, autoAcceptRecruiters: true } });
    if (!w?.openToWork) return NextResponse.json({ error: "Ứng viên không còn tìm việc." }, { status: 400 });

    const ownActive = await prisma.employee.findFirst({ where: { workerAccountId: id, companyId, status: "active" }, select: { id: true } });
    if (ownActive) return NextResponse.json({ error: "Đây là nhân viên đang làm cho công ty bạn." }, { status: 400 });

    const existing = await prisma.workerConnection.findFirst({ where: { companyId, workerAccountId: id, status: { in: ["pending", "accepted"] } } });
    if (existing) return NextResponse.json({ ok: true, status: existing.status, already: true });

    // Trừ credit (điều kiện) — chỉ trừ khi còn đủ
    const bal = await ensureBalance(companyId);
    if (bal < COST_PER_CONNECT) return NextResponse.json({ error: "Không đủ credit — hãy nạp thêm.", needCredit: true, balance: bal }, { status: 402 });
    await prisma.talentCredit.update({ where: { companyId }, data: { balance: { decrement: COST_PER_CONNECT } } });

    const status = w.autoAcceptRecruiters ? "accepted" : "pending";
    await prisma.workerConnection.create({
      data: { companyId, companyName, workerAccountId: id, note: cleanNote, status, chargedCredits: COST_PER_CONNECT, respondedAt: status === "accepted" ? new Date() : null },
    });
    await notifyWorkerById(id, {
      type: "recruiter",
      title: status === "accepted" ? `${companyName} muốn liên hệ với bạn` : `${companyName} quan tâm đến bạn`,
      body: status === "accepted" ? "Bạn đã bật cho phép mọi nhà tuyển dụng — họ đã có thể liên hệ." : "Bấm \"Cho phép liên hệ\" để chia sẻ số điện thoại.",
      link: "profile", email: true,
    });
    return NextResponse.json({ ok: true, status, balanceLeft: bal - COST_PER_CONNECT });
  }

  // source === "talent" (cựu NV cộng đồng)
  const profile = await prisma.talentProfile.findFirst({
    where: { id, isOpen: true, sourceCompanyId: { not: companyId } },
    select: { id: true, employeeId: true, desiredTitle: true },
  });
  if (!profile) return NextResponse.json({ error: "Không tìm thấy hồ sơ (hoặc đã đóng)." }, { status: 404 });

  const existing = await prisma.talentInterest.findFirst({ where: { profileId: id, companyId, status: { in: ["pending", "accepted"] } }, select: { status: true } });
  if (existing) return NextResponse.json({ ok: true, status: existing.status, already: true });

  const bal = await ensureBalance(companyId);
  if (bal < COST_PER_CONNECT) return NextResponse.json({ error: "Không đủ credit — hãy nạp thêm.", needCredit: true, balance: bal }, { status: 402 });
  await prisma.talentCredit.update({ where: { companyId }, data: { balance: { decrement: COST_PER_CONNECT } } });

  await prisma.talentInterest.create({
    data: { profileId: id, companyId, message: cleanNote, status: "pending", chargedCredits: COST_PER_CONNECT },
  });

  // Báo cựu NV qua email cá nhân (ẩn danh cho đến khi họ đồng ý)
  const emp = await prisma.employee.findUnique({ where: { id: profile.employeeId }, select: { name: true, email: true, companyId: true } });
  if (emp?.email) {
    try {
      const token = signTalentToken(profile.employeeId, emp.companyId);
      const link = `https://timio.vn/talent/${encodeURIComponent(token)}`;
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
        <div style="font-weight:bold;font-size:18px;color:#2563eb;margin-bottom:12px">Cộng đồng ứng viên Timio</div>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Chào ${esc(emp.name)},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Có <b>một nhà tuyển dụng quan tâm hồ sơ của bạn</b>${profile.desiredTitle ? ` cho vị trí <b>${esc(profile.desiredTitle)}</b>` : ""}. Thông tin của bạn vẫn <b>ẩn danh</b> cho đến khi bạn đồng ý.</p>
        <p style="text-align:center;margin:22px 0"><a href="${link}" style="background:#2563eb;color:#fff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px">Xem &amp; phản hồi →</a></p>
        <p style="font-size:12px;color:#9ca3af;margin:0">Bạn toàn quyền Đồng ý hoặc Từ chối. Chỉ khi bạn đồng ý, nhà tuyển dụng mới thấy liên hệ của bạn.</p>
      </div>`;
      await sendEmail({ to: emp.email, subject: `Có nhà tuyển dụng quan tâm bạn — Timio`, html });
    } catch (e) { console.error("[talent-pool] email lỗi:", e); }
  }
  return NextResponse.json({ ok: true, status: "pending", balanceLeft: bal - COST_PER_CONNECT });
}
