import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.RECRUIT_AI_MODEL ?? process.env.CHAT_MODEL ?? "claude-haiku-4-5";

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Trích JSON đầu tiên trong text (phòng khi model bọc ```json ... ```)
function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

async function complete(system: string, user: string, maxTokens = 1024): Promise<string> {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

// ─── 1. Sinh tin tuyển dụng từ 1 câu ────────────────────────────────────────────

export interface GeneratedJD {
  title: string;
  description: string;
  requirements: string;
  benefits: string;
  workTime: string;
  quantity: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
}

export async function generateJD(hint: string, companyName: string): Promise<GeneratedJD> {
  const system = `Bạn là chuyên viên tuyển dụng cho doanh nghiệp vừa và nhỏ ở Việt Nam. Nhiệm vụ: từ mô tả ngắn của chủ doanh nghiệp, soạn một tin tuyển dụng đầy đủ, tiếng Việt, giọng thân thiện, thực tế (phù hợp quán ăn, cửa hàng, xưởng nhỏ...). KHÔNG bịa quyền lợi quá mức. Trả về DUY NHẤT một JSON hợp lệ, không thêm chữ nào ngoài JSON, theo schema:
{
  "title": "tên vị trí ngắn gọn",
  "description": "mô tả công việc, mỗi ý một dòng (dùng \\n)",
  "requirements": "yêu cầu, mỗi ý một dòng",
  "benefits": "quyền lợi, mỗi ý một dòng",
  "workTime": "ca/giờ làm nếu suy ra được, không thì để rỗng",
  "quantity": số lượng cần tuyển (number) hoặc null,
  "salaryMin": lương tối thiểu VND (number) hoặc null,
  "salaryMax": lương tối đa VND (number) hoặc null
}
Nếu mô tả có mức lương theo giờ, quy đổi hợp lý ra khoảng lương tháng (giả định ~26 ngày, ca 8h) chỉ khi chắc chắn, không thì để null.`;

  const user = `Công ty: ${companyName}\nMô tả của chủ: "${hint}"\n\nSoạn tin tuyển dụng (chỉ trả JSON).`;
  const text = await complete(system, user, 1200);
  const parsed = extractJson<Partial<GeneratedJD>>(text);
  return {
    title: (parsed?.title || "").toString().trim() || hint.slice(0, 60),
    description: (parsed?.description || "").toString().trim(),
    requirements: (parsed?.requirements || "").toString().trim(),
    benefits: (parsed?.benefits || "").toString().trim(),
    workTime: (parsed?.workTime || "").toString().trim(),
    quantity: typeof parsed?.quantity === "number" ? parsed!.quantity : null,
    salaryMin: typeof parsed?.salaryMin === "number" ? parsed!.salaryMin : null,
    salaryMax: typeof parsed?.salaryMax === "number" ? parsed!.salaryMax : null,
  };
}

// ─── 2. Chấm điểm ứng viên ───────────────────────────────────────────────────────

export interface CandidateScore {
  score: number; // 0-100
  summary: string;
}

export async function scoreCandidate(
  candidate: { name: string; experience?: string | null; phone?: string | null; notes?: string | null },
  job: { title: string; requirements?: string | null; description?: string | null }
): Promise<CandidateScore> {
  const system = `Bạn là chuyên viên tuyển dụng TRUNG THỰC. Chấm mức độ phù hợp của ứng viên với vị trí, thang 0-100. QUY TẮC:
- Nếu thiếu dữ liệu (ứng viên không ghi kinh nghiệm gì) → cho điểm TRUNG TÍNH 50 và ghi rõ "chưa đủ thông tin", KHÔNG suy diễn.
- Không thiên vị, không bịa. Điểm cao chỉ khi kinh nghiệm/kỹ năng thực sự khớp yêu cầu.
Trả về DUY NHẤT JSON: {"score": number 0-100, "summary": "tóm tắt ≤ 3 câu tiếng Việt, nêu điểm mạnh/yếu và lý do điểm"}`;

  const user = `VỊ TRÍ: ${job.title}
Yêu cầu: ${job.requirements || "(không ghi)"}
Mô tả: ${job.description || "(không ghi)"}

ỨNG VIÊN: ${candidate.name}
Kinh nghiệm/giới thiệu: ${candidate.experience || "(không ghi)"}
Ghi chú: ${candidate.notes || "(không có)"}

Chấm điểm (chỉ trả JSON).`;

  const text = await complete(system, user, 400);
  const parsed = extractJson<Partial<CandidateScore>>(text);
  let score = typeof parsed?.score === "number" ? Math.round(parsed!.score) : 50;
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return {
    score,
    summary: (parsed?.summary || "").toString().trim() || "Chưa đủ thông tin để đánh giá.",
  };
}

// ─── 3. Soạn bài đăng Facebook/Zalo ──────────────────────────────────────────────

export async function generateSocialPost(
  job: { title: string; salaryMin?: number | null; salaryMax?: number | null; location?: string | null; workTime?: string | null; benefits?: string | null; quantity?: number | null },
  publicUrl: string,
  companyName: string
): Promise<string> {
  const sal =
    job.salaryMin && job.salaryMax
      ? `${job.salaryMin.toLocaleString("vi-VN")}–${job.salaryMax.toLocaleString("vi-VN")}đ`
      : job.salaryMin
      ? `từ ${job.salaryMin.toLocaleString("vi-VN")}đ`
      : "thỏa thuận";

  const system = `Bạn là người viết content tuyển dụng cho mạng xã hội (Facebook/Zalo) ở Việt Nam. Viết bài đăng NGẮN, bắt mắt, có emoji phù hợp, xuống dòng thoáng, kêu gọi ứng tuyển. Đây là content MXH nên ĐƯỢC dùng emoji. Kết bài PHẢI có dòng "👉 Ứng tuyển: <link>". Chỉ trả về nội dung bài đăng, không giải thích.`;

  const user = `Công ty: ${companyName}
Vị trí: ${job.title}${job.quantity ? ` (tuyển ${job.quantity} người)` : ""}
Lương: ${sal}
${job.workTime ? `Ca làm: ${job.workTime}\n` : ""}${job.location ? `Địa điểm: ${job.location}\n` : ""}${job.benefits ? `Quyền lợi: ${job.benefits}\n` : ""}Link ứng tuyển: ${publicUrl}

Viết bài đăng tuyển dụng cho Facebook/Zalo.`;

  const text = await complete(system, user, 600);
  const content = text.trim();
  // Đảm bảo có link (phòng khi model quên)
  return content.includes(publicUrl) ? content : `${content}\n\n👉 Ứng tuyển: ${publicUrl}`;
}
