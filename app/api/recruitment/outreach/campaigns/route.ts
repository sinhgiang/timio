import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scopedBranchId, type ScopeUser } from "@/lib/branchScope";
import { fallbackRank, type MatchProfile } from "@/lib/talentMatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CONTACTS = 50;

function normPhone(p: string | null | undefined) {
  return (p || "").replace(/[\s.]/g, "");
}
function normEmail(e: string | null | undefined) {
  return (e || "").toLowerCase().trim();
}

// Trạng thái tính vào phễu
const FUNNEL_STATUSES = ["sent", "opened", "replied", "interested", "interviewed", "hired"] as const;

async function requireBusiness(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  return company?.plan === "business";
}

// GET — danh sách chiến dịch + đếm phễu
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const b = scopedBranchId(user);
  const campaigns = await prisma.outreachCampaign.findMany({
    where: { companyId, ...(b ? { OR: [{ branchId: b }, { branchId: null }] } : {}) },
    orderBy: { createdAt: "desc" },
  });

  const ids = campaigns.map((c) => c.id);
  const contacts = ids.length
    ? await prisma.outreachContact.findMany({ where: { campaignId: { in: ids } }, select: { campaignId: true, status: true } })
    : [];

  const jobIds = Array.from(new Set(campaigns.map((c) => c.jobId)));
  const jobs = jobIds.length
    ? await prisma.jobPosting.findMany({ where: { id: { in: jobIds } }, select: { id: true, title: true } })
    : [];
  const jobMap = new Map(jobs.map((j) => [j.id, j.title]));

  const items = campaigns.map((c) => {
    const cc = contacts.filter((x) => x.campaignId === c.id);
    const funnel = {
      total: cc.length,
      sent: cc.filter((x) => (FUNNEL_STATUSES as readonly string[]).includes(x.status)).length,
      replied: cc.filter((x) => ["replied", "interested", "interviewed", "hired"].includes(x.status)).length,
      interested: cc.filter((x) => ["interested", "interviewed", "hired"].includes(x.status)).length,
      interviewed: cc.filter((x) => ["interviewed", "hired"].includes(x.status)).length,
      hired: cc.filter((x) => x.status === "hired").length,
    };
    return { ...c, jobTitle: jobMap.get(c.jobId) ?? "(vị trí đã xóa)", funnel };
  });

  return NextResponse.json({ campaigns: items });
}

// POST — tạo chiến dịch, tự nạp danh sách ứng viên có cơ sở đồng ý + xếp hạng
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as ScopeUser | undefined;
  const companyId = user?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user?.role === "accountant") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  if (!(await requireBusiness(companyId))) {
    return NextResponse.json({ error: "Liên hệ chủ động chỉ có ở gói Business.", locked: true }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const jobId: string = body.jobId || "";
  const sources: string[] = Array.isArray(body.sources) && body.sources.length ? body.sources : ["ex_employee", "candidate"];
  if (!jobId) return NextResponse.json({ error: "Thiếu vị trí tuyển dụng." }, { status: 400 });

  const b = scopedBranchId(user);
  const job = await prisma.jobPosting.findFirst({
    where: { id: jobId, companyId, ...(b ? { OR: [{ branchId: b }, { branchId: null }] } : {}) },
    select: { id: true, title: true, department: true, location: true, requirements: true, description: true, salaryMin: true, salaryMax: true, branchId: true },
  });
  if (!job) return NextResponse.json({ error: "Không tìm thấy vị trí." }, { status: 404 });

  // Sổ từ chối nhận tin → loại ngay
  const optOuts = await prisma.outreachOptOut.findMany({ where: { companyId }, select: { contact: true } });
  const blocked = new Set(optOuts.map((o) => o.contact));

  type Cand = { kind: string; refId: string; name: string; email: string | null; phone: string | null; position: string | null; text: string };
  const pool: Cand[] = [];
  const seen = new Set<string>(); // dedupe theo email/phone

  const dedupeKey = (email: string | null, phone: string | null) => `${normEmail(email)}|${normPhone(phone)}`;
  const isBlocked = (email: string | null, phone: string | null) =>
    (normEmail(email) && blocked.has(normEmail(email))) || (normPhone(phone) && blocked.has(normPhone(phone)));

  // 1. Cựu nhân viên của công ty (đã nghỉ) — boomerang, có quan hệ + liên hệ
  if (sources.includes("ex_employee")) {
    const exEmps = await prisma.employee.findMany({
      where: { companyId, status: { not: "active" }, ...(b ? { branchId: b } : {}) },
      select: { id: true, name: true, email: true, phone: true, position: true, department: true },
      take: 300,
    });
    for (const e of exEmps) {
      if (!e.email && !e.phone) continue;
      if (isBlocked(e.email, e.phone)) continue;
      const key = dedupeKey(e.email, e.phone);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({ kind: "ex_employee", refId: e.id, name: e.name, email: e.email, phone: e.phone, position: e.position, text: [e.position, e.department].filter(Boolean).join(" ") });
    }
  }

  // 2. Ứng viên đã từng nộp (đã đồng ý khi ứng tuyển) — không lấy người đã tuyển
  if (sources.includes("candidate")) {
    const cands = await prisma.candidate.findMany({
      where: { companyId, status: { not: "hired" }, ...(b ? { job: { OR: [{ branchId: b }, { branchId: null }] } } : {}) },
      select: { id: true, name: true, email: true, phone: true, experience: true, notes: true, job: { select: { title: true } } },
      take: 300,
    });
    for (const c of cands) {
      if (!c.email && !c.phone) continue;
      if (isBlocked(c.email, c.phone)) continue;
      const key = dedupeKey(c.email, c.phone);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({ kind: "candidate", refId: c.id, name: c.name, email: c.email, phone: c.phone, position: c.job?.title ?? null, text: [c.experience, c.notes].filter(Boolean).join(" ") });
    }
  }

  if (pool.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy ứng viên phù hợp (cựu NV / ứng viên cũ có email/SĐT, chưa từ chối nhận tin)." }, { status: 400 });
  }

  // Xếp hạng theo độ khớp với vị trí (không cần AI — dùng từ khóa)
  const matchInput: MatchProfile[] = pool.map((p, i) => ({
    id: String(i),
    desiredTitle: p.position,
    skills: p.text,
    bio: p.text,
  }));
  const ranked = fallbackRank(job, matchInput);
  const top = ranked.slice(0, MAX_CONTACTS);

  const campaign = await prisma.outreachCampaign.create({
    data: {
      companyId,
      jobId: job.id,
      name: `Liên hệ: ${job.title}`,
      branchId: job.branchId ?? null,
      createdBy: (user as { email?: string })?.email ?? null,
    },
  });

  await prisma.outreachContact.createMany({
    data: top.map((r) => {
      const p = pool[Number(r.id)];
      return {
        campaignId: campaign.id,
        companyId,
        kind: p.kind,
        refId: p.refId,
        name: p.name,
        email: p.email,
        phone: p.phone,
        position: p.position,
        matchScore: r.matchScore,
        matchReason: r.reason,
      };
    }),
  });

  return NextResponse.json({ ok: true, campaignId: campaign.id, contactCount: top.length }, { status: 201 });
}
