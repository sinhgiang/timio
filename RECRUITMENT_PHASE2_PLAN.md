# Kế hoạch chi tiết — Giai đoạn 2: Cộng đồng Cựu Nhân Viên Xác Thực

> **CHỐT PHẠM VI (7/7/2026):** CHỈ làm cho **nhân viên ĐÃ NGHỈ VIỆC** — KHÔNG đụng tới người đang đi làm. Lý do của chủ doanh nghiệp: người đang làm mà bị công ty khác nhắn offer sẽ gây "công ty trả nhau ông sống", xung đột giữa các công ty → không được. Người đã nghỉ thì không còn sếp hiện tại để giấu → an toàn.
>
> **Ý tưởng:** Khi một nhân viên rời công ty, họ có sẵn **dữ liệu chấm công thật** (chuyên cần, đúng giờ, thâm niên). Timio biến họ thành **cựu nhân viên có hồ sơ ĐẸP, được xác thực + chấm điểm tin cậy**, đưa vào cộng đồng ứng viên. Đồng thời **giữ mối quan hệ** (email chăm sóc): "sau này bạn tìm việc, Timio giới thiệu công việc tốt cho bạn" → cựu nhân viên trở thành **tài sản/khách hàng** của Timio.
>
> **Moat:** Không sàn nào (TopCV, VietnamWorks, Tanca, MISA, Base) có hồ sơ ứng viên **xác thực bằng dữ liệu chấm công máy ghi**. Xem `RECRUITMENT_MARKET_RESEARCH.md`.

---

## 1. Mô hình hoạt động (2 luồng nghỉ việc)

Một nhân viên rời công ty theo 1 trong 2 cách → xử lý khác nhau:

### Luồng A — Nghỉ ĐÚNG QUY TRÌNH (nộp đơn, sếp duyệt) → "cựu nhân viên đẹp"
1. Nhân viên nộp đơn xin nghỉ việc → **sếp DUYỆT**.
2. Khi duyệt xong, hệ thống:
   - Chốt **snapshot chỉ số chấm công** của họ (chuyên cần %, đúng giờ %, thâm niên) + tính **Điểm tin cậy Timio**.
   - Gửi **email chia tay tử tế** cho nhân viên kèm **link mời vào cộng đồng**: "Cảm ơn bạn đã đồng hành. Bạn có hồ sơ rất đẹp (chuyên cần 96%, đúng giờ 92%, 2 năm). Timio sẽ giới thiệu công việc tốt cho bạn — bấm để hoàn thiện hồ sơ tìm việc miễn phí."
   - Nhân viên bấm link → xem hồ sơ đẹp của mình → **đồng ý tham gia** + điền mong muốn (vị trí, khu vực, lương).
3. Đây là nguồn ứng viên **chất lượng cao nhất** (nghỉ văn minh, có sếp duyệt).

### Luồng B — Nghỉ KHÔNG BÁO (tự nghỉ / bị đánh dấu nghỉ) → chăm sóc để kéo về
1. Sếp đánh dấu nhân viên **"đã nghỉ"** (status inactive) mà không qua đơn.
2. Hệ thống gửi **chuỗi email chăm sóc (nurture)** — VD cách ~10 ngày/lần, vài lần: "Timio thấy bạn đã rời [công ty]. Hoàn thiện hồ sơ để nhận giới thiệu công việc tốt phù hợp."
3. Khi họ bấm vào & hoàn thiện → cũng thành hồ sơ cộng đồng như Luồng A.
4. Mục tiêu: **không để mất** người có dữ liệu tốt; kéo họ thành ứng viên + khách của Timio.

> Cả 2 luồng: hồ sơ chỉ vào cộng đồng khi **cựu nhân viên tự đồng ý** (bấm link + opt-in). Không tự động đăng.

---

## 2. Vì sao model này AN TOÀN hơn hẳn (so với "người đang làm")

