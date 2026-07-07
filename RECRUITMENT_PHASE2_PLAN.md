# Kế hoạch chi tiết — Giai đoạn 2: Cộng đồng Ứng viên Xác thực

> **Mục tiêu:** Biến kho nhân viên đang có trên Timio thành một **cộng đồng ứng viên với hồ sơ được XÁC THỰC bằng dữ liệu chấm công** (chuyên cần %, đúng giờ %, thâm niên — máy ghi, không tự khai). Đây là **moat thật sự** — thứ không đối thủ VN nào (Tanca, MISA, Base, TopCV, VietnamWorks) có được.
>
> **Bối cảnh:** xem `RECRUITMENT_MARKET_RESEARCH.md` (mô hình mẫu = Employment Hero/Swag; bài học JobHopin: AI matching KHÔNG phải moat, **dữ liệu độc quyền** mới là moat).
>
> ⚠️ **CẢNH BÁO QUAN TRỌNG:** Đây là tính năng có rủi ro pháp lý + đạo đức + niềm tin cao nhất trong toàn bộ sản phẩm. Nếu làm sai, nhân viên có thể **mất việc** vì sếp phát hiện họ đang tìm việc mới. Toàn bộ thiết kế phải đặt **BẢO VỆ NHÂN VIÊN** lên hàng đầu. Đọc kỹ mục "1. Nguyên tắc bất di bất dịch" trước khi code bất cứ dòng nào.

---

## 0. Tại sao đây là "vũ khí" — và tại sao nguy hiểm

**Giá trị:**
- Timio đã có sẵn **cả cung lẫn cầu**: nhân viên (cung ứng viên) + doanh nghiệp đăng tin (cầu). Phá được thế "con gà–quả trứng" mà mọi sàn tuyển dụng mới đều chết vì nó.
- Hồ sơ **xác thực bằng chấm công** = độ tin cậy mà CV tự khai không bao giờ có. Nhà tuyển dụng trả tiền cho sự chắc chắn.
- Nguồn doanh thu MỚI (marketplace) — không phải subscription chấm công.

**Rủi ro (phải xử lý triệt để):**
1. **Nhân viên bị lộ với sếp hiện tại** → mất việc → Timio bị kiện, mất uy tín, chết sản phẩm. Đây là rủi ro SỐ 1.
2. **Pháp lý dữ liệu cá nhân** — Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân: cần đồng ý rõ ràng, đúng mục đích, rút lại được.
3. **Lạm dụng** — công ty dò tìm nhân viên của mình / công ty khác cào dữ liệu.
4. **Niềm tin 2 phía** — nhân viên phải tin Timio giấu kín; nhà tuyển dụng phải tin dữ liệu thật.

---

## 1. Nguyên tắc BẤT DI BẤT DỊCH (thiết kế xoay quanh 5 nguyên tắc này)

1. **Sếp hiện tại KHÔNG BAO GIỜ thấy nhân viên của mình trong cộng đồng.** Khi 1 công ty duyệt kho ứng viên, hệ thống TỰ LOẠI mọi hồ sơ thuộc nhân viên của chính công ty đó (lọc theo companyId). Đây là ràng buộc ở tầng truy vấn, không phải tùy chọn.
2. **Ẩn danh mặc định.** Trước khi 2 bên đồng ý, nhà tuyển dụng CHỈ thấy: chỉ số xác thực (chuyên cần %, đúng giờ %, thâm niên), vị trí mong muốn, khu vực, khoảng lương kỳ vọng, kỹ năng. KHÔNG thấy: tên thật, SĐT, email, ảnh, tên công ty hiện tại.
3. **Double opt-in (đồng ý 2 chiều).** Nhà tuyển dụng "bày tỏ quan tâm" → nhân viên nhận thông báo (kín) → nhân viên **chủ động đồng ý** thì mới lộ danh tính/liên hệ. Nhân viên luôn là người quyết định cuối.
4. **Nhân viên toàn quyền + rút lại tức thì.** Bật/tắt "sẵn sàng cơ hội" bất cứ lúc nào; tắt là biến mất khỏi kho ngay lập tức. Tự chọn ẩn/hiện từng thông tin.
5. **Minh bạch tuyệt đối với nhân viên.** Nói rõ: "Công ty bạn đang làm KHÔNG BAO GIỜ thấy hồ sơ này. Bạn kiểm soát ai được liên hệ." Có trang giải thích + điều khoản đồng ý.

---

## 2. Kiến trúc dữ liệu (raw SQL trên Neon — KHÔNG prisma migrate)

