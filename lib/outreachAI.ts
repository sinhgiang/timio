import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.RECRUIT_AI_MODEL ?? process.env.CHAT_MODEL ?? "claude-haiku-4-5";

export function outreachAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function complete(system: string, user: string, maxTokens = 600): Promise<string> {
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

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

export interface OutreachContactInput {
  name: string;
  kind: "ex_employee" | "candidate" | "talent";
  position?: string | null; // chức vụ cũ / mong muốn
  matchReason?: string | null;
  trustScore?: number | null; // điểm tin cậy Timio (nếu có)
}

export interface OutreachJobInput {
  title: string;
  location?: string | null;
  workTime?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  benefits?: string | null;
}

export interface OutreachMessage {
  subject: string;
  body: string;
}

// Số bước tối đa của chuỗi (nghiên cứu Gem: 4 là tối ưu, bước 4 = "breakup")
export const MAX_OUTREACH_STEPS = 4;

const STEP_INTENT: Record<number, string> = {
  1: "Tin ĐẦU TIÊN: chào hỏi ấm áp, cá nhân hóa, giới thiệu ngắn gọn cơ hội và mời trò chuyện. Không dài dòng.",
  2: "Tin NHẮC LẠI lần 1 (vài ngày sau tin đầu): nhẹ nhàng hỏi thăm xem đã xem tin trước chưa, nhấn thêm 1 điểm hấp dẫn của công việc.",
  3: "Tin NHẮC LẠI lần 2: thêm giá trị (VD môi trường, lộ trình, phúc lợi cụ thể), tạo lý do phản hồi, vẫn lịch sự không ép.",
  4: "Tin CUỐI ('breakup'): lịch sự khép lại — nói nếu hiện chưa phù hợp thì mình sẽ không làm phiền thêm, để lại lời chúc và cửa mở nếu sau này quan tâm.",
};

function fmtSalary(job: OutreachJobInput): string {
  if (job.salaryMin && job.salaryMax) return `${job.salaryMin.toLocaleString("vi-VN")} - ${job.salaryMax.toLocaleString("vi-VN")} VND/tháng`;
  if (job.salaryMin) return `từ ${job.salaryMin.toLocaleString("vi-VN")} VND/tháng`;
  return "thỏa thuận theo năng lực";
}

// Nguồn quan hệ → câu mở đầu trung thực (để ứng viên hiểu vì sao được liên hệ)
function relationContext(kind: OutreachContactInput["kind"], companyName: string): string {
  switch (kind) {
    case "ex_employee":
      return `Người này TỪNG LÀM VIỆC tại ${companyName} (nay đã nghỉ). Đây là lời mời quay lại (boomerang). Nhắc tới quãng thời gian từng gắn bó một cách chân thành.`;
    case "candidate":
      return `Người này TỪNG ỨNG TUYỂN vào ${companyName} trước đây. Nhắc rằng công ty vẫn nhớ hồ sơ của họ và có vị trí mới có thể phù hợp.`;
    case "talent":
      return `Người này đã ĐỒNG Ý tham gia cộng đồng ứng viên của Timio và để mở nhận cơ hội mới. Liên hệ vì hồ sơ phù hợp vị trí.`;
  }
}

/**
 * Soạn 1 tin nhắn liên hệ cá nhân hóa cho 1 bước trong chuỗi.
 * Có fallback template khi không có ANTHROPIC_API_KEY.
 */
export async function generateOutreachMessage(
  contact: OutreachContactInput,
  job: OutreachJobInput,
  companyName: string,
  step: number
): Promise<OutreachMessage> {
  const s = Math.min(Math.max(step, 1), MAX_OUTREACH_STEPS);

  if (!outreachAiConfigured()) {
    return fallbackMessage(contact, job, companyName, s);
  }

  const system = `Bạn là CHUYÊN GIA TUYỂN DỤNG & SOURCING 15 NĂM kinh nghiệm tại Việt Nam, chuyên viết tin nhắn mời ứng viên (recruiting outreach) có tỷ lệ phản hồi cao.

QUY TẮC (dựa trên best-practice đã kiểm chứng):
- NGẮN GỌN: tối đa ~90-130 từ. Người ta không đọc tin dài.
- CÁ NHÂN HÓA thật: dùng TÊN, chức vụ/kinh nghiệm cũ, và cơ sở quan hệ (vì sao liên hệ họ) — KHÔNG chung chung.
- CHỈ 1 lời kêu gọi hành động (CTA) rõ ràng ở cuối (VD "Bạn có 5 phút trò chuyện không?").
- TRUNG THỰC: không bịa phúc lợi, không hứa suông. Nếu có điểm tin cậy chấm công, có thể khen chân thành ("hồ sơ chuyên cần rất tốt").
- Giọng thân thiện, tôn trọng, tiếng Việt CHUẨN có dấu, tự sửa lỗi chính tả đầu vào.
- KHÔNG markdown (**, #). KHÔNG chèn link (hệ thống tự thêm sau).
- KHÔNG viết phần chữ ký/tên người gửi (hệ thống tự thêm).

Trả về DUY NHẤT JSON: {"subject": "tiêu đề email ngắn hấp dẫn (<60 ký tự)", "body": "nội dung tin, xuống dòng bằng \\n"}`;

  const trust = contact.trustScore != null ? `Điểm tin cậy Timio (từ dữ liệu chấm công): ${contact.trustScore}/100.` : "";
  const user = `CÔNG TY: ${companyName}
VỊ TRÍ ĐANG TUYỂN: ${job.title}
- Lương: ${fmtSalary(job)}
- Địa điểm: ${job.location || "(không nêu)"}
- Ca/giờ làm: ${job.workTime || "(không nêu)"}
- Quyền lợi: ${job.benefits ? job.benefits.replace(/\n/g, "; ") : "(không nêu)"}

ỨNG VIÊN: ${contact.name}
- Chức vụ/kinh nghiệm: ${contact.position || "(không rõ)"}
${trust}
- ${relationContext(contact.kind, companyName)}
${contact.matchReason ? `- Lý do phù hợp: ${contact.matchReason}` : ""}

BƯỚC HIỆN TẠI (bước ${s}/${MAX_OUTREACH_STEPS}): ${STEP_INTENT[s]}

Soạn tin. Chỉ trả JSON.`;

  try {
    const text = await complete(system, user, 700);
    const parsed = extractJson<Partial<OutreachMessage>>(text);
    const subject = (parsed?.subject || "").toString().trim();
    const body = (parsed?.body || "").toString().trim();
    if (!body) return fallbackMessage(contact, job, companyName, s);
    return {
      subject: subject || `Cơ hội việc làm: ${job.title} tại ${companyName}`,
      body,
    };
  } catch {
    return fallbackMessage(contact, job, companyName, s);
  }
}

// Template dự phòng (không AI) — vẫn cá nhân hóa cơ bản, đúng từng bước
function fallbackMessage(
  contact: OutreachContactInput,
  job: OutreachJobInput,
  companyName: string,
  step: number
): OutreachMessage {
  const first = contact.name.trim().split(/\s+/).pop() || contact.name;
  const sal = fmtSalary(job);
  const rel =
    contact.kind === "ex_employee"
      ? `Trước đây bạn từng gắn bó với ${companyName}`
      : contact.kind === "candidate"
      ? `Cảm ơn bạn đã từng quan tâm đến ${companyName}`
      : `Hồ sơ của bạn trên cộng đồng Timio rất phù hợp`;

  let body: string;
  if (step >= MAX_OUTREACH_STEPS) {
    body = `Chào ${first},\n\nMình đã nhắn vài lần về vị trí ${job.title} tại ${companyName}. Nếu hiện tại chưa phải thời điểm phù hợp, mình hoàn toàn hiểu và sẽ không làm phiền thêm.\n\nChúc bạn nhiều sức khỏe và thành công. Khi nào bạn quan tâm, cửa luôn mở nhé!`;
  } else if (step === 1) {
    body = `Chào ${first},\n\n${rel}. Bên mình đang tuyển vị trí ${job.title} (lương ${sal}${job.location ? `, tại ${job.location}` : ""}) và thấy bạn rất phù hợp.\n\nBạn có 5 phút trò chuyện để mình chia sẻ thêm không?`;
  } else {
    body = `Chào ${first},\n\nMình gửi lại thông tin về vị trí ${job.title} tại ${companyName} (lương ${sal}). Đây là cơ hội mình nghĩ rất hợp với bạn.\n\nBạn phản hồi giúp mình một chút nhé, dù đồng ý hay chưa cũng được ạ.`;
  }

  return { subject: `Cơ hội việc làm: ${job.title} tại ${companyName}`, body };
}
