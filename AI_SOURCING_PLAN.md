# Kế hoạch AI Sourcing / Tuyển dụng chủ động — 3 Giai đoạn

> Kế hoạch triển khai dựa trên nghiên cứu `AI_SOURCING_RESEARCH.md` (đã kiểm chứng). Nguyên tắc bất di bất dịch: **KHÔNG auto-scrape + auto-DM người lạ** (trái điều khoản nền tảng + Luật 91/2025 phạt tới 3 tỷ). Mọi liên hệ đều **có cơ sở đồng ý** + **con người bấm gửi** (human-in-the-loop) + **có nút từ chối** (NĐ 91/2020).
>
> **Nền tảng đã có (tái dùng):** JobPosting + Candidate (ATS kanban, tuyển-1-chạm), TalentProfile/TalentInterest/TalentCredit (kho cựu NV opt-in + mở khóa liên hệ), `lib/recruitAI.ts` (generateJD, scoreCandidate, generateSocialPost), `lib/talentMatch.ts` (xếp hạng khớp), `lib/email.ts` (Resend), `/api/recruitment/stats` (phễu ATS). Gating: gói Business + `branchScope` + chặn accountant.

---

## GIAI ĐOẠN 1 — AI trợ lý liên hệ chủ động (Outreach Assistant)

**Mục tiêu:** Cho một vị trí đang tuyển, AI **tìm người phù hợp trong nhóm mình đã có quan hệ hợp pháp** (cựu nhân viên + ứng viên đã từng nộp + cựu NV cộng đồng đã opt-in), **soạn sẵn tin nhắn cá nhân hóa**, admin **bấm gửi**, và **dashboard phễu** theo dõi. Đây là phần thay thế hợp pháp cho ý "auto-spam".

### Ai được liên hệ (đều có cơ sở đồng ý)
1. **Cựu nhân viên của chính công ty** (Employee status ≠ active) — boomerang hiring, công ty đã có quan hệ + liên hệ.
2. **Ứng viên đã từng nộp** (Candidate) — đã đồng ý khi ứng tuyển.
3. **Cựu NV cộng đồng đã opt-in** (TalentProfile) — qua luồng mở khóa credit đã có (`TalentInterest`).

### DB mới (raw SQL trên Neon — KHÔNG prisma migrate)
```prisma
model OutreachCampaign {
  id         String   @id @default(cuid())
  companyId  String
  jobId      String
  name       String
  status     String   @default("active")  // "active" | "done" | "archived"
  branchId   String?
  createdBy  String?
  createdAt  DateTime @default(now())
  @@index([companyId])
}

model OutreachContact {
  id           String   @id @default(cuid())
  campaignId   String
  companyId    String
  kind         String   // "ex_employee" | "candidate" | "talent"
  refId        String?  // employeeId / candidateId / talentProfileId
  name         String
  email        String?
  phone        String?
  position     String?
  matchScore   Int?
  matchReason  String?
  step         Int      @default(0)   // số bước đã gửi (0..4)
  status       String   @default("pending") // pending|drafted|sent|opened|replied|interested|interviewed|hired|declined|opted_out
  draftSubject String?
  draftBody    String?
  messages     String?  // JSON: [{step, channel, subject, body, sentAt}]
  lastSentAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@index([campaignId])
  @@index([companyId, status])
}

model OutreachOptOut {
  id        String   @id @default(cuid())
  companyId String
  contact   String   // email hoặc phone (chuẩn hóa lowercase)
  token     String   @unique
  reason    String?
  createdAt DateTime @default(now())
  @@unique([companyId, contact])
}
```
SQL: `CREATE TABLE IF NOT EXISTS ...` cho 3 bảng + index.

### API
- `POST /api/recruitment/outreach/campaigns` — body {jobId, sources[]}. Tạo campaign; tự nạp contacts từ cựu NV + ứng viên cũ (+ talent nếu chọn), **loại người đã opt-out**, xếp hạng bằng `talentMatch.fallbackRank` (hoặc AI nếu có key). Trả campaign + contacts đã xếp hạng. *(Business gate, branch scope, chặn accountant.)*
- `GET /api/recruitment/outreach/campaigns` — list + đếm phễu mỗi campaign.
- `GET /api/recruitment/outreach/campaigns/[id]` — chi tiết + contacts.
- `POST /api/recruitment/outreach/campaigns/[id]/draft` — body {contactIds[], step}. AI soạn tin cá nhân hóa cho từng contact (dùng tên, chức vụ cũ, điểm tin cậy, vị trí). Lưu draftSubject/draftBody. *(Business gate.)*
- `POST /api/recruitment/outreach/contacts/[id]/send` — body {subject, body, channel}. Kiểm opt-out → gửi email (kèm link từ chối) → ghi messages, step+1, status="sent", lastSentAt. Với Zalo: trả link/nội dung để admin gửi tay.
- `PATCH /api/recruitment/outreach/contacts/[id]` — cập nhật status thủ công (replied/interested/interviewed/hired/declined) hoặc chuyển 1-chạm thành Candidate/Employee.
- `GET /api/outreach/unsubscribe/[token]` **(public)** — trang từ chối nhận tin → ghi `OutreachOptOut` + set contact status="opted_out".

