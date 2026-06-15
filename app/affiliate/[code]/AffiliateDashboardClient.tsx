"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Copy, Check, TrendingUp, Users, DollarSign, BarChart3, ExternalLink, Info } from "lucide-react";

interface Props {
  affiliate: {
    name: string;
    email: string;
    code: string;
    phone: string | null;
    channel: string | null;
    createdAt: string;
  };
  stats: {
    registered: number;
    converted: number;
    revenue: number;
    commission: number;
    conversionRate: number;
  };
  tier: {
    name: string;
    icon: string;
    rate: number;
    next: string | null;
    nextAt: number | null;
  };
  referrals: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    createdAt: string;
    isPro: boolean;
  }>;
}

function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("vi-VN");
}

export default function AffiliateDashboardClient({ affiliate, stats, tier, referrals }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDash, setCopiedDash] = useState(false);

  const affiliateLink = `https://timio.vn/register?aff=${affiliate.code}`;
  const dashboardUrl = `https://timio.vn/affiliate/${affiliate.code}`;

  const copy = async (text: string, setCopied: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tier progress bar
  const progress = tier.nextAt
    ? Math.min(100, Math.round((stats.converted / tier.nextAt) * 100))
    : 100;

  const tierBadgeClass =
    tier.name === "Vàng" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
    tier.name === "Bạc" ? "bg-gray-100 text-gray-700 border-gray-300" :
    "bg-orange-100 text-orange-700 border-orange-300";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/affiliate" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Timio · Đối tác</span>
          </Link>
          <div className={`text-xs font-bold px-3 py-1 rounded-full border ${tierBadgeClass}`}>
            {tier.icon} Hạng {tier.name} · {tier.rate}%
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">Xin chào, {affiliate.name}!</h1>
          <p className="text-gray-500 text-sm mt-1">Tham gia từ {fmtDate(affiliate.createdAt)} · Mã: <span className="font-mono font-bold text-blue-600">{affiliate.code}</span></p>
        </div>

        {/* Commission highlight */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-sm mb-1">Hoa hồng tích lũy</p>
              <p className="text-4xl font-extrabold">{fmtCurrency(stats.commission)}</p>
              <p className="text-blue-200 text-xs mt-2">Từ {stats.converted} đơn chuyển đổi · Doanh thu {fmtCurrency(stats.revenue)}</p>
            </div>
            <div className="text-right">
              <DollarSign className="w-12 h-12 text-blue-300 opacity-50" />
            </div>
          </div>
          {stats.commission > 0 && (
            <div className="mt-4 bg-white/10 rounded-xl px-4 py-2 text-sm">
              💡 Hoa hồng sẽ được thanh toán vào cuối tháng. Liên hệ <strong>admin@timio.vn</strong> để yêu cầu.
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Đã đăng ký", value: stats.registered, sub: "công ty qua link", Icon: Users, color: "blue" },
            { label: "Mua Pro", value: stats.converted, sub: "chuyển đổi thành công", Icon: TrendingUp, color: "green" },
            { label: "Tỷ lệ chuyển đổi", value: `${stats.conversionRate}%`, sub: "registered → Pro", Icon: BarChart3, color: "purple" },
            { label: "Hoa hồng", value: fmtCurrency(stats.commission), sub: `Hạng ${tier.name} ${tier.rate}%`, Icon: DollarSign, color: "yellow" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <s.Icon className={`w-5 h-5 mb-3 text-${s.color}-500`} />
              <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
              <div className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Affiliate link */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Link giới thiệu của bạn</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
              <p className="text-blue-700 text-sm font-mono break-all">{affiliateLink}</p>
            </div>
            <button
              onClick={() => copy(affiliateLink, setCopiedLink)}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                copiedLink ? "bg-green-100 text-green-700" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {copiedLink ? <><Check className="w-4 h-4" /> Đã sao chép!</> : <><Copy className="w-4 h-4" /> Sao chép link</>}
            </button>
            <p className="text-xs text-gray-400 mt-3 text-center">Gửi link này cho công ty bạn muốn giới thiệu</p>
          </div>

          {/* Tier progress */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-4">Tiến trình tier</h2>
            <div className="space-y-3">
              {[
                { name: "Đồng", icon: "🥉", rate: 10, min: 1, max: 5 },
                { name: "Bạc", icon: "🥈", rate: 15, min: 6, max: 20 },
                { name: "Vàng", icon: "🥇", rate: 20, min: 21, max: null },
              ].map((t) => {
                const isActive = tier.name === t.name;
                const isReached = stats.converted >= t.min;
                return (
                  <div key={t.name} className={`flex items-center gap-3 p-3 rounded-xl ${isActive ? "bg-blue-50 border border-blue-200" : isReached ? "bg-gray-50" : "opacity-50"}`}>
                    <span className="text-xl">{t.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${isActive ? "text-blue-700" : "text-gray-600"}`}>{t.name}</span>
                        <span className={`text-xs font-bold ${isActive ? "text-blue-600" : "text-gray-500"}`}>{t.rate}%</span>
                      </div>
                      <p className="text-xs text-gray-400">{t.min}{t.max ? `–${t.max}` : "+"} chuyển đổi</p>
                    </div>
                    {isActive && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">Hiện tại</span>}
                    {!isActive && isReached && <Check className="w-4 h-4 text-green-500" />}
                  </div>
                );
              })}
            </div>
            {tier.next && tier.nextAt && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Tiến đến hạng {tier.next}</span>
                  <span>{stats.converted}/{tier.nextAt}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Cần thêm {tier.nextAt - stats.converted} chuyển đổi nữa</p>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard link save reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800 font-semibold text-sm">Lưu link dashboard này lại!</p>
            <p className="text-amber-700 text-xs mt-1">Đây là link duy nhất để vào dashboard của bạn. Bookmark hoặc lưu vào ghi chú:</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-amber-800 font-mono text-xs font-bold flex-1">{dashboardUrl}</span>
              <button onClick={() => copy(dashboardUrl, setCopiedDash)} className="text-amber-600 hover:text-amber-800">
                {copiedDash ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Referrals table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Công ty đã giới thiệu ({referrals.length})</h2>
            {referrals.length > 0 && (
              <span className="text-xs text-gray-400">{stats.converted} đã mua Pro</span>
            )}
          </div>

          {referrals.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">Chưa có ai đăng ký qua link của bạn</p>
              <p className="text-sm mt-1">Chia sẻ link để bắt đầu kiếm hoa hồng</p>
              <button
                onClick={() => copy(affiliateLink, setCopiedLink)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Sao chép link ngay
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-500 font-medium">Công ty</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Đăng ký</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Gói</th>
                    <th className="text-right px-6 py-3 text-gray-500 font-medium">Hoa hồng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {referrals.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800">{r.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{r.slug}</p>
                      </td>
                      <td className="px-4 py-4 text-gray-500 text-xs">{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.isPro ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {r.isPro ? "✓ Pro" : "Starter"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {r.isPro ? (
                          <span className="text-green-700">{fmtCurrency(Math.round(PRO_PRICE * tier.rate / 100))}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="mt-6 text-center text-sm text-gray-400">
          Câu hỏi về hoa hồng? Liên hệ{" "}
          <a href="mailto:admin@timio.vn" className="text-blue-500 hover:text-blue-700">admin@timio.vn</a>
          {" "}·{" "}
          <Link href="/affiliate" className="text-blue-500 hover:text-blue-700 flex-inline items-center gap-1">
            Xem chính sách <ExternalLink className="w-3 h-3 inline" />
          </Link>
        </div>
      </main>
    </div>
  );
}

const PRO_PRICE = 299000;