- **Không có sếp hiện tại để giấu** → bỏ được rủi ro số 1 (lộ nhân viên đang làm cho sếp).
- Dữ liệu chấm công là **của chính họ**, dùng khi họ đã nghỉ + tự đồng ý → chính danh về pháp lý.
- Vẫn giữ 2 lá chắn còn lại cho chắc:
  1. **Nếu cựu NV sau này vào làm 1 công ty MỚI cũng dùng Timio** → tự động ẩn hồ sơ với công ty mới đó (lọc theo công ty hiện tại). Tức là chỉ hiện khi họ đang KHÔNG làm ở công ty nào trên Timio, hoặc ẩn với đúng công ty họ đang làm.
  2. **Ẩn danh + double opt-in** ở khâu nhà tuyển dụng liên hệ (giống mô tả cũ) — vẫn để nhân viên kiểm soát ai được liên hệ.
- Rút lại tức thì; minh bạch; tuân Nghị định 13/2023/NĐ-CP (đồng ý rõ ràng, đúng mục đích).

---

## 3. Điểm tin cậy Timio (đánh giá số điểm — "hồ sơ đẹp")

`lib/talentStats.ts` tính từ `AttendanceLog` + `Employee` (toàn bộ thời gian làm việc):
- **Chuyên cần %** = ngày có mặt / ngày công kỳ vọng.
- **Đúng giờ %** = lần đúng giờ / tổng lần chấm công (minutesLate ≤ gracePeriod).
- **Thâm niên (tháng)** = joinDate → ngày nghỉ.
- **Điểm tin cậy (0–100)** = trọng số: ~50% chuyên cần + 35% đúng giờ + 15% thâm niên (thâm niên quy đổi: 24 tháng ≈ tối đa). Nhãn: "Điểm tin cậy Timio".
- Chỉ tính khi đủ dữ liệu (≥ ~20 lần chấm công); thiếu → ghi "chưa đủ dữ liệu", KHÔNG bịa.
- Snapshot **chốt tại thời điểm nghỉ** (không đổi về sau — công bằng, ghi rõ "tại [công ty], tính đến [ngày]").
- Hiển thị dạng huy hiệu: "✔ Xác thực bởi Timio — Điểm tin cậy 91/100 (chuyên cần 96%, đúng giờ 92%, 2 năm tại 1 công ty)".

---

## 3b. CHIỀU THỨ HAI: Điểm PHÁT TRIỂN (bổ sung 7/7/2026 — ý tưởng của chủ DN)

> Ngoài "chấm công" (kỷ luật/chuyên cần), hồ sơ có thêm chiều **"Tốc độ phát triển"** — nhân viên đó ở công ty cũ **tiến bộ, thăng tiến, được đánh giá tốt** thế nào. Đây là tín hiệu nhà tuyển dụng THÈM nhất (không sàn nào có). **Hồ sơ = 2 điểm hiển thị trực diện: [Chấm công] + [Phát triển].**

**Tin tốt:** Timio ĐÃ CÓ sẵn dữ liệu — chỉ cần gom + nhắc + hiển thị:
- `PerformanceReview` (đánh giá hàng tháng/quý: điểm 1–5 do quản lý chấm, điểm mạnh/cải thiện) → **xu hướng điểm đi lên = phát triển tốt**.
- `WorkHistory` (thăng chức, đổi chức danh, tăng lương) → **có thăng tiến = cộng điểm**.
- `DisciplineRecord` (kỷ luật) → **trừ điểm**.

**Điểm phát triển (0–100)** = xu hướng điểm đánh giá (đi lên/đứng yên/đi xuống) + số lần thăng chức/đổi chức danh − kỷ luật. Kèm **"Lộ trình phát triển"** hình bậc thang đi lên (giống pipeline tuyển dụng): tháng 1 → tháng 2 → tháng 3… mỗi mốc 1 điểm/1 mức, cho thấy người này **leo lên hay đứng yên**.

**Vòng nhắc đánh giá hàng tháng (để có dữ liệu):**
- Công ty mua tính năng (Business/Talent+) → mỗi tháng Timio **gửi email nhắc admin/quản lý/HR**: "Đánh giá nhân viên tháng này: chuyên cần (tự động), thái độ, chất lượng công việc, sáng tạo, tiến bộ, có thăng chức không?" → 1 form nhanh → lưu vào `PerformanceReview` (type=monthly).
- Giá trị NGAY cho công ty (kể cả không dùng cộng đồng): **lưu lịch sử phát triển từng nhân viên** → biết ai đáng thăng chức, ai đi xuống, quản lý nhân sự tốt hơn. (Đây cũng là lý do công ty sẵn lòng mua + chịu điền hàng tháng.)

