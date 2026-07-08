# Kế hoạch Cải Tiến & Bổ Sung Timio — dựa trên nghiên cứu thị trường

> Nguồn: `MARKET_LANDSCAPE.md` (đối thủ + giá), `AI_SOURCING_RESEARCH.md` (pháp lý + cơ chế), `AI_SOURCING_PLAN.md` (3 giai đoạn đã build).
>
> **Nguyên tắc thiết kế (bắt buộc):** UI RÕ RÀNG, đơn giản, ai nhìn cũng hiểu. Việt-first. Mỗi tính năng có màn hình + nút + luồng cụ thể. Ưu tiên TIỆN cho người dùng.
>
> **3 phát hiện cốt lõi từ nghiên cứu — mọi kế hoạch bám vào đây:**
> 1. **Moat = hồ sơ ứng viên XÁC THỰC bằng dữ liệu chấm công** — 75% thị trường KHÔNG đo được "chất lượng tuyển"; MISA/Base/Tanca đều CHƯA có. Đây là vũ khí độc quyền → phải làm cho NỔI BẬT.
> 2. **Employment Hero** = app HR → sàn ứng viên có hiệu ứng mạng. Ta có nền (TalentProfile) → cần đẩy mạnh & làm đẹp.
> 3. **Ashby** = ATS AI đánh giá theo TIÊU CHÍ khách quan (Đạt/Không đạt) + người duyệt, KHÔNG phải điểm số hộp đen.

---

## TỔNG QUAN — 6 KẾ HOẠCH (ưu tiên từ cao xuống)

| # | Tên kế hoạch | Loại | Vì sao (research) | Độ lớn |
|---|---|---|---|---|
| 1 | **Điểm Tin Cậy Timio** thành trung tâm | Cải thiện + Làm mới | Moat #1 — thứ đối thủ không có | Vừa |
| 2 | **ATS chấm theo TIÊU CHÍ** (kiểu Ashby) | Cải thiện | Chuẩn ATS AI hiện đại | Vừa |
| 3 | **Trang tuyển dụng công ty đẹp** (inbound) | Làm mới | Hút ứng viên tự đến, hợp pháp | Vừa-lớn |
| 4 | **Ứng viên theo dõi hồ sơ** (trải nghiệm) | Làm mới | Tiện cho người dùng | Nhỏ-vừa |
| 5 | **Bảng điều khiển tuyển dụng** (báo cáo) | Cải thiện | Đo nguồn tuyển, phễu, chi phí | Vừa |
| 6 | **Trang giá rõ ràng + gợi ý nâng cấp** | Làm mới | Mô hình land-and-expand | Nhỏ |

---

# KẾ HOẠCH 1 — "Điểm Tin Cậy Timio" thành trung tâm (MOAT)

**Vì sao:** Đây là thứ DUY NHẤT Timio có mà MISA/Base/Tanca/TopCV không có: bằng chứng khách quan về "chất lượng người này" từ dữ liệu chấm công THẬT. Nghiên cứu: 89% muốn đo chất lượng tuyển, chỉ 25% làm được. Hiện ta CÓ dữ liệu (vScore chuyên cần + vDevScore phát triển) nhưng UI còn mờ nhạt → phải làm cho nó **đẹp, dễ hiểu, nổi bật** ở mọi nơi.

**Cải thiện gì đã có + làm mới gì:**

### 1.1 Thẻ "Chứng nhận Timio" (component dùng chung) — LÀM MỚI
Một thẻ đẹp, giải thích rõ, hiện ở mọi nơi có ứng viên xác thực:
```
┌─────────────────────────────────────────────┐
│  ✔ HỒ SƠ XÁC THỰC BỞI TIMIO      ⭐ 92/100   │
│  Dựa trên dữ liệu chấm công thật, không tự khai │
├─────────────────────────────────────────────┤
│  ⏰ Đúng giờ        ████████████░  96%         │
│  📅 Chuyên cần      ███████████░░  91%         │
│  📈 Thâm niên       2 năm 3 tháng              │
│  🏆 Thăng tiến      2 lần                       │
│  🛡️ Kỷ luật         Không vi phạm              │
└─────────────────────────────────────────────┘
```
- Mỗi dòng có icon + thanh tiến trình (bar) hoặc số rõ ràng.
- Điểm tổng to, màu theo mức (xanh ≥80 / vàng 60-79 / xám <60).
- Có dòng giải thích: "Dữ liệu chấm công thật, không phải tự khai" (đây là câu marketing khác biệt).
- Bấm vào → mở popup giải thích từng chỉ số tính thế nào (minh bạch, tạo niềm tin).

