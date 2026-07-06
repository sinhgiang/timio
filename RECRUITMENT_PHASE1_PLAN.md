# Kế hoạch chi tiết — Giai đoạn 1: "Tuyển dụng AI" cho Timio

> Mục tiêu: nâng module tuyển dụng sơ khai hiện tại lên ngang/vượt Tanca–MISA–Base ở phân khúc SME nhỏ, tận dụng 2 lợi thế độc quyền: **trợ lý AI giọng nói** + **nối thẳng vào chấm công**. Nền tảng cho Giai đoạn 2 (cộng đồng ứng viên xác thực).
> Bối cảnh thị trường: xem `RECRUITMENT_MARKET_RESEARCH.md`.

---

## 0. Hiện trạng (đã khảo sát code 7/7/2026)

**Đã có:**
- Schema: `JobPosting` (title, department, location, description, requirements, salaryMin/Max, status open/closed/filled) + `Candidate` (name, email, phone, status new→reviewing→interview→offer→hired/rejected, notes, source, `hiredEmpId` → Employee).
- UI [app/dashboard/recruitment/RecruitmentClient.tsx]: 2 tab Jobs/Candidates, thêm/sửa/xóa TAY, đổi trạng thái bằng dropdown.
- API: `/api/recruitment/jobs` + `/api/recruitment/candidates` (CRUD).
- Chatbot có tool `get_recruitment` (chỉ đọc).

**Chưa có (Giai đoạn 1 sẽ làm):** trang tuyển dụng công khai + form ứng viên TỰ nộp, pipeline kanban, AI (viết JD / chấm điểm / content đăng tin), tuyển-1-chạm thành nhân viên, tuyển qua giọng nói, QR, phân quyền chi nhánh cho tuyển dụng.

**Hạ tầng tái dùng:**
- Trang công khai theo slug: pattern `/checkin/[slug]`, `/leave/[slug]` (Company có `slug`, `logoUrl`).
- Claude server-side: `@anthropic-ai/sdk` + `ANTHROPIC_API_KEY` (đang dùng ở `/api/chat`), model `claude-haiku-4-5`.
- Chatbot tool-use + giọng nói: [lib/chatTools.ts] (TOOL_DEFS + roles + sentOk trung thực + fuzzy tên), CopyBlock/nút Chép trong ChatWidget.
- Link đăng ký khuôn mặt từ xa: `app/register-face/[token]` (dùng cho tuyển-1-chạm).
- Phân quyền: [lib/branchScope.ts] (`scopedBranchId`, `employeeInScope`) — quy tắc bắt buộc cho route mới.
- QR code: pattern QR kiosk trong Settings (package `qrcode`).
- Email: `lib/email.ts` (Resend).

---

## 1. Thay đổi Database (raw SQL trên Neon — KHÔNG prisma migrate)

```sql
-- JobPosting: thêm thông tin cho trang công khai + phân quyền chi nhánh
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "branchId"  TEXT;          -- null = toàn công ty
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "quantity"  INTEGER;       -- số lượng cần tuyển
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "workTime"  TEXT;          -- ca/giờ làm (vd "Ca tối 17h-22h")
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "benefits"  TEXT;          -- quyền lợi
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "isPublic"  BOOLEAN DEFAULT true; -- hiện trên trang tuyển dụng công khai

-- Candidate: dữ liệu ứng tuyển online + AI
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "experience" TEXT;  -- kinh nghiệm/giới thiệu (form ứng tuyển)
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "cvUrl"      TEXT;  -- link CV (Drive/website) — KHÔNG upload file GĐ1
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "aiScore"    INTEGER; -- 0-100
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "aiSummary"  TEXT;    -- AI tóm tắt + lý do điểm
```
Cập nhật `prisma/schema.prisma` tương ứng + `npx prisma generate`. (Không upload file CV ở GĐ1 — SME/công nhân hiếm có CV; form chính là CV. Tránh phình DB/serverless.)

---

## 2. Trang tuyển dụng công khai (việc lớn nhất)

### 2.1 `app/tuyendung/[slug]/page.tsx` — trang việc làm của công ty
- Server component, load company theo slug + jobs `status="open" AND isPublic=true`.
- Hiển thị: logo + tên công ty, danh sách vị trí (card: title, lương min-max, địa điểm/chi nhánh, ca làm, số lượng). SEO: metadata title "Tuyển dụng — [Công ty]", cho phép index (khác dashboard).
- Mobile-first (ứng viên xem bằng điện thoại từ link Facebook/Zalo).

### 2.2 `app/tuyendung/[slug]/[jobId]/page.tsx` — chi tiết + FORM ỨNG TUYỂN
- Mô tả/yêu cầu/quyền lợi (render text xuống dòng), nút "Ứng tuyển ngay" → form: Họ tên*, SĐT*, email, năm sinh?, kinh nghiệm/giới thiệu (textarea), link CV (tùy chọn).
- Chống spam: honeypot field ẩn + giới hạn theo IP (đếm trong bộ nhớ/DB: tối đa ~5 đơn/giờ/IP/công ty) + validate SĐT VN.
- Sau nộp: màn hình cảm ơn ("Công ty sẽ liên hệ qua SĐT của bạn").

