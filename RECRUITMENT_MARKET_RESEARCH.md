# Nghiên cứu thị trường: Timio mở rộng sang Tuyển dụng (Recruitment Marketing + Cộng đồng + AI Sourcing)

> Ngày nghiên cứu: 07/07/2026. Phương pháp: fan-out tìm kiếm đa góc → đọc 23 nguồn → kiểm chứng chéo từng số liệu (3 giám khảo/claim). Các mục đánh dấu ✓ = đã kiểm chứng 2-3/3 phiếu từ nguồn gốc (trang giá chính chủ); mục (¹ nguồn đơn) = số liệu từ 1 nguồn đáng tin nhưng chưa kiểm chứng chéo (bước verify bị nghẽn quota, KHÔNG có claim nào bị bác bỏ).

---

## KẾT LUẬN NHANH (TL;DR)

1. **Ý tưởng này thế giới ĐÃ có người làm và làm rất thành công** — mô hình gần nhất với ý tưởng của Timio là **Employment Hero (Úc)**: HR/payroll SaaS biến chính nhân viên các công ty khách hàng thành **kho ứng viên 1,5 triệu hồ sơ** (app Swag), tạo hiệu ứng mạng: càng nhiều công ty dùng chấm công/lương → kho ứng viên càng lớn → tuyển càng dễ → càng nhiều công ty vào. Đạt ~$163M ARR, 300.000 doanh nghiệp (¹ nguồn đơn: sacra.com).
2. **Ở Việt Nam: các đối thủ HRM đã có module tuyển dụng (ATS + AI sàng lọc CV) — Tanca ✓, MISA AMIS ✓, Base E-Hiring ✓ — NHƯNG chưa ai có "sàn/cộng đồng ứng viên riêng"**. Họ chỉ hút hồ sơ từ TopCV/VietnamWorks về. → Khoảng trống thật sự nằm ở **cộng đồng ứng viên + dữ liệu độc quyền**, không phải ở ATS.
3. **Cảnh báo lớn**: JobHopin — startup "AI tự tìm ứng viên" đúng nghĩa của VN — gọi vốn nhiều triệu USD vẫn **thất bại** (cắt từ 200 người còn 15, ngừng gọi vốn 10/2023; AI matching bị ChatGPT "hàng hóa hóa") (¹ vir.com.vn). Bài học: **AI không phải moat — DỮ LIỆU ĐỘC QUYỀN mới là moat**. Timio có thứ không ai có: dữ liệu chấm công thật (chuyên cần, đúng giờ, thâm niên) để làm "hồ sơ ứng viên đã xác thực".
4. **Về giá**: module tuyển dụng ở VN đang được bán RẤT đắt so với Timio — Base E-Hiring khởi điểm **850k/tháng chỉ riêng tuyển dụng** ✓; 1 tin đăng TopCV loại tốt **4,4–9,65 triệu/tin** ✓/(¹). → Timio hoàn toàn có thể tạo gói mới **1,2–1,5 triệu/tháng** (gấp ~2x Business hiện tại) mà vẫn RẺ hơn mua rời.

---

## PHẦN 1 — THẾ GIỚI: các mô hình đã có + bảng giá

### 1a. Sàn tuyển dụng / recruitment marketing
| Nền tảng | Mô hình | Giá (¹ trừ khi ghi ✓) |
|---|---|---|
| ZipRecruiter | Trả theo "slot tin đăng đang chạy"/tháng | Standard ~$299–399/slot/tháng; Premium $419–519; Pro $719–899. Không công khai giá, báo giá riêng từng khách |
| LinkedIn/Indeed | Per-click / per-application + gói Recruiter | Giá biến động theo đấu giá |
| TopCV (VN, để so) | Trả theo tin đăng | ✓ Free tier 30 ngày (không quyền lợi); combo 2,55tr/3 tin; TOP ECO PLUS 4,4tr; (¹) TOP MAX 7,5tr; TOP MAX PLUS 9,65tr/tin |

