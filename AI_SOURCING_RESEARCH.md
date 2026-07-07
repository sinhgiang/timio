# AI Sourcing cho Timio — Nghiên cứu Pháp lý & Kiến trúc An toàn

> **Mục đích:** Trả lời câu hỏi "Timio có nên xây AI tự động đi cào Facebook/Zalo/LinkedIn/Reddit/TopCV để tìm ứng viên rồi tự nhắn tin không?" và chốt kiến trúc tuyển dụng an toàn, đúng luật.
>
> **Phương pháp:** Deep-research đa nguồn — 95 AI agent fan-out tìm kiếm web, đọc 15 nguồn, trích 56 claim, kiểm chứng chéo 25 claim quan trọng nhất (mỗi claim 3 vote độc lập). Kết quả: **25/25 claim được xác nhận đồng thuận 3-0, 0 claim bị bác**.
>
> **Ngày nghiên cứu:** 08/07/2026 · **Trạng thái:** Đợt 1 (pháp lý + điều khoản nền tảng) + Đợt 2 (số liệu thiết kế: giá/quota InMail, benchmark funnel, tuân thủ spam, thị trường VN một phần). Đợt 2: 106 agent, 21/25 claim xác nhận 3-0, 4 claim bị bác (ghi rõ ở Phần 4).
>
> **Nguồn Đợt 2 (chính):** LinkedIn Help (sơ cấp) · Microsoft Learn / LinkedIn Talent Solutions (sơ cấp) · FTC CAN-SPAM Guide (sơ cấp) · Gem recruiting benchmarks · MISA AMIS · LuatVietnam (NĐ 91/2020).

---

## TÓM TẮT ĐIỀU HÀNH (đọc cái này trước)

Bản **"AI tự cào dữ liệu + tự nhắn tin hàng loạt người lạ"** là **không khả thi về mặt pháp lý và hợp đồng trên mọi nền tảng lớn**. Vấn đề không phải khó lập trình — mà là **chắc chắn bị khóa tài khoản và vi phạm pháp luật Việt Nam** (phạt tới 3 tỷ đồng).

Hướng đúng là **kiến trúc cổng-đồng-ý (consent-gated)**:
- Khai thác **MOAT của Timio**: kho **cựu nhân viên đã đồng ý**, hồ sơ xác thực bằng dữ liệu chấm công.
- Mô hình **"AI tìm người + AI soạn tin + admin BẤM GỬI"** (human-in-the-loop), thay cho auto-spam.
- Tiếp cận ứng viên mới qua **kênh hợp lệ**: job board có API/RSS, đăng tin qua chuẩn Google for Jobs, career page + chatbot AI sàng lọc (inbound).

Đây chính là cách các tool sourcing hàng đầu thế giới (hireEZ, SeekOut, Gem, LinkedIn Recruiter) vận hành.

---

## 1. CÁC NỀN TẢNG — CÁI GÌ CẤM, BẰNG CHỨNG

### LinkedIn
Điều khoản người dùng (User Agreement, mục 8.2 "Don'ts") **cấm minh thị**:
- *"Scrape hoặc sao chép Dịch vụ, bao gồm hồ sơ và dữ liệu khác"*
- *"Dùng bot hoặc phương thức tự động trái phép để truy cập, thêm/tải danh bạ, gửi hoặc chuyển hướng tin nhắn"*

→ Vi phạm: người dùng **"có nguy cơ bị hạn chế hoặc đóng tài khoản"**; công cụ bị cấm có thể **"ngừng hoạt động mà không báo trước"**.
→ Con đường hợp lệ duy nhất: **LinkedIn Recruiter / Recruiter Lite** (sản phẩm trả phí của chính LinkedIn). Các tool auto-connect/auto-InMail bên thứ ba đang bị **ban hàng loạt** (ghi nhận 2026).