**Khi cựu NV vào cộng đồng:** hồ sơ hiện **2 điểm** — Chấm công + Phát triển — kèm lộ trình bậc thang. Nhà tuyển dụng đánh giá "trực diện nhất" 1 người: vừa chuyên cần, vừa đang lên.

**RIÊNG TƯ:** Điểm phát triển hiển thị ẨN DANH — **KHÔNG nêu người đó từng làm công ty nào** (tên công ty cũ do chính nhân viên tự khai trong CV nếu muốn). Chỉ hiện "ở công ty cũ (ẩn danh): lộ trình đi lên, từng thăng chức, đánh giá tốt".

---

## 4. Kiến trúc dữ liệu (raw SQL Neon — KHÔNG prisma migrate)

```sql
-- Lời mời cựu nhân viên vào cộng đồng (token + theo dõi chăm sóc)
CREATE TABLE IF NOT EXISTS "TalentInvite" (
  "id"           TEXT PRIMARY KEY,
  "employeeId"   TEXT UNIQUE NOT NULL,   -- cựu nhân viên
  "companyId"    TEXT NOT NULL,          -- công ty cũ (nguồn dữ liệu)
  "reason"       TEXT DEFAULT 'resigned',-- 'resigned' (duyệt đơn) | 'inactive' (bị đánh dấu nghỉ)
  "vAttendance"  INTEGER, "vPunctuality" INTEGER, "vTenureMonths" INTEGER, "vScore" INTEGER, -- snapshot lúc nghỉ
  "status"       TEXT DEFAULT 'invited', -- invited | opted_in | declined
  "nurtureCount" INTEGER DEFAULT 0,      -- đã gửi mấy email chăm sóc
  "lastNurtureAt" TIMESTAMP(3),
  "invitedAt"    TIMESTAMP(3) DEFAULT now(),
  "optedInAt"    TIMESTAMP(3)
);

-- Hồ sơ cộng đồng (tạo khi cựu NV đồng ý)
CREATE TABLE IF NOT EXISTS "TalentProfile" (
  "id"            TEXT PRIMARY KEY,
  "employeeId"    TEXT UNIQUE NOT NULL,   -- link nội bộ, KHÔNG lộ ra ngoài khi ẩn danh
  "sourceCompanyId" TEXT NOT NULL,        -- công ty cũ (để loại nếu họ quay lại làm ở đó)
  "isOpen"        BOOLEAN DEFAULT true,   -- đang bật tìm việc
  "desiredTitle"  TEXT, "desiredArea" TEXT, "desiredSalaryMin" INTEGER, "desiredSalaryMax" INTEGER,
  "skills"        TEXT, "bio" TEXT, "showAvatar" BOOLEAN DEFAULT false,
  "vAttendance"   INTEGER, "vPunctuality" INTEGER, "vTenureMonths" INTEGER, "vScore" INTEGER, "vStatsAt" TIMESTAMP(3),
  -- Chiều PHÁT TRIỂN (từ PerformanceReview + WorkHistory + Discipline):
  "vDevScore"     INTEGER,  -- điểm phát triển 0-100
  "vDevTrend"     TEXT,     -- "up" | "flat" | "down"
  "vPromotions"   INTEGER,  -- số lần thăng chức/đổi chức danh
  "vReviewCount"  INTEGER,  -- số kỳ đánh giá đã có
  "createdAt"     TIMESTAMP(3) DEFAULT now(), "updatedAt" TIMESTAMP(3) DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "TalentProfile_open_idx" ON "TalentProfile" ("isOpen");

-- (GĐ sau) nhà tuyển dụng bày tỏ quan tâm + ví credit — như kế hoạch cũ
```

---

## 5. Lộ trình 4 đợt

### Đợt 1 — Nền + luồng cựu nhân viên opt-in (LÀM TRƯỚC — an toàn, chưa lộ ra ngoài)
- DB `TalentInvite` + `TalentProfile` + `lib/talentStats.ts` + `lib/talentToken.ts` (token 90 ngày).
- **Trigger mời:**
  - Nút admin "Mời vào cộng đồng Timio" cho nhân viên đã nghỉ (trong danh sách Nhân viên) → tạo TalentInvite (snapshot điểm) + gửi email mời.
  - (Sau) tự động khi duyệt đơn nghỉ / đánh dấu inactive.