### Thư viện mới
- `lib/outreachAI.ts` — `generateOutreachMessage(contact, job, company, step)`: soạn **tin ngắn, cá nhân hóa** (tên + chức vụ cũ + điểm tin cậy Timio + vị trí + lời mời) theo **best-practice nghiên cứu**: ngắn gọn, 1 CTA, chuỗi 3–4 bước (bước 1 giới thiệu, bước 2–3 nhắc, bước 4 "breakup"). Có subject riêng cho email. Fallback template khi thiếu ANTHROPIC_API_KEY.

### UI (tab mới "Liên hệ chủ động" trong dashboard tuyển dụng)
- **Tạo chiến dịch:** chọn vị trí → chọn nguồn (cựu NV / ứng viên cũ / cộng đồng) → hệ thống tìm + xếp hạng → danh sách ứng viên kèm điểm khớp.
- **Từng contact:** nút "AI soạn tin" → hiện bản nháp (sửa được) → nút **"Gửi"** (email) hoặc **"Sao chép + mở Zalo"**. Chip trạng thái phễu.
- **Chuỗi nhiều bước:** nút "Soạn bước tiếp" (tối đa 4). Hiển thị bước đang ở.
- **Dashboard phễu:** đã gửi → đã mở → trả lời → quan tâm → phỏng vấn → **chốt**, kèm **đường chuẩn tham khảo (~78% mở / ~21% trả lời / ~8% quan tâm — Gem)** để admin biết mình tốt/kém.

### Tuân thủ (nhồi vào tính năng)
- **Mọi email có link "Từ chối nhận tin"** (`/api/outreach/unsubscribe/[token]`) → đúng NĐ 91/2020.
- **Kiểm opt-out trước khi gửi**; người đã từ chối bị chặn, không gửi lại.
- **Con người bấm gửi** từng tin (hoặc xác nhận lô) — KHÔNG tự động.
- Ghi rõ nguồn quan hệ (cựu NV/ứng viên cũ) để minh bạch.

### Test GĐ1
Tạo campaign cho 1 job → nạp cựu NV + ứng viên cũ, loại opt-out → AI soạn tin (+ fallback khi không key) → gửi email (link unsubscribe) → bấm unsubscribe → contact bị chặn gửi lại → cập nhật status → phễu đếm đúng. Gating: starter 403. Branch scope: manager chỉ thấy chi nhánh mình. tsc + build sạch.

---

## GIAI ĐOẠN 2 — Thu hút ứng viên MỚI qua kênh hợp lệ (Inbound + Distribution)

**Mục tiêu:** Để ứng viên **tự đến** thay vì đi cào. 3 mảng:

### 2.1 Google for Jobs (miễn phí, hợp lệ, giá trị cao)
- Nhúng **JSON-LD `JobPosting` schema** vào trang tuyển dụng công khai `/tuyendung/[slug]/[jobId]` → Google tự index tin lên "Google for Jobs" miễn phí.
- Schema gồm: title, description, datePosted, validThrough, hiringOrganization, jobLocation, baseSalary, employmentType.
- **DB:** không cần đổi (đọc từ JobPosting). Chỉ thêm component `<JobPostingJsonLd>`.

### 2.2 Career page riêng cho công ty
- Nâng `/tuyendung/[slug]` thành **trang thương hiệu tuyển dụng**: logo + giới thiệu công ty + danh sách vị trí đang mở + "vì sao làm ở đây".
- **DB:** Company thêm `careerIntro String?`, `careerCoverUrl String?` (SQL Neon). Settings có ô nhập.

