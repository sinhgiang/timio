# Bản đồ Đối thủ & Thị trường — Timio

> Nghiên cứu deep-research đa nguồn (104 AI agent, kiểm chứng chéo 3 vote/claim, **21/25 claim xác nhận đồng thuận 3-0, 4 claim bị bác**). Ngày: 08/07/2026.
>
> **Bối cảnh:** Timio = SaaS chấm công VN (nhận diện khuôn mặt, kiosk + dashboard + app) đang mở rộng sang tuyển dụng. Mục tiêu: học mô hình, giá, tính năng, chiến lược mở rộng của các ông lớn ở 4 nhóm.

---

## TÓM TẮT

Ranh giới giữa "chấm công/HR" và "tuyển dụng" ngày càng mờ — đúng hướng mở rộng Timio đang đi, và nhiều ông lớn đã chứng minh thành công. Ở VN, **TopCV** dẫn đầu tuyển dụng, **VietnamWorks** là incumbent cao cấp, **Base.vn (FPT)** là đối thủ trực tiếp nhất vì đã gộp cả chấm công + tuyển dụng. Toàn cầu, **Rippling** và **Deel** chứng minh mô hình "land-and-expand" per-employee/tháng, còn **Employment Hero (Úc)** là mô hình mẫu gần nhất với Timio (biến app HR thành sàn ứng viên có network effect). AI tuyển dụng đang tăng tốc mạnh, mở cơ hội khác biệt bằng **"hồ sơ ứng viên xác thực bằng dữ liệu chấm công thật"**.

---

## NHÓM 1 — TUYỂN DỤNG VIỆT NAM

| Công ty | Vị thế | Mô hình & giá | Bài học cho Timio |
|---|---|---|---|
| **TopCV** | **#1 traffic** (hạng 1 mục "Jobs & Employment" VN, Similarweb 6/2026) | Đăng tin + AI chấm/viết lại CV. Báo cáo thường niên dựa trên khảo sát 3.000+ DN + phân tích ~300.000 tin/năm | Dẫn đầu nhờ **volume tin + dữ liệu độc quyền**; dùng **báo cáo thị trường thường niên** làm marketing/thought leadership |
| **VietnamWorks** (Navigos Group) | Incumbent cao cấp (từ 2002) | Doanh thu thuần **>400 tỷ VND/năm** (2020-21), lãi sau thuế >70 tỷ. Mô hình lai: **bán kho CV** (3,87tr–37,17tr +VAT tùy 1-12 tháng) + đăng tin trả phí. **KHÔNG có gói miễn phí** | Phân khúc cao cấp sống bằng **bán dữ liệu ứng viên/CV database** — mảnh Timio có thể khác biệt bằng hồ sơ xác thực |
| **ITviec / TopDev** | Ngách IT | Không công bố giá/quy mô; dùng **báo cáo lương thường niên** làm mồi thu hút | Ngách cạnh tranh bằng **dữ liệu chuyên sâu + định vị chuyên gia** |

*Chưa xác minh được (cần nghiên cứu thêm): giá & quy mô JobsGO, Job3s, Việc Làm Tốt (Chợ Tốt), Glints VN, Vieclam24h/CareerLink, CareerViet chi tiết.*

---

## NHÓM 2 — TUYỂN DỤNG QUỐC TẾ & XU HƯỚNG AI

- **Ashby** — mô hình mẫu **ATS AI-native**: AI phủ toàn bộ hành trình (sourcing → sàng lọc → phỏng vấn → analytics). Sàng lọc theo **tiêu chí khách quan** do khách định nghĩa (verdict Đạt/Không đạt từng tiêu chí, KHÔNG xếp hạng số) + **human-in-the-loop** (con người phê duyệt). → Đúng hướng "AI soạn + người bấm duyệt" mà Timio đã build.
- **Xu hướng AI tuyển dụng tăng tốc**: **40,7% DN Việt** chọn AI làm hướng phát triển (báo cáo TopCV 2025-26); toàn cầu **37% tổ chức** đang tích hợp/thử nghiệm GenAI tuyển dụng (tăng từ 27%), **73% chuyên gia TA** tin AI sẽ thay đổi cách tuyển (LinkedIn Future of Recruiting).
- **⭐ Khoảng trống "Quality of Hire"**: **89%** chuyên gia nói đo chất lượng tuyển ngày càng quan trọng, nhưng chỉ **25% tự tin đo được**, 61% tin AI cải thiện được. → **Dữ liệu chấm công thật (chuyên cần %, đúng giờ %, thâm niên) là bằng chứng khách quan cho "quality of hire"** — moat mà job board thuần không có.

*Chưa xác minh: doanh thu/định giá cụ thể Greenhouse, Lever, hireEZ, SeekOut, Gem (đã có ở báo cáo AI_SOURCING_RESEARCH.md phần cơ chế).*

---

## NHÓM 3 — CHẤM CÔNG & HR SaaS VIỆT NAM (đối thủ trực tiếp)

| Công ty | Điều quan trọng nhất |
|---|---|
| **⚠️ Base.vn** (thuộc FPT) | **ĐỐI THỦ TRỰC TIẾP NHẤT** — bộ **HRM+ 8 module đã gộp cả chấm công (Base Schedule) + tuyển dụng (Base E-Hiring)** (tích hợp VietnamWorks/Vieclam24h/Timviecnhanh) + Payroll/Goal/Review/Me/Reward. Phục vụ 10.000+ DN. **Đã đi đúng con đường chấm công→tuyển dụng của Timio** |
| **MISA AMIS Chấm công** | **10.000–15.000 VND/nhân viên/tháng** (5,1tr/năm cho 30 user ≈ 14k/user/tháng). **Đã có nhận diện khuôn mặt** + vân tay/thẻ/GPS/QR/WiFi → **lợi thế khuôn mặt của Timio không còn độc quyền** |