```sql
-- Hồ sơ ứng viên cộng đồng (mỗi nhân viên tối đa 1)
CREATE TABLE IF NOT EXISTS "TalentProfile" (
  "id"            TEXT PRIMARY KEY,
  "employeeId"    TEXT UNIQUE NOT NULL,   -- link Employee (nội bộ, KHÔNG lộ ra ngoài)
  "companyId"     TEXT NOT NULL,          -- công ty hiện tại (chỉ để LOẠI khi sếp duyệt)
  "isOpen"        BOOLEAN DEFAULT false,  -- đang bật "sẵn sàng cơ hội"
  "desiredTitle"  TEXT,                   -- vị trí mong muốn
  "desiredArea"   TEXT,                   -- khu vực (Hà Nội, HCM, remote...)
  "desiredSalaryMin" INTEGER,
  "desiredSalaryMax" INTEGER,
  "skills"        TEXT,                   -- kỹ năng (mỗi ý một dòng)
  "bio"           TEXT,                   -- giới thiệu ngắn (tự viết, ẩn danh — KHÔNG nêu tên/công ty)
  "showAvatar"    BOOLEAN DEFAULT false,  -- có cho hiện ảnh (mặc định KHÔNG)
  -- Snapshot chỉ số xác thực (tính từ chấm công, làm mới định kỳ)
  "vAttendance"   INTEGER,                -- % chuyên cần
  "vPunctuality"  INTEGER,                -- % đúng giờ
  "vTenureMonths" INTEGER,                -- thâm niên (tháng)
  "vStatsAt"      TIMESTAMP(3),           -- lúc tính snapshot
  "createdAt"     TIMESTAMP(3) DEFAULT now(),
  "updatedAt"     TIMESTAMP(3) DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "TalentProfile_open_idx" ON "TalentProfile" ("isOpen");

-- Lượt "quan tâm" của nhà tuyển dụng tới 1 hồ sơ (đơn vị tính phí + double opt-in)
CREATE TABLE IF NOT EXISTS "TalentInterest" (
  "id"            TEXT PRIMARY KEY,
  "profileId"     TEXT NOT NULL,          -- TalentProfile
  "companyId"     TEXT NOT NULL,          -- công ty gửi quan tâm
  "jobId"         TEXT,                   -- (tùy chọn) gắn với vị trí đang tuyển
  "message"       TEXT,                   -- lời nhắn nhà tuyển dụng gửi ứng viên
  "status"        TEXT DEFAULT 'pending', -- pending | accepted | declined | expired
  "chargedAmount" INTEGER,                -- số tiền đã trừ (mở khóa)
  "createdAt"     TIMESTAMP(3) DEFAULT now(),
  "respondedAt"   TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "TalentInterest_profile_idx" ON "TalentInterest" ("profileId");
CREATE INDEX IF NOT EXISTS "TalentInterest_company_idx" ON "TalentInterest" ("companyId", "status");

-- Ví tín dụng "mở khóa" của công ty (nạp trước, trừ khi gửi quan tâm)
CREATE TABLE IF NOT EXISTS "TalentCredit" (
  "id"        TEXT PRIMARY KEY,
  "companyId" TEXT UNIQUE NOT NULL,
  "balance"   INTEGER DEFAULT 0,          -- số credit còn lại
  "updatedAt" TIMESTAMP(3) DEFAULT now()
);
```

Prisma schema tương ứng + `prisma generate`. (Ẩn danh ở tầng DỮ LIỆU TRẢ RA, không lưu tên vào bảng public — tên luôn lấy từ Employee qua join nội bộ, chỉ lộ khi interest accepted.)

---

## 3. Cách tính chỉ số XÁC THỰC (từ chấm công)

`lib/talentStats.ts` — tính từ `AttendanceLog` + `Employee` (N tháng gần nhất, mặc định 6 tháng):
- **Chuyên cần %** = số ngày có mặt / số ngày công kỳ vọng (theo lịch ca/workDays).
- **Đúng giờ %** = số lần check-in đúng giờ / tổng số lần check-in (minutesLate ≤ gracePeriod).
- **Thâm niên (tháng)** = từ `joinDate` đến nay.
- Làm tròn, chỉ hiện khi có đủ dữ liệu (VD ≥ 20 lần chấm công) — thiếu thì ghi "chưa đủ dữ liệu", KHÔNG bịa.
- **Cron làm mới snapshot** hàng tuần (hoặc tính lazy khi mở hồ sơ, cache 7 ngày).
- Nhãn hiển thị: "✔ Xác thực bởi Timio từ dữ liệu chấm công thực tế".

> Trung thực: chỉ số là snapshot tại 1 thời điểm, ghi rõ "cập nhật ngày X". KHÔNG suy diễn tính cách/năng lực — chỉ nêu số liệu máy ghi.

---

## 4. Lộ trình 4 đợt (mỗi đợt độc lập, deploy + test được)