### 1b. AI sourcing (tự đi tìm + nhắn ứng viên) — đúng cái anh mô tả
| Công cụ | Làm gì | Giá (¹) |
|---|---|---|
| hireEZ | AI quét 800M hồ sơ web, tự tìm + outreach | $149–250/user/tháng, hợp đồng median ~$13.000/năm |
| SeekOut | AI sourcing + talent analytics | $3.000–6.000/seat/năm (Essentials) → $15.000+/seat/năm |
| Fetcher | Tự tìm + gửi email cá nhân hóa | Từ $149/tháng |
| Paradox (Olivia) | AI chatbot tuyển dụng tự động (screen, hẹn phỏng vấn) | ~$1.000/tháng starter → $75k–150k+/năm enterprise |
| Manatal | ATS + AI cho SMB (rẻ nhất) | $15/user/tháng |
| Workable | ATS all-in-one + AI screening | $299/tháng Standard, $599 Premier |

→ **Nhận xét**: "AI tự tìm ứng viên ngoài internet" là sản phẩm đắt (hàng trăm USD/user/tháng) vì phải có database hồ sơ khổng lồ. SMB VN không trả nổi giá đó, và Timio không có database hồ sơ web — **đừng đâm đầu vào AI outbound sourcing kiểu hireEZ ngay từ đầu**.

### 1c. HR SaaS bundle tuyển dụng — mô hình đáng học nhất
- **Rippling** (¹ sacra.com): khách bắt đầu bằng HR/payroll → cross-sell thêm module (Recruiting, IT, Finance); tính **tiền theo nhân viên × theo module** → ARPU tăng khi bật thêm module; khách dùng 3+ module có LTV ~5x; đạt $1B ARR 3/2026, tăng 78%/năm. "Employee Graph" chung làm việc bật module mới gần như không ma sát → **đúng vị thế của Timio: đã có sẵn hồ sơ + dữ liệu nhân viên**.
- **Employment Hero** (¹ sacra.com): AU$12/nhân viên/tháng; ATS tích hợp AI match từ **kho 1,5M ứng viên lấy từ app Swag** — app tiêu dùng cho CHÍNH nhân viên của khách hàng (xem phiếu lương, và... tìm việc). → Flywheel: nhiều công ty dùng payroll → nhiều nhân viên dùng Swag → kho ứng viên phình → tuyển dễ → bán được thêm. **Đây chính là ý tưởng "cộng đồng tuyển dụng" của Timio, đã được chứng minh scale được.**

---

## PHẦN 2 — VIỆT NAM

### 2a. Sàn tuyển dụng hiện có
- **TopCV** ✓: thống trị; free tier làm mồi, gói trả phí 2,55–9,65tr; AI chỉ là "đề xuất CV", KHÔNG phải AI sourcing tự động ✓. Điểm yếu (¹ review người dùng): spam call, tin tuyển ảo, CV gửi không phản hồi.
- **VietnamWorks**: không công khai bảng giá (phải qua portal/sales) (¹) — đắt, thiên white-collar.
- **Thực tế SME/công nhân** (¹): tuyển chủ yếu qua **Facebook/Zalo/TikTok, treo biển trước xưởng, giới thiệu người quen** — gần như 0 đồng → **mức sẵn lòng chi cho "đăng tin" của SME nhỏ rất thấp**; nỗi đau thật là "đăng tin mà không có ai ứng tuyển".

