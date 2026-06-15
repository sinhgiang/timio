"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock, Copy, Check, TrendingUp, Users, DollarSign, BarChart3,
  ExternalLink, Info, MousePointer, Smartphone, Monitor, Tablet,
  Globe, ArrowRight,
} from "lucide-react";

interface ClickStats {
  total:          number;
  uniqueIps:      number;
  today:          number;
  thisMonth:      number;
  clickConverted: number;
  clickToRegRate: number;
  regToProRate:   number;
  devices:        { device: string; count: number }[];
  sources:        { source: string; count: number }[];
  dailyLast30:    { date: string; clicks: number; conversions: number }[];
}

interface Props {
  affiliate: {
    name: string; email: string; code: string;
    phone: string | null; channel: string | null; createdAt: string;
  };
  stats: {
    registered: number; converted: number; revenue: number;
    commission: number; pendingCommission: number; conversionRate: number;
    nextPayoutDate: string;
  };
  tier: { name: string; icon: string; rate: number; next: string | null; nextAt: number | null };
  referrals: Array<{
    id: string; name: string; slug: string; plan: string; createdAt: string;
    isPaid: boolean; planPrice: number;
    inWindow: boolean; isEligible: boolean;
    commissionUntil: string | null; holdEndsAt: string | null; payoutDate: string | null;
  }>;
  clickStats: ClickStats;
}


function fmtCurrency(n: number) { return n.toLocaleString("vi-VN") + "đ"; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("vi-VN"); }
function fmtShortDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

function DeviceIcon({ device }: { device: string }) {
  if (device === "mobile")  return <Smartphone className="w-4 h-4 text-blue-500" />;
  if (device === "tablet")  return <Tablet className="w-4 h-4 text-purple-500" />;
  return <Monitor className="w-4 h-4 text-gray-500" />;
}

function deviceLabel(d: string) {
  if (d === "mobile")  return "Di động";
  if (d === "tablet")  return "Tablet";
  if (d === "desktop") return "Máy tính";
  return d;
}

