import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.RECRUIT_AI_MODEL ?? process.env.CHAT_MODEL ?? "claude-haiku-4-5";

export function matchAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

export interface MatchJob {
  title: string;
  department?: string | null;
  location?: string | null;
  requirements?: string | null;
  description?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
}

export interface MatchProfile {
  id: string;
  desiredTitle?: string | null;
  desiredArea?: string | null;
  skills?: string | null;
  bio?: string | null;
  desiredSalaryMin?: number | null;
  desiredSalaryMax?: number | null;
  vScore?: number | null;
  vDevScore?: number | null;
}

export interface MatchResult {
  id: string;
  matchScore: number; // 0-100
  reason: string;
}

// ─── Chấm điểm khớp KHÔNG cần AI (dự phòng khi thiếu API key) ────────────────────
function keywordScore(job: MatchJob, p: MatchProfile): number {
  const jobText = stripAccents([job.title, job.department, job.requirements, job.description].filter(Boolean).join(" "));
  const jobWords = new Set(jobText.split(/[^a-z0-9]+/).filter((w) => w.length >= 3));
  const pText = stripAccents([p.desiredTitle, p.skills, p.bio].filter(Boolean).join(" "));
  const pWords = pText.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  if (pWords.length === 0 || jobWords.size === 0) return 0;
  let hit = 0;
  const seen = new Set<string>();
  for (const w of pWords) {
    if (seen.has(w)) continue;
    seen.add(w);
    if (jobWords.has(w)) hit++;
  }
  // Tỉ lệ từ khóa hồ sơ trùng với tin tuyển dụng, chuẩn hóa nhẹ
  const overlap = Math.min(1, hit / 6);
  // Khu vực khớp cộng thêm
  const areaBonus = job.location && p.desiredArea && stripAccents(p.desiredArea).includes(stripAccents(job.location).split(",")[0].trim())
    ? 0.15 : 0;
  return Math.round(Math.min(1, overlap + areaBonus) * 100);
}

export function fallbackRank(job: MatchJob, profiles: MatchProfile[]): MatchResult[] {
  return profiles
    .map((p) => {
      const kw = keywordScore(job, p);
      // Kết hợp độ khớp từ khóa (70%) + điểm xác thực trung bình (30%)
      const verif = Math.max(p.vScore ?? 0, p.vDevScore ?? 0);
      const matchScore = Math.round(kw * 0.7 + verif * 0.3);
      const reason = kw >= 40
        ? "Kỹ năng/vị trí mong muốn khớp với tin tuyển dụng."
        : "Khớp một phần — cân nhắc theo điểm xác thực.";
      return { id: p.id, matchScore, reason };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

function extractJsonArray<T>(text: string): T[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T[];
  } catch {
    return null;
  }
}

// ─── Xếp hạng bằng AI: hồ sơ ẨN DANH (không tên/công ty) khớp với 1 tin tuyển dụng ──
export async function rankTalentForJob(job: MatchJob, profiles: MatchProfile[]): Promise<MatchResult[]> {
  if (profiles.length === 0) return [];
  // Giới hạn số hồ sơ gửi lên AI (ưu tiên điểm xác thực cao) để kiểm soát token
  const capped = [...profiles]
    .sort((a, b) => Math.max(b.vScore ?? 0, b.vDevScore ?? 0) - Math.max(a.vScore ?? 0, a.vDevScore ?? 0))
    .slice(0, 40);

  if (!matchAiConfigured()) return fallbackRank(job, capped);

  const sal = job.salaryMin || job.salaryMax
    ? `${job.salaryMin?.toLocaleString("vi-VN") ?? "?"} - ${job.salaryMax?.toLocaleString("vi-VN") ?? "?"} VND`
    : "(không nêu)";

  const system = `Bạn là chuyên gia tuyển dụng TRUNG THỰC. Nhiệm vụ: xếp hạng mức độ PHÙ HỢP của từng ứng viên (ẩn danh) với MỘT vị trí đang tuyển, thang 0-100.
QUY TẮC:
- Chấm dựa trên: vị trí mong muốn, kỹ năng, giới thiệu, khu vực, mức lương mong muốn so với yêu cầu công việc.
- Điểm xác thực (chuyên cần / phát triển) là điểm CỘNG cho độ tin cậy, KHÔNG thay cho độ khớp chuyên môn.
- Thiếu dữ liệu → cho điểm TRUNG TÍNH (~50), KHÔNG suy diễn. Không bịa.
- "reason": 1 câu tiếng Việt ngắn gọn giải thích vì sao khớp/không khớp (KHÔNG nhắc tên công ty).
CHỈ trả về DUY NHẤT một JSON array, mỗi phần tử: {"id":"<id ứng viên>","score":<0-100>,"reason":"<1 câu>"}. Không markdown, không giải thích ngoài JSON.`;

  const lines = capped.map((p) => {
    const psal = p.desiredSalaryMin || p.desiredSalaryMax
      ? `${p.desiredSalaryMin?.toLocaleString("vi-VN") ?? "?"}-${p.desiredSalaryMax?.toLocaleString("vi-VN") ?? "?"}` : "?";
    return `- id=${p.id} | Vị trí mong muốn: ${p.desiredTitle || "(không ghi)"} | Khu vực: ${p.desiredArea || "?"} | Lương mong muốn: ${psal} | Kỹ năng: ${p.skills || "(không ghi)"} | Giới thiệu: ${(p.bio || "").slice(0, 200) || "(không ghi)"} | Điểm chuyên cần: ${p.vScore ?? "?"} | Điểm phát triển: ${p.vDevScore ?? "?"}`;
  }).join("\n");

  const userMsg = `VỊ TRÍ ĐANG TUYỂN:
Tên: ${job.title}${job.department ? ` — Phòng ${job.department}` : ""}
Địa điểm: ${job.location || "(không nêu)"}
Lương: ${sal}
Yêu cầu: ${job.requirements || "(không ghi)"}
Mô tả: ${(job.description || "").slice(0, 500) || "(không ghi)"}

DANH SÁCH ỨNG VIÊN (ẩn danh):
${lines}

Xếp hạng tất cả ứng viên trên. Chỉ trả JSON array.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: userMsg }],
    });
    const block = msg.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text : "";
    const arr = extractJsonArray<{ id: string; score: number; reason: string }>(text);
    if (!arr) return fallbackRank(job, capped);

    const byId = new Map(capped.map((p) => [p.id, p]));
    const results: MatchResult[] = arr
      .filter((r) => r && byId.has(String(r.id)))
      .map((r) => ({
        id: String(r.id),
        matchScore: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
        reason: String(r.reason || "").trim() || "Phù hợp một phần.",
      }));
    // Bổ sung hồ sơ AI bỏ sót bằng điểm dự phòng
    const covered = new Set(results.map((r) => r.id));
    for (const p of capped) {
      if (!covered.has(p.id)) {
        const fb = fallbackRank(job, [p])[0];
        results.push(fb);
      }
    }
    return results.sort((a, b) => b.matchScore - a.matchScore);
  } catch (e) {
    console.error("[talentMatch] AI lỗi, dùng fallback:", e);
    return fallbackRank(job, capped);
  }
}