**→ Điểm neo giá thị trường VN: ~10-15k/người/tháng.** Timio phải khác biệt bằng **độ chính xác kiosk + hồ sơ ứng viên xác thực**, KHÔNG đua bề rộng module với Base.

*Chưa xác minh: Tanca, ACheckin, Fastwork, GapoWork có gộp tuyển dụng chưa; giá phần cứng ZKTeco/Ronald Jack/Hanet/Hikvision/Suprema.*

---

## NHÓM 4 — CHẤM CÔNG/WORKFORCE/HR QUỐC TẾ (mô hình mẫu mở rộng)

| Công ty | Quy mô | Bài học cho Timio |
|---|---|---|
| **Rippling** | ~1 tỷ USD ARR, định giá **16,8 tỷ USD** (Series G 5/2025), 10+ dòng sản phẩm (mỗi dòng >1tr USD ARR), ~78% tăng trưởng YoY | **"Land-and-expand" per-employee/tháng theo module**: bắt đầu HR/chấm công (land) → bán chéo tuyển dụng/payroll/IT (expand). Tăng ARPU + retention |
| **Deel** | **>1 tỷ USD ARR**, định giá **17,3 tỷ USD** (Series E 10/2025), 35.000+ khách / 1,5tr+ lao động / 150+ quốc gia | Thị trường HR/payroll toàn cầu cực lớn, VC đổ vốn mạnh; định vị theo module + phủ nhiều nước |
| **⭐ Employment Hero** (Úc) | App nhân viên **Swag chứa ~1,5 triệu hồ sơ** (nay 2-2,3tr), từ 200.000+ tổ chức / 1tr+ nhân viên | **MÔ HÌNH MẪU GẦN NHẤT VỚI TIMIO**: biến nền tảng HR/chấm công thành **sàn ứng viên** với AI matching → **hiệu ứng mạng** (càng nhiều DN dùng, kho ứng viên càng lớn). Chính xác con đường chấm công/HR→cộng đồng ứng viên |

*Chưa xác minh: giá per-employee cụ thể của Employment Hero (claim AU$12 bị bác), Deputy, When I Work, Homebase, Connecteam, Jibble.*

---

## 🎯 KHUYẾN NGHỊ ĐỊNH VỊ CHO TIMIO

1. **Học chính xác Employment Hero** — con đường Timio đang đi đã được chứng minh: nhân viên dùng app chấm công → tạo hồ sơ xác thực → dần thành talent pool có **network effect**. Đây là moat bền vững nhất.
2. **Giá theo mô hình Rippling** — per-employee/tháng theo module (chấm công = "land", tuyển dụng AI = "expand"), neo quanh **10-15k/người/tháng** như MISA để cạnh tranh ở VN.
3. **Moat khác biệt (KHÔNG đua điểm mạnh của đối thủ)**:
   - KHÔNG đua nhận diện khuôn mặt (MISA đã có).
   - KHÔNG đua bề rộng module (Base đã có).
   - MÀ là **"hồ sơ ứng viên xác thực bằng dữ liệu chấm công thật = bằng chứng chất lượng tuyển"** — thứ ~75% thị trường đang thiếu (chỉ 25% tự tin đo được quality of hire).
4. **AI-native ngay từ đầu** — thị trường sẵn sàng (37% toàn cầu, 40,7% VN đang hướng AI); sàng lọc theo tiêu chí khách quan + human-in-the-loop như Ashby.

---

## ⚠️ LƯU Ý ĐỘ TIN CẬY

- **4 claim ĐÃ BỊ BÁC (đừng dùng):** tăng trưởng Glints 250%/1000%; traffic TopCV 6,5tr/tháng; giá đăng tin VietnamWorks 1,95tr/tin; giá Employment Hero AU$12/người/tháng.
- Nhiều số liệu VN là **công ty tự công bố** trong báo cáo ra mắt (TopCV, ITviec, MISA) — có lợi ích riêng, chưa kiểm toán độc lập.
- Doanh thu VietnamWorks chỉ từ 1 nguồn thứ cấp (vietdata); giá có thể đã đổi (đang chuyển sang hệ thống credit).
- Định giá Rippling/Deel là 2025 — thay đổi nhanh.
- **Rào cản pháp lý quan trọng**: dùng dữ liệu chấm công/khuôn mặt để xác thực hồ sơ ứng viên **vướng Luật 91/2025 (Bảo vệ Dữ liệu Cá nhân)** — cần sự đồng ý của người lao động (xem `AI_SOURCING_RESEARCH.md`).

---

## NGUỒN CHÍNH
TopCV/Similarweb · TopCV Recruitment Market Report 2025-26 · VietnamWorks (vietdata, betterteam) · ITviec Salary Report · MISA AMIS (amis.misa.vn) · Base HRM (base.vn/hrm/pricing) · Ashby (ashbyhq.com/ai) · LinkedIn Future of Recruiting · Rippling & Employment Hero (sacra.com) · Deel (TechCrunch 10/2025).

*Báo cáo tạo bởi deep-research harness · Timio · 08/07/2026. Chi tiết pháp lý sourcing: xem `AI_SOURCING_RESEARCH.md`.*
