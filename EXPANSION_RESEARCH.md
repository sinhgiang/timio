# Nghiên cứu mở rộng sản phẩm Timio — Payroll/BHXH (A) & Phúc lợi/Bảo hiểm (B)

*Deep-research demand-first, 08/7/2026 · 6 góc · 24 nguồn · 96 claim → 20 xác minh (3-0), 5 bị bác. Nguồn chính: văn bản luật gốc (chinhphu.vn, thuvienphapluat), MISA, Employment Hero/Sacra, GIMO, Vui App, VIR.*

## KẾT LUẬN 1 DÒNG
**Làm SẢN PHẨM B trước** (phúc lợi/EWA/bảo hiểm vi mô qua app nhân viên — nhu cầu đã được chứng minh, rào cản giải được bằng đối tác, nối thẳng app sẵn có). **Sản phẩm A (lương+thuế+BHXH) là ván dài** dùng dữ liệu chấm công thật feed vào một I-VAN có giấy phép — đấu trực diện MISA chứ không phải lấp chỗ trống. **Cả hai chỉ khả thi theo đúng nguyên tắc: Timio làm DỮ LIỆU + LUỒNG + PHÂN PHỐI, đối tác/giấy phép lo phần lõi bị quản lý — KHÔNG bao giờ tự đứng giấy phép, không cầm tiền.**

---

## SẢN PHẨM A — Bảng lương + Thuế TNCN + Khai BHXH (cho chủ DN)

**Nhu cầu (có thật, nhưng chưa định lượng được để định giá):** SME trả **500k–5 triệu/tháng** cho dịch vụ kế toán thuê ngoài (TP.HCM, gồm kê khai thuế). Phần mềm: MISA/Fast ~**100–150k/người/tháng** (300 NV = 30–45 triệu/tháng); Tanca rẻ hơn (30–80k) nhưng **tính lương yếu**. *Chưa tìm được số cụ thể SME trả riêng cho dịch vụ khai BHXH → cần khảo sát trước khi định giá.*

**Đối thủ — thị trường ĐÃ CÓ NGƯỜI GIỮ (không phải chỗ trống):**
- **MISA AMIS đã làm đủ chuỗi** chấm công → tiền lương → BHXH → thuế TNCN (4 module riêng) VÀ **là I-VAN chính thức** (từ 18/9/2020, số hóa 19 thủ tục BHXH). Timio nhảy vào là đấu incumbent có giấy phép.

**Rào cản pháp lý CỨNG (điểm chốt):**
- Muốn tự làm cổng khai BHXH điện tử (I-VAN) theo **NĐ 166/2016 Điều 6**: phải là **DN công nghệ thông tin** + có **bảo lãnh ngân hàng**, nhân sự IT bằng đại học, hệ thống **24/7** (lưu log 10 năm, phục hồi 8h), VÀ **ký hợp đồng chính thức với BHXH VN**. Cả nước chỉ ~**14 nhà cung cấp** I-VAN.
- ⚠️ **Đã bác bỏ (0-3):** *KHÔNG* thể "tích hợp thẳng cổng BHXH để né I-VAN" — vai trò trung gian vẫn cần hợp đồng với BHXH VN.
- ⚠️ **Đã bác (0-3):** danh sách "đúng 4 I-VAN (VNPT/TS24/Thái Sơn/EFY)" là sai — có ~14.

→ **Timio làm:** giao diện + tính lương từ chấm công thật + chuẩn hóa dữ liệu. **Đối tác I-VAN làm:** giao dịch khai BHXH thật. Thuế TNCN: cần kiểm tra API eTax/TCT (nhiều khả năng qua HTKK/thủ công); cân nhắc đối tác đại lý thuế.

---

## SẢN PHẨM B — Phúc lợi/ưu đãi + bảo hiểm vi mô + tiết kiệm (cho nhân viên)

**Nhu cầu — ĐƯỢC CHỨNG MINH MẠNH:**
- **GIMO**: phục vụ ~**500.000 công nhân** (chủ yếu nhà máy vừa–lớn), gọi **17,1 triệu USD Series A** (TNB Aura, Y Combinator, Integra, ThinkZone).
- **Vui App (Nano)**: EWA employer-funded, định vị chống **tín dụng đen**; **Trường Thành Furniture triển khai 20/7/2021** để **giữ chân + giảm vắng** → bằng chứng chủ DN sẵn lòng trả/trợ giá phúc lợi.
- ⚠️ *Số 500k của GIMO và kết quả "giảm vắng" của TTF là do công ty tự báo cáo — coi là định hướng, không phải số kiểm toán.* ⚠️ Đã bác (0-3): Nano "5 triệu user".

**Mô hình doanh thu (chuyển giao trực tiếp được) — Employment Hero "Swag":** gộp phiếu lương + ứng lương (EWA) + điểm thưởng + tìm việc vào 1 app; kiếm tiền qua **hoa hồng marketplace + mua chung (Hero Rewards) + phí EWA ~1,3–1,5%** (không phải sản phẩm tín dụng). App **miễn phí cho nhân viên**, nuôi bằng SaaS + hoa hồng. Gusto cũng ăn **hoa hồng bảo hiểm từ hãng** bên cạnh phí SaaS.

