import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import {
  Zap, Camera, Users, Building2, BarChart3, Umbrella, CalendarDays,
  MessageSquare, Gift, Info, CheckCircle2, AlertTriangle, Bookmark,
  LayoutDashboard, BookOpen, type LucideIcon,
} from "lucide-react";

// ── Mini component helpers ──────────────────────────────────────────────────

function Section({ id, Icon, title, children }: {
  id: string;
  Icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 mb-14">
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
    info: { bg: "bg-blue-50 border-blue-200 text-blue-800", Icon: Info, iconCls: "text-blue-500" },
    tip: { bg: "bg-green-50 border-green-200 text-green-800", Icon: CheckCircle2, iconCls: "text-green-500" },
    warning: { bg: "bg-amber-50 border-amber-200 text-amber-800", Icon: AlertTriangle, iconCls: "text-amber-500" },
    example: { bg: "bg-gray-50 border-gray-200 text-gray-700", Icon: Bookmark, iconCls: "text-gray-400" },
  };
  const { bg, Icon, iconCls } = styles[type];
  return (
    <div className={`border rounded-xl px-4 py-3 text-sm flex gap-2.5 ${bg}`}>
      <Icon size={16} className={`${iconCls} shrink-0 mt-0.5`} strokeWidth={2} />
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

// ── Table of contents ───────────────────────────────────────────────────────

const TOC: { id: string; Icon: LucideIcon; label: string }[] = [
  { id: "quickstart", Icon: Zap, label: "Bắt đầu nhanh" },
  { id: "kiosk", Icon: Camera, label: "Máy chấm công" },
  { id: "employees", Icon: Users, label: "Nhân viên" },
  { id: "branches", Icon: Building2, label: "Chi nhánh & Ca làm" },
  { id: "reports", Icon: BarChart3, label: "Báo cáo tháng" },
  { id: "leave", Icon: Umbrella, label: "Nghỉ phép" },
  { id: "holidays", Icon: CalendarDays, label: "Lịch nghỉ lễ" },
  { id: "telegram", Icon: MessageSquare, label: "Thông báo Telegram" },
  { id: "salary13", Icon: Gift, label: "Lương tháng 13" },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default async function DocsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex gap-0 min-h-screen">

      {/* Mục lục bên trái — ẩn trên mobile */}
      <aside className="hidden lg:block w-52 shrink-0">
        <div className="sticky top-0 pt-8 pb-6 px-4 h-screen overflow-y-auto border-r border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Nội dung</p>
          <nav className="space-y-0.5">
            {TOC.map(({ id, Icon, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Icon size={15} strokeWidth={1.8} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* Nội dung chính */}
      <main className="flex-1 px-8 py-8 max-w-3xl">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
              <BookOpen size={24} className="text-white" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Hướng dẫn sử dụng</h1>
              <p className="text-sm text-gray-400 mt-0.5">Tìm hiểu cách vận hành Timio từ A đến Z</p>
            </div>
          </div>
        </div>

        {/* ── 1. Bắt đầu nhanh ── */}
        <Section id="quickstart" Icon={Zap} title="Bắt đầu nhanh">
          <p className="text-sm text-gray-600">Thiết lập xong 5 bước dưới đây là hệ thống sẵn sàng chạy.</p>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-5">
            <Step num={1} title="Tạo chi nhánh" desc="Vào Chi nhánh → Thêm chi nhánh → Nhập tên, giờ vào/ra, ngày làm việc." />
            <Step num={2} title="Thêm nhân viên" desc="Vào Nhân viên → Thêm nhân viên → Nhập tên, mã NV, PIN, lương cơ bản." />
            <Step num={3} title="Đăng ký khuôn mặt" desc="Trong hồ sơ từng nhân viên → nhấn 'Đăng ký khuôn mặt' → nhìn vào camera." />
            <Step num={4} title="Đặt máy kiosk" desc="Mở trình duyệt trên điện thoại/máy tính bảng → vào Cài đặt → copy link kiosk → đặt ở lối vào." />
            <Step num={5} title="Xem báo cáo" desc="Cuối tháng vào Báo cáo tháng → xem tổng hợp → xuất Excel nếu cần." />
          </div>
          <Callout type="tip">Nên hoàn thành bước 1 và 2 trước, sau đó nhân viên tự đăng ký khuôn mặt tại máy kiosk hoặc admin đăng ký hộ trong phần Nhân viên.</Callout>
        </Section>

        {/* ── 2. Máy chấm công ── */}
        <Section id="kiosk" Icon={Camera} title="Máy chấm công (Kiosk)">
          <p className="text-sm text-gray-600">Máy chấm công là một trang web chạy trên điện thoại hoặc máy tính bảng đặt tại cửa văn phòng. Nhân viên tự chấm vào/ra mà không cần thao tác gì thêm.</p>

          <SubTitle>Cách lấy link kiosk</SubTitle>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2 text-sm text-gray-700">
            <Check>Vào <strong>Cài đặt</strong> → thấy ô &ldquo;Link chấm công&rdquo; màu xanh ở đầu trang</Check>
            <Check>Nhấn <strong>Copy</strong> → dán vào trình duyệt của máy kiosk</Check>
            <Check>Mỗi chi nhánh có link riêng, dạng: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">/checkin/[tên-công-ty]</code></Check>
          </div>

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
        </Section>

        {/* ── 3. Nhân viên ── */}
        <Section id="employees" Icon={Users} title="Quản lý nhân viên">
          <SubTitle>Thêm nhân viên mới</SubTitle>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2 text-sm text-gray-700">
            <Check>Vào <strong>Nhân viên</strong> → nhấn <strong>Thêm nhân viên</strong></Check>
            <Check><strong>Mã NV:</strong> mã định danh (VD: NV001) — phải duy nhất trong công ty</Check>
            <Check><strong>PIN:</strong> 4 chữ số — nhân viên dùng để chấm công bằng PIN</Check>
            <Check><strong>Lương cơ bản:</strong> dùng để tính tiền tăng ca và lương tháng 13</Check>
            <Check><strong>Ngày vào làm:</strong> dùng để tính tỉ lệ lương tháng 13 nếu chưa đủ năm</Check>
          </div>

          <SubTitle>Đăng ký khuôn mặt</SubTitle>
          <div className="space-y-2">
            <Step num={1} title="Mở hồ sơ nhân viên" desc="Trong danh sách Nhân viên → nhấn vào tên → nhấn 'Đăng ký khuôn mặt'." />
            <Step num={2} title="Cho phép camera" desc="Trình duyệt sẽ hỏi quyền camera → nhấn Cho phép." />
            <Step num={3} title="Nhìn thẳng vào camera" desc="Hệ thống tự động nhận diện và lưu khuôn mặt. Chụp ở nhiều góc để tăng độ chính xác." />
          </div>
          <Callout type="tip">Nên chụp trong điều kiện ánh sáng tốt, không đội mũ hoặc đeo kính đậm. Có thể đăng ký lại bất kỳ lúc nào nếu khuôn mặt không nhận ra.</Callout>

          <SubTitle>Ca làm riêng cho nhân viên</SubTitle>
          <p className="text-sm text-gray-600">Nếu một nhân viên có giờ vào/ra khác với chi nhánh (VD: nhân viên bán thời gian), vào hồ sơ nhân viên → <strong>Ca làm riêng</strong> → bật toggle → nhập giờ riêng.</p>
        </Section>

        {/* ── 4. Chi nhánh ── */}
        <Section id="branches" Icon={Building2} title="Chi nhánh & Ca làm">
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

        {/* ── 5. Báo cáo ── */}
        <Section id="reports" Icon={BarChart3} title="Báo cáo tháng">
          <p className="text-sm text-gray-600">Báo cáo tổng hợp toàn bộ dữ liệu chấm công theo tháng, bao gồm số ngày đi làm, số lần trễ, tiền phạt, thưởng chuyên cần và giờ tăng ca.</p>

          <SubTitle>Cách xem báo cáo</SubTitle>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2">
            <Check>Vào <strong>Báo cáo tháng</strong> → chọn tháng/năm muốn xem</Check>
            <Check>Bảng trên: tổng hợp theo nhân viên — đi đúng, trễ, vắng, phạt, thưởng, tăng ca</Check>
            <Check>Nhấn vào tên nhân viên → xem chi tiết từng ngày trong tháng</Check>
          </div>

          <SubTitle>Xuất Excel</SubTitle>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-2">
            <Check>Nhấn nút <strong>Xuất Excel</strong> góc phải trên → tải file .xlsx về máy</Check>
            <Check>File bao gồm: tab tổng hợp + tab chi tiết từng ngày, có màu sắc và tổng cuối</Check>
          </div>

          <SubTitle>Tăng ca (Overtime)</SubTitle>
          <Callout type="info">
            Tăng ca được tính <strong>tự động</strong> khi nhân viên check-out muộn hơn giờ tan ca. Hệ số:
            <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
              <li>Ngày thường: <strong>×1.5</strong> lương giờ</li>
              <li>Cuối tuần (T7, CN): <strong>×2.0</strong> lương giờ</li>
            </ul>
            <p className="mt-1.5 text-xs text-blue-600">Lưu ý: cần nhập <strong>Lương cơ bản</strong> cho nhân viên thì mới tính được tiền tăng ca.</p>
          </Callout>

          <SubTitle>Bảng phạt & Thưởng</SubTitle>
          <p className="text-sm text-gray-600">Cấu hình tại <strong>Cài đặt → Bảng phạt / Bảng thưởng</strong>. Hệ thống tự áp dụng khi nhân viên chấm công.</p>
        </Section>

        {/* ── 6. Nghỉ phép ── */}
        <Section id="leave" Icon={Umbrella} title="Nghỉ phép">
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

        {/* ── 7. Ngày lễ ── */}
        <Section id="holidays" Icon={CalendarDays} title="Lịch nghỉ lễ">
          <p className="text-sm text-gray-600">Thiết lập ngày lễ để ngày đó không bị tính là ngày vắng trong báo cáo.</p>

          <SubTitle>Nhập ngày lễ quốc gia Việt Nam</SubTitle>
          <div className="space-y-3">
            <Step num={1} title="Vào Cài đặt → Tab 'Ngày lễ'" desc="Chọn năm cần nhập (VD: 2025)." />
            <Step num={2} title="Nhấn 'Nhập lễ VN 2025'" desc="Hệ thống tự thêm: Tết Nguyên Đán, 30/4, 1/5, 2/9, Giỗ Tổ Hùng Vương." />
            <Step num={3} title="Thêm ngày nghỉ riêng" desc="Nhấn '+ Thêm tự chọn' → nhập ngày và tên (VD: 'Kỷ niệm thành lập công ty')." />
          </div>
          <Callout type="tip">Nên nhập lịch lễ trước khi bắt đầu tháng mới để báo cáo tính chính xác từ đầu tháng.</Callout>

          <SubTitle>Ngày lễ có sẵn (2025)</SubTitle>
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
                  ["Tết Nguyên Đán", "28/01 – 03/02 (7 ngày)"],
                  ["Giỗ Tổ Hùng Vương", "07/04"],
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

        {/* ── 8. Telegram ── */}
        <Section id="telegram" Icon={MessageSquare} title="Thông báo Telegram">
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

        {/* ── 9. Lương tháng 13 ── */}
        <Section id="salary13" Icon={Gift} title="Lương tháng 13">
          <p className="text-sm text-gray-600">Hệ thống tự tính lương tháng 13 theo từng nhân viên dựa trên lương cơ bản và số tháng đã làm trong năm.</p>

          <SubTitle>Công thức tóm tắt</SubTitle>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center font-mono text-sm text-blue-800">
            Lương tháng 13 = Lương CB × (Số tháng làm đủ ÷ 12)
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3 text-sm text-center">
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="flex justify-center mb-2">
                <Users size={28} strokeWidth={1.5} className="text-blue-400" />
              </div>
              <p className="font-semibold text-gray-700 text-xs">Đủ 12 tháng</p>
              <p className="text-green-600 font-bold mt-1 text-xs">= 1 tháng lương</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="flex justify-center mb-2">
                <Users size={28} strokeWidth={1.5} className="text-purple-400" />
              </div>
              <p className="font-semibold text-gray-700 text-xs">Mới 6 tháng</p>
              <p className="text-blue-600 font-bold mt-1 text-xs">= 0.5 tháng lương</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <div className="flex justify-center mb-2">
                <CalendarDays size={28} strokeWidth={1.5} className="text-gray-300" />
              </div>
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

        {/* Footer */}
        <div className="border-t border-gray-100 pt-8 mt-4 text-center">
          <p className="text-sm text-gray-400">Cần hỗ trợ thêm? Liên hệ với người cung cấp tài khoản để được giúp đỡ.</p>
        </div>

      </main>
    </div>
  );
}
