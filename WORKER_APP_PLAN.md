# Kế hoạch: App Nhân Viên Timio — Tài khoản + Thu nhập đã kiếm + Ứng lương

> Dựa trên nghiên cứu khách-hàng-trước (`EWA_RESEARCH.md`). Nguyên tắc: xây theo NHU CẦU nhân viên, không theo tài sản sẵn có. Mục tiêu: biến app từ "công cụ chấm công của sếp" thành "app nhân viên mở mỗi ngày vì có giá trị cho họ".
>
> **Kiềng 3 chân:**
> 1. **Tài khoản nhân viên (container)** — giải bài toán kéo người dùng.
> 2. **Thu nhập đã kiếm (hook)** — lý do mở app mỗi ngày, tự động, không nhập tay.
> 3. **Ứng lương (money)** — nhu cầu #1 đã kiểm chứng.
>
> **Nền tảng đã có (tái dùng):** `Employee` (tên/SĐT/email/lương cơ bản), log chấm công, tính lương cơ bản, cổng nhân viên (web) + app mobile (Expo, login slug+PIN).

---

# PHẦN 1 — Tài khoản nhân viên do công ty tạo sẵn (CONTAINER)

**Mục tiêu:** Mỗi nhân viên công ty thêm vào → có sẵn 1 tài khoản CÁ NHÂN, tự kích hoạt trên điện thoại của mình, dùng hằng ngày. Tài khoản **đi theo người** (1 số điện thoại = 1 tài khoản), gắn được nhiều công ty.

### Vì sao đây là điểm mạnh nhất
Bài toán khó nhất của app tiêu dùng = kéo người dùng về (Money Lover/Mint đốt tiền marketing). Timio có **cửa sau**: công ty thêm nhân viên (để chấm công) → nhân viên đã có tài khoản. Giống mô hình Employment Hero Swag / ADP / Gusto.

### DB mới
```prisma
// 1 người = 1 tài khoản (theo SĐT), gắn nhiều công ty
model WorkerAccount {
  id            String   @id @default(cuid())
  phone         String   @unique      // định danh chính
  name          String
  email         String?
  passwordHash  String?               // hoặc dùng OTP
  avatarUrl     String?               // base64 nhỏ
  activatedAt   DateTime?             // null = chưa kích hoạt
  consentAppAt  DateTime?             // đồng ý dùng app + tính năng cá nhân (Luật 91/2025)
  consentFinanceAt DateTime?          // đồng ý riêng cho tính năng tài chính (ứng lương)
  createdAt     DateTime @default(now())
}
```
- `Employee` thêm cột `workerAccountId String?` → nối nhân viên (theo từng công ty) với 1 tài khoản người thật.
- Khi công ty thêm nhân viên có SĐT: nếu SĐT đã có WorkerAccount → **nối** (người này làm nhiều nơi); nếu chưa → tạo WorkerAccount (chưa kích hoạt).

### Luồng kích hoạt
1. Công ty thêm nhân viên (tên + **SĐT bắt buộc** + email tùy chọn) → hệ thống tạo/nối WorkerAccount + sinh **link/QR kích hoạt**.
2. Công ty gửi link cho nhân viên (SMS/Zalo/in QR dán). Nhân viên mở → trang `/kich-hoat/[token]`.
3. Nhân viên **đặt mật khẩu/PIN** + **đồng ý điều khoản** (consent) → tài khoản kích hoạt.
4. Từ nay đăng nhập bằng **SĐT + mật khẩu** (hoặc OTP) — không phụ thuộc PIN công ty.

### UI (mobile-web / PWA trước, app native sau)
- **Trang chủ (home feed):** thẻ **Thu nhập đã kiếm** (Phần 2) · **Ứng lương** (Phần 3) · lịch ca hôm nay · thông báo công ty · phúc lợi.
- **Hồ sơ:** tên/ảnh · các công ty đang/đã làm · lịch sử chấm công · phiếu lương · nút "Tìm việc" (nối recruitment) · cài đặt/đăng xuất.
- Mặc định vào là thấy **con số tiền** + việc cần làm → có lý do mở app.

### Pháp lý (Luật 91/2025)
- Tạo tài khoản trong **bối cảnh lao động** (nhân viên đã trong hệ thống HR công ty) = hợp lệ. NHƯNG:
- Tính năng **cá nhân/tài chính phải OPT-IN** (nhân viên tự bật, có consent riêng). Tài khoản "công việc" (chấm công/phiếu lương) mặc định; ứng lương/chi tiêu phải đồng ý riêng.
- Nhân viên **rút lại đồng ý / xóa tài khoản** được.

