import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { scoreCandidate, aiConfigured } from "@/lib/recruitAI";
import { makeApplicationToken } from "@/lib/applicationToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Rate limit đơn giản trong bộ nhớ (lớp chặn nhẹ; serverless có thể reset — kèm honeypot + dedupe DB)
const ipHits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000; // 1 giờ
const MAX_PER_WINDOW = 5;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (ipHits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    ipHits.set(key, arr);
    return true;
  }
  arr.push(now);
  ipHits.set(key, arr);
  // Dọn map để không phình bộ nhớ
  if (ipHits.size > 5000) {
    ipHits.forEach((v, k) => {
      if (v.every((t) => now - t >= WINDOW_MS)) ipHits.delete(k);
    });
  }
  return false;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function normalizePhone(raw: string): string {
  return raw.replace(/[\s.\-()]/g, "");
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const slug = String(body.slug || "").trim();
  const jobId = String(body.jobId || "").trim();
  const name = String(body.name || "").trim();
  const phoneRaw = String(body.phone || "").trim();
  const email = body.email ? String(body.email).trim() : null;
  const birthYear = body.birthYear ? String(body.birthYear).trim() : null;
  let experience = body.experience ? String(body.experience).trim() : null;
  // Câu trả lời sàng lọc (nếu có) → gộp vào phần giới thiệu để AI chấm + admin xem
  if (Array.isArray(body.screening) && body.screening.length) {
    const qa = (body.screening as { q?: unknown; a?: unknown }[])
      .map((x) => ({ q: String(x?.q ?? "").trim(), a: String(x?.a ?? "").trim() }))
      .filter((x) => x.q && x.a)
      .slice(0, 5)
      .map((x) => `• ${x.q}\n  → ${x.a}`)
      .join("\n");
    if (qa) experience = `${experience ? experience + "\n\n" : ""}[Trả lời sàng lọc]\n${qa}`.slice(0, 3000);
  }
  const cvUrl = body.cvUrl ? String(body.cvUrl).trim() : null;
  const cvFile = typeof body.cvFile === "string" ? body.cvFile : null; // data URI
  const cvFileName = body.cvFileName ? String(body.cvFileName).trim().slice(0, 200) : null;
  const honeypot = String(body.company || "").trim();

  // Honeypot: bot điền field ẩn → giả vờ thành công, không lưu
  if (honeypot.length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (!slug || !jobId) {
    return NextResponse.json({ error: "Thiếu thông tin vị trí." }, { status: 400 });
  }
  if (name.length < 2) {
    return NextResponse.json({ error: "Vui lòng nhập họ tên." }, { status: 400 });
  }
  const phone = normalizePhone(phoneRaw);
  if (!/^0\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "Số điện thoại chưa hợp lệ (10 số, bắt đầu bằng 0)." }, { status: 400 });
  }
  if (experience && experience.length > 3000) {
    return NextResponse.json({ error: "Phần giới thiệu quá dài." }, { status: 400 });
  }

  // Kiểm tra file CV (data URI PDF/ảnh, tối đa ~4MB → base64 ~5.6MB)
  let cvMediaType: string | null = null;
  let cvBase64: string | null = null;
  if (cvFile) {
    const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(cvFile);
    if (!m) return NextResponse.json({ error: "File CV không hợp lệ." }, { status: 400 });
    cvMediaType = m[1];
    cvBase64 = m[2];
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(cvMediaType)) {
      return NextResponse.json({ error: "CV chỉ nhận PDF hoặc ảnh (JPG/PNG)." }, { status: 400 });
    }
    if (cvFile.length > 5_800_000) {
      return NextResponse.json({ error: "File CV quá lớn (tối đa 4MB)." }, { status: 400 });
    }
  }

  // Rate limit theo IP + công ty
  const ip = clientIp(req);
  if (rateLimited(`${ip}:${slug}`)) {
    return NextResponse.json(
      { error: "Bạn đã gửi quá nhiều đơn. Vui lòng thử lại sau ít phút." },
      { status: 429 }
    );
  }

  const company = await prisma.company.findUnique({
    where: { slug },
    select: { id: true, name: true, plan: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Không tìm thấy công ty." }, { status: 404 });
  }

  const job = await prisma.jobPosting.findFirst({
    where: { id: jobId, companyId: company.id },
    select: { id: true, title: true, status: true, isPublic: true, branchId: true, requirements: true, description: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Không tìm thấy vị trí tuyển dụng." }, { status: 404 });
  }
  if (job.status !== "open" || !job.isPublic) {
    return NextResponse.json({ error: "Vị trí này đã ngừng nhận hồ sơ." }, { status: 400 });
  }

  // Dedupe: cùng SĐT + cùng vị trí → không tạo trùng
  const existing = await prisma.candidate.findFirst({
    where: { companyId: company.id, jobId: job.id, phone },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Mã giới thiệu (referral): "emp_<employeeId>" | "talent_<profileId>"
  const refRaw = body.ref ? String(body.ref).trim() : "";
  let refInfo: { type: string; id: string; name: string } | null = null;
  if (refRaw) {
    const [pfx, rid] = refRaw.split("_");
    if (pfx === "emp" && rid) {
      const emp = await prisma.employee.findFirst({ where: { id: rid, companyId: company.id }, select: { id: true, name: true } });
      if (emp) refInfo = { type: "employee", id: emp.id, name: emp.name };
    } else if (pfx === "talent" && rid) {
      const tp = await prisma.talentProfile.findFirst({ where: { id: rid }, select: { id: true } });
      if (tp) refInfo = { type: "talent", id: tp.id, name: "Cựu nhân viên" };
    }
  }

  // Gộp năm sinh vào notes để không cần thêm cột
  const notes = birthYear ? `Năm sinh: ${birthYear}` : null;

  let candidate;
  try {
    candidate = await prisma.candidate.create({
      data: {
        companyId: company.id,
        jobId: job.id,
        name,
        phone,
        email: email || null,
        experience: experience || null,
        cvUrl: cvUrl || null,
        cvFile: cvFile || null,
        cvFileName: cvFileName || null,
        notes,
        source: refInfo ? "referral" : "website",
        status: "new",
      },
      select: { id: true },
    });
  } catch (e) {
    console.error("[apply] Lỗi tạo ứng viên:", e);
    return NextResponse.json({ error: "Không lưu được đơn. Vui lòng thử lại." }, { status: 500 });
  }

  // Ghi nhận giới thiệu (referral) — 1 dòng / 1 ứng viên được giới thiệu
  if (refInfo) {
    try {
      await prisma.referral.create({
        data: {
          companyId: company.id,
          jobId: job.id,
          referrerType: refInfo.type,
          referrerId: refInfo.id,
          referrerName: refInfo.name,
          code: `${candidate.id}`,
          candidateId: candidate.id,
          candidateName: name,
          status: "applied",
        },
      });
    } catch (e) {
      console.error("[apply] Lỗi ghi referral (bỏ qua):", e);
    }
  }

  // Chấm điểm AI ngay (chỉ gói Business + có API key) — lỗi AI KHÔNG ảnh hưởng việc lưu đơn
  let aiScore: number | null = null;
  if (company.plan === "business" && aiConfigured()) {
    try {
      const scored = await scoreCandidate(
        { name, experience, phone, notes },
        { title: job.title, requirements: job.requirements, description: job.description },
        {
          file: cvBase64 && cvMediaType ? { data: cvBase64, mediaType: cvMediaType } : undefined,
          link: cvUrl,
        }
      );
      aiScore = scored.score;
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { aiScore: scored.score, aiSummary: scored.summary },
      });
    } catch (e) {
      console.error("[apply] Chấm điểm AI lỗi (bỏ qua):", e);
    }
  }

  // Thông báo admin qua email (không chặn phản hồi — lỗi email vẫn coi là nộp thành công)
  try {
    const admins = await prisma.admin.findMany({
      where: {
        companyId: company.id,
        receiveLeaveEmail: true,
        OR: [
          { role: "owner" },
          // Manager toàn công ty (branchId = null) luôn nhận; manager chi nhánh chỉ nhận nếu job thuộc chi nhánh mình
          { role: "manager", branchId: null },
          ...(job.branchId ? [{ role: "manager", branchId: job.branchId }] : []),
        ],
      },
      select: { email: true },
    });
    const recipients = Array.from(new Set(admins.map((a) => a.email).filter(Boolean)));
    if (recipients.length > 0) {
      const html = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1e3a8a;margin-bottom:4px">Có ứng viên mới 🎉</h2>
          <p style="color:#475569;margin-top:0">Vị trí: <b>${esc(job.title)}</b>${aiScore != null ? ` · <span style="color:${aiScore >= 70 ? "#16a34a" : aiScore >= 40 ? "#d97706" : "#64748b"}">Điểm AI: ${aiScore}/100</span>` : ""}</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155">
            <tr><td style="padding:6px 0;color:#64748b">Họ tên</td><td style="padding:6px 0"><b>${esc(name)}</b></td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Điện thoại</td><td style="padding:6px 0">${esc(phone)}</td></tr>
            ${email ? `<tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0">${esc(email)}</td></tr>` : ""}
            ${birthYear ? `<tr><td style="padding:6px 0;color:#64748b">Năm sinh</td><td style="padding:6px 0">${esc(birthYear)}</td></tr>` : ""}
            ${experience ? `<tr><td style="padding:6px 0;color:#64748b;vertical-align:top">Giới thiệu</td><td style="padding:6px 0">${esc(experience).replace(/\n/g, "<br>")}</td></tr>` : ""}
            ${cvUrl ? `<tr><td style="padding:6px 0;color:#64748b">CV</td><td style="padding:6px 0"><a href="${esc(cvUrl)}">${esc(cvUrl)}</a></td></tr>` : ""}
          </table>
          <p style="margin-top:16px">
            <a href="https://timio.vn/dashboard/recruitment" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Xem trong bảng điều khiển</a>
          </p>
          <p style="color:#94a3b8;font-size:12px;margin-top:20px">Timio — ${esc(company.name)}</p>
        </div>`;
      await sendEmail({
        to: recipients.join(","),
        subject: `Ứng viên mới: ${name} — ${job.title}`,
        html,
      });
    }
  } catch (e) {
    console.error("[apply] Lỗi gửi email thông báo (đơn vẫn được lưu):", e);
  }

  // Email tự động xác nhận cho ứng viên (nếu có email) — không chặn phản hồi
  if (email) {
    try {
      const logo = (await prisma.company.findUnique({ where: { id: company.id }, select: { logoUrl: true } }))?.logoUrl;
      const head = logo
        ? `<div style="text-align:center;margin-bottom:18px"><img src="${logo}" alt="${esc(company.name)}" style="max-height:52px;max-width:180px"></div>`
        : `<div style="font-weight:bold;font-size:18px;color:#111827;margin-bottom:14px">${esc(company.name)}</div>`;
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
        ${head}
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Chào ${esc(name)},</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px"><b>${esc(company.name)}</b> đã nhận được hồ sơ ứng tuyển vị trí <b>${esc(job.title)}</b> của bạn.</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Chúng tôi sẽ xem xét và liên hệ lại với bạn qua số điện thoại sớm nhất. Cảm ơn bạn đã quan tâm!</p>
        <p style="font-size:15px;line-height:1.6;margin:0 0 12px"><a href="${(process.env.NEXTAUTH_URL || "https://timio.vn")}/ung-tuyen/${makeApplicationToken(candidate.id)}" style="color:#2563eb;font-weight:600">Theo dõi trạng thái hồ sơ của bạn →</a></p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0">
        <p style="font-size:12px;color:#9ca3af;margin:0">Email tự động từ ${esc(company.name)} qua hệ thống tuyển dụng Timio.</p>
      </div>`;
      await sendEmail({ to: email, subject: `Đã nhận hồ sơ — ${job.title} — ${company.name}`, html });
    } catch (e) {
      console.error("[apply] Lỗi gửi email xác nhận cho ứng viên (bỏ qua):", e);
    }
  }

  return NextResponse.json({ ok: true, candidateId: candidate.id });
}
