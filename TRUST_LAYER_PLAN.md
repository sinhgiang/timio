# KẾ HOẠCH CHI TIẾT — Wedge "Lớp độ tin cậy di động cho lao động frontline VN"

*Dựa trên `DIFFERENTIATION_STRATEGY.md` (deep-research 08/7/2026). Nguyên tắc: hồ sơ do NGƯỜI LAO ĐỘNG sở hữu (opt-in, hợp Luật 91/2025); điểm tin cậy CÓ LỢI CHO NV trước; khép vòng tuyển→chấm công→trả/ứng lương→tái tuyển; đánh dày theo cụm F&B/bán lẻ SME.*

## 0. Định vị 1 câu
**"Timio — hồ sơ đi làm thật, đi theo bạn."** Mỗi lao động frontline có 1 hồ sơ **do chính họ sở hữu**, ghi lại lịch sử đi làm thật (đúng giờ, chuyên cần, gắn bó) được **xác thực bằng chấm công khuôn mặt** — mang theo để xin việc tốt hơn, ứng lương nhiều hơn. Chủ quán tuyển được người **đáng tin thật** thay vì đoán qua CV.

## 1. Mình đã có gì (tận dụng, không xây lại)
| Mảnh | Trạng thái | Dùng cho wedge |
|---|---|---|
| Chấm công khuôn mặt (kiosk) | ✅ | Nguồn dữ liệu gốc, không ai có |
| Tài khoản xuyên công ty (1 SĐT = 1 `WorkerAccount`, có `handle`) | ✅ | Xương sống hồ sơ di động |
| Hồ sơ công khai `/ho-so/[handle]` + stat xác thực (ngày công, % đúng giờ, kinh nghiệm) | ✅ | **Đây chính là mầm của điểm tin cậy** |
| Đồng ý app/tài chính (`consentAppAt`, `consentFinanceAt`) | ✅ | Nền cho opt-in Luật 91/2025 |
| Tuyển dụng + kho cựu NV (talent pool) | ✅ | Vòng tái tuyển |
| EWA/ứng lương | ✅ | Gắn điểm → hạn mức tốt hơn |

→ **Wedge KHÔNG phải sản phẩm mới**; là NỐI các mảnh + thêm 3 thứ: **(1) Điểm tin cậy, (2) Quyền sở hữu/opt-in của NV, (3) Vòng tái tuyển theo cụm.**

---

## GIAI ĐOẠN 1 — Điểm tin cậy + hồ sơ do NV sở hữu (nền tảng, rủi ro thấp)

**Mục tiêu:** biến hồ sơ hiện tại thành "hồ sơ độ tin cậy" mà NV tự hào và muốn khoe.

### 1.1 Điểm tin cậy (Timio Trust Score)
- Tính từ chấm công thật (đã có `AttendanceLog`): **% đúng giờ · tỷ lệ chuyên cần (đi làm/lịch) · thời gian gắn bó · số nơi hoàn thành tử tế**.
- Cuốn chiếu (gần đây nặng hơn — học Instawork) để NV cải thiện được.
- Hiển thị dạng **có lợi cho NV**: "Điểm tin cậy 87/100 — Rất đáng tin. Bạn thuộc top 15% đúng giờ." + gợi ý tăng điểm.
- Kỹ thuật: `lib/trustScore.ts` (nới `computeWorkerProfile`), hiển thị trong `/ho-so/[handle]` tab Hồ sơ (đã có band "Được Timio xác thực").

### 1.2 NV SỞ HỮU + opt-in (Luật 91/2025 — bắt buộc)
- **Mặc định hồ sơ RIÊNG TƯ.** NV tự bật "Cho phép nhà tuyển dụng khác xem hồ sơ của tôi" + **chọn chia sẻ gì** (điểm tin cậy / kinh nghiệm / liên hệ) — 3 công tắc riêng.
- Thêm field `WorkerAccount`: `profilePublic` (bool), `shareTrustScore`, `shareContact`, `openToWork` (đang tìm việc?).
- Mọi chia sẻ xuyên chủ = **do NV chủ động bật**, có nhật ký đồng ý → hợp Luật 91/2025 (Timio KHÔNG bán data giữa các chủ).

### 1.3 Khung "có lợi cho NV"
- Trang giải thích: điểm tin cậy giúp bạn **được ưu tiên tuyển, ứng lương nhiều hơn, xin việc lương cao hơn**.
- Huy hiệu/cấp độ (Đồng/Bạc/Vàng) để tạo động lực quét mặt đều.

**Xong GĐ1:** mỗi NV có điểm tin cậy + toàn quyền bật/tắt chia sẻ. Chưa động tới tái tuyển → gần như 0 rủi ro pháp lý.

---

## GIAI ĐOẠN 2 — Vòng tái tuyển theo cụm (network effect)