### Đợt 1 — Nền tảng phía NHÂN VIÊN (cung) — *làm trước, chưa lộ ra ngoài*
- Model `TalentProfile` + `lib/talentStats.ts`.
- **Trong portal nhân viên** (`/employee/[slug]`) + **app mobile nhân viên**: mục **"Cơ hội nghề nghiệp"**:
  - Công tắc **"Sẵn sàng cơ hội mới"** (mặc định TẮT) + trang giải thích quyền riêng tư + checkbox đồng ý điều khoản.
  - Form: vị trí mong muốn, khu vực, khoảng lương, kỹ năng, giới thiệu ngắn (có nhắc "đừng ghi tên công ty").
  - Hiện chỉ số xác thực của chính họ ("Hồ sơ của bạn: chuyên cần 96%, đúng giờ 92%, 2 năm").
  - Nút tắt = biến mất khỏi kho ngay.
- **CHƯA có gì phía nhà tuyển dụng.** *Test: nhân viên bật/tắt, chỉ số tính đúng, dữ liệu lưu.*

### Đợt 2 — Duyệt kho ứng viên phía NHÀ TUYỂN DỤNG (cầu) — *ẩn danh, chưa liên hệ*
- Trong dashboard tuyển dụng: mục mới **"Tìm ứng viên"** (hoặc "Cộng đồng"):
  - Danh sách hồ sơ **ẩn danh** (mã "Ứng viên #A1B2", chỉ số xác thực, vị trí/khu vực/lương mong muốn, kỹ năng, bio).
  - **LỌC BẮT BUỘC**: loại mọi hồ sơ có `companyId` = công ty đang xem (sếp không thấy người của mình).
  - Bộ lọc: vị trí, khu vực, khoảng lương, chuyên cần tối thiểu, thâm niên.
  - Chưa có nút liên hệ (hoặc nút "Quan tâm" hiện nhưng chưa nối thanh toán ở đợt này — để test luồng duyệt).
- *Test: công ty A KHÔNG thấy nhân viên của A; thấy nhân viên công ty B đã opt-in; lọc đúng.*

### Đợt 3 — Double opt-in + Mở khóa liên hệ + Thanh toán (marketplace core)
- Model `TalentInterest` + `TalentCredit`.
- **Luồng:**
  1. Nhà tuyển dụng bấm **"Bày tỏ quan tâm"** → trừ credit (hoặc mua credit qua Sepay/billing sẵn có) → tạo `TalentInterest` (pending) + lời nhắn.
  2. **Nhân viên nhận thông báo KÍN** (in-app portal + email/telegram cá nhân — KHÔNG qua kênh công ty): "Có 1 nhà tuyển dụng quan tâm hồ sơ của bạn cho vị trí X. Xem?".
  3. Nhân viên xem thông tin công ty tuyển + lời nhắn → **Đồng ý / Từ chối**.
  4. Đồng ý → lộ danh tính + liên hệ 2 chiều (công ty thấy tên/SĐT/email ứng viên; ứng viên thấy công ty). Từ chối → công ты chỉ biết "đã từ chối", credit có thể hoàn (chính sách tùy chọn).
- **Gate quyền + gói:** chỉ Business (hoặc add-on "Talent+"). Kế toán không truy cập.
- *Test: mua/trừ credit; nhân viên nhận đúng thông báo kín; accept → lộ liên hệ; decline → không lộ; sếp hiện tại vẫn không thấy.*

### Đợt 4 — AI gợi ý + mời chủ động (tăng chuyển đổi)
- Với mỗi vị trí đang tuyển của công ty, **AI gợi ý** các hồ sơ cộng đồng phù hợp (so vị trí/kỹ năng/khu vực + chỉ số xác thực) — vẫn ẩn danh, vẫn loại nhân viên công ty đó.
- Gợi ý "3 ứng viên tiềm năng cho vị trí Phục vụ của bạn" trong tab Tìm ứng viên + trong trợ lý chatbot ("có ai phù hợp vị trí X trong cộng đồng không?").
- (Tùy chọn) nhắc nhân viên cập nhật hồ sơ định kỳ để "được săn đón".

---

## 5. Mô hình thanh toán (đề xuất — chốt trước khi làm Đợt 3)

| Đối tượng | Mô hình |
|---|---|
| **Nhân viên (cung)** | MIỄN PHÍ hoàn toàn. Đây là nguồn cung — càng nhiều càng tốt. |
| **Nhà tuyển dụng (cầu)** | Duyệt kho ẩn danh: miễn phí (hoặc chỉ Business). **Mở khóa/gửi quan tâm: trả phí** — 2 lựa chọn: |
| → Trả theo lượt | ~**100–200k/lượt mở khóa** hồ sơ (chỉ tính khi nhân viên ĐỒNG Ý — công bằng, giảm rủi ro). |
| → Gói add-on | **"Talent+" ~1–1,5tr/tháng** kèm X lượt mở khóa/tháng. |