### 2b. HRM có module tuyển dụng chưa? (câu hỏi then chốt của anh)
| Đối thủ | Có module tuyển dụng? | Mức độ | Có sàn/cộng đồng ứng viên riêng? |
|---|---|---|---|
| **Tanca** | ✓ CÓ (ATS tích hợp chấm công) | ✓ AI đọc CV, đối chiếu JD, xếp hạng ứng viên; tuyển xong tự tạo hồ sơ nhân viên | ✗ KHÔNG |
| **MISA AMIS** | ✓ CÓ (AMIS Tuyển dụng, nối chấm công–lương) | ✓ AI Agent: tự tạo+đăng tin, soạn email/thư mời, sàng lọc chấm điểm, tóm tắt CV | ✗ KHÔNG — chỉ hút hồ sơ từ VietnamWorks/TopCV, đăng qua FB/LinkedIn ✓ |
| **Base E-Hiring** | ✓ CÓ (bán RỜI như sản phẩm riêng) | AI quét CV, lọc trùng, chấm điểm, tự đặt lịch PV (¹) | ✗ KHÔNG |
| **Giá của họ** | Base: ✓ 850k/tháng gói thấp nhất (5 user, cam kết 12 tháng); Growth 2,49tr; Advanced 5,25tr (¹) | | |

→ **Kết luận phần VN**: làm ATS + AI screening thì Timio là **người đến sau** (cả 3 đối thủ đã có). Nhưng **"cộng đồng ứng viên + hồ sơ xác thực từ dữ liệu chấm công" thì CHƯA AI CÓ** — đây là cửa duy nhất đáng đánh, và trùng khớp mô hình Employment Hero đã chứng minh.

### 2c. Bài học thất bại phải nhớ
- **JobHopin** (¹): AI matching thuần túy chết ở VN dù có vốn — AI không còn là lợi thế khi ai cũng có GPT. 
- **Bài toán con gà–quả trứng** (¹): sàn tuyển dụng mới không có ứng viên → công ty không đăng tin → càng không có ứng viên. **Cách phá duy nhất của Timio: KHÔNG xây sàn từ số 0 — kho ứng viên khởi đầu chính là nhân viên đang chấm công trên Timio** (như Swag của Employment Hero).

---

## PHẦN 3 — KHUYẾN NGHỊ LỘ TRÌNH CHO TIMIO (3 giai đoạn)

### Giai đoạn 1 (nhanh, 1-2 tháng): "Tuyển dụng AI" — nâng module sơ khai hiện có lên ngang đối thủ, tận dụng trợ lý giọng nói
- ATS chuẩn: pipeline ứng viên kéo-thả, JD template, trang tuyển dụng riêng cho mỗi công ty (`timio.vn/tuyendung/[slug]` — như đã có kiosk slug).
- **AI Agent tuyển dụng** (mình đã có sẵn hạ tầng Claude tool-use + giọng nói): sếp NÓI "tuyển 2 phục vụ ca tối, lương 25k/giờ" → AI tự soạn JD + đăng lên trang tuyển dụng + tạo nội dung đăng Facebook/Zalo (đúng kênh SME thật sự dùng, thay vì đòi họ mua tin TopCV 4-9 triệu).
- AI đọc CV/hồ sơ ứng tuyển, chấm điểm, tóm tắt, xếp lịch phỏng vấn — ngang Tanca/MISA/Base.
- Tuyển xong 1 chạm → tạo hồ sơ nhân viên + đăng ký khuôn mặt + vào ca (điểm mạnh riêng: nối thẳng vào chấm công, "từ ứng viên đến ca làm đầu tiên trong 1 ngày").

### Giai đoạn 2 (3-6 tháng): "Cộng đồng ứng viên Timio" — moat thật
- Nhân viên trên cổng/app Timio bật **"Sẵn sàng cho cơ hội mới"** (opt-in, ẩn danh với công ty hiện tại).
- **Hồ sơ ứng viên XÁC THỰC bằng dữ liệu chấm công**: "đi làm chuyên cần 98%, đúng giờ 96%, thâm niên 14 tháng, kỹ năng ca đêm" — thứ TopCV/Tanca/MISA không bao giờ có. Nhà tuyển dụng SME tin ngay vì đây là dữ liệu máy ghi, không phải tự khai.
- Ứng viên ngoài cũng tạo hồ sơ được (kho mở rộng), nhưng huy hiệu "Xác thực bởi Timio" là hàng hiếm.
- Phá bài toán con gà–quả trứng bằng chính user base chấm công (mỗi công ty mới = thêm chục ứng viên tiềm năng vào kho).

