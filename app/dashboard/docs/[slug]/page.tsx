import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Zap, Camera, Users, Building2, BarChart3, FileText, Umbrella,
  CalendarDays, MessageSquare, Gift, BookOpen, Info, CheckCircle2,
  AlertTriangle, Bookmark, ChevronRight, type LucideIcon,
} from "lucide-react";

// ── Shared helpers ───────────────────────────────────────────────────────────

function Section({ Icon, title, children }: { Icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Icon size={20} className="text-blue-600" strokeWidth={1.8} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Callout({ type, children }: { type: "info" | "tip" | "warning" | "example"; children: React.ReactNode }) {
  const styles = {
    info: { bg: "bg-blue-50 border-blue-200 text-blue-800", Icon: Info, ic: "text-blue-500" },
    tip: { bg: "bg-green-50 border-green-200 text-green-800", Icon: CheckCircle2, ic: "text-green-500" },
    warning: { bg: "bg-amber-50 border-amber-200 text-amber-800", Icon: AlertTriangle, ic: "text-amber-500" },
    example: { bg: "bg-gray-50 border-gray-200 text-gray-700", Icon: Bookmark, ic: "text-gray-400" },
  };
  const { bg, Icon: I, ic } = styles[type];
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex gap-2.5 ${bg}`}>
      <I size={16} className={`${ic} shrink-0 mt-0.5`} strokeWidth={2} />
      <div>{children}</div>
    </div>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{num}</div>
      <div>
        <p className="font-semibold text-gray-800 text-sm">{title}</p>
        <p className="text-gray-500 text-sm mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-700">
      <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" strokeWidth={2.5} />
      <span>{children}</span>
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-gray-700 text-xs mt-5 mb-2 uppercase tracking-widest">{children}</h3>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2">{children}</div>;
}

// ── Article content ──────────────────────────────────────────────────────────

const ARTICLES: Record<string, { title: string; Icon: LucideIcon; content: React.ReactNode }> = {
  "getting-started": {
    title: "Bắt đầu nhanh",
    Icon: Zap,
    content: (
      <Section Icon={Zap} title="Bắt đầu nhanh">
        <p className="text-sm text-gray-600">Thiết lập xong 5 bước dưới đây là hệ thống sẵn sàng chạy.</p>
        <Card>
          <Step num={1} title="Tạo chi nhánh" desc="Vào Chi nhánh → Thêm chi nhánh → Nhập tên, giờ vào/ra, ngày làm việc." />
          <Step num={2} title="Thêm nhân viên" desc="Vào Nhân viên → Thêm nhân viên → Nhập tên, mã NV, PIN, lương cơ bản." />
          <Step num={3} title="Đăng ký khuôn mặt" desc="Trong hồ sơ từng nhân viên → nhấn 'Đăng ký khuôn mặt' → nhìn vào camera." />
          <Step num={4} title="Đặt máy kiosk" desc="Mở trình duyệt trên điện thoại/máy tính bảng → vào Cài đặt → copy link kiosk → đặt ở lối vào." />
          <Step num={5} title="Xem báo cáo" desc="Cuối tháng vào Báo cáo tháng → xem tổng hợp → xuất Excel nếu cần." />
        </Card>
        <Callout type="tip">Nên hoàn thành bước 1 và 2 trước, sau đó nhân viên tự đăng ký khuôn mặt tại máy kiosk hoặc admin đăng ký hộ trong phần Nhân viên.</Callout>
        <SubTitle>Sau khi thiết lập xong bạn có thể</SubTitle>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["Phiếu lương", "/dashboard/docs/payslip", "In phiếu lương hàng tháng cho nhân viên"],
            ["Báo cáo tháng", "/dashboard/docs/reports", "Xuất Excel chấm công toàn công ty"],
            ["Thông báo Telegram", "/dashboard/docs/telegram", "Nhận cảnh báo trễ tức thì"],
            ["Lương tháng 13", "/dashboard/docs/salary13", "Tính thưởng Tết tự động"],
          ].map(([name, href, desc]) => (
            <Link key={href} href={href} className="group bg-white border border-gray-100 rounded-xl p-3 hover:border-blue-200 transition-all">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="font-semibold text-gray-700 text-xs group-hover:text-blue-600">{name}</p>
                <ChevronRight size={12} className="text-gray-300 group-hover:text-blue-400" />
              </div>
              <p className="text-gray-500 text-xs">{desc}</p>
            </Link>
          ))}
        </div>
      </Section>
    ),
  },

  "kiosk": {
    title: "Máy chấm công (Kiosk)",
    Icon: Camera,
    content: (
      <Section Icon={Camera} title="Máy chấm công (Kiosk)">
        <p className="text-sm text-gray-600">Máy chấm công là một trang web chạy trên điện thoại hoặc máy tính bảng đặt tại cửa văn phòng. Nhân viên tự chấm vào/ra mà không cần thao tác gì thêm.</p>

        <SubTitle>Cách lấy link kiosk</SubTitle>
        <Card>
          <Check>Vào <strong>Cài đặt</strong> → thấy ô &ldquo;Link chấm công&rdquo; màu xanh ở đầu trang</Check>
          <Check>Nhấn <strong>Copy</strong> → dán vào trình duyệt của máy kiosk</Check>
          <Check>Mỗi chi nhánh có link riêng, dạng: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">/checkin/[tên-công-ty]</code></Check>
        </Card>

        <SubTitle>Quy trình chấm công</SubTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
            <p className="font-semibold text-blue-700 mb-2">Quét khuôn mặt</p>
            <p className="text-blue-600 text-xs">Nhân viên nhìn vào camera → hệ thống nhận diện tự động → phát giọng thông báo → hoàn thành.</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm">
            <p className="font-semibold text-purple-700 mb-2">Nhập PIN</p>
            <p className="text-purple-600 text-xs">Nhấn &ldquo;Dùng PIN&rdquo; → chọn tên → nhập 4 số PIN → nhấn Xác nhận.</p>
          </div>
        </div>

        <SubTitle>Trạng thái chấm công</SubTitle>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Trạng thái</th>
                <th className="text-left px-4 py-2 font-medium">Ý nghĩa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr><td className="px-4 py-2.5"><span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Đúng giờ</span></td><td className="px-4 py-2.5 text-gray-600">Vào trong giờ cho phép (kể cả ân hạn)</td></tr>
              <tr><td className="px-4 py-2.5"><span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">Trễ</span></td><td className="px-4 py-2.5 text-gray-600">Vào muộn hơn giờ + ân hạn, dưới 30 phút</td></tr>
              <tr><td className="px-4 py-2.5"><span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">Trễ nhiều</span></td><td className="px-4 py-2.5 text-gray-600">Vào muộn hơn 30 phút</td></tr>
              <tr><td className="px-4 py-2.5"><span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">Vắng</span></td><td className="px-4 py-2.5 text-gray-600">Không có dữ liệu chấm công trong ngày</td></tr>
            </tbody>
          </table>
        </div>
        <Callout type="info"><strong>Ân hạn</strong> là khoảng thời gian cho phép trễ mà không bị tính phạt. Ví dụ: giờ vào 07:30, ân hạn 5 phút → vào trước 07:35 vẫn tính đúng giờ.</Callout>

        <SubTitle>Tùy chỉnh câu chào của kiosk</SubTitle>
        <p className="text-sm text-gray-600">Bạn có thể thay đổi câu chào/thông báo mà kiosk phát ra khi nhân viên chấm công.</p>
        <Card>
          <Check>Vào <strong>Cài đặt → Tin nhắn kiosk</strong></Check>
          <Check>Chỉnh 4 câu: Chào mừng, Check-in đúng giờ, Check-in trễ, Check-out</Check>
          <Check>Dùng <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{"{name}"}</code> để chèn tên nhân viên, <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{"{minutes}"}</code> để chèn số phút trễ</Check>
          <Check>Nhấn <strong>Lưu</strong> → kiosk áp dụng ngay lần chấm công tiếp theo</Check>
        </Card>
        <Callout type="example">
          Ví dụ câu check-in trễ: <em>&ldquo;Xin chào {"{name}"}! Hôm nay bạn trễ {"{minutes}"} phút rồi nhé, cố gắng hơn nhé!&rdquo;</em>
        </Callout>
      </Section>
    ),
  },

  "employees": {
    title: "Quản lý nhân viên",
    Icon: Users,
    content: (
      <Section Icon={Users} title="Quản lý nhân viên">
        <SubTitle>Thêm nhân viên mới</SubTitle>
        <Card>
          <Check>Vào <strong>Nhân viên</strong> → nhấn <strong>Thêm nhân viên</strong></Check>
          <Check><strong>Mã NV:</strong> mã định danh (VD: NV001) — phải duy nhất trong công ty</Check>
          <Check><strong>PIN:</strong> 4 chữ số — nhân viên dùng để chấm công bằng PIN</Check>
          <Check><strong>Lương cơ bản:</strong> dùng để tính tiền tăng ca, phiếu lương và lương tháng 13</Check>
          <Check><strong>Ngày vào làm:</strong> dùng để tính tỉ lệ lương tháng 13 nếu chưa đủ năm</Check>
        </Card>

        <SubTitle>Đăng ký khuôn mặt</SubTitle>
        <div className="space-y-2">
          <Step num={1} title="Mở hồ sơ nhân viên" desc="Trong danh sách Nhân viên → nhấn vào tên → nhấn 'Đăng ký khuôn mặt'." />
          <Step num={2} title="Cho phép camera" desc="Trình duyệt sẽ hỏi quyền camera → nhấn Cho phép." />
          <Step num={3} title="Nhìn thẳng vào camera" desc="Hệ thống tự động nhận diện và lưu khuôn mặt. Chụp ở nhiều góc để tăng độ chính xác." />
        </div>
        <Callout type="tip">Nên chụp trong điều kiện ánh sáng tốt, không đội mũ hoặc đeo kính đậm. Có thể đăng ký lại bất kỳ lúc nào nếu khuôn mặt không nhận ra.</Callout>

        <SubTitle>Ca làm riêng cho nhân viên</SubTitle>
        <p className="text-sm text-gray-600">Nếu một nhân viên có giờ vào/ra khác với chi nhánh (VD: nhân viên bán thời gian), vào hồ sơ nhân viên → <strong>Ca làm riêng</strong> → bật toggle → nhập giờ riêng.</p>

        <SubTitle>Số ngày phép</SubTitle>
        <p className="text-sm text-gray-600">Mỗi nhân viên có số ngày phép năm (mặc định 12 ngày). Khi duyệt nghỉ phép năm, hệ thống tự trừ số ngày đó. Có thể xem và điều chỉnh trong hồ sơ nhân viên.</p>
      </Section>
    ),
  },

  "branches": {
    title: "Chi nhánh & Ca làm",
    Icon: Building2,
    content: (
      <Section Icon={Building2} title="Chi nhánh & Ca làm">
        <p className="text-sm text-gray-600">Mỗi chi nhánh có cấu hình ca làm riêng. Nhân viên thuộc chi nhánh nào thì áp dụng ca làm của chi nhánh đó (trừ khi có ca riêng).</p>

        <SubTitle>Các thông số cần cấu hình</SubTitle>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Thông số</th>
                <th className="text-left px-4 py-2 font-medium">Ý nghĩa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Giờ vào ca</td><td className="px-4 py-2.5 text-gray-600">Giờ bắt đầu làm việc (VD: 07:30)</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Giờ tan ca</td><td className="px-4 py-2.5 text-gray-600">Giờ kết thúc — dùng để tính tăng ca khi ra muộn</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Ân hạn</td><td className="px-4 py-2.5 text-gray-600">Số phút cho phép trễ mà không bị tính phạt</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Ngày làm việc</td><td className="px-4 py-2.5 text-gray-600">Các ngày trong tuần (VD: Thứ 2–6)</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Telegram Chat ID</td><td className="px-4 py-2.5 text-gray-600">Nhóm nhận thông báo khi nhân viên đến trễ</td></tr>
            </tbody>
          </table>
        </div>
        <Callout type="info">Nhiều chi nhánh → mỗi chi nhánh có một link kiosk riêng. Nhân viên chỉ thấy danh sách nhân viên thuộc chi nhánh đó khi chấm bằng PIN.</Callout>
      </Section>
    ),
  },

  "reports": {
    title: "Báo cáo tháng",
    Icon: BarChart3,
    content: (
      <Section Icon={BarChart3} title="Báo cáo tháng">
        <p className="text-sm text-gray-600">Báo cáo tổng hợp toàn bộ dữ liệu chấm công theo tháng, bao gồm số ngày đi làm, số lần trễ, tiền phạt, thưởng chuyên cần và giờ tăng ca.</p>

        <SubTitle>Cách xem báo cáo</SubTitle>
        <Card>
          <Check>Vào <strong>Báo cáo tháng</strong> → chọn tháng/năm muốn xem</Check>
          <Check>Bảng trên: tổng hợp theo nhân viên — đi đúng, trễ, vắng, phạt, thưởng, tăng ca</Check>
          <Check>Nhấn vào tên nhân viên → xem chi tiết từng ngày trong tháng</Check>
        </Card>

        <SubTitle>Xuất Excel</SubTitle>
        <Card>
          <Check>Nhấn nút <strong>Xuất Excel</strong> góc phải trên → tải file .xlsx về máy</Check>
          <Check>File bao gồm: tab tổng hợp + tab chi tiết từng ngày, có màu sắc và tổng cuối</Check>
        </Card>

        <SubTitle>Tăng ca (Overtime)</SubTitle>
        <Callout type="info">
          Tăng ca được tính <strong>tự động</strong> khi nhân viên check-out muộn hơn giờ tan ca. Hệ số:
          <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
            <li>Ngày thường: <strong>×1.5</strong> lương giờ</li>
            <li>Cuối tuần (T7, CN): <strong>×2.0</strong> lương giờ</li>
          </ul>
          <p className="mt-1.5 text-xs">Lưu ý: cần nhập <strong>Lương cơ bản</strong> cho nhân viên thì mới tính được tiền tăng ca.</p>
        </Callout>

        <SubTitle>Bảng phạt & Thưởng</SubTitle>
        <p className="text-sm text-gray-600">Cấu hình tại <strong>Cài đặt → Bảng phạt / Bảng thưởng</strong>. Hệ thống tự áp dụng khi nhân viên chấm công.</p>
        <Callout type="tip">Sau khi có dữ liệu báo cáo, dùng tính năng <strong>Phiếu lương</strong> để in phiếu cho từng nhân viên. <Link href="/dashboard/docs/payslip" className="underline font-medium">Xem hướng dẫn Phiếu lương →</Link></Callout>
      </Section>
    ),
  },

  "payslip": {
    title: "Phiếu lương",
    Icon: FileText,
    content: (
      <Section Icon={FileText} title="Phiếu lương">
        <p className="text-sm text-gray-600">In phiếu lương cá nhân hàng tháng cho từng nhân viên. Phiếu đầy đủ thông tin lương cơ bản, phạt, tăng ca, thực nhận và số tiền bằng chữ.</p>

        <SubTitle>Cách xem phiếu lương</SubTitle>
        <div className="space-y-2">
          <Step num={1} title="Vào Phiếu lương" desc="Trong menu trái → chọn 'Phiếu lương'." />
          <Step num={2} title="Chọn tháng" desc="Dùng ô chọn tháng/năm ở góc phải để xem tháng muốn." />
          <Step num={3} title="Xem tổng quan" desc="Bảng hiện tất cả nhân viên với lương cơ bản, phạt, tăng ca và thực nhận." />
          <Step num={4} title="In phiếu từng người" desc="Nhấn 'In phiếu' ở cuối mỗi hàng → tab mới mở ra với phiếu A4." />
          <Step num={5} title="In hoặc lưu PDF" desc="Nhấn 'In phiếu lương' → chọn máy in hoặc 'Lưu PDF' trong dialog in." />
        </div>

        <SubTitle>Nội dung phiếu lương A4</SubTitle>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Phần</th>
                <th className="text-left px-4 py-2 font-medium">Nội dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Thông tin NV</td><td className="px-4 py-2.5 text-gray-600">Họ tên, mã NV, phòng ban, chức vụ, chi nhánh, SĐT</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Chấm công</td><td className="px-4 py-2.5 text-gray-600">Ngày công thực tế, ngày vắng, số lần trễ, tổng phút trễ</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Tính lương</td><td className="px-4 py-2.5 text-gray-600">Lương cơ bản, thưởng, tăng ca, phạt vi phạm</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Thực nhận</td><td className="px-4 py-2.5 text-gray-600">Tổng thực nhận (số và chữ)</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Chữ ký</td><td className="px-4 py-2.5 text-gray-600">Ô ký của nhân viên và phụ trách lương</td></tr>
            </tbody>
          </table>
        </div>

        <SubTitle>Tóm tắt tháng</SubTitle>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 font-medium mb-1">Tổng thực nhận</p>
            <p className="text-sm font-bold text-blue-700">Tất cả NV</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xs text-red-600 font-medium mb-1">Tổng phạt</p>
            <p className="text-sm font-bold text-red-600">Toàn công ty</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-green-600 font-medium mb-1">Tổng tăng ca</p>
            <p className="text-sm font-bold text-green-600">Toàn công ty</p>
          </div>
        </div>

        <Callout type="tip">
          Phiếu lương tự động lấy dữ liệu từ báo cáo chấm công. Để phiếu chính xác:
          <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
            <li>Nhập <strong>Lương cơ bản</strong> đầy đủ cho nhân viên</li>
            <li>Cấu hình <strong>Bảng phạt</strong> nếu muốn trừ lương trễ</li>
            <li>Duyệt <strong>tăng ca</strong> trước khi in phiếu</li>
          </ul>
        </Callout>

        <Callout type="info">Để lưu PDF, trong hộp thoại in của trình duyệt chọn <strong>Máy in → Lưu thành PDF</strong>.</Callout>
      </Section>
    ),
  },

  "leave": {
    title: "Nghỉ phép",
    Icon: Umbrella,
    content: (
      <Section Icon={Umbrella} title="Nghỉ phép">
        <p className="text-sm text-gray-600">Quản lý đơn xin nghỉ của nhân viên. Sếp/kế toán duyệt hoặc từ chối ngay trên dashboard.</p>

        <SubTitle>Quy trình</SubTitle>
        <div className="space-y-3">
          <Step num={1} title="Nhân viên gửi đơn" desc="Nhân viên gửi đơn xin nghỉ (qua form hoặc nhờ admin tạo hộ)." />
          <Step num={2} title="Sếp nhận đơn" desc="Vào Nghỉ phép → thấy tab 'Chờ duyệt' hiện số đơn mới." />
          <Step num={3} title="Duyệt hoặc từ chối" desc="Nhấn 'Duyệt' hoặc 'Từ chối' → có thể ghi chú lý do." />
        </div>

        <SubTitle>Các loại nghỉ</SubTitle>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["Nghỉ phép năm", "Trừ vào số ngày phép còn lại (mặc định 12 ngày/năm)"],
            ["Nghỉ ốm", "Không trừ phép, nhưng vẫn ghi nhận vắng"],
            ["Nghỉ không lương", "Không lương ngày đó"],
            ["Thai sản", "Theo quy định bảo hiểm xã hội"],
          ].map(([name, desc]) => (
            <div key={name} className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="font-semibold text-gray-700 text-xs mb-1">{name}</p>
              <p className="text-gray-500 text-xs">{desc}</p>
            </div>
          ))}
        </div>
        <Callout type="info">Khi duyệt <strong>Nghỉ phép năm</strong>, hệ thống tự động trừ số ngày vào số phép còn lại của nhân viên. Số phép còn lại hiện trong hồ sơ nhân viên.</Callout>
      </Section>
    ),
  },

  "holidays": {
    title: "Lịch nghỉ lễ",
    Icon: CalendarDays,
    content: (
      <Section Icon={CalendarDays} title="Lịch nghỉ lễ">
        <p className="text-sm text-gray-600">Thiết lập ngày lễ để ngày đó không bị tính là ngày vắng trong báo cáo.</p>

        <SubTitle>Nhập ngày lễ quốc gia Việt Nam</SubTitle>
        <div className="space-y-3">
          <Step num={1} title="Vào Cài đặt → Tab 'Ngày lễ'" desc="Chọn năm cần nhập (VD: 2025 hoặc 2026)." />
          <Step num={2} title="Nhấn 'Nhập lễ VN'" desc="Hệ thống tự thêm: Tết Nguyên Đán, 30/4, 1/5, 2/9, Giỗ Tổ Hùng Vương." />
          <Step num={3} title="Thêm ngày nghỉ riêng" desc="Nhấn '+ Thêm tự chọn' → nhập ngày và tên (VD: 'Kỷ niệm thành lập công ty')." />
        </div>
        <Callout type="tip">Nên nhập lịch lễ trước khi bắt đầu tháng mới để báo cáo tính chính xác từ đầu tháng.</Callout>

        <SubTitle>Ngày lễ quốc gia (hàng năm)</SubTitle>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-red-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Ngày lễ</th>
                <th className="text-left px-4 py-2 font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ["Tết Dương Lịch", "01/01"],
                ["Tết Nguyên Đán", "28/01 – 03/02 (7 ngày, thay đổi theo năm âm)"],
                ["Giỗ Tổ Hùng Vương", "10/3 âm lịch"],
                ["Ngày Giải Phóng Miền Nam", "30/04"],
                ["Quốc Tế Lao Động", "01/05"],
                ["Quốc Khánh", "02/09"],
              ].map(([name, date]) => (
                <tr key={name}>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    ),
  },

  "telegram": {
    title: "Thông báo Telegram",
    Icon: MessageSquare,
    content: (
      <Section Icon={MessageSquare} title="Thông báo Telegram">
        <p className="text-sm text-gray-600">Nhận thông báo tự động qua Telegram khi nhân viên đến trễ. Không cần mở dashboard.</p>

        <SubTitle>Thiết lập lần đầu (5 bước)</SubTitle>
        <div className="space-y-3">
          <Step num={1} title="Tạo bot Telegram" desc="Mở Telegram → tìm @BotFather → gõ /newbot → đặt tên → nhận Bot Token." />
          <Step num={2} title="Nhập Bot Token vào hệ thống" desc="Cài đặt → cuộn xuống 'Thông báo Telegram' → dán token → nhấn Lưu." />
          <Step num={3} title="Tạo nhóm Telegram" desc="Tạo nhóm mới (hoặc dùng nhóm sếp sẵn có) → thêm bot vào nhóm." />
          <Step num={4} title="Lấy Chat ID của nhóm" desc="Thêm @userinfobot vào nhóm → nó trả về Chat ID (số âm, VD: -1001234567890)." />
          <Step num={5} title="Gắn Chat ID vào chi nhánh" desc="Chi nhánh → Sửa → dán Chat ID vào ô 'Telegram Chat ID' → Lưu." />
        </div>
        <Callout type="tip">
          Sau khi thiết lập, nhấn <strong>&ldquo;Gửi thử&rdquo;</strong> trong Cài đặt → Telegram để kiểm tra kết nối trước khi sử dụng thực tế.
        </Callout>

        <SubTitle>Tin nhắn mẫu nhận được</SubTitle>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs font-mono space-y-1">
          <p>⚠️ Nhân viên đến trễ</p>
          <p>👤 Nguyễn Văn A</p>
          <p>🏢 Chi nhánh: Văn phòng Hà Nội</p>
          <p>⏱ Trễ 15 phút</p>
          <p>💸 Phạt: 50.000 ₫</p>
        </div>
      </Section>
    ),
  },

  "salary13": {
    title: "Lương tháng 13",
    Icon: Gift,
    content: (
      <Section Icon={Gift} title="Lương tháng 13">
        <p className="text-sm text-gray-600">Hệ thống tự tính lương tháng 13 theo từng nhân viên dựa trên lương cơ bản và số tháng đã làm trong năm.</p>

        <SubTitle>Công thức tóm tắt</SubTitle>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center font-mono text-sm text-blue-800">
          Lương tháng 13 = Lương CB × (Số tháng làm đủ ÷ 12)
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3 text-sm text-center">
          <div className="bg-white border border-gray-100 rounded-xl p-3">
            <p className="font-semibold text-gray-700 text-xs">Đủ 12 tháng</p>
            <p className="text-green-600 font-bold mt-1 text-xs">= 1 tháng lương</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3">
            <p className="font-semibold text-gray-700 text-xs">Mới 6 tháng</p>
            <p className="text-blue-600 font-bold mt-1 text-xs">= 0.5 tháng lương</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-3">
            <p className="font-semibold text-gray-700 text-xs">Dưới 1 tháng</p>
            <p className="text-gray-400 font-bold mt-1 text-xs">= Không tính</p>
          </div>
        </div>

        <Callout type="info">Cần nhập <strong>Ngày vào làm</strong> và <strong>Lương cơ bản</strong> trong hồ sơ nhân viên thì hệ thống mới tính được.</Callout>

        <div className="mt-2">
          <Link
            href="/dashboard/reports/13th-month/guide"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <BookOpen size={15} />
            Xem hướng dẫn chi tiết lương tháng 13
          </Link>
        </div>
      </Section>
    ),
  },
};

// ── Page ────────────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return Object.keys(ARTICLES).map((slug) => ({ slug }));
}

export default function DocArticlePage({ params }: { params: { slug: string } }) {
  const article = ARTICLES[params.slug];
  if (!article) notFound();

  const slugs = Object.keys(ARTICLES);
  const currentIndex = slugs.indexOf(params.slug);
  const prevSlug = currentIndex > 0 ? slugs[currentIndex - 1] : null;
  const nextSlug = currentIndex < slugs.length - 1 ? slugs[currentIndex + 1] : null;

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <Link href="/dashboard/docs" className="hover:text-blue-600 transition-colors">Hướng dẫn</Link>
        <ChevronRight size={12} />
        <span className="text-gray-600">{article.title}</span>
      </div>

      {/* Article content */}
      {article.content}

      {/* Prev / Next navigation */}
      <div className="border-t border-gray-100 pt-6 mt-4 flex gap-3">
        {prevSlug ? (
          <Link
            href={`/dashboard/docs/${prevSlug}`}
            className="flex-1 bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 transition-all text-sm text-left"
          >
            <p className="text-xs text-gray-400 mb-1">← Bài trước</p>
            <p className="font-semibold text-gray-700">{ARTICLES[prevSlug].title}</p>
          </Link>
        ) : <div className="flex-1" />}
        {nextSlug ? (
          <Link
            href={`/dashboard/docs/${nextSlug}`}
            className="flex-1 bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 transition-all text-sm text-right"
          >
            <p className="text-xs text-gray-400 mb-1">Bài tiếp →</p>
            <p className="font-semibold text-gray-700">{ARTICLES[nextSlug].title}</p>
          </Link>
        ) : <div className="flex-1" />}
      </div>
    </div>
  );
}
