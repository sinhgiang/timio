"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Clock, Copy, Check, TrendingUp, Users, DollarSign, BarChart3,
  ExternalLink, Info, MousePointer, Smartphone, Monitor, Tablet,
  Globe, ArrowRight, Pencil, X, Loader2, CheckCircle2, AlertCircle,
  User, Banknote, Save,
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
    bankName: string | null; bankAccount: string | null; accountName: string | null;
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

const DESTINATIONS = [
  { label: "Trang chủ",  value: "/",          desc: "timio.vn" },
  { label: "Bảng giá",  value: "/#pricing",  desc: "timio.vn/#pricing" },
  { label: "Tính năng", value: "/#demo",      desc: "timio.vn/#demo" },
  { label: "Đăng ký",   value: "/register",   desc: "timio.vn/register" },
];

export default function AffiliateDashboardClient({ affiliate, stats, tier, referrals, clickStats }: Props) {
  const [copiedLink, setCopiedLink]   = useState(false);
  const [copiedDash, setCopiedDash]   = useState(false);
  const [activeTab, setActiveTab]     = useState<"overview" | "analytics" | "referrals" | "account">("overview");

  // Account / profile state
  const [profileForm, setProfileForm] = useState({
    name:        affiliate.name,
    phone:       affiliate.phone ?? "",
    channel:     affiliate.channel ?? "",
    bankName:    affiliate.bankName ?? "",
    bankAccount: affiliate.bankAccount ?? "",
    accountName: affiliate.accountName ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/affiliate/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: currentCode, ...profileForm }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({ ok: true, text: "Đã lưu thành công!" });
      } else {
        setProfileMsg({ ok: false, text: data.error ?? "Lỗi lưu thông tin" });
      }
    } catch {
      setProfileMsg({ ok: false, text: "Lỗi kết nối, thử lại sau." });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(null), 4000);
    }
  };
  const [destination, setDestination] = useState("/");

  // Slug editor state
  const [editingSlug, setEditingSlug]     = useState(false);
  const [slugInput, setSlugInput]         = useState(affiliate.code);
  const [slugStatus, setSlugStatus]       = useState<"idle" | "checking" | "available" | "taken" | "error">("idle");
  const [slugMsg, setSlugMsg]             = useState("");
  const [slugSaving, setSlugSaving]       = useState(false);
  const [currentCode, setCurrentCode]     = useState(affiliate.code);
  const checkTimer                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildLink = (code: string, dest: string) => {
    const base = "https://timio.vn";
    if (dest === "/") return `${base}/?aff=${code}`;
    if (dest.startsWith("/#")) return `${base}/?aff=${code}${dest}`;
    return `${base}${dest}?aff=${code}`;
  };

  const affiliateLink = buildLink(currentCode, destination);
  const dashboardUrl  = `https://timio.vn/affiliate/${currentCode}`;

  const copy = async (text: string, setCopied: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live-check slug availability
  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlugInput(clean);
    setSlugStatus("idle");
    setSlugMsg("");
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!clean || clean === currentCode) return;
    if (clean.length < 3) { setSlugStatus("error"); setSlugMsg("Tối thiểu 3 ký tự"); return; }
    setSlugStatus("checking");
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/affiliate/check-code?code=${encodeURIComponent(clean)}&current=${encodeURIComponent(currentCode)}`);
        const data = await res.json();
        setSlugStatus(data.available ? "available" : "taken");
        setSlugMsg(data.reason ?? "");
      } catch {
        setSlugStatus("error");
        setSlugMsg("Không kiểm tra được, thử lại sau.");
      }
    }, 500);
  };

  const saveSlug = async () => {
    if (slugStatus !== "available" && slugInput !== currentCode) return;
    setSlugSaving(true);
    try {
      const res = await fetch("/api/affiliate/update-code", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentCode, newCode: slugInput }),
      });
      const data = await res.json();
      if (!res.ok) { setSlugStatus("error"); setSlugMsg(data.error ?? "Lỗi"); return; }
      setCurrentCode(data.code);
      setEditingSlug(false);
      // Redirect về URL mới
      window.location.href = `/affiliate/${data.code}`;
    } catch {
      setSlugStatus("error");
      setSlugMsg("Lỗi kết nối, thử lại sau.");
    } finally {
      setSlugSaving(false);
    }
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
          <div className="flex items-center gap-3">
            <div className={`text-xs font-bold px-3 py-1 rounded-full border ${tierBadgeClass}`}>
              {tier.icon} Hạng {tier.name} · {tier.rate}%
            </div>
            <button
              onClick={async () => {
                await fetch(`/api/affiliate/logout?code=${affiliate.code}`, { method: "POST" });
                window.location.href = `/affiliate/${affiliate.code}/login`;
              }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100"
              title="Đăng xuất"
            >
              Đăng xuất
            </button>
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
                : <> · Hoa hồng tính trong <strong>12 tháng đầu</strong> từ lần mua đầu</>
              }
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          {(["overview", "analytics", "referrals", "account"] as const).map((tab) => {
            const labels = { overview: "Tổng quan", analytics: "Phân tích Click", referrals: `Công ty (${referrals.length})`, account: "Tài khoản" };
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
              <div className="flex items-center gap-3">
                {[
                  {
                    label: "Lượt click",
                    value: clickStats.total,
                    sub: "người đã click link",
                    color: "indigo",
                    active: true,
                  },
                  {
                    label: "Đăng ký",
                    value: stats.registered,
                    sub: clickStats.total > 0
                      ? `${clickStats.clickToRegRate}% từ click`
                      : "chưa có đăng ký",
                    color: "blue",
                    active: stats.registered > 0,
                  },
                  {
                    label: "Trả phí",
                    value: stats.converted,
                    sub: stats.registered > 0
                      ? `${clickStats.regToProRate}% từ đăng ký`
                      : "chưa có trả phí",
                    color: "green",
                    active: stats.converted > 0,
                  },
                ].map((step, i, arr) => {
                  const colorMap: Record<string, { bg: string; text: string; bar: string; barEmpty: string }> = {
                    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", bar: "bg-indigo-500", barEmpty: "bg-indigo-100" },
                    blue:   { bg: "bg-blue-50",   text: "text-blue-700",   bar: "bg-blue-500",   barEmpty: "bg-blue-100" },
                    green:  { bg: "bg-green-50",  text: "text-green-700",  bar: "bg-green-500",  barEmpty: "bg-green-100" },
                  };
                  const c = colorMap[step.color];
                  const pct = i === 0 ? 100 : arr[i - 1].value > 0 ? Math.round(step.value / arr[i - 1].value * 100) : 0;
                  return (
                    <div key={step.label} className="flex items-center gap-3 flex-1">
                      <div className={`flex-1 rounded-2xl border-2 p-4 transition-all ${step.active ? `${c.bg} border-transparent` : "bg-gray-50 border-gray-100"}`}>
                        {/* Value */}
                        <div className={`text-3xl font-extrabold mb-1 ${step.active ? c.text : "text-gray-300"}`}>
                          {step.value}
                        </div>
                        <div className={`text-xs font-semibold mb-1 ${step.active ? "text-gray-700" : "text-gray-400"}`}>
                          {step.label}
                        </div>
                        <div className={`text-[11px] ${step.active ? "text-gray-500" : "text-gray-300"}`}>
                          {step.sub}
                        </div>
                        {/* Progress bar */}
                        <div className={`mt-3 h-1.5 rounded-full ${c.barEmpty}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                            style={{ width: step.active ? `${Math.max(pct, 8)}%` : "0%" }}
                          />
                        </div>
                      </div>
                      {i < arr.length - 1 && (
                        <ArrowRight className={`w-4 h-4 shrink-0 ${arr[i + 1].active ? "text-gray-400" : "text-gray-200"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Link + Tier */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Affiliate link + slug editor */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Link giới thiệu</h2>
                  {!editingSlug && (
                    <button
                      onClick={() => { setEditingSlug(true); setSlugInput(currentCode); setSlugStatus("idle"); }}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Pencil className="w-3 h-3" /> Đổi slug
                    </button>
                  )}
                </div>

                {/* Slug editor */}
                {editingSlug && (
                  <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-600 font-medium mb-2">Slug tùy chỉnh <span className="text-gray-400">(chỉ a–z, 0–9, dấu -)</span></p>
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-gray-400 shrink-0">timio.vn/?aff=</span>
                      <input
                        value={slugInput}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:border-blue-500"
                        placeholder="ten-cua-ban"
                        maxLength={40}
                      />
                    </div>
                    {/* Status message */}
                    {slugStatus !== "idle" && (
                      <div className={`flex items-center gap-1.5 text-xs mt-2 ${
                        slugStatus === "available" ? "text-green-600" :
                        slugStatus === "taken" || slugStatus === "error" ? "text-red-500" :
                        "text-gray-400"
                      }`}>
                        {slugStatus === "checking" && <Loader2 className="w-3 h-3 animate-spin" />}
                        {slugStatus === "available" && <CheckCircle2 className="w-3 h-3" />}
                        {(slugStatus === "taken" || slugStatus === "error") && <AlertCircle className="w-3 h-3" />}
                        {slugStatus === "checking" ? "Đang kiểm tra..." : slugStatus === "available" ? "Có thể dùng!" : slugMsg}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={saveSlug}
                        disabled={slugSaving || (slugStatus !== "available" && slugInput !== currentCode)}
                        className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {slugSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {slugSaving ? "Đang lưu..." : "Lưu slug mới"}
                      </button>
                      <button
                        onClick={() => setEditingSlug(false)}
                        className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-600 mt-2 leading-relaxed">
                      ⚠️ Link cũ vẫn tracking được. Dashboard sẽ tự chuyển sang URL mới sau khi lưu.
                    </p>
                  </div>
                )}

                {/* Destination selector */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Trang đích khi người dùng click:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DESTINATIONS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDestination(d.value)}
                        className={`text-xs px-3 py-2 rounded-lg border font-medium transition-colors text-left ${
                          destination === d.value
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold">{d.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 mb-3">
                  <p className="text-blue-700 text-xs font-mono break-all leading-relaxed">{affiliateLink}</p>
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
                    const isActive = tier.name === t.name;
                    const isPast   = stats.converted >= t.min && !isActive;
                    const isLocked = !isActive && !isPast;

                    let containerCls = "flex items-center gap-3 p-3 rounded-xl border-2 transition-all ";
                    if (isActive)    containerCls += "bg-blue-50 border-blue-400 shadow-sm";
                    else if (isPast) containerCls += "bg-green-50 border-green-300";
                    else             containerCls += "bg-gray-50 border-dashed border-gray-200";

                    return (
                      <div key={t.name} className={containerCls}>
                        <span className={`text-xl ${isLocked ? "grayscale opacity-40" : ""}`}>{t.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isActive ? "text-blue-700" : isPast ? "text-green-700" : "text-gray-400"}`}>
                              {t.name}
                            </span>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isActive ? "bg-blue-100 text-blue-600" : isPast ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                              {t.rate}% hoa hồng
                            </span>
                          </div>
                          {isLocked && (
                            <p className="text-[11px] text-gray-400 mt-0.5">Cần {t.min} chuyển đổi để mở khoá</p>
                          )}
                          {isPast && (
                            <p className="text-[11px] text-green-600 mt-0.5">Đã đạt · đang ở hạng cao hơn</p>
                          )}
                        </div>
                        {isActive  && <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-bold shrink-0">Hiện tại</span>}
                        {isPast    && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                        {isLocked  && <span className="text-base shrink-0 opacity-40">🔒</span>}
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

        {/* ===================== TAB: ACCOUNT ===================== */}
        {activeTab === "account" && (
          <div className="space-y-6 max-w-2xl">

            {/* Profile */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-4 h-4 text-gray-500" />
                <h2 className="font-bold text-gray-900">Thông tin cá nhân</h2>
              </div>
              <div className="space-y-4">

                {/* Email readonly */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email <span className="font-normal text-gray-400">(không đổi được)</span></label>
                  <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 font-mono">{affiliate.email}</div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tên hiển thị *</label>
                  <input
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Số điện thoại</label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                    placeholder="0912 345 678"
                    type="tel"
                  />
                </div>

                {/* Channel */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Kênh giới thiệu chính</label>
                  <select
                    value={profileForm.channel}
                    onChange={(e) => setProfileForm({ ...profileForm, channel: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="">— Chọn kênh —</option>
                    <option value="blog">Blog / Website</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="zalo">Zalo</option>
                    <option value="consulting">Tư vấn trực tiếp</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bank account */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="w-4 h-4 text-green-600" />
                <h2 className="font-bold text-gray-900">Tài khoản nhận hoa hồng</h2>
              </div>
              <p className="text-xs text-gray-400 mb-5">
                Hoa hồng được chuyển khoản vào ngày 15 hàng tháng. Điền đúng thông tin để nhận tiền đúng hạn.
              </p>
              <div className="space-y-4">

                {/* Bank name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ngân hàng</label>
                  <input
                    value={profileForm.bankName}
                    onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400"
                    placeholder="VCB / Vietcombank, TCB / Techcombank, MB Bank..."
                  />
                </div>

                {/* Account number */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Số tài khoản</label>
                  <input
                    value={profileForm.bankAccount}
                    onChange={(e) => setProfileForm({ ...profileForm, bankAccount: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 font-mono"
                    placeholder="1234567890"
                  />
                </div>

                {/* Account holder name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tên chủ tài khoản <span className="text-gray-400 font-normal">(đúng như trên CCCD, in hoa)</span></label>
                  <input
                    value={profileForm.accountName}
                    onChange={(e) => setProfileForm({ ...profileForm, accountName: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 font-mono uppercase"
                    placeholder="NGUYEN VAN A"
                  />
                </div>

                {/* Bank info status */}
                {affiliate.bankAccount ? (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Đã cài tài khoản ngân hàng — bạn sẽ nhận hoa hồng vào ngày 15 hàng tháng khi đủ điều kiện.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Chưa có tài khoản ngân hàng — hoa hồng sẽ bị giữ cho đến khi bạn điền đầy đủ.
                  </div>
                )}
              </div>
            </div>

            {/* Save button */}
            <div>
              {profileMsg && (
                <p className={`text-sm mb-3 ${profileMsg.ok ? "text-green-600" : "text-red-500"}`}>{profileMsg.text}</p>
              )}
              <button
                onClick={saveProfile}
                disabled={profileSaving}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {profileSaving ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </div>

            {/* Dashboard URL reminder */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-800 font-semibold text-sm">Link dashboard của bạn</p>
                <p className="text-amber-700 text-xs mt-1">Lưu link này lại — đây là cách duy nhất để vào dashboard:</p>
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