### API
- `POST /api/company/employees` (đã có) → thêm/nối WorkerAccount + sinh token kích hoạt.
- `GET /kich-hoat/[token]` + `POST /api/worker/activate` (đặt mật khẩu + consent).
- `POST /api/worker/login` (SĐT + mật khẩu/OTP) → token phiên nhân viên.
- `GET /api/worker/me` → hồ sơ + danh sách công ty.

---

# PHẦN 2 — "Thu nhập đã kiếm" tự động (HOOK)

**Mục tiêu:** Cho nhân viên thấy **TỰ ĐỘNG** họ đã kiếm được bao nhiêu kỳ này (từ chấm công × đơn giá), cập nhật mỗi ngày. **KHÔNG nhập tay** (đây là lý do app quản lý chi tiêu thường chết — nhập tay phiền).

### Vì sao chỉ làm bản TỰ ĐỘNG này, KHÔNG làm sổ chi tiêu nhập tay
- App ghi chép chi tiêu thủ công: giữ chân cực kém, Mint (lớn nhất Mỹ, 3,6tr user) đã đóng cửa 2024.
- Lao động phổ thông không ngồi ghi thu-chi; họ cần **thấy tiền mình kiếm được** (tích cực, tự động).

### Tính toán (tái dùng logic lương đã có)
- **Đã kiếm kỳ này (tạm tính)** = số ngày/giờ công đã chấm trong kỳ × đơn giá (lương cơ bản/ngày công chuẩn, hoặc theo giờ) + phụ cấp − phạt (nếu áp dụng).
- Nhãn rõ **"tạm tính"** (số cuối cùng do công ty chốt). Đây cũng là **cơ sở để tính hạn mức ứng lương** (Phần 3).

### UI
- **Thẻ trang chủ:** "Tháng này bạn đã đi làm **X ngày**, kiếm được **~Y đồng**. Còn **Z ngày** tới kỳ lương." + thanh tiến trình.
- **Màn chi tiết:** thu nhập theo ngày (mỗi ngày công +bao nhiêu), tổng kỳ, so với tháng trước.
- Nếu làm **nhiều công ty** → tách theo từng nơi + tổng.

### API
- `GET /api/worker/earnings` → { theo từng công ty: ngày công, đã kiếm tạm tính, kỳ lương, ngày trả } + tổng.

### Độ khó: THẤP (dữ liệu đã có, không pháp lý, không vốn). Nên làm ngay sau Phần 1.

---

# PHẦN 3 — Ứng lương (EWA) — MONEY

**Mục tiêu:** Nhân viên rút trước phần lương **đã kiếm nhưng chưa tới kỳ trả**. Đây là nhu cầu #1 (đã kiểm chứng: >30% lao động thiếu tiền, tránh tín dụng đen 300-500%/năm).

### ⚠️ MÔ HÌNH BẮT BUỘC (để né giấy phép + né cần vốn của Timio)
> **DOANH NGHIỆP tự ứng tiền cho nhân viên. Timio CHỈ làm công nghệ (tính hạn mức + duyệt + ghi sổ khấu trừ) + thu phí.**
- Dựa **Điều 101 Bộ luật Lao động 2019**: tạm ứng lương theo thỏa thuận, **không tính lãi** → không phải "cho vay", **không cần giấy phép tín dụng NHNN**.
- **Timio KHÔNG cầm/chuyển tiền** (né giấy phép trung gian thanh toán) → tiền đi qua **tài khoản ngân hàng của chính công ty**.
- ❌ TUYỆT ĐỐI KHÔNG để Timio tự bỏ vốn ứng trước → sẽ bị coi là cho vay (cần giấy phép).

### Luồng (MVP an toàn)
1. Nhân viên mở "Ứng lương" → thấy **"Có thể ứng: đến X đồng"** (= đã kiếm tạm tính × hạn mức % − đã ứng).
2. Nhân viên yêu cầu ứng (tối thiểu 100.000đ, tối đa theo cap công ty đặt: 50–100% đã kiếm).
3. Yêu cầu về **công ty duyệt** (hoặc tự động nếu trong hạn mức chính sách công ty đã bật).
4. **Công ty chuyển tiền** cho nhân viên (chuyển khoản/ví — bằng tài khoản của công ty). Timio **ghi nhận khoản ứng** để **khấu trừ vào kỳ lương**.
5. Timio tính **phí dịch vụ** (thu từ công ty: phí công nghệ theo đầu người + **1,5–2,5%/lượt ứng**, như chuẩn thị trường Vui/GIMO).
6. Kỳ lương: bảng lương tự trừ khoản đã ứng + phí.

