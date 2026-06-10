import Link from "next/link";
import {
  Clock,
  Users,
  BarChart3,
  Shield,
  Smartphone,
  Bell,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Building2,
  Zap,
  Eye,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Clock size={17} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">Timio</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Tính năng</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Bảng giá</a>
            <a href="#demo" className="hover:text-blue-600 transition-colors">Demo</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors px-3 py-2">
              Đăng nhập
            </Link>
            <Link href="/login" className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Dùng thử miễn phí
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white pt-20 pb-28 px-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.3),transparent_60%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 text-blue-300 text-sm font-medium mb-6">
                <Zap size={14} />
                Phần mềm chấm công thông minh #1 Việt Nam
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
                Nhân viên đến muộn, về sớm —{" "}
                <span className="text-blue-400">bạn có biết không?</span>
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed mb-8">
                Timio giúp chủ doanh nghiệp kiểm soát chấm công thực tế bằng nhận diện khuôn mặt AI, tính lương tự động — không cần Excel, không cần tin tưởng mù quáng.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-6 py-3.5 rounded-xl transition-colors text-base">
                  Dùng thử 14 ngày miễn phí
                  <ArrowRight size={18} />
                </Link>
                <a href="#demo" className="inline-flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-200 font-semibold px-6 py-3.5 rounded-xl transition-colors text-base">
                  <Eye size={18} />
                  Xem demo live
                </a>
              </div>
              <p className="text-slate-500 text-sm mt-4">Không cần thẻ tín dụng · Cài đặt trong 5 phút</p>
            </div>

            {/* Right — Dashboard Mockup */}
            <div className="hidden md:block">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-slate-500 text-xs">timio.app/dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Có mặt hôm nay", value: "18/20", color: "text-green-400" },
                    { label: "Đi muộn", value: "2", color: "text-red-400" },
                    { label: "Vắng mặt", value: "0", color: "text-slate-300" },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-700/50 rounded-lg p-2.5">
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-700/30 rounded-lg p-2 space-y-1.5">
                  {[
                    { name: "Nguyễn Minh Tuấn", time: "08:02", status: "Đúng giờ", ok: true },
                    { name: "Trần Thị Lan", time: "08:45", status: "Đi muộn 45p", ok: false },
                    { name: "Lê Văn Hùng", time: "07:58", status: "Đúng giờ", ok: true },
                    { name: "Phạm Thu Hà", time: "08:01", status: "Đúng giờ", ok: true },
                  ].map((r) => (
                    <div key={r.name} className="flex items-center justify-between py-1 px-2 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-xs text-blue-300">
                          {r.name[0]}
                        </div>
                        <span className="text-slate-300 text-xs">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">{r.time}</span>
                        <span className={`text-xs font-medium ${r.ok ? "text-green-400" : "text-red-400"}`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 bg-red-900/30 border border-red-800/40 rounded-lg p-2.5 flex items-center gap-2">
                  <Bell size={14} className="text-red-400" />
                  <span className="text-red-300 text-xs">Trần Thị Lan đến muộn 45 phút — đã gửi Telegram cho quản lý</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              <AlertTriangle size={14} />
              Những vấn đề đang xảy ra hàng ngày
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Bạn có đang gặp những vấn đề này?
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Hầu hết chủ doanh nghiệp Việt Nam đang lãng phí tiền bạc và thời gian vì những vấn đề này — mà không biết.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "🕐",
                title: "Không biết nhân viên đến đúng giờ không",
                desc: "Chấm công bằng giấy hoặc app điểm danh dễ nhờ người ký hộ. Bạn trả lương đầy đủ nhưng thực tế nhân viên đến muộn 30–60 phút mỗi ngày.",
              },
              {
                icon: "📊",
                title: "Kế toán tính lương sai, làm đi làm lại",
                desc: "Excel lỗi công thức, dữ liệu không khớp nhau. Cuối tháng kế toán mất 2–3 ngày để đối soát công, nhân viên vẫn khiếu nại lương sai.",
              },
              {
                icon: "👀",
                title: "Sếp không kiểm soát được khi vắng mặt",
                desc: "Đi công tác hay họp ngoài không biết hôm nay ai vắng, ai đến muộn. Mọi thứ chỉ biết khi quay lại văn phòng — đã quá muộn.",
              },
              {
                icon: "🏢",
                title: "Nhiều chi nhánh, quản lý rời rạc",
                desc: "Mỗi chi nhánh một bảng Excel riêng, cuối tháng phải tổng hợp thủ công. Sai sót xảy ra liên tục, mất hàng giờ để kiểm tra chéo.",
              },
              {
                icon: "💸",
                title: "Trả lương nhầm, không có bằng chứng",
                desc: "Nhân viên khiếu nại lương thiếu nhưng không có dữ liệu chấm công minh bạch để đối chiếu. Tranh cãi kéo dài, mất lòng tin.",
              },
              {
                icon: "🤯",
                title: "Phần mềm cũ quá phức tạp, không ai dùng",
                desc: "Mua phần mềm hàng chục triệu về nhưng chỉ có IT mới biết dùng. Sau 1 tháng toàn bộ quay lại Excel. Tiền mất, vấn đề vẫn còn.",
              },
            ].map((pain) => (
              <div key={pain.title} className="bg-white border border-red-100 rounded-xl p-6 hover:shadow-md hover:border-red-200 transition-all">
                <div className="text-3xl mb-3">{pain.icon}</div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{pain.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{pain.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRANSITION BANNER ── */}
      <section className="bg-blue-700 py-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-white text-xl sm:text-2xl font-bold leading-relaxed">
            Hơn <span className="text-yellow-300">500 doanh nghiệp</span> Việt Nam đã ngừng đoán mò —
          </p>
          <p className="text-blue-100 text-xl sm:text-2xl font-bold">họ kiểm soát chấm công bằng Timio.</p>
        </div>
      </section>

      {/* ── SOLUTION ── */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Timio giải quyết tất cả trong 1 nền tảng
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Từ chấm công đến tính lương, từ 1 chi nhánh đến nhiều văn phòng — Timio xử lý tất cả tự động.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                color: "bg-blue-100 text-blue-600",
                title: "Chấm công khuôn mặt AI",
                desc: "Kiosk đặt tại văn phòng nhận diện khuôn mặt chính xác. Không thể ký hộ, không thể gian lận. Mỗi lần check-in được log với timestamp chính xác.",
                points: ["Nhận diện AI chính xác > 99%", "Hoạt động offline", "Cảnh báo tức thì khi đến muộn"],
              },
              {
                icon: FileSpreadsheet,
                color: "bg-green-100 text-green-600",
                title: "Tính lương tự động",
                desc: "Hệ thống tự tính công, trừ phạt đi muộn, tính thưởng — theo quy tắc bạn thiết lập. Cuối tháng xuất Excel 1 click, không cần kế toán làm thủ công.",
                points: ["Công thức linh hoạt", "Xuất Excel chi tiết", "Minh bạch với nhân viên"],
              },
              {
                icon: TrendingUp,
                color: "bg-purple-100 text-purple-600",
                title: "Quản lý real-time",
                desc: "Dashboard xem từ bất kỳ đâu. Cảnh báo Telegram ngay khi nhân viên đến muộn hoặc vắng mặt. Báo cáo tháng đầy đủ theo chi nhánh.",
                points: ["Dashboard live trên điện thoại", "Telegram alert tức thì", "Báo cáo đa chi nhánh"],
              },
            ].map((sol) => (
              <div key={sol.title} className="border border-gray-100 rounded-2xl p-7 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${sol.color} flex items-center justify-center mb-5`}>
                  <sol.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{sol.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{sol.desc}</p>
                <ul className="space-y-2">
                  {sol.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Bắt đầu chỉ trong 3 bước
            </h2>
            <p className="text-gray-500 text-lg">Không cần IT, không cần đào tạo dài. Cài xong là dùng được ngay.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: Building2,
                title: "Tạo tài khoản & công ty",
                desc: "Đăng ký, nhập tên công ty, thiết lập giờ làm việc và quy tắc chấm công.",
                time: "⏱ 5 phút",
              },
              {
                step: "02",
                icon: Users,
                title: "Thêm nhân viên",
                desc: "Nhập danh sách nhân viên, chụp khuôn mặt bằng camera. Hệ thống tự đăng ký AI.",
                time: "⏱ 10 phút",
              },
              {
                step: "03",
                icon: Smartphone,
                title: "Bật kiosk & dùng ngay",
                desc: "Mở trình duyệt trên tablet/điện thoại, vào link kiosk — nhân viên bắt đầu chấm công.",
                time: "⏱ 1 phút",
              },
            ].map((s) => (
              <div key={s.step} className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <s.icon size={22} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm mb-3 leading-relaxed">{s.desc}</p>
                <span className="text-blue-600 text-xs font-semibold bg-blue-50 px-2.5 py-1 rounded-full">{s.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE DEEP-DIVE ── */}
      <section id="demo" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto space-y-24">

          {/* Row 1 — Kiosk */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-blue-600 text-sm font-semibold uppercase tracking-wide mb-3">Kiosk PWA</div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                Điện thoại cũ cũng làm được kiosk chấm công
              </h3>
              <p className="text-gray-500 leading-relaxed mb-5">
                Chỉ cần 1 chiếc điện thoại hoặc tablet đặt tại lối vào văn phòng. Mở trình duyệt, vào link kiosk — nhân viên tự check-in bằng khuôn mặt. Không cần phần cứng đặc biệt.
              </p>
              <ul className="space-y-3">
                {["Hoạt động trên mọi thiết bị có camera", "Tự động nhận diện, không cần chạm tay", "Thông báo giọng nói tiếng Việt sau check-in"].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            {/* Phone mockup */}
            <div className="flex justify-center">
              <div className="w-56 bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-gray-800">
                <div className="bg-blue-950 rounded-[2rem] overflow-hidden p-4 flex flex-col items-center justify-center gap-3" style={{ minHeight: 380 }}>
                  <div className="w-20 h-20 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-blue-600/30 border border-blue-400 flex items-center justify-center">
                      <Users size={28} className="text-blue-300" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-300 text-sm font-semibold">Đang nhận diện...</div>
                    <div className="text-blue-500 text-xs mt-1">Nhìn thẳng vào camera</div>
                  </div>
                  <div className="w-full bg-blue-900/50 rounded-xl p-2 text-center">
                    <div className="text-white text-sm font-bold">Nguyễn Minh Tuấn</div>
                    <div className="text-green-400 text-xs">✓ Check-in 08:02</div>
                  </div>
                  <div className="text-slate-600 text-xs">Văn phòng Hà Nội</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 — Dashboard */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Báo cáo tháng 6/2026</div>
                    <div className="text-gray-500 text-xs">Văn phòng chính · 20 nhân viên</div>
                  </div>
                  <div className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">Xuất Excel</div>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-gray-500 py-1.5 font-medium">Nhân viên</th>
                      <th className="text-center text-gray-500 py-1.5 font-medium">Công</th>
                      <th className="text-center text-gray-500 py-1.5 font-medium">Phạt</th>
                      <th className="text-right text-gray-500 py-1.5 font-medium">Lương</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Nguyễn M. Tuấn", work: 22, fine: 0, salary: "12.500.000" },
                      { name: "Trần Thị Lan", work: 20, fine: 150000, salary: "11.350.000" },
                      { name: "Lê Văn Hùng", work: 22, fine: 0, salary: "10.000.000" },
                      { name: "Phạm Thu Hà", work: 21, fine: 50000, salary: "9.950.000" },
                    ].map((r) => (
                      <tr key={r.name} className="border-b border-gray-100">
                        <td className="py-2 text-gray-800 font-medium">{r.name}</td>
                        <td className="py-2 text-center text-gray-600">{r.work}</td>
                        <td className={`py-2 text-center ${r.fine > 0 ? "text-red-500" : "text-gray-400"}`}>
                          {r.fine > 0 ? `-${r.fine.toLocaleString("vi-VN")}` : "—"}
                        </td>
                        <td className="py-2 text-right text-gray-900 font-semibold">{r.salary}đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-gray-500 text-xs">Tổng chi lương tháng 6</span>
                  <span className="text-blue-700 font-bold text-sm">43.800.000đ</span>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="text-green-600 text-sm font-semibold uppercase tracking-wide mb-3">Báo cáo & Tính lương</div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                Cuối tháng xuất lương trong 30 giây
              </h3>
              <p className="text-gray-500 leading-relaxed mb-5">
                Hệ thống tự tính công dựa trên dữ liệu check-in thực tế. Trừ phạt đi muộn, tính thưởng KPI theo quy tắc bạn đặt ra. Xuất Excel gửi cho kế toán là xong.
              </p>
              <ul className="space-y-3">
                {["Tự động tổng hợp công theo tháng", "Quy tắc phạt/thưởng linh hoạt", "Báo cáo chi tiết từng nhân viên", "So sánh giữa các chi nhánh"].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Row 3 — Telegram */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-blue-500 text-sm font-semibold uppercase tracking-wide mb-3">Cảnh báo thời gian thực</div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                Biết ngay khi nhân viên đến muộn — dù bạn đang ở đâu
              </h3>
              <p className="text-gray-500 leading-relaxed mb-5">
                Timio gửi thông báo Telegram tức thì đến điện thoại của bạn mỗi khi có nhân viên đến muộn hoặc vắng mặt không phép. Không cần ngồi văn phòng mới biết.
              </p>
              <ul className="space-y-3">
                {["Cảnh báo Telegram ngay lập tức", "Xem chi tiết lý do qua dashboard", "Lịch sử cảnh báo lưu đầy đủ"].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            {/* Telegram mockup */}
            <div className="flex justify-center">
              <div className="w-72 bg-gray-100 rounded-2xl overflow-hidden shadow-xl border border-gray-200">
                <div className="bg-blue-500 text-white px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Timio Bot</div>
                    <div className="text-blue-100 text-xs">online</div>
                  </div>
                </div>
                <div className="p-3 space-y-2 bg-white min-h-[180px]">
                  {[
                    { msg: "⚠️ Trần Thị Lan đến muộn 45 phút\n📍 Văn phòng HN · 08:45", time: "08:45", alert: true },
                    { msg: "✅ 18/20 nhân viên đã check-in\n📊 Tỷ lệ đúng giờ: 90%", time: "09:00", alert: false },
                    { msg: "🔴 Nguyễn Văn B vắng mặt không phép\n📍 Chi nhánh Sài Gòn", time: "09:15", alert: true },
                  ].map((m, i) => (
                    <div key={i} className={`rounded-xl px-3 py-2 max-w-[85%] ${m.alert ? "bg-red-50 border border-red-100" : "bg-blue-50 border border-blue-100"}`}>
                      <p className={`text-xs leading-relaxed whitespace-pre-line ${m.alert ? "text-red-700" : "text-blue-700"}`}>{m.msg}</p>
                      <p className="text-gray-400 text-[10px] mt-1 text-right">{m.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Cách cũ vs Timio</h2>
            <p className="text-gray-500 text-lg">Sự khác biệt rõ ràng sau tháng đầu tiên dùng thử.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
              <div className="p-4 text-sm font-semibold text-gray-600">Tiêu chí</div>
              <div className="p-4 text-sm font-semibold text-gray-500 text-center border-l border-gray-200">Cách cũ (Excel/giấy)</div>
              <div className="p-4 text-sm font-bold text-blue-700 text-center border-l border-gray-200 bg-blue-50">✅ Timio</div>
            </div>
            {[
              { criteria: "Chấm công", old: "Ký tay, dễ gian lận", timio: "Nhận diện khuôn mặt AI" },
              { criteria: "Tính lương", old: "Mất 2–3 ngày/tháng", timio: "Tự động, xuất 1 click" },
              { criteria: "Kiểm soát", old: "Chỉ khi ở văn phòng", timio: "Real-time từ bất kỳ đâu" },
              { criteria: "Nhiều chi nhánh", old: "Tổng hợp thủ công, sai nhiều", timio: "1 dashboard cho tất cả" },
              { criteria: "Chi phí setup", old: "Cao + đào tạo kéo dài", timio: "Thấp, dùng được trong 15 phút" },
              { criteria: "Minh bạch", old: "Không có dữ liệu rõ ràng", timio: "Log đầy đủ từng giây" },
            ].map((r, i) => (
              <div key={r.criteria} className={`grid grid-cols-3 border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                <div className="p-4 text-sm font-semibold text-gray-800">{r.criteria}</div>
                <div className="p-4 text-sm text-gray-500 text-center border-l border-gray-100 flex items-center justify-center gap-1.5">
                  <XCircle size={14} className="text-red-400 shrink-0" />
                  {r.old}
                </div>
                <div className="p-4 text-sm text-blue-700 font-medium text-center border-l border-gray-100 bg-blue-50/40 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  {r.timio}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-blue-700 py-14 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "500+", label: "Doanh nghiệp tin dùng" },
            { value: "5.000+", label: "Nhân viên đang dùng" },
            { value: "99.9%", label: "Uptime đảm bảo" },
            { value: "< 5 phút", label: "Thời gian cài đặt" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1">{s.value}</div>
              <div className="text-blue-200 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Bảng giá đơn giản, không bất ngờ</h2>
            <p className="text-gray-500 text-lg">Bắt đầu miễn phí, nâng cấp khi cần.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="border border-gray-200 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Miễn phí</h3>
              <p className="text-gray-500 text-sm mb-5">Thử nghiệm không giới hạn thời gian</p>
              <div className="text-4xl font-extrabold text-gray-900 mb-6">0đ</div>
              <ul className="space-y-3 mb-8">
                {["1 chi nhánh", "Tối đa 5 nhân viên", "Kiosk nhận diện khuôn mặt", "Báo cáo cơ bản", "Xuất Excel"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block text-center border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                Bắt đầu miễn phí
              </Link>
            </div>
            {/* Pro */}
            <div className="border-2 border-blue-600 rounded-2xl p-8 relative bg-blue-50/30">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                PHỔ BIẾN NHẤT
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Pro</h3>
              <p className="text-gray-500 text-sm mb-5">Dành cho doanh nghiệp đang phát triển</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">299.000đ</span>
                <span className="text-gray-500 text-sm">/tháng</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Không giới hạn chi nhánh",
                  "Không giới hạn nhân viên",
                  "Kiosk nhận diện khuôn mặt AI",
                  "Cảnh báo Telegram tức thì",
                  "Báo cáo đầy đủ + so sánh chi nhánh",
                  "Quản lý nghỉ phép & lương tháng 13",
                  "Hỗ trợ ưu tiên 24/7",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block text-center bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm">
                Dùng thử 14 ngày miễn phí
              </Link>
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">Giá chưa bao gồm VAT · Hủy bất cứ lúc nào · Không cần thẻ tín dụng</p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-5 leading-tight">
            Bắt đầu kiểm soát doanh nghiệp của bạn ngay hôm nay
          </h2>
          <p className="text-blue-200 text-lg mb-8">
            Hàng trăm chủ doanh nghiệp đã tiết kiệm hàng triệu đồng mỗi tháng nhờ chấm công minh bạch. Bạn có muốn là người tiếp theo không?
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-lg px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-xl">
            Dùng thử miễn phí — Không cần thẻ tín dụng
            <ArrowRight size={20} />
          </Link>
          <p className="text-blue-300 text-sm mt-4">Cài đặt xong trong 5 phút · Hỗ trợ tiếng Việt 100%</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Clock size={14} className="text-white" />
            </div>
            <span className="text-white font-bold">Timio</span>
            <span className="text-slate-600 text-sm ml-2">Phần mềm chấm công thông minh</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-white transition-colors">Tính năng</a>
            <a href="#pricing" className="hover:text-white transition-colors">Bảng giá</a>
            <Link href="/login" className="hover:text-white transition-colors">Đăng nhập</Link>
          </div>
          <p className="text-slate-600 text-sm">© 2026 Timio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
