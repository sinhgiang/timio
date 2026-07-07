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
  department: string;
  location: string;
  branchName: string; // tên chi nhánh nếu người dùng nói rõ (khớp danh sách chi nhánh công ty), không thì rỗng
  description: string;
  requirements: string;
  benefits: string;
  workTime: string;
  quantity: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
}

export interface CompanyContext {
  name: string;
  departments?: string[]; // phòng ban công ty đang có
  positions?: string[]; // chức vụ công ty đang có
  existingTitles?: string[]; // các vị trí đang/đã tuyển
  branches?: string[]; // danh sách chi nhánh của công ty
}

export async function generateJD(hint: string, ctx: CompanyContext): Promise<GeneratedJD> {
  const contextLines: string[] = [`Tên công ty: ${ctx.name}`];
  if (ctx.branches?.length) contextLines.push(`Các chi nhánh của công ty: ${ctx.branches.slice(0, 30).join(", ")}`);
  if (ctx.departments?.length) contextLines.push(`Các phòng ban hiện có: ${ctx.departments.slice(0, 20).join(", ")}`);
  if (ctx.positions?.length) contextLines.push(`Các chức vụ hiện có: ${ctx.positions.slice(0, 20).join(", ")}`);
  if (ctx.existingTitles?.length) contextLines.push(`Vị trí công ty đã đăng tuyển: ${ctx.existingTitles.slice(0, 15).join(", ")}`);

  const system = `Bạn là CHUYÊN GIA TUYỂN DỤNG & EMPLOYER BRANDING với 15 NĂM kinh nghiệm, từng viết hàng nghìn tin tuyển dụng chuyển đổi cao cho doanh nghiệp Việt Nam (từ quán ăn, cửa hàng, xưởng nhỏ đến chuỗi lớn). Nhiệm vụ: từ vài từ gợi ý của chủ doanh nghiệp, soạn một BÀI TUYỂN DỤNG HOÀN CHỈNH, CHUYÊN NGHIỆP, thuyết phục — như một chuyên gia thực thụ.

NGUYÊN TẮC CHUYÊN GIA:
- Bám sát cơ cấu công ty đã cho (phòng ban, chức vụ, các vị trí đã tuyển) để đặt tên vị trí & mô tả cho NHẤT QUÁN với công ty. Nếu gợi ý khớp một chức vụ có sẵn, ưu tiên dùng đúng tên đó.
- ĐIỀN ĐẦY ĐỦ CÁC TRƯỜNG: nếu người dùng có NÓI RÕ phòng ban → điền "department" (khớp phòng ban công ty nếu có, không thì dùng đúng từ họ nói). Nếu nói rõ ĐỊA ĐIỂM/khu vực → điền "location". Nếu nói rõ CHI NHÁNH và tên đó KHỚP một chi nhánh công ty → điền "branchName" đúng y tên chi nhánh đó (không khớp thì để rỗng và ghi địa điểm vào "location").
- Mô tả công việc: 5-8 gạch đầu dòng cụ thể, dùng ĐỘNG TỪ hành động, rõ đầu việc hằng ngày — không chung chung.
- Yêu cầu: 4-6 ý, tách "Bắt buộc" và "Ưu tiên" nếu hợp lý; thực tế với thị trường lao động Việt Nam, không đòi hỏi quá mức cho vị trí phổ thông.
- Quyền lợi: 4-6 ý hấp dẫn nhưng TRUNG THỰC (lương thưởng, chế độ, môi trường, cơ hội) — KHÔNG bịa phúc lợi không có căn cứ.
- Giọng văn: chuyên nghiệp, tích cực, thân thiện, "chuẩn nhà tuyển dụng"; tiếng Việt chuẩn, có dấu đầy đủ; mỗi ý một dòng (\\n). Có thể mở đầu mô tả bằng 1 câu giới thiệu ngắn hấp dẫn.
- Suy luận thông minh: nếu chỉ có lương theo giờ, quy đổi khoảng lương tháng hợp lý (~26 ngày, ca 8h) khi đủ căn cứ; suy ra ca làm, số lượng nếu gợi ý có nêu.

CHỈ trả về DUY NHẤT một JSON hợp lệ (không markdown, không giải thích), schema:
{
  "title": "tên vị trí ngắn gọn, đúng chuẩn",
  "department": "phòng ban nếu người dùng nói rõ, không thì rỗng",
  "location": "địa điểm/khu vực nếu người dùng nói rõ, không thì rỗng",
  "branchName": "tên chi nhánh KHỚP danh sách chi nhánh công ty nếu người dùng nói rõ, không thì rỗng",
  "description": "mô tả công việc, mỗi ý một dòng",
  "requirements": "yêu cầu, mỗi ý một dòng",
  "benefits": "quyền lợi, mỗi ý một dòng",
  "workTime": "ca/giờ làm nếu suy ra được, không thì rỗng",
  "quantity": number hoặc null,
  "salaryMin": number VND hoặc null,
  "salaryMax": number VND hoặc null
}`;

  const user = `THÔNG TIN CÔNG TY:
${contextLines.join("\n")}

GỢI Ý CỦA CHỦ DOANH NGHIỆP (có thể chỉ vài từ): "${hint}"

Hãy soạn bài tuyển dụng hoàn chỉnh, chuyên nghiệp như chuyên gia 15 năm kinh nghiệm. Chỉ trả JSON.`;
  const text = await complete(system, user, 1600);
  const parsed = extractJson<Partial<GeneratedJD>>(text);
  return {
    title: (parsed?.title || "").toString().trim() || hint.slice(0, 60),
    department: (parsed?.department || "").toString().trim(),
    location: (parsed?.location || "").toString().trim(),
    branchName: (parsed?.branchName || "").toString().trim(),
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