### Giai đoạn 3 (6-12 tháng): AI tự tìm ứng viên trong kho + recruitment marketing
- AI chủ động quét kho cộng đồng, match JD → gợi ý + (được ứng viên cho phép) tự nhắn mời ứng tuyển qua Zalo/app — "AI sourcing" phiên bản khả thi vì tìm trong kho CỦA MÌNH, không phải cào web như hireEZ.
- Công cụ marketing tuyển dụng: tự đăng đa kênh FB/Zalo/TikTok, đo lượt xem/ứng tuyển từng kênh.

### Định giá đề xuất
| Phương án | Giá | Ghi chú |
|---|---|---|
| **Add-on "Tuyển dụng AI"** cho gói Pro/Business | **+300–500k/tháng** | So neo: Base bán rời 850k/tháng + cam kết 12 tháng → Timio add-on 300-500k là "ngon-bổ-rẻ" rõ rệt |
| **Gói mới "Business+ / Suite"** (chấm công + lương + tuyển dụng + AI) | **1,2–1,5tr/tháng** | Vẫn rẻ hơn Base Basic (850k chỉ tuyển dụng) + Tanca/MISA mua module rời; nâng trần giá Timio lên gần gấp đôi |
| Thu theo giao dịch (GĐ 2-3) | 100–200k/lượt "mở khóa hồ sơ xác thực" hoặc tin đăng ưu tiên trong cộng đồng | Doanh thu marketplace, không cần tăng giá subscription; so neo: 1 tin TopCV = 4,4–9,65tr |
| KHÔNG nên | Bán per-hire (khó track, dễ lách) hoặc gói AI sourcing giá USD kiểu hireEZ | Sai túi tiền SME VN |

### Vì sao Timio thắng được (điểm khác biệt để marketing)
1. **Hồ sơ ứng viên xác thực bằng máy chấm công** — không ai làm giả được, không đối thủ nào có.
2. **Tuyển bằng giọng nói với trợ lý AI** — "nói một câu, có tin tuyển đăng khắp Facebook/Zalo" (không đối thủ VN nào có trợ lý hội thoại giọng nói).
3. **Từ ứng viên → nhân viên chấm công trong 1 chạm** (Tanca có ý này nhưng Timio làm mượt hơn + rẻ hơn).
4. **Đúng kênh + đúng túi tiền SME nhỏ**: giúp đăng miễn phí lên FB/Zalo thay vì ép mua tin 4-9 triệu.

### Rủi ro cần quản
- Đến sau về ATS (Tanca/MISA/Base đã có) → đừng marketing là "ATS", hãy marketing là "cộng đồng ứng viên xác thực + AI tuyển bằng giọng nói".
- Cộng đồng cần khối lượng: chỉ đáng làm khi Timio có đủ số công ty/nhân viên đang hoạt động; giai đoạn 1 phải tự nuôi được doanh thu trước.
- Nhạy cảm: nhân viên "open to work" phải ẨN với chủ hiện tại tuyệt đối, opt-in rõ ràng — sai một lần là mất niềm tin cả 2 phía.

---

## Nguồn chính
- tuyendung.topcv.vn/bang-gia-dich-vu (giá TopCV — primary ✓) · tanca.io/feature/recruitment ✓ · amis.misa.vn/amis-tuyen-dung ✓ · base.vn/hiring ✓
- sacra.com/c/rippling, sacra.com/c/employment-hero (mô hình bundle & ARPU — ¹)
- vir.com.vn (JobHopin thất bại — ¹) · smartjobboard.com (chicken-egg — ¹) · selectsoftwarereviews.com, pin.com, index.dev, pitchmeai.com (giá công cụ AI recruiting toàn cầu — ¹)