**Nguồn:** [User Agreement](https://www.linkedin.com/legal/user-agreement) · [Help a1341387](https://www.linkedin.com/help/linkedin/answer/a1341387)

### Án lệ hiQ Labs v. LinkedIn (bài học quan trọng nhất)
Kết cục **phân đôi**:
- Tòa phúc thẩm số 9 (2019 & 4/2022) xử: cào dữ liệu **công khai** **không** vi phạm Luật Gian lận & Lạm dụng Máy tính Mỹ (CFAA).
- **NHƯNG** 11/2022 tòa quận xử: hiQ **vi phạm hợp đồng điều khoản** của LinkedIn (cào tự động + thuê người tạo tài khoản giả).
- **hiQ THUA cuối cùng** — dàn xếp 12/2022: **lệnh cấm vĩnh viễn** ngừng cào + **xóa toàn bộ source code/data/thuật toán** + **bồi thường $500.000**.

→ **Bài học cho Timio:** "Thắng CFAA" ≠ được tự do cào. **Vi phạm điều khoản và bồi thường thiệt hại vẫn là rủi ro thật**, đặc biệt khi dùng tài khoản đăng nhập/tài khoản giả.

**Nguồn:** [ZwillGen](https://www.zwillgen.com/alternative-data/hiq-v-linkedin-wrapped-up-web-scraping-lessons-learned/) · [Wikipedia](https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn)

### Án lệ Meta v. Bright Data (2024) — điểm mấu chốt cho auto-DM
Tòa (N.D. Cal., Thẩm phán Chen, 23/01/2024) xử: điều khoản Facebook/Instagram **không cấm** cào public khi **ĐĂNG XUẤT** (vì người không có tài khoản thì không "sử dụng" nền tảng).

→ **Hệ quả chí mạng:** cào public khi **ĐĂNG NHẬP** **là vi phạm** điều khoản. Mà **auto-DM/auto-outreach bắt buộc phải đăng nhập** → **luôn luôn vi phạm** điều khoản Meta.

**Nguồn:** [Farella Braun + Martel](https://www.fbm.com/publications/major-decision-affects-law-of-scraping-and-online-data-collection-meta-platforms-v-bright-data/)

### Meta chủ động kiện & thắng người cào
BrandTotal & Unimania (cào qua extension trình duyệt, đăng nhập) — dàn xếp 10/2022: **lệnh cấm vĩnh viễn + xóa code/data + khoản tiền phạt "đáng kể"**. Tòa xác nhận điều khoản có hiệu lực **kể cả khi** việc cào không vi phạm CFAA.

**Nguồn:** [TechCrunch](https://techcrunch.com/2022/10/03/meta-settles-lawsuit-for-significant-sum-against-businesses-scraping-facebook-and-instagram-data/amp)

### Reddit
Từ 5/2024: mọi dùng dữ liệu công khai cho **mục đích thương mại phải có hợp đồng license**. Cào bulk miễn phí không được phép. Reddit đã **kiện Anthropic (6/2025)** và **Perplexity + các vendor cào (10/2025)**.
→ Chỉ được dùng **API Reddit chính thức** trong giới hạn cho phép.

**Nguồn:** [TechCrunch](https://techcrunch.com/2024/05/09/reddit-locks-down-its-public-data-in-new-content-policy-says-use-now-requires-a-contract/)

### Zalo OA
**Không thể nhắn chủ động người lạ.** Chỉ nhắn "người quan tâm" (đã follow):
- Tin truyền thông: tối đa **1 tin/ngày, 30 tin/tháng** mỗi người.
- Nhắn người chưa follow: cần đã tương tác trong 7 ngày.
- ZNS: cần doanh nghiệp đã xác thực + quan hệ có sẵn + template được duyệt.

→ Cửa "auto-DM người lạ trong group Zalo" **đóng hoàn toàn**. Zalo chỉ nuôi dưỡng người đã opt-in.

**Nguồn:** [Chính sách Zalo OA](https://oa.zalo.me/home/documents/policy/tuong-tac-cua-oa-voi-nguoi-dung)

---

## 2. ⚠️ LUẬT VIỆT NAM — THAY ĐỔI LỚN (bắt buộc biết)

**Phát hiện quan trọng:** **Nghị định 13/2023/NĐ-CP đã HẾT hiệu lực từ 01/01/2026**, được nâng cấp thành **Luật Bảo vệ Dữ liệu Cá nhân 2025 — Luật số 91/2025/QH15** (ban hành 26/6/2025, hiệu lực 01/01/2026 → **hiện đã có hiệu lực**). Nội dung **chặt hơn**:

| Quy định | Nội dung |
|---|---|
| **Cần đồng ý** | Gần như **mọi** hoạt động xử lý dữ liệu cá nhân, kể cả marketing/tuyển dụng, phải có sự đồng ý của chủ thể (Điều 11 NĐ13 cũ; Luật 91/2025 giữ nguyên tinh thần). **KHÔNG có ngoại lệ "dữ liệu công khai"** — khác GDPR châu Âu. |
| **Cấm mua/bán** | Luật cấm **mua, bán dữ liệu cá nhân** (trừ khi luật khác cho phép) → **không được mua list contact từ data broker**. |
| **Quyền rút đồng ý** | Chủ thể có thể rút đồng ý bất cứ lúc nào → người bị thu thập phải **opt-out được**. |
| **Marketing** | Dùng dữ liệu để quảng cáo/tiếp thị phải có đồng ý **+ thông báo** nội dung/phương thức/hình thức/tần suất (Điều 21 NĐ13). |
| **Mức phạt** | Tổ chức: tới **3 tỷ đồng**; cá nhân: tới 1,5 tỷ đồng. Buôn bán dữ liệu trái phép: phạt tới **10 lần doanh thu bất hợp pháp**. |

→ **Kết luận:** Cào tên/SĐT từ comment công khai rồi nhắn tin tuyển dụng **nói chung cần sự đồng ý**, và **không được** dựa vào danh sách mua từ bên thứ ba. Làm sai = vi phạm hành chính/hình sự.

*(Ghi chú: có lộ trình ân hạn 5 năm cho doanh nghiệp nhỏ — cần theo dõi nghị định hướng dẫn.)*

**Nguồn:** [Bộ Công An](https://bocongan.gov.vn/chinh-sach-phap-luat/bai-viet/luat-bao-ve-du-lieu-ca-nhan-chinh-thuc-co-hieu-luc-thi-hanh-tu-ngay-01-01-2026-1767186124) · [LuatVietnam — mức phạt](https://luatvietnam.vn/linh-vuc-khac/tong-hop-cac-muc-phat-ve-vi-pham-bao-ve-du-lieu-ca-nhan-tu-01-01-2026-883-103753-article.html) · [Toàn văn NĐ 13/2023](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-13-2023-nd-cp-bao-ve-du-lieu-ca-nhan-119230516104357809.htm)

---

## 3. KIẾN TRÚC AN TOÀN CHO TIMIO

Vì mọi cửa "tự động spam" đều đóng, con đường đúng là **cổng-đồng-ý**:

| Nguyên tắc | Cụ thể |
|---|---|
| **(a) KHÔNG auto-scrape + auto-DM** | Bỏ hoàn toàn hướng cào FB/Zalo/LinkedIn + tự nhắn người lạ. |
| **(b) Khai thác MOAT** | Kho **cựu nhân viên đã đồng ý** + hồ sơ xác thực từ dữ liệu chấm công — nguồn liên hệ **hợp pháp** mà TopCV/hireEZ không có. |
| **(c) "AI tìm + AI soạn + admin BẤM GỬI"** | Human-in-the-loop né đúng điều khoản cấm "bot gửi tin" và luật chống spam. |
| **(d) Ứng viên mới qua kênh hợp lệ** | Job board có API/RSS chính thức; đăng tin qua chuẩn **Google for Jobs / Indeed**; **career page + chatbot AI sàng lọc** để ứng viên tự đến (inbound). |

Đây chính xác là cách hireEZ, SeekOut, Gem, LinkedIn Recruiter vận hành: dữ liệu qua API chính thức, con người bấm gửi, có lớp đồng ý.

### Lộ trình 3 giai đoạn đề xuất

**Giai đoạn 1 — An toàn, làm được ngay:**
- AI gợi ý ứng viên phù hợp **từ kho cựu NV đã đồng ý** cho vị trí đang tuyển.
- AI **soạn sẵn tin nhắn cá nhân hóa** → admin xem và **bấm gửi** (qua email/Zalo OA nếu họ đã follow).
- **Dashboard funnel**: đã nhắn → đã trả lời → đã sàng lọc → phỏng vấn → chốt vào làm.

**Giai đoạn 2 — Tích hợp chính thức + inbound:**
- Đăng 1 tin → phát nhiều nơi qua chuẩn Google for Jobs / job board có API.
- **Career page** cho công ty + link ứng tuyển; **chatbot AI sàng lọc** ứng viên tự đến.
- Zalo OA nuôi dưỡng ứng viên đã opt-in.

**Giai đoạn 3 — Cộng đồng:**
- Referral: nhân viên/cựu NV giới thiệu người → thưởng. Nguồn hợp pháp, chất lượng cao, chi phí thấp.

---

## 4. SỐ LIỆU THIẾT KẾ SẢN PHẨM (Đợt 2 — 08/07/2026, 106 agent, 21/25 claim xác nhận 3-0, 4 claim bị bác)

### 4.1 LinkedIn — quota & giá InMail (dùng làm mốc so sánh giá của Timio)

| Gói | InMail credit/tháng | Giá (ước lượng, nguồn thứ cấp) |
|---|---|---|
| Premium Career | 5 | — |
| Premium Business | 15 | — |
| Sales Navigator Core | 50 | — |
| **Recruiter Lite** | **30** | ~**170 USD/tháng** (~1.680 USD/năm) |
| Recruiter Professional Services | 100 | ~6.000–10.000 USD/ghế/năm |
| **Recruiter Corporate** | **150** (pooled) | ~8.999–15.000+ USD/ghế/năm |
| Hiring Pro | 5 / mỗi tin tuyển | — |

- **Cơ chế hoàn credit (xác nhận nguồn sơ cấp):** InMail được **accept / decline / trả lời trong 90 ngày** → hoàn credit. Tin **pending không phản hồi sau 90 ngày → KHÔNG hoàn.**
  - ⚠️ *Claim "hoàn credit khi KHÔNG phản hồi sau 90 ngày" đã bị BÁC (0-3) — SAI, đừng tin.*
- **API tuyển dụng chính thức của LinkedIn** (Talent Solutions): RSC (Recruiter System Connect), Apply Connect, Job Posting API, Apply With LinkedIn. **NHƯNG kiểm soát rất chặt**: phải là **đối tác được LinkedIn phê duyệt**, ký thỏa thuận ràng buộc dữ liệu, xét duyệt ~3–6 tháng; **đã NGỪNG nhận đối tác mới** cho Job Posting API và Apply With LinkedIn (từ 01/10/2025).
  - → **Hàm ý cho Timio:** tích hợp LinkedIn hợp pháp *về lý thuyết* khả thi nhưng **thực tế rất khó trong ngắn hạn**. **Không nên xây trên LinkedIn ở GĐ1.** Dựa vào kênh sở hữu (email, Zalo OA cho người đã follow, career page).

### 4.2 Benchmark outreach & funnel (mốc thiết kế dashboard)

Theo **Gem** (~8 triệu chuỗi email tuyển dụng, 2021–2022, *nguồn vendor — tham khảo*):
- **78,3% mở · 21,3% trả lời · 7,9% trả lời quan tâm** (tỷ lệ tích lũy của cả chuỗi nhiều bước, không phải 1 email).
- **Chuỗi nhiều bước > tin đơn:** chuỗi **3 bước** cho **>2x** lượt trả lời so với 1 email. **4 bước là tối ưu** (bước 4 = "breakup email"). **Sau bước 5 gần như không cải thiện.**
- → **Thiết kế:** Timio nên hỗ trợ **chuỗi 3–4 bước** (không phải 1 tin), và dashboard funnel hiển thị: **đã gửi → đã mở → đã trả lời → quan tâm → phỏng vấn → chốt**, kèm đường chuẩn tham khảo (~78% / ~21% / ~8%).

### 4.3 Tuân thủ chống spam (BẮT BUỘC nhúng vào tính năng "AI soạn + admin gửi")

- **Nghị định 91/2020 (VN):** phải **opt-in trước** khi gửi email/SMS quảng cáo (im lặng ≠ đồng ý); email quảng cáo gắn **[QC]/[AD]** ở tiêu đề, SMS ở đầu tin; khi nhận yêu cầu từ chối phải **gửi xác nhận ngay**. *(Lưu ý: tin tuyển dụng đích danh cho người đã opt-in trong kho cựu NV thường không phải "quảng cáo" theo nghĩa hẹp, nhưng thiết kế nên theo chuẩn này cho an toàn.)*
- **CAN-SPAM (Mỹ, nếu vươn ra quốc tế):** xử lý opt-out trong **10 ngày làm việc**, cơ chế opt-out sống ≥30 ngày, phạt tới **~53.088 USD/email vi phạm** (không trần tổng).
- → **Timio phải có sẵn:** nút/link **từ chối nhận tin** trong mọi tin gửi + **ghi nhận opt-out** + không gửi lại người đã từ chối. Đây là tính năng bắt buộc, không phải tùy chọn.

### 4.4 Thị trường VN (một phần — nhiều số liệu giá CHƯA xác minh được)

- **MISA AMIS** có **module Tuyển dụng** trong bộ HRM (Standard ~12,6tr/năm cho 30 NV; Professional ~18tr/năm) + sản phẩm **AMIS Tuyển dụng (ATS)** quảng cáo có AI (tự trích CV, gợi ý ứng viên từ talent pool). Không công bố giá lẻ module tuyển dụng.
- **CareerBuilder VN (nay CareerViet):** xem CV **2,94tr–66,11tr** tùy thời hạn 1–12 tháng; đăng tin **1,59tr–9,86tr/tháng** *(nguồn blog tổng hợp — độ tin trung bình)*.
- ⚠️ **BỊ BÁC (đừng dùng):** giá gói TopCV cụ thể (Top Eco/Pro/Max) và giá kho CV VietnamWorks — các claim này **không đạt kiểm chứng (1-2)**, cần lấy bảng giá chính thức trực tiếp nếu cần.

### 4.5 ⚠️ CÒN THIẾU (chưa xác minh được — đừng giả định)

Deep-research đợt 2 **KHÔNG** xác minh được các phần sau (cần nghiên cứu bổ sung / hỏi trực tiếp):
- **Cơ chế chi tiết hireEZ / SeekOut / Gem / Fetcher / Juicebox**: nguồn dữ liệu, auto vs human-in-the-loop, giá — hầu như **không claim nào vượt kiểm chứng**.
- **Giới hạn lời mời kết nối/tuần của LinkedIn** (~100–200): chưa nguồn nào xác nhận.
- **Tỷ lệ chuyển đổi từng bước** của funnel (sourced→contacted→…→hired) & **time-to-fill** trung bình: chưa có số cụ thể (mới có 3 mốc tổng của Gem).
- **Giá TopCV/VietnamWorks/Việc Làm Tốt/JobsGO/Tanca/Base/Zoho**: nhiều claim giá bị bác — cần bảng giá chính thức.
- Best practice định lượng: độ dài tin tối ưu, số personalization token, khoảng cách ngày giữa các bước.

---

## PHỤ LỤC — Nguồn đầy đủ (Đợt 1)

| Nguồn | Loại | Chủ đề |
|---|---|---|
| [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement) · [Help a1341387](https://www.linkedin.com/help/linkedin/answer/a1341387) | Sơ cấp | LinkedIn cấm scraping + bot messaging |
| [ZwillGen](https://www.zwillgen.com/alternative-data/hiq-v-linkedin-wrapped-up-web-scraping-lessons-learned/) · [Wikipedia](https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn) | Thứ cấp | hiQ v. LinkedIn — kết cục dàn xếp |
| [Farella Braun + Martel](https://www.fbm.com/publications/major-decision-affects-law-of-scraping-and-online-data-collection-meta-platforms-v-bright-data/) | Thứ cấp | Meta v. Bright Data — logged-in vs logged-off |
| [TechCrunch (BrandTotal)](https://techcrunch.com/2022/10/03/meta-settles-lawsuit-for-significant-sum-against-businesses-scraping-facebook-and-instagram-data/amp) | Thứ cấp | Meta kiện người cào qua extension |
| [TechCrunch (Reddit)](https://techcrunch.com/2024/05/09/reddit-locks-down-its-public-data-in-new-content-policy-says-use-now-requires-a-contract/) | Thứ cấp | Reddit yêu cầu license cho dùng thương mại |
| [Chính sách Zalo OA](https://oa.zalo.me/home/documents/policy/tuong-tac-cua-oa-voi-nguoi-dung) | Sơ cấp | Zalo OA chỉ nhắn người quan tâm, giới hạn 1/ngày 30/tháng |
| [Bộ Công An](https://bocongan.gov.vn/chinh-sach-phap-luat/bai-viet/luat-bao-ve-du-lieu-ca-nhan-chinh-thuc-co-hieu-luc-thi-hanh-tu-ngay-01-01-2026-1767186124) | Sơ cấp | Luật 91/2025/QH15 hiệu lực 01/01/2026 |
| [LuatVietnam](https://luatvietnam.vn/linh-vuc-khac/tong-hop-cac-muc-phat-ve-vi-pham-bao-ve-du-lieu-ca-nhan-tu-01-01-2026-883-103753-article.html) | Thứ cấp | Mức phạt tới 3 tỷ / 10x doanh thu |
| [Toàn văn NĐ 13/2023](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-13-2023-nd-cp-bao-ve-du-lieu-ca-nhan-119230516104357809.htm) | Sơ cấp | Điều 11 (đồng ý), Điều 21 (marketing) |

---

## LƯU Ý VỀ ĐỘ TIN CẬY
- Điều khoản nền tảng thay đổi thường xuyên — cần **kiểm tra lại trước khi ra mắt**.
- Luật 91/2025 rất mới; nghị định hướng dẫn & thực tiễn thực thi còn đang hình thành; ân hạn 5 năm cho DN nhỏ tạo bất định về mức phạt tức thời.
- Các claim mạnh nhất (điều khoản LinkedIn/Zalo, luật VN) dựa trên **nguồn sơ cấp**; các án lệ Mỹ dựa trên phân tích pháp lý chất lượng cao (không phải bản án gốc). Meta v. Bright Data là phán quyết tòa quận (chưa phải án lệ phúc thẩm ràng buộc).

---

*Báo cáo tạo bởi deep-research harness · Timio · 08/07/2026*