### 1.2 Hiện thẻ này ở MỌI nơi — CẢI THIỆN
- Tab **Tìm ứng viên (Cộng đồng)** — thay hiển thị điểm số rời rạc hiện tại bằng thẻ đẹp này.
- **Gợi ý AI** — mỗi ứng viên có thẻ.
- **Liên hệ chủ động (Outreach)** — nếu contact là cựu NV có hồ sơ, hiện điểm tin cậy.
- **Chi tiết ứng viên** trong kanban — nếu ứng viên từng là NV (map SĐT/email) → hiện thẻ.

### 1.3 Link hồ sơ xác thực chia sẻ được — LÀM MỚI
Cựu NV (đã opt-in) có 1 **link công khai** dạng `/hoso/[token]` hiện thẻ xác thực đẹp → họ tự dán vào CV/Facebook/Zalo khi xin việc chỗ khác. Vừa tiện cho họ, vừa marketing miễn phí cho Timio.
- UI trang: thẻ chứng nhận lớn + nút "Nhà tuyển dụng? Liên hệ tôi qua Timio".
- Ẩn danh tùy chọn (chỉ hiện điểm + kỹ năng, ẩn tên/SĐT tới khi đồng ý — đúng luật 91/2025).

**Cần thêm:** component `VerifiedBadge.tsx`; route public `/hoso/[token]` (tái dùng talentToken); không cần đổi DB (dữ liệu đã có trong TalentProfile).

---

# KẾ HOẠCH 2 — ATS chấm theo TIÊU CHÍ (kiểu Ashby)

**Vì sao:** Ashby (ATS AI mẫu) không chấm điểm hộp đen 0-100 — mà cho nhà tuyển dụng **tự đặt tiêu chí**, AI trả **Đạt / Không đạt / Chưa rõ** cho TỪNG tiêu chí kèm bằng chứng, rồi người duyệt. Cách này minh bạch + đáng tin hơn điểm số đơn thuần. Hiện ta chỉ có aiScore 0-100 → nâng cấp.

**Cải thiện:**

### 2.1 Ô "Tiêu chí tuyển" trong form vị trí — LÀM MỚI
Khi tạo/sửa tin tuyển, thêm ô liệt kê tiêu chí (mỗi dòng 1 tiêu chí), có nút "AI gợi ý tiêu chí" (từ JD):
```
Tiêu chí đánh giá ứng viên:
  • Có kinh nghiệm bán hàng ≥ 1 năm        [x]
  • Ở gần khu vực làm việc                  [x]
  • Làm được ca tối 17h-22h                 [x]
  • Giao tiếp tốt                            [x]
  [+ Thêm tiêu chí]   [✨ AI gợi ý từ mô tả]
```

### 2.2 Thẻ ứng viên hiện checklist tiêu chí — CẢI THIỆN
Thay vì chỉ "Điểm AI 72", hiện:
```
Nguyễn Văn A                          Phù hợp 3/4
  ✅ Kinh nghiệm bán hàng — "2 năm ở shop ABC"
  ✅ Ở gần — "Quận 7, cách 3km"
  ❓ Ca tối — chưa rõ trong hồ sơ
  ✅ Giao tiếp — "từng làm CSKH"
```
- Mỗi tiêu chí: ✅ Đạt (xanh) / ❌ Không (đỏ) / ❓ Chưa rõ (xám) + 1 dòng bằng chứng AI trích.
- Vẫn giữ điểm tổng nhỏ để sắp xếp, nhưng checklist là chính.
- **Con người duyệt** — AI chỉ gợi ý, không tự loại ai.

**Cần thêm:** `JobPosting.criteria` (JSON string[]); `Candidate.criteriaResult` (JSON [{tiêu chí, verdict, bằng chứng}]); nâng `lib/recruitAI.ts` hàm `evaluateAgainstCriteria(candidate, job, criteria)`; cập nhật form vị trí + thẻ kanban + chi tiết ứng viên.