### 2.3 `app/api/public/apply/route.ts` — POST nhận đơn (KHÔNG cần đăng nhập)
1. Validate slug/jobId, job đang open. 2. Tạo `Candidate` (source="website"). 3. **Gọi AI chấm điểm inline** (try/catch — AI lỗi vẫn lưu đơn): so `experience`+thông tin với JD → `aiScore` + `aiSummary`. 4. Thông báo cho admin: email (reuse sendEmail) "Có ứng viên mới cho vị trí X — điểm AI: 85".

### 2.4 Điều hướng + QR
- Settings: thêm khối "Trang tuyển dụng" — link `timio.vn/tuyendung/[slug]` + QR tải/in (reuse pattern QR kiosk).
- Dashboard recruitment: nút "Xem trang tuyển dụng" + "Sao chép link".

---

## 3. AI phía server — `lib/recruitAI.ts` + endpoints

Dùng chung `ANTHROPIC_API_KEY`, model `claude-haiku-4-5` (nâng sonnet nếu chất lượng JD chưa đạt). 3 hàm:

1. **`generateJD(hint, companyContext)`** — từ 1 câu ("tuyển 2 phục vụ ca tối 25k/giờ") → JSON `{title, description, requirements, benefits, workTime, quantity, salaryMin, salaryMax}` bằng tiếng Việt, giọng thân thiện SME. Endpoint: `POST /api/recruitment/ai/jd` (auth: owner/manager).
2. **`scoreCandidate(candidate, job)`** — trả `{score 0-100, summary ≤3 câu, lyDo}`; prompt yêu cầu TRUNG THỰC, thiếu dữ liệu thì điểm trung tính 50 + ghi "chưa đủ thông tin". Gọi từ `/api/public/apply` + nút "Chấm lại" `POST /api/recruitment/candidates/[id]/score`.
3. **`generateSocialPost(job, publicUrl)`** — content đăng Facebook/Zalo (ngắn, có emoji phù hợp mạng xã hội — NGOẠI LỆ quy tắc no-emoji vì đây là content MXH, kèm link ứng tuyển). Endpoint: `POST /api/recruitment/ai/social`.

---

## 4. Nâng cấp Dashboard `/dashboard/recruitment`

- **Tab Ứng viên → Kanban pipeline**: cột Mới nộp → Đang xem → Phỏng vấn → Offer → Đã tuyển | Từ chối. Kéo-thả bằng HTML5 drag native (không thêm thư viện) + nút mũi tên fallback (mobile). Card: tên, SĐT (bấm gọi), badge **điểm AI màu** (xanh ≥70 / vàng 40-69 / xám thiếu dữ liệu), aiSummary khi mở.
- **Form vị trí**: nút **"AI viết giúp"** (nhập 1 câu → điền sẵn toàn bộ form, sửa được trước khi lưu) + trường mới (quantity, workTime, benefits, branchId, isPublic).
- **Nút "Đăng lên Facebook/Zalo"** trên mỗi job: modal hiện content AI soạn + nút **Chép** (reuse CopyButton) + link trang ứng tuyển + hướng dẫn dán vào nhóm FB/Zalo.
- **Tuyển-1-chạm**: trên card ứng viên (Offer/Hired) nút **"Tuyển & tạo hồ sơ nhân viên"** → modal chọn chi nhánh, phòng ban, ca, lương khởi điểm, mã NV → tạo `Employee` (map name/phone/email) + set candidate `hired`+`hiredEmpId` + trả về **link đăng ký khuôn mặt** (register-face token) kèm nút Chép để gửi cho nhân viên mới — *"từ ứng viên đến ca làm đầu tiên trong 1 ngày"*.
- **Phân quyền** (theo [lib/branchScope.ts] + quy tắc memory): owner + manager dùng được; manager chi nhánh chỉ thấy job/ứng viên `branchId` của mình (null = job toàn công ty vẫn thấy); accountant KHÔNG truy cập. Áp cho CẢ 4 route API hiện có (hiện chưa scope) + route mới.

---

## 5. Chatbot + GIỌNG NÓI (điểm khác biệt marketing)

Thêm vào [lib/chatTools.ts]:

