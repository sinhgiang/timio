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
  UserX,
  Calculator,
  EyeOff,
  Banknote,
  MonitorX,
  Layers,
  Quote,
  ChevronRight,
  MapPin,
  VolumeX,
} from "lucide-react";

/* ── Custom SVG icon backgrounds — replaces emoji ─────────────────── */
function PainIcon({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
  const map: Record<string, string> = {
    red: "from-red-50 to-rose-100 border-red-200 text-red-600",
    orange: "from-orange-50 to-amber-100 border-amber-200 text-orange-600",
    purple: "from-purple-50 to-violet-100 border-purple-200 text-purple-600",
    blue: "from-blue-50 to-indigo-100 border-blue-200 text-blue-600",
    pink: "from-pink-50 to-rose-100 border-pink-200 text-pink-600",
    slate: "from-slate-50 to-gray-100 border-slate-200 text-slate-600",
  };
  return (
    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center mb-4 shadow-sm ${map[color]}`}>
      <Icon className="w-7 h-7" />
    </div>
  );
}

function SolIcon({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
  const map: Record<string, string> = {
    blue: "from-blue-500 to-blue-600 shadow-blue-200",
    green: "from-green-500 to-emerald-600 shadow-green-200",
    purple: "from-purple-500 to-violet-600 shadow-purple-200",
  };
  return (
    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 shadow-lg ${map[color]}`}>
      <Icon className="w-7 h-7 text-white" />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <Clock size={16} className="text-white" />
            </div>
            <span className="font-extrabold text-gray-900 text-lg tracking-tight">Timio</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#pain" className="hover:text-blue-600 transition-colors">Vấn đề</a>
            <a href="#features" className="hover:text-blue-600 transition-colors">Tính năng</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Bảng giá</a>
            <a href="#demo" className="hover:text-blue-600 transition-colors">Demo</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors px-3 py-2">
              Đăng nhập
            </Link>
            <Link href="/login" className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              Dùng thử miễn phí
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white pt-20 pb-28 px-4 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.35),transparent_60%)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-400/30 rounded-full px-4 py-1.5 text-red-300 text-sm font-semibold mb-6">
                <AlertTriangle size={13} />
                Nhân viên đang lấy tiền của bạn — mỗi ngày
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-5">
                Bạn trả lương đầy đủ —{" "}
                <span className="text-blue-400">nhưng họ có làm đủ giờ không?</span>
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed mb-4">
                Trung bình mỗi nhân viên đi muộn <strong className="text-white">23 phút/ngày</strong> mà chủ doanh nghiệp không biết. Với 10 nhân viên, bạn đang lãng phí <strong className="text-yellow-300">hơn 18 triệu đồng/năm</strong> tiền lương cho những giờ không ai làm việc.
              </p>
              <p className="text-slate-400 leading-relaxed mb-8">
                Timio chấm công bằng nhận diện khuôn mặt AI — không thể gian lận, không cần tin tưởng mù quáng.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-6 py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-blue-900/40">
                  Bắt đầu miễn phí
                  <ArrowRight size={18} />
                </Link>
                <a href="#demo" className="inline-flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-200 font-semibold px-6 py-3.5 rounded-xl transition-colors text-base">
                  <Eye size={18} />
                  Xem demo live
                </a>
              </div>
              <p className="text-slate-500 text-sm mt-4">Không cần thẻ tín dụng · Cài đặt xong trong 10 phút · Miễn phí mãi mãi cho ≤ 5 nhân viên</p>
            </div>

            {/* Dashboard Mockup */}
            <div className="hidden md:block">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-slate-500 text-xs">timio.app/dashboard — Hôm nay</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Đúng giờ", value: "16", color: "text-green-400" },
                    { label: "Đi muộn", value: "3", color: "text-red-400" },
                    { label: "Vắng mặt", value: "1", color: "text-yellow-400" },
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
                    { name: "Trần Thị Lan", time: "08:47", status: "Muộn 47 phút", ok: false },
                    { name: "Lê Văn Hùng", time: "07:58", status: "Đúng giờ", ok: true },
                    { name: "Phạm Thu Hà", time: "09:12", status: "Muộn 72 phút", ok: false },
                  ].map((r) => (
                    <div key={r.name} className="flex items-center justify-between py-1 px-2 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-xs text-blue-300 font-bold">
                          {r.name[0]}
                        </div>
                        <span className="text-slate-300 text-xs">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">{r.time}</span>
                        <span className={`text-xs font-semibold ${r.ok ? "text-green-400" : "text-red-400"}`}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 bg-red-900/30 border border-red-800/40 rounded-lg p-2.5 flex items-center gap-2">
                  <Bell size={13} className="text-red-400 shrink-0" />
                  <span className="text-red-300 text-xs">🔴 Phạm Thu Hà muộn 72 phút — Telegram đã gửi đến bạn</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIỀN RÒ RỈ ── */}
      <section className="py-16 px-4 bg-gradient-to-r from-red-900 to-rose-900 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-red-300 text-sm font-semibold uppercase tracking-widest mb-3">Bạn có biết?</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Tiền đang rò rỉ mỗi ngày — âm thầm, không ai nói</h2>
            <p className="text-red-200 text-base max-w-2xl mx-auto">Không cần nhân viên tham nhũng. Chỉ cần họ đến muộn 20 phút mỗi ngày là đủ.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                scenario: "Công ty 10 nhân viên",
                calc: "Đi muộn TB 25 phút/ngày × 10 người × 260 ngày",
                loss: "~21.700.000đ/năm",
                note: "Tiền lương trả cho giờ không làm việc",
              },
              {
                scenario: "Công ty 30 nhân viên",
                calc: "2 người ký hộ mỗi tháng × lương 8 triệu",
                loss: "~16.000.000đ/năm",
                note: "Chấm công giả, không bao giờ phát hiện",
              },
              {
                scenario: "Kế toán tính lương thủ công",
                calc: "3 ngày/tháng × lương kế toán 12 triệu",
                loss: "~14.400.000đ/năm",
                note: "Chỉ riêng chi phí nhân công tính lương",
              },
            ].map((item) => (
              <div key={item.scenario} className="bg-white/10 border border-white/20 rounded-2xl p-5 backdrop-blur-sm">
                <div className="text-red-200 text-xs font-semibold uppercase tracking-wide mb-3">{item.scenario}</div>
                <div className="text-white/70 text-xs mb-2 leading-relaxed">{item.calc}</div>
                <div className="text-3xl font-extrabold text-yellow-300 mb-1">{item.loss}</div>
                <div className="text-red-300 text-xs">{item.note}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-red-300 text-sm mt-6">Cộng 3 khoản trên: doanh nghiệp 30 người có thể mất <strong className="text-white">52 triệu đồng/năm</strong> vì không kiểm soát được chấm công.</p>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section id="pain" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
              <AlertTriangle size={14} />
              Những vấn đề đang xảy ra hàng ngày
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Bạn có đang mắc phải những điều này không?
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Hầu hết chủ doanh nghiệp Việt Nam đang chịu đựng những vấn đề này mỗi ngày — và đã quen đến mức không còn thấy chúng là vấn đề nữa.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: UserX,
                color: "red",
                title: "Nhân viên ký hộ nhau — bạn không biết",
                desc: "Chấm công bằng sổ ký hoặc app điện thoại: 1 người đến sớm ký hộ cả nhóm là chuyện bình thường. Bạn trả lương đầy đủ cho những người chưa đến văn phòng.",
                stat: "74% chủ DN thừa nhận nghi ngờ nhưng không có bằng chứng",
              },
              {
                icon: Calculator,
                color: "orange",
                title: "Kế toán mất 2–3 ngày tính lương mỗi tháng",
                desc: "Excel lỗi công thức, dữ liệu không khớp giữa file chấm công và file lương. Nhân viên vẫn khiếu nại sai lương — và kế toán phải làm lại từ đầu.",
                stat: "Trung bình 3 ngày/tháng = 36 ngày/năm chỉ để tính lương",
              },
              {
                icon: EyeOff,
                color: "purple",
                title: "Đi công tác, họp ngoài — mọi thứ mất kiểm soát",
                desc: "Không có ai trông, nhân viên tự quyết định giờ đến. Bạn chỉ biết ai vắng khi quay về văn phòng — lúc đó đã quá muộn để xử lý.",
                stat: "Chủ DN đi công tác trung bình 8 ngày/tháng = 8 ngày mù quáng",
              },
              {
                icon: Layers,
                color: "blue",
                title: "Nhiều chi nhánh, mỗi nơi một bảng Excel",
                desc: "Cuối tháng tổng hợp từ 3–5 file Excel từ các chi nhánh: sai định dạng, thiếu cột, khác công thức. Mất hàng giờ chỉ để ghép số liệu lại.",
                stat: "Doanh nghiệp 3 chi nhánh mất gần 1 tuần để tổng hợp báo cáo tháng",
              },
              {
                icon: Banknote,
                color: "pink",
                title: "Nhân viên khiếu nại lương — không có gì để đối chiếu",
                desc: "Họ nói thiếu lương, bạn nói đủ. Không có log chấm công rõ ràng, không ai đúng hoàn toàn. Tranh cãi kéo dài, mất lòng tin lẫn nhau.",
                stat: "Tranh chấp lương là lý do #2 khiến nhân viên nghỉ việc",
              },
              {
                icon: MonitorX,
                color: "slate",
                title: "Mua phần mềm về rồi... bỏ xó",
                desc: "Phần mềm HR cũ phức tạp, chỉ IT mới biết dùng. Sau 2 tháng toàn bộ quay lại Excel như cũ. Tiền đầu tư mất, vấn đề vẫn còn nguyên.",
                stat: "60% doanh nghiệp VN mua phần mềm HR nhưng dùng dưới 30% tính năng",
              },
            ].map((pain) => (
              <div key={pain.title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-gray-200 transition-all group">
                <PainIcon icon={pain.icon} color={pain.color} />
                <h3 className="font-bold text-gray-900 text-base mb-2 leading-snug">{pain.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-3">{pain.desc}</p>
                <div className="bg-gray-50 rounded-lg px-3 py-2 border-l-2 border-gray-300">
                  <p className="text-gray-600 text-xs italic">{pain.stat}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Callout — nỗi đau đặc biệt */}
          <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
              <VolumeX className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-base mb-1">
                Và nỗi đau thầm lặng nhất: <span className="text-orange-600">biết nhân viên đi muộn — nhưng không dám nói</span>
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Nói thẳng sợ mất lòng, sợ nhân viên nghỉ việc. Thế là cứ nhìn vào mà im lặng, tháng này qua tháng khác.
                Với Timio, <strong className="text-gray-800">bạn không cần làm người xấu</strong> — hệ thống tự ghi nhận, nhân viên tự thấy mình đi muộn và không thể cãi. Quy tắc là quy tắc, không phải sếp cố tình khắt khe.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── TRANSITION BANNER ── */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-800 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-white text-xl sm:text-2xl font-bold leading-relaxed mb-2">
            Những vấn đề trên không phải lỗi của nhân viên — mà là lỗi của <span className="text-yellow-300">hệ thống chưa đủ minh bạch.</span>
          </p>
          <p className="text-blue-100 text-lg">Timio tạo ra hệ thống minh bạch đó — tự động, không cần ai làm thêm việc.</p>
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
                color: "blue",
                title: "Chấm công khuôn mặt AI",
                desc: "Kiosk nhận diện khuôn mặt đặt tại lối vào. Không thể ký hộ, không thể gian lận — mỗi check-in đều có timestamp và ảnh chụp thực tế.",
                points: ["Nhận diện AI chính xác > 99%", "Hoạt động trên bất kỳ điện thoại nào", "Cảnh báo tức thì khi đến muộn"],
              },
              {
                icon: FileSpreadsheet,
                color: "green",
                title: "Tính lương tự động",
                desc: "Hệ thống tự tổng hợp công, tính phạt đi muộn, tính thưởng KPI theo quy tắc bạn đặt ra. Kế toán chỉ cần 1 click xuất Excel — không cần làm thủ công.",
                points: ["Quy tắc phạt/thưởng linh hoạt", "Xuất Excel chi tiết 1 click", "Minh bạch — nhân viên tự tra cứu"],
              },
              {
                icon: TrendingUp,
                color: "purple",
                title: "Kiểm soát real-time từ xa",
                desc: "Dashboard xem được từ điện thoại của bạn — dù đang đi công tác hay nghỉ cuối tuần. Cảnh báo Telegram ngay khi có nhân viên đến muộn hoặc vắng mặt.",
                points: ["Dashboard live trên điện thoại", "Telegram alert tức thì", "Báo cáo đa chi nhánh tổng hợp"],
              },
            ].map((sol) => (
              <div key={sol.title} className="border border-gray-100 rounded-2xl p-7 hover:shadow-xl transition-shadow">
                <SolIcon icon={sol.icon} color={sol.color} />
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
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Bắt đầu chỉ trong 3 bước</h2>
            <p className="text-gray-500 text-lg">Không cần IT, không cần đào tạo dài. Cài xong là dùng được ngay.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: Building2,
                title: "Tạo tài khoản & công ty",
                desc: "Đăng ký, nhập tên công ty, thiết lập giờ làm việc và quy tắc chấm công theo yêu cầu.",
                time: "3 phút",
              },
              {
                step: "02",
                icon: Users,
                title: "Thêm nhân viên",
                desc: "Nhập danh sách nhân viên, chụp khuôn mặt bằng camera điện thoại. Hệ thống tự đăng ký AI.",
                time: "5 phút",
              },
              {
                step: "03",
                icon: Smartphone,
                title: "Bật kiosk & dùng ngay",
                desc: "Mở trình duyệt trên tablet cũ đặt ở lối vào, vào link kiosk — nhân viên bắt đầu chấm công.",
                time: "1 phút",
              },
            ].map((s) => (
              <div key={s.step} className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-extrabold flex items-center justify-center shadow-lg">
                  {s.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mx-auto mt-4 mb-4 border border-blue-200">
                  <s.icon size={22} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm mb-3 leading-relaxed">{s.desc}</p>
                <span className="inline-flex items-center gap-1 text-blue-600 text-xs font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  <Clock size={11} />
                  {s.time}
                </span>
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
              <div className="inline-flex items-center gap-1.5 text-blue-600 text-xs font-bold uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 mb-4">
                <Smartphone size={12} /> Kiosk PWA
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                Điện thoại cũ cũng làm được kiosk chấm công
              </h3>
              <p className="text-gray-500 leading-relaxed mb-5">
                Chỉ cần 1 chiếc điện thoại hoặc tablet đặt tại lối vào. Mở trình duyệt, vào link kiosk — nhân viên tự check-in bằng khuôn mặt. <strong className="text-gray-700">Không cần mua máy chấm công, không cần lắp đặt phần cứng.</strong>
              </p>
              <ul className="space-y-3">
                {[
                  "Hoạt động trên mọi điện thoại/tablet có camera",
                  "Tự nhận diện, không cần chạm tay — vệ sinh hơn",
                  "Thông báo giọng nói tiếng Việt sau check-in",
                  "Một link kiosk cho mỗi chi nhánh — quản lý riêng",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <div className="w-56 bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-gray-800">
                <div className="bg-blue-950 rounded-[2rem] overflow-hidden p-4 flex flex-col items-center justify-center gap-3" style={{ minHeight: 380 }}>
                  <div className="w-24 h-24 rounded-full border-2 border-blue-400 flex items-center justify-center relative">
                    <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center">
                      <Users size={28} className="text-blue-300" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 text-sm font-bold">Nhận diện thành công</div>
                    <div className="text-slate-300 text-base font-semibold mt-1">Nguyễn Minh Tuấn</div>
                    <div className="text-blue-400 text-xs mt-0.5">Check-in 08:02 · Đúng giờ</div>
                  </div>
                  <div className="w-full bg-blue-900/40 rounded-xl p-2.5 text-center border border-blue-700/30">
                    <div className="text-white/60 text-xs">Văn phòng Hà Nội</div>
                  </div>
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
                  <div className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <FileSpreadsheet size={11} /> Xuất Excel
                  </div>
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
                        <td className={`py-2 text-center ${r.fine > 0 ? "text-red-500 font-medium" : "text-gray-400"}`}>
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
              <div className="inline-flex items-center gap-1.5 text-green-600 text-xs font-bold uppercase tracking-wider bg-green-50 px-3 py-1.5 rounded-full border border-green-200 mb-4">
                <BarChart3 size={12} /> Báo cáo & Tính lương
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                Cuối tháng xuất lương trong 30 giây — không phải 3 ngày
              </h3>
              <p className="text-gray-500 leading-relaxed mb-5">
                Hệ thống tự tính công dựa trên dữ liệu check-in thực tế. Không cần kế toán ngồi đối soát thủ công. Không còn tranh cãi vì lương — mọi thứ có log rõ ràng.
              </p>
              <ul className="space-y-3">
                {[
                  "Tự động tổng hợp công theo tháng, quý",
                  "Quy tắc phạt/thưởng linh hoạt — tùy chỉnh theo công ty",
                  "Báo cáo chi tiết từng nhân viên, từng ngày",
                  "So sánh hiệu suất giữa các chi nhánh",
                ].map((t) => (
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
              <div className="inline-flex items-center gap-1.5 text-blue-500 text-xs font-bold uppercase tracking-wider bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 mb-4">
                <Bell size={12} /> Cảnh báo thời gian thực
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
                Biết ngay khi nhân viên đến muộn — dù bạn đang ở đâu
              </h3>
              <p className="text-gray-500 leading-relaxed mb-5">
                Timio gửi thông báo Telegram tức thì đến điện thoại của bạn. Đang đi công tác ở Đà Nẵng vẫn biết nhân viên ở Hà Nội vắng mặt không phép.
              </p>
              <ul className="space-y-3">
                {[
                  "Cảnh báo Telegram ngay lập tức — không trễ",
                  "Xem chi tiết lý do và lịch sử qua dashboard",
                  "Nhận báo cáo tổng hợp đầu tuần tự động",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <div className="w-72 bg-gray-100 rounded-2xl overflow-hidden shadow-xl border border-gray-200">
                <div className="bg-blue-500 text-white px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Timio Bot</div>
                    <div className="text-blue-100 text-xs">● online</div>
                  </div>
                </div>
                <div className="p-3 space-y-2 bg-white min-h-[180px]">
                  {[
                    { msg: "🔴 Trần Thị Lan đến muộn 47 phút\n📍 Văn phòng HN · 08:47", time: "08:47", alert: true },
                    { msg: "✅ 18/20 nhân viên đã check-in\n📊 Tỷ lệ đúng giờ hôm nay: 90%", time: "09:00", alert: false },
                    { msg: "⚠️ Phạm Thu Hà vắng mặt không phép\n📍 Chi nhánh Sài Gòn", time: "09:15", alert: true },
                  ].map((m, i) => (
                    <div key={i} className={`rounded-xl px-3 py-2 max-w-[90%] ${m.alert ? "bg-red-50 border border-red-100" : "bg-blue-50 border border-blue-100"}`}>
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
            <p className="text-gray-500 text-lg">Sự khác biệt rõ ràng ngay từ tuần đầu tiên.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
              <div className="p-4 text-sm font-semibold text-gray-600">Tiêu chí</div>
              <div className="p-4 text-sm font-semibold text-gray-400 text-center border-l border-gray-200">❌ Cách cũ</div>
              <div className="p-4 text-sm font-bold text-blue-700 text-center border-l border-gray-200 bg-blue-50">✅ Timio</div>
            </div>
            {[
              { criteria: "Chấm công", old: "Ký tay — dễ ký hộ, gian lận", timio: "Nhận diện khuôn mặt AI, không thể gian lận" },
              { criteria: "Tính lương", old: "Kế toán mất 2–3 ngày/tháng", timio: "Tự động, kế toán chỉ cần 30 giây" },
              { criteria: "Kiểm soát từ xa", old: "Không thể — chỉ biết khi về VP", timio: "Real-time từ bất kỳ đâu, Telegram alert" },
              { criteria: "Nhiều chi nhánh", old: "Mỗi nơi 1 file, tổng hợp thủ công", timio: "1 dashboard tổng hợp tất cả" },
              { criteria: "Tranh chấp lương", old: "Không có bằng chứng để đối chiếu", timio: "Log đầy đủ từng giây, minh bạch 100%" },
              { criteria: "Chi phí setup", old: "Hàng chục triệu + đào tạo kéo dài", timio: "Miễn phí, cài xong trong 10 phút" },
              { criteria: "Nhân viên dùng được không", old: "Chỉ IT mới hiểu, sau 2 tháng bỏ", timio: "Ai cũng dùng được — chỉ nhìn vào camera" },
            ].map((r, i) => (
              <div key={r.criteria} className={`grid grid-cols-3 border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                <div className="p-4 text-sm font-semibold text-gray-800">{r.criteria}</div>
                <div className="p-4 text-xs text-gray-500 text-center border-l border-gray-100 flex items-start justify-center gap-1.5 leading-relaxed">
                  <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                  {r.old}
                </div>
                <div className="p-4 text-xs text-blue-700 font-medium text-center border-l border-gray-100 bg-blue-50/40 flex items-start justify-center gap-1.5 leading-relaxed">
                  <CheckCircle2 size={13} className="text-green-500 shrink-0 mt-0.5" />
                  {r.timio}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Chủ doanh nghiệp nói gì về Timio?</h2>
            <p className="text-gray-500 text-lg">Từ nhà hàng đến văn phòng — ai cũng giải quyết được vấn đề chấm công.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                quote: "Trước đây tôi mất 3 ngày cuối tháng để tổng hợp công và tính lương cho 25 nhân viên. Giờ chỉ cần 30 phút, bao gồm cả kiểm tra lại. Tiết kiệm được hẳn 2.5 ngày làm việc mỗi tháng.",
                name: "Anh Hoàng Minh",
                title: "Giám đốc chuỗi nhà hàng",
                location: "TP. Hồ Chí Minh",
                avatar: "HM",
              },
              {
                quote: "Sau khi dùng Timio, tôi phát hiện 3 nhân viên đi muộn trung bình 45 phút mỗi ngày trong 3 tháng. Tôi không biết vì họ ký hộ nhau. Bây giờ toàn bộ công ty đến đúng giờ hơn hẳn.",
                name: "Chị Lan Phương",
                title: "Chủ spa & thẩm mỹ viện",
                location: "Hà Nội",
                avatar: "LP",
              },
              {
                quote: "Có 4 chi nhánh mà trước đây tổng hợp báo cáo cuối tháng là ác mộng. Giờ tôi chỉ cần mở điện thoại là xem được tất cả, từ bất kỳ đâu. Quản lý từ xa không còn là vấn đề nữa.",
                name: "Anh Đức Thành",
                title: "CEO công ty dịch vụ",
                location: "Đà Nẵng",
                avatar: "ĐT",
              },
            ].map((t) => (
              <div key={t.name} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow relative">
                <Quote className="w-8 h-8 text-blue-200 absolute top-5 right-5" />
                <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.title}</div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                      <MapPin size={10} />
                      {t.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-800 py-14 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "500+", label: "Doanh nghiệp tin dùng", sub: "trên toàn Việt Nam" },
            { value: "5.000+", label: "Nhân viên đang chấm công", sub: "mỗi ngày với Timio" },
            { value: "99.9%", label: "Uptime đảm bảo", sub: "không gián đoạn" },
            { value: "10 phút", label: "Thời gian cài đặt", sub: "từ đăng ký đến chạy được" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mb-1">{s.value}</div>
              <div className="text-blue-100 text-sm font-semibold">{s.label}</div>
              <div className="text-blue-300 text-xs mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Bảng giá đơn giản, không bất ngờ</h2>
            <p className="text-gray-500 text-lg">Bắt đầu miễn phí, nâng cấp khi sẵn sàng. Huỷ bất cứ lúc nào.</p>
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
              <p className="text-gray-500 text-sm mb-3">Dành cho doanh nghiệp đang phát triển</p>
              <div className="mb-1">
                <span className="text-4xl font-extrabold text-gray-900">299.000đ</span>
                <span className="text-gray-500 text-sm">/tháng</span>
              </div>
              <div className="text-sm text-green-600 font-semibold mb-5">✨ Thành viên mới: chỉ 150.000đ/tháng trong 2 tháng đầu</div>
              <ul className="space-y-3 mb-8">
                {[
                  "Không giới hạn chi nhánh",
                  "Không giới hạn nhân viên",
                  "Kiosk nhận diện khuôn mặt AI",
                  "Cảnh báo Telegram tức thì",
                  "Báo cáo đầy đủ + so sánh chi nhánh",
                  "Quản lý nghỉ phép & lương tháng 13",
                  "Hỗ trợ ưu tiên",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/billing" className="block text-center bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm">
                Nâng cấp lên Pro — 299.000đ/tháng
              </Link>
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">Không cần thẻ tín dụng · Huỷ bất cứ lúc nào · Hỗ trợ tiếng Việt 100%</p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.05),transparent_70%)]" />
        <div className="max-w-3xl mx-auto relative">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-blue-200 text-sm font-medium mb-6">
            <Zap size={13} />
            Bắt đầu kiểm soát ngay hôm nay
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-5 leading-tight">
            Dừng trả tiền cho những giờ nhân viên không làm việc
          </h2>
          <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">
            Hàng trăm chủ doanh nghiệp đã lấy lại quyền kiểm soát và tiết kiệm hàng chục triệu mỗi năm. Chỉ mất 10 phút để bắt đầu.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-lg px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-xl">
            Bắt đầu miễn phí ngay
            <ArrowRight size={20} />
          </Link>
          <p className="text-blue-300 text-sm mt-4">Cài đặt xong trong 10 phút · Không cần thẻ tín dụng · Miễn phí mãi mãi cho ≤ 5 nhân viên</p>
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
