import Link from "next/link";
import { Clock, TrendingUp, Users, DollarSign, CheckCircle, ChevronRight, Star, Zap, Shield } from "lucide-react";

const TIERS = [
  { name: "Đồng", icon: "🥉", range: "1–5 chuyển đổi", rate: 10, color: "from-orange-50 to-amber-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", ring: "ring-orange-300" },
  { name: "Bạc", icon: "🥈", range: "6–20 chuyển đổi", rate: 15, color: "from-slate-50 to-gray-100", border: "border-gray-300", badge: "bg-gray-200 text-gray-700", ring: "ring-gray-400", featured: true },
  { name: "Vàng", icon: "🥇", range: "21+ chuyển đổi", rate: 20, color: "from-yellow-50 to-amber-50", border: "border-yellow-300", badge: "bg-yellow-100 text-yellow-700", ring: "ring-yellow-400" },
];

const STEPS = [
  { step: "01", title: "Đăng ký miễn phí", desc: "Điền tên + email, nhận ngay link giới thiệu cá nhân của bạn.", icon: Users },
  { step: "02", title: "Chia sẻ link", desc: "Gửi link cho bạn bè, khách hàng, đăng lên mạng xã hội hoặc blog.", icon: Zap },
  { step: "03", title: "Nhận hoa hồng", desc: "Mỗi khi họ mua gói Pro hoặc Business, bạn nhận hoa hồng trực tiếp vào tài khoản.", icon: DollarSign },
];

const FAQS = [
  { q: "Hoa hồng được tính như thế nào?", a: "Mỗi khi công ty bạn giới thiệu mua gói Pro (299.000đ) hoặc Business (799.000đ), bạn nhận hoa hồng theo tier của mình. Tier tăng lũy kế theo tổng số lần chuyển đổi thành công." },
  { q: "Khi nào tôi nhận được tiền?", a: "Hoa hồng được tổng hợp hàng tháng. Chúng tôi liên hệ để thanh toán qua chuyển khoản ngân hàng hoặc ví điện tử vào cuối mỗi tháng." },
  { q: "Ai có thể tham gia?", a: "Bất kỳ ai — freelancer, kế toán viên, tư vấn HR, blogger, YouTuber, hoặc đơn giản là người dùng Timio muốn giới thiệu cho bạn bè." },
  { q: "Link giới thiệu có hiệu lực bao lâu?", a: "Link không hết hạn. Miễn là công ty đó đăng ký qua link của bạn, bạn sẽ nhận hoa hồng khi họ nâng cấp lên Pro hoặc Business — dù là bây giờ hay 6 tháng sau." },
  { q: "Tôi có thể theo dõi hiệu quả không?", a: "Có. Sau khi đăng ký, bạn có dashboard cá nhân xem số lượt click, số đăng ký, số chuyển đổi có phí, tier hiện tại và hoa hồng tích lũy." },
];