### 2.3 Chatbot AI sàng lọc ứng viên
- Trên trang ứng tuyển: sau khi nộp, **chatbot hỏi 3–5 câu sàng lọc** (do AI sinh theo JD) → lưu câu trả lời → AI **chấm sơ bộ** (tái dùng `scoreCandidate` mở rộng).
- **DB:** Candidate thêm `screeningQA String?` (JSON hỏi-đáp). Route `/api/public/screening` sinh câu hỏi + nhận trả lời.

### API/Lib GĐ2
- `lib/outreachAI.ts` (hoặc `recruitAI.ts`) thêm `generateScreeningQuestions(job)`.
- `GET/POST /api/public/screening/[jobId]` — sinh câu hỏi + nhận đáp án (public, honeypot + rate limit như apply).
- Component `JobPostingJsonLd`, `CareerHeader`, `ScreeningChat`.

### Test GĐ2
Xem nguồn trang job → có JSON-LD hợp lệ (test qua Google Rich Results). Career page hiện logo + intro. Nộp đơn → chatbot hỏi → lưu QA → AI chấm sơ bộ.

---

## GIAI ĐOẠN 3 — Cộng đồng + Giới thiệu (Referral)

**Mục tiêu:** Nguồn ứng viên hợp pháp, chất lượng, chi phí thấp nhất.

### 3.1 Referral (giới thiệu có thưởng)
- Mỗi **nhân viên/cựu NV** có **link giới thiệu riêng** cho 1 vị trí (`/tuyendung/[slug]/[jobId]?ref=CODE`).
- Ứng viên nộp qua link đó → **gắn công người giới thiệu**; khi ứng viên được **tuyển** → ghi nhận thưởng cho người giới thiệu.
- **DB mới:**
```prisma
model Referral {
  id          String   @id @default(cuid())
  companyId   String
  jobId       String?
  referrerType String  // "employee" | "talent"
  referrerId  String
  code        String   @unique
  candidateId String?  // gắn khi có người nộp qua link
  status      String   @default("shared") // shared|applied|hired|rewarded
  rewardAmount Int?
  createdAt   DateTime @default(now())
  @@index([companyId])
}
```
- Apply route nhận `?ref=` → tạo/nối Referral, set candidate.source="referral".

### 3.2 Mở rộng kho ứng viên xác thực (đã có nền tảng)
- Tận dụng `TalentProfile` (cựu NV opt-in + điểm tin cậy chấm công). GĐ3 thêm: mời hàng loạt cựu NV opt-in, bảng xếp hạng cộng đồng, AI gợi ý chéo công ty (đã có `talent/suggest`).

### UI/API GĐ3
- Tab "Giới thiệu" trong tuyển dụng: tạo link referral cho vị trí, xem ai giới thiệu ai, trạng thái thưởng.
- `POST /api/recruitment/referrals` (tạo link), `GET` (list), apply route xử lý `?ref=`.
- Trang nhân viên/cựu NV: nút "Giới thiệu bạn bè" → link cá nhân + chia sẻ.

### Test GĐ3
Tạo link referral → nộp đơn qua link → candidate gắn referrer + source=referral → tuyển → referral status=hired + thưởng. Chống tự giới thiệu mình.

---

## Định giá (theo nghiên cứu)
- **Outreach Assistant (GĐ1)** + **Google for Jobs/career page (GĐ2)** + **Referral (GĐ3)**: gói **Business** (đồng bộ các tính năng AI tuyển dụng hiện có).
- Mở khóa liên hệ cộng đồng: giữ mô hình credit đã có (100–200k/lượt, hoàn nếu từ chối — chuẩn TopCV).
- **KHÔNG** bán per-hire, **KHÔNG** làm AI sourcing giá USD kiểu LinkedIn.

## Số liệu nghiên cứu đã nhồi vào thiết kế
- **Chuỗi 3–4 bước** (không phải 1 tin): >2x trả lời; bước 4 "breakup"; sau bước 5 vô ích (Gem).
- **Đường chuẩn phễu:** ~78% mở · ~21% trả lời · ~8% quan tâm (Gem) — hiển thị trên dashboard.
- **Tuân thủ NĐ 91/2020:** opt-in + nhãn + nút từ chối + xác nhận khi từ chối → nhúng vào mọi tin.
- **LinkedIn:** API đối tác đóng/khó → KHÔNG xây trên LinkedIn ở GĐ1–2.

## Thứ tự thực thi
GĐ1 (DB → lib → API → UI → test) → GĐ2 (JSON-LD → career page → screening) → GĐ3 (referral → cộng đồng) → **ép 1 lượt end-to-end + test nhiều kiểu** → tsc + build + push.