| Tool | Roles | Hành vi |
|---|---|---|
| `create_job_posting` | owner, manager | Input: mô tả 1 câu. B1 gọi AI generateJD → trả PREVIEW đầy đủ + hỏi xác nhận ("Em soạn tin thế này, anh duyệt không ạ?"). B2 user đồng ý → tạo job + trả `sentOk`, link công khai, và content FB/Zalo trong khối ``` để hiện nút Chép. Trung thực theo pattern sentOk. |
| `get_candidates` | owner, manager | Lọc theo job/trạng thái/tên (fuzzy + bỏ dấu như đã có), trả kèm aiScore/aiSummary. "Có ứng viên nào mới cho vị trí phục vụ không?" |
| `update_candidate_status` | owner, manager | "Chuyển bạn Hùng sang phỏng vấn" — fuzzy tên + hỏi xác nhận nếu mơ hồ. |
| Nâng `get_recruitment` | như cũ | Thêm số đơn mới hôm nay/tuần, điểm AI trung bình. |

- System prompt: mục mới "## Tuyển dụng" — flow tạo tin (luôn preview trước khi tạo), quy tắc trung thực, manager scope chi nhánh.
- **Kịch bản voice demo** (dùng cho marketing + landing): sếp bấm mic — *"Tuyển 2 phục vụ ca tối, lương 25 nghìn 1 giờ, làm ở chi nhánh Cầu Giấy"* → AI đọc lại bản nháp → *"Đăng luôn đi"* → AI: *"Dạ em đã đăng ạ. Link ứng tuyển và bài đăng Facebook em để bên dưới, anh bấm Chép để đăng lên nhóm nhé."*

---

## 6. Gói & giá (quyết định trong GĐ1 — đơn giản, không đổi billing)

| Gói | Được gì |
|---|---|
| Starter | Như hiện tại (quản lý tay) — không trang công khai, không AI |
| **Pro** | + Trang tuyển dụng công khai + form ứng tuyển + kanban + tuyển-1-chạm + QR |
| **Business** | + TOÀN BỘ AI: viết JD, chấm điểm ứng viên, content FB/Zalo, tuyển qua trợ lý giọng nói |

Lý do: đẩy lý do nâng cấp Pro→Business (nghiên cứu: Base bán riêng 850k/tháng → "Business 799k có cả tuyển dụng AI" là claim bán hàng mạnh). GĐ2 (cộng đồng ứng viên) mới tách gói/add-on riêng 1,2-1,5tr. Gate bằng `hasPlanAccess` hiện có; API AI check plan server-side.

Cập nhật bảng giá (landing + billing): Pro thêm "Trang tuyển dụng + quản lý ứng viên (kanban)"; Business thêm "Tuyển dụng AI — viết tin, chấm điểm ứng viên, tuyển qua trợ lý giọng nói".

---

## 7. Thứ tự thực hiện (4 đợt, mỗi đợt deploy + test được)

1. **Đợt 1 — Nền + trang công khai**: SQL + schema + prisma generate → `/tuyendung/[slug]` + `[jobId]` + form + `/api/public/apply` (chưa AI) + email báo admin + QR/link trong Settings & dashboard. *Test: nộp đơn từ điện thoại qua link → thấy ứng viên trong dashboard.*
2. **Đợt 2 — Pipeline + tuyển-1-chạm + phân quyền**: kanban, nút gọi/chuyển trạng thái, modal tuyển→Employee→link đăng ký mặt, branch scope 4+2 routes. *Test: kéo ứng viên qua các cột; tuyển thử 1 người → có hồ sơ NV + link face; manager chi nhánh không thấy job chi nhánh khác.*
3. **Đợt 3 — AI**: lib/recruitAI + 3 endpoints + nút "AI viết giúp" + chấm điểm khi apply + badge điểm + modal content FB/Zalo. *Test: JD sinh từ 1 câu; nộp đơn → có điểm + tóm tắt; content FB có link đúng.*
4. **Đợt 4 — Chatbot/giọng nói + bảng giá**: 3 tools mới + prompt + gate plan + cập nhật landing/billing + (tùy) section landing "Tuyển dụng AI". *Test: nói với trợ lý tạo tin end-to-end bằng giọng; kiểm tra accountant bị chặn; Starter không thấy trang công khai.*

Sau mỗi đợt: `npx tsc --noEmit` + `npm run build` + commit/push (message qua `git commit -F`). Ước lượng cả GĐ1: ~4-6 buổi làm việc.

## 8. Kiểm thử cuối (trước khi công bố)
- [ ] Nộp đơn thật từ điện thoại (link + QR), có email báo, có điểm AI
- [ ] Spam test: honeypot + rate limit chặn
- [ ] Voice end-to-end: nói → preview → xác nhận → job public + content chép được
- [ ] Tuyển-1-chạm: candidate → employee → đăng ký mặt → check-in được
- [ ] Phân quyền: manager chi nhánh / accountant / Starter / Pro / Business đúng ma trận
- [ ] Chatbot trung thực: tạo tin thất bại phải báo thất bại (sentOk pattern)

## Ngoài phạm vi GĐ1 (để GĐ2-3)
Upload file CV · cộng đồng ứng viên cross-company + badge xác thực chấm công · AI tự nhắn mời ứng viên · app mobile xem ứng viên · thu phí add-on riêng · auto-post API Facebook (GĐ1 chỉ soạn content + chép tay vì FB API hạn chế).