export default function AffiliatePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Timio</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Đăng nhập</Link>
            <Link href="/affiliate/register" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 mb-6">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-blue-200 text-sm font-medium">Chương trình Đối tác Timio</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            Kiếm hoa hồng đến{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">20%</span>
            {" "}khi giới thiệu Timio
          </h1>
          <p className="text-blue-200 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Chia sẻ link cá nhân của bạn. Mỗi công ty đăng ký qua link và mua gói Pro hoặc Business, bạn nhận hoa hồng ngay — không giới hạn.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/affiliate/register"
              className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors text-base shadow-lg"
            >
              Đăng ký làm đối tác <ChevronRight className="w-5 h-5" />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 border border-white/30 text-white px-8 py-4 rounded-xl hover:bg-white/10 transition-colors text-base">
              Tìm hiểu thêm
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: "299k–799k", label: "Giá gói trả phí/tháng" },
              { value: "20%", label: "Hoa hồng tối đa" },
              { value: "∞", label: "Không giới hạn" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold text-white">{s.value}</div>
                <div className="text-blue-300 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Cách hoạt động</h2>
            <p className="text-gray-500">Đơn giản — chỉ 3 bước để bắt đầu kiếm hoa hồng</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center relative">
                <div className="text-xs font-bold text-blue-400 tracking-widest mb-4">{s.step}</div>
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Bảng hoa hồng theo tier</h2>
            <p className="text-gray-500">Càng giới thiệu nhiều, hoa hồng càng cao — cộng dồn lũy kế</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map((t) => (
              <div key={t.name} className={`rounded-2xl border-2 p-8 bg-gradient-to-b ${t.color} ${t.border} ${t.featured ? `ring-2 ${t.ring} shadow-xl scale-105` : ""} transition-transform`}>
                {t.featured && (
                  <div className="text-center mb-3">
                    <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">PHỔ BIẾN NHẤT</span>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-4xl mb-2">{t.icon}</div>
                  <div className="text-xl font-extrabold text-gray-900 mb-1">Hạng {t.name}</div>
                  <div className="text-sm text-gray-500 mb-6">{t.range}</div>
                  <div className="text-5xl font-extrabold text-gray-900 mb-1">{t.rate}%</div>
                  <div className="text-sm text-gray-500 mb-6">hoa hồng mỗi đơn</div>
                  <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${t.badge} inline-block`}>
                    Pro: {Math.round(299000 * t.rate / 100).toLocaleString("vi-VN")}đ / đơn
                  </div>
                  <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${t.badge} inline-block mt-1`}>
                    Business: {Math.round(799000 * t.rate / 100).toLocaleString("vi-VN")}đ / đơn
                  </div>
                </div>
                <ul className="mt-6 space-y-2">
                  {["Link giới thiệu cá nhân", "Dashboard theo dõi real-time", "Thanh toán cuối tháng"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Example calc */}
          <div className="mt-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-80" />
            <p className="text-lg font-bold mb-2">Ví dụ thu nhập thực tế</p>
            <p className="text-blue-200 text-sm mb-4">Hạng Bạc (15%) · 10 công ty Pro + 2 công ty Business</p>
            <div className="text-2xl font-extrabold">
              10 × 299k × 15% + 2 × 799k × 15%<br/>
              = <span className="text-yellow-300">448.500đ + 239.700đ = <strong>688.200đ / tháng</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* Who should join */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Ai nên tham gia?</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: "💼", title: "Tư vấn HR & Kế toán", desc: "Bạn đang tư vấn nhiều công ty — giới thiệu Timio, nhận thêm thu nhập." },
              { icon: "📱", title: "Influencer / Blogger", desc: "Bạn có cộng đồng doanh nghiệp — một bài viết có thể kiếm triệu đồng." },
              { icon: "🤝", title: "Đối tác kinh doanh", desc: "Bạn biết nhiều công ty vừa và nhỏ đang cần giải pháp chấm công." },
              { icon: "💻", title: "Freelancer IT", desc: "Khách hàng của bạn cần phần mềm quản lý — Timio là lựa chọn hoàn hảo." },
              { icon: "🏢", title: "Công ty dịch vụ", desc: "Tích hợp Timio vào gói dịch vụ HR của bạn và chia sẻ hoa hồng." },
              { icon: "👥", title: "Người dùng Timio", desc: "Bạn thấy Timio hữu ích? Giới thiệu cho bạn bè và nhận thưởng." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Câu hỏi thường gặp</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Sẵn sàng bắt đầu?</h2>
          <p className="text-blue-200 mb-8">Đăng ký trong 1 phút — miễn phí hoàn toàn. Nhận link giới thiệu ngay.</p>
          <Link
            href="/affiliate/register"
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition-colors text-base shadow-lg"
          >
            Đăng ký làm đối tác <ChevronRight className="w-5 h-5" />
          </Link>
          <p className="text-blue-400 text-xs mt-4">Không cần thẻ ngân hàng · Không phí ẩn</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-gray-400 text-sm">
        <p>© 2026 Timio · <Link href="/affiliate" className="hover:text-gray-600">Đối tác</Link> · <Link href="/login" className="hover:text-gray-600">Đăng nhập</Link></p>
      </footer>
    </div>
  );
}
