import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Zap, Camera, Users, Building2, BarChart3, FileText, Umbrella,
  CalendarDays, MessageSquare, Gift, BookOpen, Info, CheckCircle2,
  AlertTriangle, Bookmark, ChevronRight, Banknote, Bell, Layers,
  Shield, ScrollText, User, type LucideIcon,
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

  "salary-payment": {
    title: "Thanh toán lương",
    Icon: Banknote,
    content: (
      <Section Icon={Banknote} title="Thanh toán lương">
        <p className="text-sm text-gray-600">Theo dõi trạng thái đã trả / chưa trả lương cho từng nhân viên mỗi tháng ngay trong trang Phiếu lương.</p>

        <Callout type="tip">Tính năng này giúp kế toán không bị nhầm — ai đã nhận tiền, ai chưa, tổng đã chi bao nhiêu — tất cả hiện ngay trên một màn hình.</Callout>

        <SubTitle>Cách sử dụng</SubTitle>
        <div className="space-y-3">
          <Step num={1} title="Vào Phiếu lương" desc="Menu trái → Phiếu lương → chọn tháng cần thanh toán." />
          <Step num={2} title="Thanh bar trạng thái" desc="Phía trên bảng hiện: 'X/Y nhân viên đã trả · tổng đã chi'. Nếu chưa ai được trả, nhấn 'Đánh dấu tất cả đã trả'." />
          <Step num={3} title="Đánh dấu từng người" desc="Cột 'Thanh toán' trong bảng → nhấn nút xanh 'Trả lương' để đánh dấu đã trả." />
          <Step num={4} title="Xem ngày trả" desc="Sau khi đánh dấu, ô hiển thị badge xanh 'Đã trả' kèm ngày giờ thực hiện." />
          <Step num={5} title="Hoàn tác nếu nhầm" desc="Nhấn link nhỏ 'Hoàn tác' dưới badge xanh để đặt lại về trạng thái chưa trả." />
        </div>

        <SubTitle>Các thao tác nhanh</SubTitle>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Thao tác</th>
                <th className="text-left px-4 py-2 font-medium">Mô tả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Trả lương (từng người)</td><td className="px-4 py-2.5 text-gray-600">Nhấn nút xanh trong cột Thanh toán của từng hàng</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Đánh dấu tất cả đã trả</td><td className="px-4 py-2.5 text-gray-600">Nút ở thanh trạng thái phía trên bảng — đánh dấu tất cả cùng lúc</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Đặt lại tất cả</td><td className="px-4 py-2.5 text-gray-600">Khi tất cả đã trả, nút đổi thành 'Đặt lại tất cả'</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Hoàn tác từng người</td><td className="px-4 py-2.5 text-gray-600">Link nhỏ 'Hoàn tác' dưới badge Đã trả</td></tr>
            </tbody>
          </table>
        </div>

        <SubTitle>Theo dõi tổng tiền đã chi</SubTitle>
        <p className="text-sm text-gray-600">Thanh trạng thái luôn cập nhật realtime: số nhân viên đã trả và tổng số tiền thực nhận của những người đó. Không cần tính tay.</p>
        <Callout type="info">Trạng thái thanh toán được lưu theo từng tháng. Tháng 1 và tháng 2 là hai bản ghi độc lập — đánh dấu tháng này không ảnh hưởng tháng khác.</Callout>
      </Section>
    ),
  },

  "late-alert": {
    title: "Cảnh báo đi trễ tự động",
    Icon: Bell,
    content: (
      <Section Icon={Bell} title="Cảnh báo đi trễ tự động">
        <p className="text-sm text-gray-600">Hệ thống tự động gửi tin nhắn Telegram mỗi sáng thứ 2–6, thông báo danh sách nhân viên chưa chấm công sau giờ vào làm.</p>

        <Callout type="tip">Không cần mở dashboard — sếp và quản lý nhận ngay thông báo trên điện thoại lúc 9:15 sáng nếu có nhân viên vắng mà không xin phép.</Callout>

        <SubTitle>Lịch gửi cảnh báo</SubTitle>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Thông số</th>
                <th className="text-left px-4 py-2 font-medium">Giá trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Giờ gửi</td><td className="px-4 py-2.5 text-gray-600">9:15 sáng (giờ Việt Nam)</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Ngày gửi</td><td className="px-4 py-2.5 text-gray-600">Thứ 2 đến Thứ 6</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Điều kiện kích hoạt</td><td className="px-4 py-2.5 text-gray-600">Ngưỡng: Giờ vào + Ân hạn + 30 phút đã qua</td></tr>
            </tbody>
          </table>
        </div>

        <SubTitle>Ví dụ thực tế</SubTitle>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-sm space-y-2">
          <p className="text-gray-600">Chi nhánh cấu hình giờ vào <strong>07:30</strong>, ân hạn <strong>5 phút</strong>:</p>
          <ul className="space-y-1 text-gray-500 text-xs list-disc list-inside">
            <li>Ngưỡng cảnh báo = 07:30 + 5 phút + 30 phút = <strong>08:05</strong></li>
            <li>Đến 9:15 sáng, cron chạy và kiểm tra ai chưa chấm công</li>
            <li>Danh sách những người vắng được gửi qua Telegram</li>
          </ul>
        </div>

        <SubTitle>Tin nhắn Telegram mẫu</SubTitle>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs font-mono space-y-1">
          <p>⚠️ Cảnh báo chưa chấm công</p>
          <p>🏢 Chi nhánh Hà Nội — Công ty ABC</p>
          <p>📅 Thứ Hai, 24/06/2026 | Ca: 07:30</p>
          <p></p>
          <p>Chưa vào làm (3/12 NV):</p>
          <p>• Nguyễn Văn A (Kế toán) — NV001</p>
          <p>• Trần Thị B (Marketing) — NV007</p>
          <p>• Lê Văn C — NV012</p>
          <p></p>
          <p>_Timio — Cảnh báo tự động_</p>
        </div>

        <SubTitle>Ai nhận được cảnh báo</SubTitle>
        <div className="space-y-2">
          <Check><strong>Telegram Chat ID của chi nhánh</strong> — nhóm riêng của mỗi chi nhánh</Check>
          <Check><strong>Accounting Chat ID của công ty</strong> — nhóm kế toán chung (nếu có cấu hình khác với chi nhánh)</Check>
          <Check><strong>Cá nhân admin</strong> — những admin bật &ldquo;Nhận Telegram cá nhân&rdquo; trong Cài đặt tài khoản</Check>
        </div>

        <SubTitle>Điều kiện hoạt động</SubTitle>
        <div className="space-y-2">
          <Check>Đã cấu hình <strong>Telegram Bot Token</strong> trong Cài đặt công ty</Check>
          <Check>Chi nhánh có <strong>Telegram Chat ID</strong> được thiết lập</Check>
          <Check>Nhân viên có trạng thái <strong>Đang hoạt động</strong> (không phải đã nghỉ việc)</Check>
        </div>

        <Callout type="warning">Cảnh báo <strong>không tự tắt</strong> khi nhân viên chấm công muộn sau 9:15 sáng — bạn có thể thấy tên nhân viên đã đến muộn trong tin nhắn. Đây là hành vi cố ý để ghi nhận việc đến trễ.</Callout>

        <div className="mt-2">
          <Link href="/dashboard/docs/telegram" className="text-sm text-blue-600 hover:underline">
            → Xem hướng dẫn thiết lập Telegram →
          </Link>
        </div>
      </Section>
    ),
  },

  "branch-reports": {
    title: "Báo cáo đa chi nhánh",
    Icon: Layers,
    content: (
      <Section Icon={Layers} title="Báo cáo đa chi nhánh">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold mb-4">
          <Shield size={11} />
          Tính năng gói Business
        </div>

        <p className="text-sm text-gray-600">So sánh hiệu suất chấm công giữa tất cả chi nhánh trong cùng một bảng — ai chuyên cần nhất, chi nhánh nào có tỉ lệ trễ cao, tổng phạt và tăng ca mỗi nơi.</p>

        <SubTitle>Cách xem</SubTitle>
        <div className="space-y-2">
          <Step num={1} title="Vào Báo cáo tháng" desc="Menu trái → Báo cáo tháng → chọn tháng." />
          <Step num={2} title="Chọn tab Chi nhánh" desc="Nhấn tab 'Chi nhánh' màu tím bên cạnh tab 'Tổng quan' và 'Chi tiết'." />
          <Step num={3} title="Đọc bảng so sánh" desc="Mỗi hàng là một chi nhánh với đầy đủ các chỉ số." />
        </div>

        <SubTitle>Các chỉ số hiển thị</SubTitle>
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Cột</th>
                <th className="text-left px-4 py-2 font-medium">Ý nghĩa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">% Chuyên cần</td><td className="px-4 py-2.5 text-gray-600">Tỉ lệ ngày có mặt / tổng ngày công. Badge màu xanh/vàng/đỏ</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Nhân viên</td><td className="px-4 py-2.5 text-gray-600">Số nhân viên đang hoạt động trong chi nhánh</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Ngày công</td><td className="px-4 py-2.5 text-gray-600">Tổng ngày có mặt trong tháng</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Trễ</td><td className="px-4 py-2.5 text-gray-600">Số lần trễ và % so với tổng ngày công</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Vắng</td><td className="px-4 py-2.5 text-gray-600">Số ngày vắng không có lý do</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Tổng phạt</td><td className="px-4 py-2.5 text-gray-600">Tổng tiền phạt của chi nhánh trong tháng</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Tăng ca</td><td className="px-4 py-2.5 text-gray-600">Tổng tiền tăng ca phải chi</td></tr>
              <tr><td className="px-4 py-2.5 font-medium text-gray-700">Lương CB</td><td className="px-4 py-2.5 text-gray-600">Tổng lương cơ bản của tất cả nhân viên trong chi nhánh</td></tr>
            </tbody>
          </table>
        </div>

        <SubTitle>Badge chuyên cần</SubTitle>
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="font-bold text-green-700 text-sm">≥ 90%</p>
            <p className="text-green-600 mt-1">Tốt</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <p className="font-bold text-yellow-700 text-sm">70–89%</p>
            <p className="text-yellow-600 mt-1">Trung bình</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="font-bold text-red-700 text-sm">&lt; 70%</p>
            <p className="text-red-600 mt-1">Cần chú ý</p>
          </div>
        </div>

        <Callout type="info">Bảng được sắp xếp theo ngày công từ cao xuống thấp. Hàng tổng cộng xuất hiện ở cuối khi có từ 2 chi nhánh trở lên.</Callout>
      </Section>
    ),
  },

  "permissions": {
    title: "Phân quyền quản lý",
    Icon: Shield,
    content: (
      <Section Icon={Shield} title="Phân quyền quản lý">
        <p className="text-sm text-gray-600">Timio hỗ trợ nhiều cấp quyền để bạn phân công nhân sự quản trị mà không lo lộ dữ liệu nhạy cảm.</p>

        <SubTitle>Ba vai trò hệ thống</SubTitle>
        <div className="space-y-3">
          {[
            {
              role: "Chủ sở hữu (Owner)",
              color: "bg-blue-50 border-blue-200 text-blue-800",
              badge: "bg-blue-100 text-blue-700",
              perms: ["Xem toàn bộ dữ liệu công ty", "Thêm/xóa nhân viên, chi nhánh", "Cấu hình bảng phạt, thưởng, Telegram", "Xem và thay đổi gói dịch vụ", "Thêm tài khoản quản lý và kế toán"],
            },
            {
              role: "Quản lý (Manager)",
              color: "bg-purple-50 border-purple-200 text-purple-800",
              badge: "bg-purple-100 text-purple-700",
              perms: ["Chỉ thấy dữ liệu chi nhánh được giao", "Xem báo cáo, phiếu lương chi nhánh mình", "Duyệt đơn nghỉ phép nhân viên chi nhánh mình", "Không xem được chi nhánh khác", "Không thay đổi cài đặt hệ thống"],
            },
            {
              role: "Kế toán (Accountant)",
              color: "bg-orange-50 border-orange-200 text-orange-800",
              badge: "bg-orange-100 text-orange-700",
              perms: ["Xem toàn bộ dữ liệu công ty (đọc)", "Truy cập phiếu lương, báo cáo tất cả chi nhánh", "Không thêm/xóa nhân viên", "Không thay đổi cài đặt"],
            },
          ].map(({ role, color, badge, perms }) => (
            <div key={role} className={`border rounded-xl p-4 ${color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{role}</span>
              </div>
              <ul className="space-y-1">
                {perms.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-xs">
                    <CheckCircle2 size={12} className="shrink-0 mt-0.5 opacity-70" strokeWidth={2.5} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <SubTitle>Thêm tài khoản mới</SubTitle>
        <div className="space-y-2">
          <Step num={1} title="Vào Nhóm & Phân quyền" desc="Menu trái → Nhóm → nhấn 'Thêm thành viên'." />
          <Step num={2} title="Nhập email" desc="Nhập email tài khoản mới → chọn vai trò (Quản lý hoặc Kế toán)." />
          <Step num={3} title="Giao chi nhánh (nếu là Manager)" desc="Chọn chi nhánh mà Manager đó sẽ phụ trách — Manager chỉ thấy dữ liệu chi nhánh này." />
          <Step num={4} title="Người được mời đặt mật khẩu" desc="Người dùng mới vào link đăng nhập → nhập email → tạo mật khẩu lần đầu." />
        </div>

        <Callout type="info">
          Manager được giao chi nhánh sẽ thấy <strong>đúng chi nhánh đó</strong> trong tất cả trang:
          Dashboard, Báo cáo, Phiếu lương, Nghỉ phép. Dữ liệu chi nhánh khác hoàn toàn ẩn.
        </Callout>
        <Callout type="tip">Gói Starter hỗ trợ 1 tài khoản. Pro hỗ trợ 3. Business không giới hạn số lượng.</Callout>
      </Section>
    ),
  },

  "contracts": {
    title: "Hợp đồng lao động",
    Icon: ScrollText,
    content: (
      <Section Icon={ScrollText} title="Hợp đồng lao động">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold mb-4">
          <Shield size={11} />
          Tính năng gói Business
        </div>

        <p className="text-sm text-gray-600">Tạo và lưu trữ hợp đồng lao động cho từng nhân viên ngay trong hệ thống. In hợp đồng A4 với đầy đủ thông tin và chữ ký.</p>

        <SubTitle>Các loại hợp đồng</SubTitle>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["Thử việc", "Thời gian thử việc trước khi ký chính thức"],
            ["Xác định thời hạn", "Hợp đồng có ngày bắt đầu và kết thúc cụ thể"],
            ["Không xác định thời hạn", "Hợp đồng dài hạn không có ngày hết"],
            ["Mùa vụ", "Hợp đồng theo mùa hoặc dự án ngắn hạn"],
            ["Bán thời gian", "Nhân viên làm việc dưới 8 giờ/ngày"],
          ].map(([name, desc]) => (
            <div key={name} className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="font-semibold text-gray-700 text-xs mb-1">{name}</p>
              <p className="text-gray-500 text-xs">{desc}</p>
            </div>
          ))}
        </div>

        <SubTitle>Tạo hợp đồng mới</SubTitle>
        <div className="space-y-2">
          <Step num={1} title="Vào danh sách Nhân viên" desc="Menu trái → Nhân viên → tìm nhân viên cần tạo hợp đồng." />
          <Step num={2} title="Nhấn nút 'HĐ'" desc="Nút màu tím 'HĐ' ở cuối mỗi hàng nhân viên → mở form tạo hợp đồng." />
          <Step num={3} title="Điền thông tin hợp đồng" desc="Chọn loại hợp đồng, ngày bắt đầu, ngày kết thúc (nếu có), lương, và các điều khoản." />
          <Step num={4} title="Lưu hợp đồng" desc="Nhấn Lưu → hợp đồng được gắn với nhân viên và lưu trong hệ thống." />
          <Step num={5} title="In hợp đồng" desc="Trong danh sách hợp đồng → nhấn 'In' → hợp đồng A4 có chữ ký và dấu công ty." />
        </div>

        <SubTitle>Chữ ký & Dấu công ty trên hợp đồng</SubTitle>
        <p className="text-sm text-gray-600">Upload chữ ký và dấu đỏ một lần tại Cài đặt → Chữ ký & Dấu — sau đó tất cả hợp đồng, phiếu duyệt nghỉ phép tự động dùng ảnh đó.</p>
        <div className="space-y-1 mt-2">
          <Check>Vào <strong>Cài đặt → Chữ ký & Dấu</strong></Check>
          <Check>Upload ảnh PNG nền trong suốt (max 200KB)</Check>
          <Check>Ảnh chữ ký và dấu hiển thị trên tất cả văn bản in ra</Check>
        </div>

        <Callout type="warning">Hợp đồng chỉ khả dụng với gói <strong>Business</strong>. Nút &ldquo;HĐ&rdquo; sẽ bị khóa trên gói Starter và Pro.</Callout>
      </Section>
    ),
  },

  "employee-portal": {
    title: "Cổng thông tin nhân viên",
    Icon: User,
    content: (
      <Section Icon={User} title="Cổng thông tin nhân viên">
        <p className="text-sm text-gray-600">Mỗi nhân viên có thể tự tra cứu chấm công, xem phiếu lương và gửi yêu cầu điều chỉnh — không cần hỏi sếp.</p>

        <SubTitle>Link truy cập</SubTitle>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs font-mono">
          https://timio.vn/employee/[slug-công-ty]
        </div>
        <p className="text-xs text-gray-400 mt-2">Ví dụ: <code className="bg-gray-100 px-1.5 py-0.5 rounded">timio.vn/employee/abc-company</code></p>
        <Callout type="tip">In QR code trỏ đến link này và dán ở phòng ăn / bảng thông báo để nhân viên dễ truy cập từ điện thoại cá nhân.</Callout>

        <SubTitle>Quy trình đăng nhập</SubTitle>
        <div className="space-y-2">
          <Step num={1} title="Vào link cổng thông tin" desc="Nhân viên mở trình duyệt trên điện thoại → nhập URL hoặc quét QR." />
          <Step num={2} title="Nhập mã nhân viên và PIN" desc="Dùng Mã NV (VD: NV001) và PIN 4 số — chính là PIN chấm công hàng ngày." />
          <Step num={3} title="Xem thông tin cá nhân" desc="Sau khi đăng nhập thấy: ngày công, số lần trễ, tiền phạt, số ngày phép còn lại." />
        </div>

        <SubTitle>Tính năng nhân viên có thể làm</SubTitle>
        <div className="space-y-2">
          <Check><strong>Xem bảng chấm công tháng</strong> — lịch ngày nào đúng giờ, trễ, vắng, nghỉ phép</Check>
          <Check><strong>Xem phiếu lương</strong> — lương CB, tăng ca, phạt, BHXH, thực nhận và số tiền bằng chữ</Check>
          <Check><strong>Gửi yêu cầu điều chỉnh</strong> — nếu chấm công bị sai (quên check-in, check-out nhầm), điền form gửi cho admin xét duyệt</Check>
          <Check><strong>Xem số ngày phép còn lại</strong> — tổng phép năm và số đã dùng</Check>
        </div>

        <SubTitle>Yêu cầu điều chỉnh chấm công</SubTitle>
        <div className="space-y-2">
          <Step num={1} title="Trong cổng NV → nhấn 'Yêu cầu điều chỉnh'" desc="Chọn ngày cần chỉnh → điền lý do (VD: 'Quên check-out lúc 17:30')." />
          <Step num={2} title="Gửi yêu cầu" desc="Admin nhận yêu cầu trong dashboard → Cài đặt → Yêu cầu điều chỉnh." />
          <Step num={3} title="Admin xét duyệt" desc="Admin chỉnh sửa giờ vào/ra trực tiếp hoặc từ chối với ghi chú." />
        </div>

        <Callout type="info">PIN của nhân viên là PIN chấm công 4 số. Nếu nhân viên quên PIN, admin có thể xem và đặt lại trong hồ sơ nhân viên.</Callout>

        <SubTitle>Cách chia sẻ link với nhân viên</SubTitle>
        <div className="space-y-2">
          <Check>Vào <strong>Cài đặt</strong> → tìm ô &ldquo;Link cổng nhân viên&rdquo; → nhấn Copy</Check>
          <Check>Gửi qua Zalo nhóm công ty hoặc in QR dán ở bảng thông báo</Check>
          <Check>Mỗi công ty có một link riêng — nhân viên công ty khác không đăng nhập được</Check>
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