**Mục tiêu:** khi NV nghỉ (opt-in), hồ sơ xác thực thành tài sản để chủ KHÁC tuyển → khép vòng.

### 2.1 Kho ứng viên xác thực (mở rộng talent pool đã có)
- NV bật `openToWork` → vào kho ứng viên frontline **có điểm tin cậy thật** (khác hẳn CV tự khai).
- Chủ tuyển frontline (F&B/bán lẻ) tìm theo: khu vực · vị trí · **điểm tin cậy tối thiểu** · từng làm ngành gì.
- Ẩn danh cho tới khi NV đồng ý kết nối (giống luồng talent đã có — privacy #1).

### 2.2 Đánh DÀY theo cụm địa lý-ngành
- Pilot 1 khu vực (vd F&B một quận ở TP.HCM/Hà Nội): mời đủ nhiều quán dùng chấm công → khi NV nhảy việc trong cụm, hồ sơ **dùng lại ngay** → giá trị tái tuyển bật lên (network effect).
- Chỉ số kích hoạt: mật độ ≥ X quán + Y lao động trong bán kính Z km (đo trong pilot).

### 2.3 Nối tuyển dụng đã có
- Tin tuyển frontline hiện điểm tin cậy ứng viên; 1 chạm mời cựu NV đáng tin quay lại/sang chỗ mới.

**Xong GĐ2:** chủ quán tuyển được người đáng tin trong cụm; NV nhảy việc không mất "uy tín đã tích".

---

## GIAI ĐOẠN 3 — Tài chính + phúc lợi gắn điểm (giữ chân + doanh thu)

**Mục tiêu:** biến điểm tin cậy thành quyền lợi thật cho NV, thành doanh thu cho Timio.

- **Ứng lương theo điểm:** điểm cao → hạn mức/điều kiện ứng lương tốt hơn (nới EWA đã có).
- **Phúc lợi/ưu đãi** (từ nghiên cứu B): NV điểm cao được ưu đãi tốt hơn.
- **Bảo hiểm vi mô / tiết kiệm** qua đối tác (đúng ranh giới: không cầm tiền, qua đại lý — xem `EXPANSION_RESEARCH.md`).

---

## 2. Doanh thu (nhiều nguồn, hợp SME chi trả thấp)
1. **SaaS chấm công/tháng** (đã có) — giữ rẻ để phủ dày.
2. **Phí tái tuyển thành công** — chủ trả khi tuyển được người xác thực (rẻ hơn nhiều so tuyển lại + no-show).
3. **Spread EWA** (đã có).
4. **Phí xác thực / hồ sơ premium** (kiểu verifyBetter) — sau, khi có mật độ.

## 3. Chỉ số đo (bắc thang)
- GĐ1: % NV bật hồ sơ công khai; điểm tin cậy trung bình; tần suất mở app.
- GĐ2: số **lượt tái tuyển** thành công trong cụm; **giảm no-show** (mục tiêu học Instawork ~2%); thời gian tuyển.
- GĐ3: hạn mức EWA gắn điểm; tỷ lệ giữ chân.

## 4. KHÔNG làm (tránh đua ông lớn)
- Không dựng job-board tổng (Việc Làm Tốt/TopCV đã thắng sourcing cổ cồn trắng).
- Không đua module kế toán/HR với MISA.
- Không làm EWA đơn lẻ (GIMO đã thắng) — chỉ EWA GẮN vào vòng.
- Không "chấm điểm đen" cho chủ — luôn khung "có lợi cho NV".

## 5. Rủi ro & cách phòng
| Rủi ro | Phòng |
|---|---|
| **Luật 91/2025** (phạt 3 tỷ, cấm bán DLCN) | Hồ sơ NV sở hữu, opt-in từng phần, nhật ký đồng ý; Timio không bán data giữa chủ |
| NV tẩy chay "chấm điểm đen" | Khung có lợi cho NV; NV kiểm soát; điểm giúp họ kiếm tiền |
| Ghép 2 mảnh chưa có tiền lệ | Ra GĐ1 trước (0 rủi ro), đo adoption rồi mới mở tái tuyển |
| Chưa đạt mật độ network-effect | Đánh dày 1 cụm, không dàn mỏng |
| Số liệu thị trường từ bên có lợi ích | Tự đo trong pilot, không tin tuyệt đối con số PR |

## 6. Bước đi đầu tiên đề xuất (build ngay được)
**GĐ1.1 + 1.2** — thêm **Điểm tin cậy** vào hồ sơ + **công tắc opt-in do NV sở hữu** — vì gần như đã có nền (`/ho-so`, verified stats, consent). Rủi ro pháp lý ~0, cho ra thứ NV thấy ngay giá trị, đặt nền cho tái tuyển sau.