---

# KẾ HOẠCH 3 — Trang tuyển dụng công ty ĐẸP (inbound)

**Vì sao:** Inbound (để ứng viên tự đến) là kênh hợp pháp + rẻ nhất. Hiện `/tuyendung/[slug]` mới có logo + intro + danh sách tin — còn sơ sài. Làm đẹp thành "trang thương hiệu tuyển dụng" giúp hút ứng viên chất lượng mà không tốn phí quảng cáo.

**Làm mới (nâng cấp lớn trang công khai):**

### 3.1 Trang công ty dạng "employer branding"
```
┌───────────────────────────────────────────┐
│         [ẢNH BÌA công ty]                   │
│   [logo]  CÔNG TY AZLAB                      │
│           "Chuỗi cà phê 20 chi nhánh..."     │
│   📍 TP.HCM   👥 120 nhân viên   ⭐ 4.5      │
├───────────────────────────────────────────┤
│  VÌ SAO LÀM Ở ĐÂY                            │
│  [💰 Lương tốt] [📈 Thăng tiến] [🎓 Đào tạo]│
│  [🏖️ Du lịch]   [🍜 Ăn ca]      [🎉 Thưởng] │
├───────────────────────────────────────────┤
│  HÌNH ẢNH MÔI TRƯỜNG  [ảnh][ảnh][ảnh]       │
├───────────────────────────────────────────┤
│  5 VỊ TRÍ ĐANG TUYỂN                         │
│  [Thẻ vị trí đẹp có lương/địa điểm/nút ứng tuyển] │
└───────────────────────────────────────────┘
```
- **Owner sửa inline** (như CareerIntroEditor đã có): ảnh bìa, "vì sao làm ở đây" (chọn icon + text), ảnh môi trường.
- Ứng viên chỉ xem, thấy chuyên nghiệp → tin tưởng → ứng tuyển nhiều hơn.

**Cần thêm:** `Company.careerCoverUrl`, `Company.careerPerks` (JSON [{icon,label}]), `Company.careerPhotos` (JSON string[] base64/url); mở rộng `CareerIntroEditor` thành trình sửa đầy đủ; redesign trang `/tuyendung/[slug]`.

---

# KẾ HOẠCH 4 — Ứng viên THEO DÕI hồ sơ (trải nghiệm người dùng)

**Vì sao:** User nhấn mạnh "tiện cho người dùng nhất". Hiện ứng viên nộp xong là "mất hút", không biết hồ sơ tới đâu → sốt ruột, mất thiện cảm. Cho họ theo dõi minh bạch = trải nghiệm tốt + đỡ tốn công gọi hỏi.

**Làm mới:**

### 4.1 Trang theo dõi hồ sơ cho ứng viên
Sau khi nộp, ứng viên nhận link `/ung-tuyen/[token]` (qua email/SMS) → xem trạng thái:
```
Hồ sơ của bạn — Nhân viên bán hàng @ AZLAB
  ✅ Đã nhận hồ sơ         (12/07)
  ✅ Đang xem xét          (13/07)
  🔵 Mời phỏng vấn         → 15/07 lúc 14h, tại 12 Nguyễn Huệ
  ⚪ Kết quả
  ─────────────────────────────
  [📞 Gọi nhà tuyển dụng]  [❌ Rút hồ sơ]
```
- Trạng thái đồng bộ với kanban của nhà tuyển dụng (đã có sẵn status).
- Có lịch phỏng vấn (đã có interviewAt).
- Nút rút hồ sơ (đúng luật — quyền của ứng viên).

### 4.2 Tự động báo tin
Khi nhà tuyển dụng đổi trạng thái → tự gửi email/Zalo cho ứng viên ("Bạn được mời phỏng vấn..."). Tái dùng hệ thống email đã có.

**Cần thêm:** route public `/ung-tuyen/[token]` (token ký từ candidateId); API `/api/public/application/[token]` (xem trạng thái + rút); hook đổi status → gửi thông báo (mở rộng cái đã có).

---

# KẾ HOẠCH 5 — Bảng điều khiển tuyển dụng (báo cáo rõ ràng)