Nạp credit qua Sepay QR (đã có ở billing). **KHÔNG thu per-hire** (khó kiểm chứng, gây tranh cãi). Nghiên cứu: Base bán riêng module tuyển dụng 850k/tháng → gói Talent+ định giá được.

**Chốt cần anh quyết:** (a) trả-the-lượt hay gói-add-on hay cả hai; (b) mức giá; (c) có hoàn credit khi ứng viên từ chối không.

---

## 6. Khung pháp lý & đồng ý (BẮT BUỘC — làm cùng Đợt 1)

- **Trang điều khoản riêng** cho tính năng: mục đích dữ liệu, ai thấy gì, quyền rút lại, cam kết giấu với công ty hiện tại.
- **Đồng ý rõ ràng** (checkbox, không tick sẵn) trước khi bật. Ghi lại thời điểm đồng ý (audit).
- Chỉ hiển thị **dữ liệu tổng hợp** (chỉ số %) + thông tin nhân viên **tự nhập**. KHÔNG lộ dữ liệu nhạy cảm (CCCD, lương hiện tại, ảnh trừ khi họ chọn).
- Tuân Nghị định 13/2023/NĐ-CP: đúng mục đích, tối thiểu hóa dữ liệu, rút lại tức thì, không chuyển cho bên thứ 3 ngoài luồng.
- **Khuyến nghị mạnh:** trước khi bật thật cho khách, **hỏi ý kiến luật sư lao động/dữ liệu** 1 buổi. Chi phí nhỏ so với rủi ro.

---

## 7. Chống lạm dụng & bảo vệ

- Loại nhân viên công ty mình ở **tầng truy vấn** (không phải ẩn UI) — không thể lách.
- **Giới hạn tần suất** duyệt/mở khóa; phát hiện hành vi cào dữ liệu.
- Ẩn danh **đủ mạnh**: không lộ ghép được danh tính từ tổ hợp thông tin (không hiện công ty, phòng ban chi tiết, ngày sinh chính xác — chỉ khoảng).
- Chỉ công ty **đang trả phí Timio** mới được vào (đã xác thực là khách thật).
- Nhân viên xem được "bao nhiêu lượt quan tâm" nhưng công ty gửi quan tâm **không tự xem lại được danh tính** nếu bị từ chối.

---

## 8. Chỉ số thành công (đo sau khi ra mắt)

- Tỷ lệ nhân viên opt-in (mục tiêu GĐ đầu: 3–5% base).
- Số hồ sơ trong kho; số lượt "quan tâm"; tỷ lệ nhân viên đồng ý.
- Doanh thu marketplace/tháng; số công ty mua credit.
- **Chỉ số an toàn (quan trọng nhất):** 0 vụ lộ nhân viên với sếp hiện tại. Bất kỳ sự cố nào = dừng khẩn cấp.

---

## 9. Ước lượng & thứ tự

- **Đợt 1** (nền + phía nhân viên + pháp lý): ~3–4 buổi. *Làm được ngay, an toàn (chưa lộ ra ngoài).*
- **Đợt 2** (duyệt kho ẩn danh): ~2–3 buổi.
- **Đợt 3** (double opt-in + thanh toán): ~4–5 buổi (nhạy cảm nhất, test kỹ).
- **Đợt 4** (AI gợi ý): ~2–3 buổi.
- Tổng: ~11–15 buổi. Nên làm **tuần tự, ra mắt dần** (Đợt 1 nội bộ trước, tích lũy đủ hồ sơ rồi mới mở Đợt 2–3 cho nhà tuyển dụng).

---

## 10. 3 quyết định cần anh chốt TRƯỚC khi code

1. **Mô hình riêng tư:** đồng ý dùng **double opt-in + ẩn danh mặc định + loại sếp hiện tại** (khuyến nghị mạnh) hay muốn mở hơn/kín hơn?
2. **Thanh toán:** trả-the-lượt (100–200k) / gói Talent+ (1–1,5tr/tháng) / cả hai? Có hoàn credit khi bị từ chối?
3. **Thời điểm:** làm **Đợt 1 ngay** (an toàn, xây kho cung ẩn) rồi tính tiếp, hay chờ khi có lượng khách đủ lớn?

## Ngoài phạm vi GĐ2 (để sau)
Cào hồ sơ web ngoài · chấm điểm AI matching nâng cao · hồ sơ công khai hoàn toàn (không ẩn danh) · chia doanh thu với nhân viên · xác minh KYC ứng viên.