- **Trang công khai `/talent/[token]`**: cựu NV xem **hồ sơ đẹp của mình** (điểm tin cậy + chỉ số) → **đồng ý tham gia** + điền mong muốn (vị trí, khu vực, lương, kỹ năng, giới thiệu) + đồng ý điều khoản → tạo TalentProfile.
- **Email chăm sóc (nurture)** cho ai chưa opt-in: cron gửi lại sau N ngày (tối đa vài lần).
- *Test: tính điểm đúng; mời → email token; opt-in → tạo hồ sơ; nurture đếm đúng.*

### Đợt 1b — Chiều Phát triển (đánh giá hàng tháng) — *chèn ngay sau Đợt 1*
- `lib/talentDevStats.ts`: tính **điểm phát triển** từ `PerformanceReview` (xu hướng điểm) + `WorkHistory` (thăng chức) − `DisciplineRecord`.
- **Cron nhắc đánh giá hàng tháng**: email admin/quản lý → form đánh giá nhanh (chuyên cần tự động + thái độ + chất lượng + sáng tạo + tiến bộ + thăng chức) → lưu `PerformanceReview` type=monthly. (Tận dụng trang `/dashboard/performance-reviews` sẵn có.)
- Snapshot `vDevScore/vDevTrend/vPromotions` vào TalentInvite/TalentProfile khi cựu NV nghỉ/opt-in.
- Trang cựu NV + (sau) hồ sơ nhà tuyển dụng: hiện **2 điểm [Chấm công] + [Phát triển] + lộ trình bậc thang**.
- *Test: điểm phát triển tính đúng theo xu hướng review + thăng chức; nhắc email hàng tháng chạy.*

### Đợt 2 — Nhà tuyển dụng duyệt kho ẩn danh (hiện CẢ 2 điểm)
- Dashboard tuyển dụng → mục "Tìm ứng viên": danh sách hồ sơ **ẩn danh** (mã + điểm tin cậy + chỉ số + mong muốn + kỹ năng), lọc theo vị trí/khu vực/điểm.
- **Loại** hồ sơ của cựu NV nếu họ đang làm ở chính công ty đang xem (theo Employee.status + companyId hiện tại).

### Đợt 3 — Double opt-in + mở khóa liên hệ + thanh toán
- Nhà tuyển dụng "bày tỏ quan tâm" (trừ credit / mua qua Sepay) → cựu NV nhận thông báo → đồng ý → lộ liên hệ 2 chiều. Gate gói Business/Talent+.

### Đợt 4 — AI gợi ý + tự giới thiệu việc tốt cho cựu NV
- AI khớp cựu NV ↔ vị trí đang tuyển; **email chủ động giới thiệu việc tốt** cho cựu NV (đúng lời hứa "Timio giới thiệu công việc tốt cho bạn").

---

## 6. Thanh toán (đề xuất — chốt trước Đợt 3)
- **Cựu nhân viên: miễn phí** (nguồn cung + là khách quan hệ lâu dài).
- **Nhà tuyển dụng:** duyệt kho ẩn danh miễn phí (hoặc Business); **mở khóa liên hệ trả phí** ~100–200k/lượt (chỉ tính khi cựu NV đồng ý), hoặc gói **Talent+ ~1–1,5tr/tháng** kèm X lượt.

## 7. Pháp lý & đồng ý
- Trang điều khoản riêng; đồng ý rõ ràng (không tick sẵn) khi opt-in; chỉ hiện chỉ số tổng hợp + thông tin tự nhập; rút lại tức thì; ẩn danh tới khi đồng ý liên hệ. Nên hỏi luật sư lao động/dữ liệu 1 buổi trước khi bật thật.

## 8. Ước lượng
- Đợt 1: ~3–4 buổi (đang làm). Đợt 2: ~2–3. Đợt 3: ~4–5. Đợt 4: ~2–3. Ra mắt dần: Đợt 1 tích lũy kho trước, rồi mở Đợt 2–3 cho nhà tuyển dụng.

## Ngoài phạm vi
Người đang đi làm (đã loại) · cào web ngoài · KYC · chia doanh thu với cựu NV.