**Ranh giới bảo hiểm (điểm chốt):**
- Luật KDBH 2022: bán/giới thiệu/tư vấn/thu phí bảo hiểm = **hoạt động đại lý**, **cấm** làm nếu không đủ điều kiện; **NĐ 46/2023**: tổ chức đại lý cần **≥3 nhân sự có chứng chỉ đại lý bảo hiểm**. Bảo hiểm vi mô **chỉ DN bảo hiểm / tổ chức tương hỗ** được cung cấp (underwrite).
- Luật **CHO PHÉP phân phối online** qua insurer/đại lý/môi giới.
- → **Timio là KÊNH PHÂN PHỐI SỐ, không bao giờ underwrite.** Cắm vào insurtech/môi giới có giấy phép: **Saladin** (môi giới số, 15 hãng, ~1tr KH, embedded B2B2C), **Igloo** (nhúng qua Zalopay/Shopee/FE Credit), **Global Care, MonCover, Medici, Papaya…**
- ⚠️ **Luật 139/2025 (hiệu lực 1/1/2026)** siết **độc quyền đại lý** — ảnh hưởng việc phân phối nhiều hãng qua 1 đối tác; cần rà trước khi ký.

**Ranh giới TIỀN (điểm chốt):**
- Tính năng **tiết kiệm/tự trích lương** mà **giữ hoặc chuyển tiền** của nhân viên → chạm **NĐ 52/2024**: ví điện tử / thu hộ-chi hộ / cổng thanh toán cần **giấy phép NHNN + vốn 50 tỷ**. → **Timio KHÔNG BAO GIỜ cầm tiền**; tiền chảy qua ngân hàng/trung gian có phép. (Giống hệt nguyên tắc EWA đã chốt.)

---

## RANH GIỚI AN TOÀN — Timio tự làm vs. bắt buộc đối tác/giấy phép

| Việc | Timio TỰ làm | BẮT BUỘC đối tác/giấy phép |
|---|---|---|
| Khai BHXH điện tử | Tính lương từ chấm công, chuẩn hóa dữ liệu, UX | **I-VAN có phép** (NĐ166/2016 + hợp đồng BHXH VN) |
| Thuế TNCN | Tính toán, kết xuất tờ khai | eTax/HTKK hoặc **đại lý thuế** |
| Bảo hiểm | Kênh phân phối, hồ sơ nhân viên, UX bán | **Đại lý/môi giới có phép** (Saladin/Igloo…); DN bảo hiểm underwrite |
| Ưu đãi/voucher | Marketplace, gợi ý, hoa hồng | Đối tác thương mại (không cần giấy phép đặc biệt) |
| Tiết kiệm/ứng lương/tiền | Tính số, ghi sổ, đối soát | **Ngân hàng/trung gian thanh toán có phép** — Timio không cầm tiền |

---

## LỘ TRÌNH 3 GIAI ĐOẠN

**Sản phẩm B (ưu tiên):**
1. **GĐ1 — Ưu đãi/phúc lợi (dễ, không giấy phép):** marketplace voucher/giảm giá + điểm thưởng nội bộ, ăn hoa hồng. Cắm vào EWA + hồ sơ đã có.
2. **GĐ2 — Bảo hiểm vi mô (qua đối tác):** ký 1 insurtech môi giới (Saladin/Igloo), bán bảo hiểm tai nạn/sức khỏe nhóm cho công nhân, công ty trợ giá hoặc NV tự mua; Timio ăn hoa hồng giới thiệu.
3. **GĐ3 — Tiết kiệm/tài chính (qua ngân hàng):** tích lũy tự trích lương giữ ở ngân hàng đối tác; Timio chỉ là giao diện + đối soát.

**Sản phẩm A (ván dài):**
1. **GĐ1 — Bảng lương hoàn chỉnh:** nâng tính lương hiện có → phiếu lương chuẩn, thuế TNCN tự tính, kết xuất file BHXH.
2. **GĐ2 — Nối I-VAN:** ký 1 nhà cung cấp I-VAN, đẩy tờ khai BHXH tự động từ dữ liệu chấm công thật (điểm khác biệt vs MISA).
3. **GĐ3 — Trọn gói tuân thủ:** thêm đại lý thuế/kế toán đối tác cho gói "chấm công → lương → thuế → BHXH" một cửa cho SME.

---

## BẪY PHÁP LÝ DỄ VƯỚNG (nhắc lại)
1. **Tự đứng làm I-VAN** → gần như bất khả thi (bảo lãnh NH, 24/7, hợp đồng BHXH VN). Luôn qua đối tác.
2. **Tự "giới thiệu" bảo hiểm** mà chưa đủ điều kiện đại lý (≥3 chứng chỉ) → phạm luật. Luôn qua đại lý/môi giới có phép.
3. **Cầm/chuyển tiền nhân viên** (tiết kiệm, ví) → cần giấy phép NHNN + 50 tỷ. Không bao giờ cầm tiền.
4. **Luật mới cần rà lại trước khi build:** Luật BHXH 41/2024 (1/7/2025) có thể sửa quy định I-VAN; Luật KDBH sửa đổi 139/2025 (1/1/2026) siết độc quyền đại lý.

## CÂU HỎI MỞ CÒN LẠI (cần trước khi build)
- SME thực trả bao nhiêu/tháng cho khai BHXH + kế toán thuê ngoài? (định giá A)
- I-VAN (VNPT/TS24/EFY/Thái Sơn) và eTax có API đối tác/white-label không, điều khoản thương mại?
- Đối tác insurtech (Saladin/Igloo/Global Care) chia hoa hồng bao nhiêu, có sản phẩm bảo hiểm nhóm cho công nhân sẵn chưa?
- Luật 139/2025 siết độc quyền đại lý ảnh hưởng thế nào tới việc phân phối nhiều hãng?