**Vì sao:** Rippling/Ashby mạnh ở analytics. Ta có tab Báo cáo cơ bản (phễu) → nâng cấp để sếp thấy: tuyển từ NGUỒN nào hiệu quả, mất bao lâu, tốn bao nhiêu.

**Cải thiện:**

### 5.1 Thêm biểu đồ "Nguồn tuyển" (source of hire)
```
NGUỒN ỨNG VIÊN (tháng này)
  Trang tuyển dụng   ████████ 45%
  Giới thiệu         █████ 28%
  Liên hệ chủ động   ███ 18%
  Cộng đồng Timio    ██ 9%
  → Giới thiệu cho tỷ lệ TUYỂN cao nhất (chốt 40%)
```
- Đã có `Candidate.source` (website/referral/...) → chỉ cần gom nhóm + vẽ.
- Chỉ số: tỷ lệ chốt theo nguồn, time-to-hire theo nguồn.

### 5.2 Ô "gợi ý hành động" (AI insight)
1-2 câu AI đọc số liệu gợi ý: "Giới thiệu hiệu quả nhất — nên đẩy mạnh referral", "Vị trí X tuyển đã 30 ngày chưa xong — cân nhắc tăng lương/đăng thêm kênh".

**Cần thêm:** mở rộng `/api/recruitment/stats` (group by source + outreach funnel); cập nhật tab Báo cáo với biểu đồ nguồn + insight.

---

# KẾ HOẠCH 6 — Trang giá rõ ràng + gợi ý nâng cấp (land-and-expand)

**Vì sao:** Rippling thắng nhờ "land-and-expand" — khách vào bằng chấm công rồi bán chéo. Cần trang giá rõ + nút nâng cấp đúng lúc. Nghiên cứu cho điểm neo: chấm công 10-15k/người/tháng; add-on tuyển dụng; credit 100-200k/lượt.

**Làm mới:**

### 6.1 Trang giá 3 gói rõ ràng
```
  KHỞI ĐẦU          CHUYÊN NGHIỆP       DOANH NGHIỆP
  (chấm công)        (+ HR + nghỉ phép)  (+ Tuyển dụng AI)
  ~12k/người/tháng   ~20k/người/tháng    Liên hệ
  ✓ Quét mặt         ✓ Tất cả Khởi đầu   ✓ Tất cả Pro
  ✓ Báo cáo          ✓ Nghỉ phép         ✓ Tuyển dụng AI
  ✓ QR/app           ✓ Bảng lương        ✓ Kho ứng viên xác thực
                     ✓ Chi nhánh         ✓ Liên hệ chủ động
```
- So sánh rõ từng tính năng (bảng ✓/✗).
- Nút "Nâng cấp" nổi bật.

### 6.2 Gợi ý nâng cấp đúng lúc (upsell mềm)
Khi khách gói chấm công bấm vào Tuyển dụng → banner nhẹ: "Mở khóa Tuyển dụng AI — tìm ứng viên xác thực từ chính dữ liệu chấm công của bạn. [Xem gói]". Không ép, chỉ gợi.

**Cần thêm:** trang `/gia` hoặc mục trong dashboard; banner upsell ở các tab bị khóa (đã có PlanGate → làm đẹp hơn).

---

## THỨ TỰ ĐỀ XUẤT LÀM
1. **KH1 (Điểm tin cậy)** — moat, tác động lớn nhất, không cần đổi DB nhiều.
2. **KH2 (ATS theo tiêu chí)** — nâng chất lượng lõi ATS.
3. **KH4 (Ứng viên theo dõi)** — trải nghiệm, nhỏ mà tiện.
4. **KH3 (Trang công ty đẹp)** — hút inbound.
5. **KH5 (Báo cáo)** — đo hiệu quả.
6. **KH6 (Trang giá)** — chốt doanh thu.

## Ghi chú
- Mọi tính năng dùng dữ liệu cá nhân (điểm tin cậy, hồ sơ) đều giữ nguyên tắc **đồng ý + ẩn danh + rút được** (Luật 91/2025).
- UI theo hệ icon Lucide đã có, không emoji trong sản phẩm (emoji trong tài liệu này chỉ để phác họa).
- Mỗi kế hoạch làm xong sẽ: tsc + build + test + push, rồi báo cáo.