export default function AffiliateDashboardClient({ affiliate, stats, tier, referrals, clickStats }: Props) {
  const [copiedLink, setCopiedLink]   = useState(false);
  const [copiedDash, setCopiedDash]   = useState(false);
  const [activeTab, setActiveTab]     = useState<"overview" | "analytics" | "referrals">("overview");

  const affiliateLink = `https://timio.vn/register?aff=${affiliate.code}`;
  const dashboardUrl  = `https://timio.vn/affiliate/${affiliate.code}`;

  const copy = async (text: string, setCopied: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tierBadgeClass =
    tier.name === "Vàng" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
    tier.name === "Bạc"  ? "bg-gray-100 text-gray-700 border-gray-300" :
                            "bg-orange-100 text-orange-700 border-orange-300";

  const progress = tier.nextAt
    ? Math.min(100, Math.round((stats.converted / tier.nextAt) * 100))
    : 100;

  // Chart: max clicks in last 30 days for scaling
  const maxClicks = Math.max(1, ...clickStats.dailyLast30.map((d) => d.clicks));

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
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Xin chào, {affiliate.name}!</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tham gia từ {fmtDate(affiliate.createdAt)} · Mã:{" "}
            <span className="font-mono font-bold text-blue-600">{affiliate.code}</span>
          </p>
        </div>

        {/* Commission hero */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-blue-200 text-xs mb-1">Đã xác nhận · thanh toán ngày 15</p>
              <p className="text-4xl font-extrabold">{fmtCurrency(stats.commission)}</p>
              <p className="text-blue-200 text-xs mt-1">
                Từ {stats.converted} đơn · Doanh thu {fmtCurrency(stats.revenue)}
              </p>
            </div>
            {stats.pendingCommission > 0 && (
              <div className="bg-white/10 rounded-xl px-4 py-3 text-center shrink-0">
                <p className="text-blue-200 text-xs mb-0.5">Đang giữ (30 ngày)</p>
                <p className="text-xl font-extrabold">{fmtCurrency(stats.pendingCommission)}</p>
                <p className="text-blue-300 text-xs mt-0.5">chờ xác nhận</p>
              </div>
            )}
          </div>
          <div className="mt-4 bg-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm">
            <DollarSign className="w-4 h-4 text-yellow-300 shrink-0" />
            <span>
              Thanh toán tiếp theo:{" "}
              <strong className="text-yellow-200">
                ngày 15/{new Date(stats.nextPayoutDate).getMonth() + 1}/{new Date(stats.nextPayoutDate).getFullYear()}
              </strong>
              {stats.commission > 0
                ? <> · Liên hệ <strong>admin@timio.vn</strong> để yêu cầu</>
                : <> · Hoa hồng tính trong <strong>6 tháng đầu</strong> từ lần mua đầu</>
              }
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          {(["overview", "analytics", "referrals"] as const).map((tab) => {
            const labels = { overview: "Tổng quan", analytics: "Phân tích Click", referrals: `Công ty (${referrals.length})` };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* ===================== TAB: OVERVIEW ===================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Lượt Click",       value: clickStats.total,       sub: `${clickStats.uniqueIps} unique IP`,       Icon: MousePointer, color: "indigo" },
                { label: "Đã đăng ký",       value: stats.registered,       sub: "công ty qua link",                       Icon: Users,        color: "blue" },
                { label: "Đã trả phí",         value: stats.converted,        sub: "Pro + Business",                         Icon: TrendingUp,   color: "green" },
                { label: "Hoa hồng",          value: fmtCurrency(stats.commission), sub: `Hạng ${tier.name} · ${tier.rate}%`, Icon: DollarSign,   color: "yellow" },
              ].map((s) => {
                const bg: Record<string, string> = {
                  indigo: "bg-indigo-50 text-indigo-600",
                  blue:   "bg-blue-50 text-blue-600",
                  green:  "bg-green-50 text-green-600",
                  yellow: "bg-yellow-50 text-yellow-600",
                };
                return (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg[s.color]}`}>
                      <s.Icon className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                    <div className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* Conversion funnel */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-5">Phễu chuyển đổi</h2>
              <div className="flex items-center gap-2">
                {[
                  { label: "Lượt click",   value: clickStats.total,        pct: 100,                        color: "bg-indigo-500" },
                  { label: "Đăng ký",      value: stats.registered,        pct: clickStats.clickToRegRate,  color: "bg-blue-500" },
                  { label: "Trả phí",      value: stats.converted,         pct: clickStats.regToProRate,    color: "bg-green-500" },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-2 flex-1">
                    <div className="flex-1 text-center">
                      <div className={`h-12 ${step.color} rounded-xl flex items-center justify-center mb-2`}
                           style={{ opacity: 0.15 + 0.85 * (step.pct / 100) }}>
                        <span className="text-white font-extrabold text-lg" style={{ opacity: 1 / (0.15 + 0.85 * (step.pct / 100)) }}>
                          {step.value}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-700">{step.label}</p>
                      {i > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{arr[i-1].value > 0 ? Math.round(step.value / arr[i-1].value * 100) : 0}% chuyển đổi</p>
                      )}
                    </div>
                    {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-50 pt-4">
                <div className="text-center">
                  <div className="text-lg font-extrabold text-indigo-600">{clickStats.clickToRegRate}%</div>
                  <div className="text-xs text-gray-400">Click → Đăng ký</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-extrabold text-blue-600">{clickStats.regToProRate}%</div>
                  <div className="text-xs text-gray-400">Đăng ký → Pro</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-extrabold text-green-600">
                    {clickStats.total > 0 ? Math.round(stats.converted / clickStats.total * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-400">Click → Trả phí (tổng)</div>
                </div>
              </div>
            </div>

            {/* Link + Tier */}
            <div className="grid md:grid-cols-2 gap-6">
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
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg py-2">
                    <div className="text-lg font-extrabold text-gray-900">{clickStats.today}</div>
                    <div className="text-xs text-gray-400">Click hôm nay</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg py-2">
                    <div className="text-lg font-extrabold text-gray-900">{clickStats.thisMonth}</div>
                    <div className="text-xs text-gray-400">Click tháng này</div>
                  </div>
                </div>
              </div>

              {/* Tier progress */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4">Tiến trình tier</h2>
                <div className="space-y-3">
                  {[
                    { name: "Đồng", icon: "🥉", rate: 10, min: 1 },
                    { name: "Bạc",  icon: "🥈", rate: 15, min: 6 },
                    { name: "Vàng", icon: "🥇", rate: 20, min: 21 },
                  ].map((t) => {
                    const isActive  = tier.name === t.name;
                    const isReached = stats.converted >= t.min;
                    return (
                      <div key={t.name} className={`flex items-center gap-3 p-3 rounded-xl ${isActive ? "bg-blue-50 border border-blue-200" : isReached ? "bg-gray-50" : "opacity-50"}`}>
                        <span className="text-xl">{t.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-bold ${isActive ? "text-blue-700" : "text-gray-600"}`}>{t.name}</span>
                            <span className={`text-xs font-bold ${isActive ? "text-blue-600" : "text-gray-500"}`}>{t.rate}%</span>
                          </div>
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

            {/* Dashboard save reminder */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-800 font-semibold text-sm">Lưu link dashboard này lại!</p>
                <p className="text-amber-700 text-xs mt-1">Đây là link duy nhất để vào dashboard của bạn:</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-amber-800 font-mono text-xs font-bold flex-1">{dashboardUrl}</span>
                  <button onClick={() => copy(dashboardUrl, setCopiedDash)} className="text-amber-600 hover:text-amber-800">
                    {copiedDash ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: ANALYTICS ===================== */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Click summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Tổng click",     value: clickStats.total,     sub: "all-time",           color: "indigo" },
                { label: "Unique visitor", value: clickStats.uniqueIps, sub: "IP riêng biệt",      color: "purple" },
                { label: "Hôm nay",        value: clickStats.today,     sub: "lượt truy cập",      color: "blue" },
                { label: "Tháng này",      value: clickStats.thisMonth, sub: "lượt truy cập",      color: "teal" },
              ].map((s) => {
                const cls: Record<string, string> = {
                  indigo: "bg-indigo-50 text-indigo-700",
                  purple: "bg-purple-50 text-purple-700",
                  blue:   "bg-blue-50 text-blue-700",
                  teal:   "bg-teal-50 text-teal-700",
                };
                return (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className={`text-2xl font-extrabold ${cls[s.color]}`}>{s.value}</div>
                    <div className="text-sm font-semibold text-gray-700 mt-1">{s.label}</div>
                    <div className="text-xs text-gray-400">{s.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* Daily chart — last 30 days */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-gray-900">Click theo ngày (30 ngày qua)</h2>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block" /> Click</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Đăng ký</span>
                </div>
              </div>
              {clickStats.total === 0 ? (
                <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
                  <MousePointer className="w-5 h-5 mr-2 text-gray-300" />
                  Chưa có click nào — hãy chia sẻ link của bạn!
                </div>
              ) : (
                <div className="flex items-end gap-px h-40 w-full">
                  {clickStats.dailyLast30.map((d, i) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-px group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {fmtShortDate(d.date)}: {d.clicks} click{d.conversions > 0 ? `, ${d.conversions} đăng ký` : ""}
                      </div>
                      {/* Conversion bar (green) */}
                      {d.conversions > 0 && (
                        <div
                          className="w-full bg-green-400 rounded-t-sm"
                          style={{ height: `${(d.conversions / maxClicks) * 100}%` }}
                        />
                      )}
                      {/* Click bar (indigo) */}
                      <div
                        className="w-full bg-indigo-400 rounded-t-sm"
                        style={{ height: `${Math.max(2, ((d.clicks - d.conversions) / maxClicks) * 100)}%` }}
                      />
                      {/* Date label every 5 days */}
                      {i % 5 === 0 && (
                        <div className="text-gray-300 text-[10px] mt-1 rotate-0 whitespace-nowrap">
                          {fmtShortDate(d.date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Device + Sources */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Device breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" /> Thiết bị
                </h2>
                {clickStats.devices.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Chưa có dữ liệu</p>
                ) : (
                  <div className="space-y-3">
                    {clickStats.devices.map((d) => {
                      const pct = clickStats.total > 0 ? Math.round(d.count / clickStats.total * 100) : 0;
                      const barColor = d.device === "mobile" ? "bg-blue-500" : d.device === "tablet" ? "bg-purple-500" : "bg-gray-400";
                      return (
                        <div key={d.device}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="flex items-center gap-2 text-sm text-gray-700">
                              <DeviceIcon device={d.device} />
                              {deviceLabel(d.device)}
                            </span>
                            <span className="text-sm font-bold text-gray-900">{d.count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Traffic sources */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" /> Nguồn truy cập
                </h2>
                {clickStats.sources.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Chưa có dữ liệu</p>
                ) : (
                  <div className="space-y-3">
                    {clickStats.sources.map((s) => {
                      const pct = clickStats.total > 0 ? Math.round(s.count / clickStats.total * 100) : 0;
                      const sourceColors: Record<string, string> = {
                        "Google":     "bg-blue-500",
                        "Facebook":   "bg-blue-700",
                        "YouTube":    "bg-red-500",
                        "TikTok":     "bg-gray-800",
                        "Zalo":       "bg-blue-400",
                        "Twitter/X":  "bg-gray-700",
                        "LinkedIn":   "bg-blue-600",
                        "Trực tiếp":  "bg-green-500",
                      };
                      const barColor = sourceColors[s.source] ?? "bg-indigo-400";
                      return (
                        <div key={s.source}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700 truncate max-w-[60%]">{s.source}</span>
                            <span className="text-sm font-bold text-gray-900 shrink-0">{s.count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Conversion detail */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Chi tiết chuyển đổi</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Click → Đăng ký",   value: `${clickStats.clickToRegRate}%`,
                    detail: `${clickStats.clickConverted} / ${clickStats.total} người`,
                    color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "Đăng ký → Trả phí",  value: `${clickStats.regToProRate}%`,
                    detail: `${stats.converted} / ${stats.registered} người`,
                    color: "text-blue-600",   bg: "bg-blue-50" },
                  { label: "Click → Trả phí (tổng)", value: `${clickStats.total > 0 ? Math.round(stats.converted / clickStats.total * 100) : 0}%`,
                    detail: `${stats.converted} / ${clickStats.total} người`,
                    color: "text-green-600",  bg: "bg-green-50" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-4 text-center ${s.bg}`}>
                    <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
                    <div className="text-sm font-semibold text-gray-700 mt-1">{s.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: REFERRALS ===================== */}
        {activeTab === "referrals" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Công ty đã giới thiệu ({referrals.length})</h2>
              {referrals.length > 0 && (
                <span className="text-xs text-gray-400">{stats.converted} đã nâng cấp</span>
              )}
            </div>

            {referrals.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="font-medium text-gray-500">Chưa có ai đăng ký qua link của bạn</p>
                <p className="text-sm mt-1">Chia sẻ link để bắt đầu kiếm hoa hồng</p>
                <button
                  onClick={() => { setActiveTab("overview"); }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Xem link giới thiệu
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-gray-500 font-medium text-xs">Công ty</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-medium text-xs">Gói</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-medium text-xs">Trạng thái HH</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-medium text-xs">HH đến</th>
                      <th className="text-right px-6 py-3 text-gray-500 font-medium text-xs">Hoa hồng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {referrals.map((r) => {
                      const commission = r.isPaid ? Math.round(r.planPrice * tier.rate / 100) : 0;
                      return (
                        <tr key={r.id} className={`hover:bg-gray-50 ${r.isPaid && !r.inWindow ? "opacity-40" : ""}`}>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-800 text-sm">{r.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(r.createdAt)}</p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.plan === "business" ? "bg-slate-800 text-white" : r.isPaid ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {r.plan === "business" ? "Business" : r.isPaid ? "Pro" : "Starter"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {!r.isPaid ? (
                              <span className="text-xs text-gray-400">—</span>
                            ) : !r.inWindow ? (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium">Hết HH</span>
                            ) : !r.isEligible ? (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                                Giữ đơn · đến {r.holdEndsAt ? fmtDate(r.holdEndsAt) : "—"}
                              </span>
                            ) : (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                TT ngày {r.payoutDate ? `15/${new Date(r.payoutDate).getMonth() + 1}` : "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center text-xs">
                            {r.commissionUntil && r.inWindow ? (
                              <span className="text-green-600 font-medium">{fmtDate(r.commissionUntil)}</span>
                            ) : r.commissionUntil ? (
                              <span className="text-gray-400">Đã hết</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold">
                            {r.isPaid && r.inWindow && r.isEligible ? (
                              <span className="text-green-700 text-sm">{fmtCurrency(commission)}</span>
                            ) : r.isPaid && r.inWindow && !r.isEligible ? (
                              <span className="text-amber-600 text-sm">{fmtCurrency(commission)}</span>
                            ) : r.isPaid ? (
                              <span className="text-gray-300 line-through text-xs">{fmtCurrency(commission)}</span>
                            ) : (
                              <span className="text-gray-300 text-sm">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          Câu hỏi về hoa hồng? Liên hệ{" "}
          <a href="mailto:admin@timio.vn" className="text-blue-500 hover:text-blue-700">admin@timio.vn</a>
          {" · "}
          <Link href="/affiliate" className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-1">
            Xem chính sách <ExternalLink className="w-3 h-3 inline" />
          </Link>
        </div>
      </main>
    </div>
  );
}