### Công ty thiết lập (Cài đặt)
- Bật/tắt Ứng lương · **hạn mức %** (VD 50%) · số lần tối đa/tháng · tự động duyệt hay duyệt tay · mô hình phí (công ty chịu hay nhân viên chịu).

### DB mới
```prisma
model WageAdvance {
  id          String   @id @default(cuid())
  companyId   String
  employeeId  String
  amount      Int                    // số tiền ứng
  fee         Int                    // phí
  status      String   @default("requested") // requested|approved|paid|deducted|rejected
  cycleMonth  String                 // "2026-07" — kỳ lương sẽ khấu trừ
  requestedAt DateTime @default(now())
  approvedAt  DateTime?
  paidAt      DateTime?
  @@index([companyId, cycleMonth])
  @@index([employeeId])
}
```
- `Company` thêm: `ewaEnabled`, `ewaCapPercent`, `ewaMaxPerMonth`, `ewaAutoApprove`, `ewaFeePayer`.

### Kiếm tiền
- **Phí/lượt ứng** (1,5–2,5%) + **phí công nghệ theo đầu người** — thu từ công ty (chuẩn thị trường). Nhân viên KHÔNG bị tính lãi.

### Pháp lý — điều PHẢI làm trước khi bật thật
- **Hỏi luật sư** xác nhận mô hình "công ty tự ứng, Timio làm công nghệ + thu phí" không rơi vào hoạt động tín dụng/trung gian thanh toán.
- Hợp đồng với công ty ghi rõ: công ty là bên ứng lương, Timio là nhà cung cấp phần mềm.

### Giai đoạn sau (KHÔNG làm ngay)
- **Ứng lương tức thì do đối tác cấp vốn** (Timio/ngân hàng ứng trước, chi trong vài phút) → cần **đối tác tài chính có giấy phép** + vốn luân chuyển. Chỉ làm khi đã có nhiều công ty + đã rõ pháp lý.

### Độ khó: TRUNG BÌNH (MVP không cần vốn/giấy phép vì tiền qua công ty; cần luồng duyệt + khấu trừ + hợp đồng pháp lý).

---

# PHÁP LÝ & RIÊNG TƯ (tổng)
- **Luật 91/2025 (BVDLCN):** tài khoản tạo trong bối cảnh lao động OK; tính năng tài chính/chi tiêu **opt-in**; nhân viên rút đồng ý được.
- **Điều 101 BLLĐ:** cơ sở cho ứng lương không lãi.
- **Không cầm tiền** → né giấy phép trung gian thanh toán.
- **Nên hỏi luật sư** trước khi bật ứng lương thật cho khách.

# THỨ TỰ TRIỂN KHAI
| GĐ | Làm gì | Độ khó | Vốn/Pháp lý |
|---|---|---|---|
| **1** | Tài khoản nhân viên (container) + kích hoạt + login + home feed | Vừa | Không |
| **2** | Thu nhập đã kiếm tự động | Thấp | Không |
| **3** | Ứng lương (mô hình công ty-tự-ứng) + cài đặt + duyệt + khấu trừ | Vừa | Cần hợp đồng + hỏi luật sư |
| *(sau)* | Ứng lương tức thì qua đối tác cấp vốn; phúc lợi/ưu đãi | Cao | Cần đối tác + vốn |

# RỦI RO & ĐIỀU CẦN CHỐT
- **Chốt mô hình vốn ứng lương:** MVP = công ty tự ứng (khuyên dùng). Không tự bỏ vốn.
- **Hỏi luật sư** về ứng lương + dùng dữ liệu cá nhân trước khi bật thật.
- **SĐT là bắt buộc** khi thêm nhân viên (nền tảng của tài khoản) — cần rà lại quy trình thêm NV.
- **App nền tảng:** làm **mobile-web (PWA)** trước để chạy ngay trên điện thoại (không cần app store); app native Expo nâng cấp sau.
