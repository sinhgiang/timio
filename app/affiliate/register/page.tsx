"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, CheckCircle, Copy, ArrowLeft, ExternalLink } from "lucide-react";

export default function AffiliateRegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", channel: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ code: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/affiliate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Đăng ký thất bại"); return; }
      setResult({ code: data.code, name: data.name });
    } finally {
      setLoading(false);
    }
  };

  const affiliateLink = result ? `https://timio.vn/register?aff=${result.code}` : "";
  const dashboardLink = result ? `/affiliate/${result.code}` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Chào mừng, {result.name}!</h1>
            <p className="text-gray-500 text-sm mb-8">Tài khoản đối tác của bạn đã được tạo. Đây là link giới thiệu cá nhân của bạn:</p>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">Link giới thiệu của bạn</p>
              <div className="flex items-center gap-2">
                <p className="text-blue-800 text-sm font-mono font-bold flex-1 break-all">{affiliateLink}</p>
                <button
                  onClick={copyLink}
                  className={`shrink-0 p-2 rounded-lg transition-colors ${copied ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600 hover:bg-blue-200"}`}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && <p className="text-green-600 text-xs mt-1">✓ Đã sao chép!</p>}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 text-left">
              <p className="text-xs font-semibold text-yellow-700 mb-1">⚠️ Lưu ý quan trọng</p>
              <p className="text-yellow-700 text-xs">Lưu lại link dashboard của bạn để theo dõi thống kê:</p>
              <p className="text-yellow-800 text-xs font-mono font-bold mt-1">timio.vn{dashboardLink}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={dashboardLink}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
              >
                Vào dashboard của tôi <ExternalLink className="w-4 h-4" />
              </Link>
              <Link href="/affiliate" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← Về trang Đối tác
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link href="/affiliate" className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Timio</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Đăng ký Đối tác</h1>
          <p className="text-blue-300 text-sm">Nhận link giới thiệu cá nhân + dashboard theo dõi hoa hồng</p>
        </div>

        {/* Benefits */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-5 flex flex-wrap gap-x-4 gap-y-2">
          {["Hoa hồng 10–20%", "Thanh toán cuối tháng", "Không giới hạn", "Dashboard riêng"].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-green-300 text-xs">
              <CheckCircle className="w-3.5 h-3.5" /> {t}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">Họ và tên *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="email@cuaban.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">Số điện thoại (để nhận thanh toán)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="0901234567"
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">Kênh giới thiệu (tuỳ chọn)</label>
            <select
              value={form.channel}
              onChange={(e) => set("channel", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            >
              <option value="" className="text-gray-800">-- Chọn kênh --</option>
              <option value="blog" className="text-gray-800">Blog / Website</option>
              <option value="youtube" className="text-gray-800">YouTube</option>
              <option value="facebook" className="text-gray-800">Facebook / Zalo</option>
              <option value="tiktok" className="text-gray-800">TikTok</option>
              <option value="consulting" className="text-gray-800">Tư vấn trực tiếp</option>
              <option value="other" className="text-gray-800">Khác</option>
            </select>
          </div>

          {error && (
            <p className="text-red-300 text-xs text-center bg-red-500/10 rounded-lg py-2 px-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? "Đang đăng ký..." : "Đăng ký làm Đối tác"}
          </button>

          <p className="text-center text-blue-300/60 text-xs">
            Miễn phí hoàn toàn · Không phí ẩn ·{" "}
            <Link href="/affiliate" className="text-blue-300 hover:text-white underline-offset-2 hover:underline">
              Xem chính sách
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
