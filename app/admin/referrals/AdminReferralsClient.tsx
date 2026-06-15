"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, DollarSign, TrendingUp, Gift, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

function fmtCurrency(n: number) { return n.toLocaleString("vi-VN") + "đ"; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("vi-VN"); }

interface AffiliateRow {
  id: string; name: string; email: string; code: string; phone: string | null;
  channel: string | null; status: string; createdAt: string; updatedAt: string;
  referred: number; converted: number; revenue: number; commission: number;
  tier: { name: string; icon: string; rate: number };
}

interface ReferrerRow {
  id: string; name: string; slug: string; plan: string; createdAt: string;
  referred: Array<{ id: string; name: string; plan: string; createdAt: string }>;
  converted: number; revenue: number; commission: number;
  tier: { name: string; icon: string; rate: number };
}

interface Props {
  affiliates: AffiliateRow[];
  affiliateSummary: { total: number; converted: number; revenue: number; commission: number };
  referrers: ReferrerRow[];
  referralSummary: { total: number; converted: number; revenue: number };
}

function TierBadge({ tier }: { tier: { name: string; icon: string; rate: number } }) {
  const cls = tier.name === "Vàng" ? "bg-yellow-100 text-yellow-700"
    : tier.name === "Bạc" ? "bg-gray-100 text-gray-600"
    : "bg-orange-100 text-orange-700";
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>{tier.icon} {tier.name} {tier.rate}%</span>;
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub: string; icon: React.ElementType; color: string }) {
  const colors: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50", green: "text-green-600 bg-green-50",
    purple: "text-purple-600 bg-purple-50", yellow: "text-yellow-600 bg-yellow-50",
  };
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
      <div className="text-sm font-semibold text-gray-700 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function AffiliatesTab({ affiliates, summary }: { affiliates: AffiliateRow[]; summary: Props["affiliateSummary"] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tổng đối tác" value={summary.total} sub="đã đăng ký" icon={Users} color="blue" />
        <StatCard label="Chuyển đổi Pro" value={summary.converted} sub="công ty mua Pro qua affiliate" icon={TrendingUp} color="green" />
        <StatCard label="Doanh thu từ affiliate" value={fmtCurrency(summary.revenue)} sub="lũy kế" icon={DollarSign} color="purple" />
        <StatCard label="Hoa hồng phải trả" value={fmtCurrency(summary.commission)} sub="tổng tất cả đối tác" icon={Gift} color="yellow" />
      </div>

      {affiliates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">Chưa có đối tác nào đăng ký</p>
          <Link href="/affiliate" className="text-blue-500 text-sm mt-2 hover:text-blue-700 inline-flex items-center gap-1">
            Xem trang Affiliate <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Danh sách đối tác ({affiliates.length})</h2>
            <Link href="/affiliate" target="_blank" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
              Trang đăng ký <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {affiliates.map((a) => (
              <div key={a.id}>
                <div
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4"
                  onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {a.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{a.name}</p>
                      <TierBadge tier={a.tier} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {a.status === "active" ? "Hoạt động" : "Chờ duyệt"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{a.email}{a.phone ? ` · ${a.phone}` : ""} · tham gia {fmtDate(a.createdAt)}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-center shrink-0">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{a.referred}</p>
                      <p className="text-xs text-gray-400">đăng ký</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-700">{a.converted}</p>
                      <p className="text-xs text-gray-400">mua Pro</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-700">{fmtCurrency(a.commission)}</p>
                      <p className="text-xs text-gray-400">hoa hồng</p>
                    </div>
                  </div>

                  {/* Link + expand */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/affiliate/${a.code}`}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 border border-blue-200 px-2 py-1 rounded-lg"
                    >
                      Dashboard <ExternalLink className="w-3 h-3" />
                    </Link>
                    {expandedId === a.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === a.id && (
                  <div className="px-6 pb-4 bg-blue-50/50 border-t border-blue-100">
                    <div className="py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Code</p>
                        <p className="font-mono font-bold text-blue-700">{a.code}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Kênh</p>
                        <p className="text-gray-700 font-medium">{a.channel || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Doanh thu tạo ra</p>
                        <p className="text-gray-700 font-bold">{fmtCurrency(a.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Hoa hồng ({a.tier.rate}%)</p>
                        <p className="text-green-700 font-bold">{fmtCurrency(a.commission)}</p>
                      </div>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs text-gray-500 font-medium mb-1">Link giới thiệu</p>
                      <code className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg block text-blue-700">
                        https://timio.vn/register?aff={a.code}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReferralsTab({ referrers, summary }: { referrers: ReferrerRow[]; summary: Props["referralSummary"] }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Đã giới thiệu" value={summary.total} sub="công ty đăng ký qua link" icon={Users} color="blue" />
        <StatCard label="Đã mua Pro" value={summary.converted} sub={`tỷ lệ ${summary.total ? Math.round(summary.converted / summary.total * 100) : 0}%`} icon={TrendingUp} color="green" />
        <StatCard label="Doanh thu referral" value={fmtCurrency(summary.revenue)} sub="lũy kế" icon={DollarSign} color="purple" />
      </div>

      {referrers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center text-gray-400">
          <Gift className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">Chưa có công ty nào giới thiệu thành công</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Xếp hạng giới thiệu ({referrers.length} công ty)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Công ty</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Đăng ký</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Mua Pro</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Doanh thu</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Tier</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Thưởng tích lũy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {referrers.map((r, i) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-800">{r.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.slug}</p>
                    </td>
                    <td className="px-4 py-4 text-center font-semibold text-gray-700">{r.referred.length}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="font-bold text-green-700">{r.converted}</span>
                      {r.referred.length > 0 && (
                        <span className="text-xs text-gray-400 ml-1">({Math.round(r.converted / r.referred.length * 100)}%)</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-700">{fmtCurrency(r.revenue)}</td>
                    <td className="px-4 py-4 text-center"><TierBadge tier={r.tier} /></td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-blue-600">+{Math.round(r.converted * 30)} ngày Pro</span>
                      <p className="text-xs text-gray-400 mt-0.5">{r.converted} × 30 ngày</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReferralsClient({ affiliates, affiliateSummary, referrers, referralSummary }: Props) {
  const [tab, setTab] = useState<"affiliates" | "referrals">("affiliates");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Affiliate & Referral</h1>
          <p className="text-gray-500 text-sm mt-1">Theo dõi đối tác affiliate và chương trình giới thiệu</p>
        </div>
        <Link
          href="/affiliate"
          target="_blank"
          className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Trang đăng ký <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
        <button
          onClick={() => setTab("affiliates")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "affiliates" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Đối tác Affiliate
          {affiliates.length > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{affiliates.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("referrals")}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === "referrals" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Referral Công ty
          {referrers.length > 0 && (
            <span className="ml-2 bg-purple-100 text-purple-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{referrers.length}</span>
          )}
        </button>
      </div>

      {tab === "affiliates" ? (
        <AffiliatesTab affiliates={affiliates} summary={affiliateSummary} />
      ) : (
        <ReferralsTab referrers={referrers} summary={referralSummary} />
      )}
    </div>
  );
}
