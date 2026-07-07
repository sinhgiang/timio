import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.RECRUIT_AI_MODEL ?? process.env.CHAT_MODEL ?? "claude-haiku-4-5";

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Bỏ ký hiệu markdown để dán sạch lên Facebook/Zalo (2 nền tảng không render markdown)
function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")      // **đậm**
    .replace(/__([^_]+)__/g, "$1")          // __đậm__
    .replace(/(^|\n)\s{0,3}#{1,6}\s*/g, "$1") // # tiêu đề
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")  // `code`
    .replace(/(^|\n)\s*\*\s+/g, "$1• ")     // bullet "* " → "• "
    .replace(/\*+/g, "")                       // sao lẻ còn sót
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

CHÍNH TẢ (RẤT QUAN TRỌNG): Viết đúng chính tả tiếng Việt CHUẨN 100%, có dấu đầy đủ. Đầu vào có thể từ giọng nói nên SAI chính tả/nghe nhầm — bạn PHẢI TỰ SỬA cho đúng (ví dụ: "tạc vụ"/"đặc vụ" → "tạp vụ"; "chuyển sự" → "tuyển sự"). TUYỆT ĐỐI không để lỗi chính tả trong bài viết ra.

NGUYÊN TẮC CHUYÊN GIA:
- Bám sát cơ cấu công ty đã cho (phòng ban, chức vụ, các vị trí đã tuyển) để đặt tên vị trí & mô tả cho NHẤT QUÁN với công ty. Nếu gợi ý khớp một chức vụ có sẵn, ưu tiên dùng đúng tên đó.
- ĐIỀN ĐẦY ĐỦ CÁC TRƯỜNG: nếu người dùng có NÓI RÕ phòng ban → điền "department" (khớp phòng ban công ty nếu có, không thì dùng đúng từ họ nói). Nếu nói rõ ĐỊA ĐIỂM/khu vực → điền "location". Nếu nói rõ CHI NHÁNH và tên đó KHỚP một chi nhánh công ty → điền "branchName" đúng y tên chi nhánh đó (không khớp thì để rỗng và ghi địa điểm vào "location").
- Mô tả công việc: 5-8 gạch đầu dòng cụ thể, ĐẦY ĐỦ, dùng ĐỘNG TỪ hành động, rõ đầu việc hằng ngày — không chung chung. Có thể mở đầu bằng 1 câu giới thiệu ngắn hấp dẫn rồi xuống dòng liệt kê.
- Yêu cầu: 4-6 ý, tách "Bắt buộc" và "Ưu tiên" nếu hợp lý; thực tế với thị trường lao động Việt Nam, không đòi hỏi quá mức cho vị trí phổ thông.
- Quyền lợi: 4-6 ý hấp dẫn nhưng TRUNG THỰC (lương thưởng, chế độ, môi trường, cơ hội) — KHÔNG bịa phúc lợi không có căn cứ.
- ĐỊNH DẠNG BẮT BUỘC (rất quan trọng): 3 trường description/requirements/benefits — MỖI Ý MỘT DÒNG RIÊNG, bắt đầu bằng "• " và ngăn cách bằng ký tự xuống dòng thật (\\n). TUYỆT ĐỐI KHÔNG gộp nhiều ý thành 1 đoạn văn dài. Viết ĐẦY ĐỦ, chi tiết, chuyên nghiệp — đừng viết cụt lủn. KHÔNG dùng markdown (** #).
- Giọng văn: chuyên nghiệp, tích cực, thân thiện, "chuẩn nhà tuyển dụng"; tiếng Việt chuẩn, có dấu đầy đủ.
- Suy luận thông minh: nếu chỉ có lương theo giờ, quy đổi khoảng lương tháng hợp lý (~26 ngày, ca 8h) khi đủ căn cứ; suy ra ca làm, số lượng nếu gợi ý có nêu.

CHỈ trả về DUY NHẤT một JSON hợp lệ (không markdown, không giải thích), schema:
{
  "title": "tên vị trí ngắn gọn, đúng chuẩn",
  "department": "phòng ban nếu người dùng nói rõ, không thì rỗng",
  "location": "địa điểm/khu vực nếu người dùng nói rõ, không thì rỗng",
  "branchName": "tên chi nhánh KHỚP danh sách chi nhánh công ty nếu người dùng nói rõ, không thì rỗng",
  "description": "mô tả — MỖI Ý một dòng '• ...' cách nhau bằng \\n",
  "requirements": "yêu cầu — MỖI Ý một dòng '• ...' cách nhau bằng \\n",
  "benefits": "quyền lợi — MỖI Ý một dòng '• ...' cách nhau bằng \\n",
  "workTime": "ca/giờ làm nếu suy ra được, không thì rỗng",
  "quantity": number hoặc null,
  "salaryMin": number VND hoặc null,
  "salaryMax": number VND hoặc null
}`;

  const user = `THÔNG TIN CÔNG TY:
${contextLines.join("\n")}

GỢI Ý CỦA CHỦ DOANH NGHIỆP (có thể chỉ vài từ): "${hint}"

Hãy soạn bài tuyển dụng hoàn chỉnh, chuyên nghiệp như chuyên gia 15 năm kinh nghiệm. Chỉ trả JSON.`;
  const text = await complete(system, user, 2200);
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

export interface CvInput {
  // CV tải lên dạng file (PDF hoặc ảnh) — AI đọc trực tiếp
  file?: { data: string; mediaType: string }; // data = base64 thuần (không có tiền tố data:)
  link?: string | null; // link CV (Drive/FB...) — tín hiệu uy tín, AI KHÔNG tự mở được
}

export async function scoreCandidate(
  candidate: { name: string; experience?: string | null; phone?: string | null; notes?: string | null },
  job: { title: string; requirements?: string | null; description?: string | null },
  cv?: CvInput
): Promise<CandidateScore> {
  const hasFile = !!cv?.file?.data;
  const hasLink = !!cv?.link;

  const system = `Bạn là chuyên viên tuyển dụng TRUNG THỰC. Chấm mức độ phù hợp của ứng viên với vị trí, thang 0-100. QUY TẮC:
- Nếu thiếu dữ liệu (ứng viên không ghi kinh nghiệm gì, không có CV) → cho điểm TRUNG TÍNH 50 và ghi rõ "chưa đủ thông tin", KHÔNG suy diễn.
- Không thiên vị, không bịa. Điểm cao chỉ khi kinh nghiệm/kỹ năng thực sự khớp yêu cầu.
- HỒ SƠ CV: ứng viên có ĐÍNH KÈM CV (file hoặc link) thể hiện sự chuyên nghiệp, chuẩn bị kỹ → cộng thêm khoảng 5-10 điểm uy tín (so với người chỉ gõ vài dòng), MIỄN LÀ nội dung CV thật sự hợp lý.
- Nếu có FILE CV đính kèm: ĐỌC KỸ nội dung CV (kinh nghiệm, kỹ năng, học vấn, nơi từng làm) và dùng nó làm căn cứ CHÍNH để chấm; tóm tắt điểm nổi bật trong CV.
- Nếu chỉ có LINK CV (không có file): coi là tín hiệu tích cực (có chuẩn bị CV) nhưng bạn KHÔNG mở được link ngoài — ghi chú "ứng viên có gửi link CV, cần xem thêm" và chấm dựa trên thông tin đã có + cộng nhẹ uy tín.
Trả về DUY NHẤT JSON: {"score": number 0-100, "summary": "tóm tắt 2-4 câu tiếng Việt: điểm mạnh/yếu, điểm nổi bật trong CV (nếu có), và lý do điểm"}`;

  const userText = `VỊ TRÍ: ${job.title}
Yêu cầu: ${job.requirements || "(không ghi)"}
Mô tả: ${job.description || "(không ghi)"}

ỨNG VIÊN: ${candidate.name}
Kinh nghiệm/giới thiệu tự khai: ${candidate.experience || "(không ghi)"}
Ghi chú: ${candidate.notes || "(không có)"}
${hasFile ? "CV: có FILE đính kèm bên dưới — hãy đọc kỹ." : ""}${hasLink ? `\nLink CV ứng viên gửi (bạn không tự mở được): ${cv!.link}` : ""}

Chấm điểm (chỉ trả JSON).`;

  let text = "";
  try {
    if (hasFile) {
      // Gửi kèm CV để Claude đọc trực tiếp (PDF qua document block, ảnh qua image block)
      const mt = cv!.file!.mediaType;
      const block =
        mt === "application/pdf"
          ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: cv!.file!.data } }
          : { type: "image" as const, source: { type: "base64" as const, media_type: (mt as "image/jpeg" | "image/png" | "image/webp"), data: cv!.file!.data } };
      const msg = await client().messages.create({
        model: MODEL,
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: [block, { type: "text", text: userText }] }],
      });
      const b = msg.content.find((x) => x.type === "text");
      text = b && b.type === "text" ? b.text : "";
    } else {
      text = await complete(system, userText, 500);
    }
  } catch {
    // Nếu đọc file lỗi (định dạng lạ) → chấm theo text, vẫn coi là có CV
    text = await complete(system, userText, 500);
  }

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
  job: {
    title: string; department?: string | null; description?: string | null; requirements?: string | null;
    benefits?: string | null; salaryMin?: number | null; salaryMax?: number | null;
    location?: string | null; workTime?: string | null; quantity?: number | null;
  },
  publicUrl: string,
  companyName: string
): Promise<string> {
  const sal =
    job.salaryMin && job.salaryMax
      ? `${job.salaryMin.toLocaleString("vi-VN")} - ${job.salaryMax.toLocaleString("vi-VN")} VND/tháng`
      : job.salaryMin
      ? `từ ${job.salaryMin.toLocaleString("vi-VN")} VND/tháng`
      : "Thỏa thuận theo năng lực";

  const system = `Bạn là CHUYÊN GIA TUYỂN DỤNG & MARKETING NHÂN SỰ 15 NĂM kinh nghiệm tại Việt Nam, viết bài đăng tuyển cho Facebook/Zalo đạt tương tác và ứng tuyển cao. Nhiệm vụ: dựa TRÊN NỘI DUNG TIN TUYỂN DỤNG ĐÃ CÓ, viết lại thành BÀI ĐĂNG MẠNG XÃ HỘI HOÀN CHỈNH, CHUYÊN NGHIỆP, đúng văn hóa & thị trường lao động Việt Nam.

QUY TẮC BẮT BUỘC:
1. CHÍNH TẢ tiếng Việt CHUẨN 100%, có dấu đầy đủ. Tự sửa mọi lỗi chính tả trong dữ liệu đầu vào (VD "tạc vụ" → "tạp vụ"). TUYỆT ĐỐI không sai chính tả.
2. KHÔNG dùng markdown (KHÔNG **, __, #, \`). Đây là Facebook/Zalo — chúng KHÔNG hiển thị markdown, sẽ hiện ra dấu sao xấu. Muốn nhấn mạnh thì dùng CHỮ IN HOA hoặc emoji, KHÔNG dùng dấu sao.
3. ĐƯỢC dùng emoji phù hợp (📍💰⏰✅📞🔥...) và gạch đầu dòng bằng "•" hoặc emoji.
4. Bài viết ĐẦY ĐỦ & CHUYÊN NGHIỆP như người làm nhân sự thật: tiêu đề hút mắt → giới thiệu ngắn về công ty/cơ hội → MÔ TẢ CÔNG VIỆC → YÊU CẦU → QUYỀN LỢI (đầy đủ, bám nội dung đã cho) → thông tin lương/địa điểm/ca làm/số lượng → lời kêu gọi ứng tuyển → link. Giọng văn tự nhiên, thân thiện, đáng tin của người Việt.
5. Dựa SÁT nội dung tin đã cung cấp, không bịa thêm phúc lợi vô căn cứ. Kết bài có dòng kêu gọi + "👉 Ứng tuyển ngay: <link>".
6. Chỉ trả về NỘI DUNG BÀI ĐĂNG (không giải thích, không markdown).`;

  const user = `THÔNG TIN TIN TUYỂN DỤNG ĐÃ SOẠN (viết lại thành bài đăng MXH, đừng bịa thêm):
Công ty: ${companyName}
Vị trí: ${job.title}${job.department ? ` — Phòng ${job.department}` : ""}
Số lượng: ${job.quantity ? `${job.quantity} người` : "(không nêu)"}
Lương: ${sal}
Ca/giờ làm: ${job.workTime || "(không nêu)"}
Địa điểm: ${job.location || "(không nêu)"}

MÔ TẢ CÔNG VIỆC:
${job.description || "(chưa có — hãy viết hợp lý theo vị trí)"}

YÊU CẦU:
${job.requirements || "(chưa có)"}

QUYỀN LỢI:
${job.benefits || "(chưa có — hãy nêu quyền lợi hợp lý, trung thực)"}

Link ứng tuyển: ${publicUrl}

Viết bài đăng tuyển dụng chuyên nghiệp, đầy đủ cho Facebook/Zalo (tiếng Việt, không markdown).`;

  const text = await complete(system, user, 1200);
  let content = stripMarkdown(text.trim());
  if (!content.includes(publicUrl)) content = `${content}\n\n👉 Ứng tuyển ngay: ${publicUrl}`;
  return content;
}
