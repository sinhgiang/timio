"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Building2, Users, DollarSign, TrendingUp, LogIn, Search, ExternalLink, Plus } from "lucide-react";

interface Company {
  id: string; name: string; slug: string; plan: string;
  planExpires: string | null; createdAt: string;
  employeeCount: number; adminEmail: string; totalRevenue: number;
}

interface Props {
  companies: Company[];
  summary: { total: number; pro: number; employees: number; revenue: number };
}

function fmtCurrency(n: number) { return n.toLocaleString("vi-VN") + "đ"; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("vi-VN"); }

export default function CompaniesClient({ companies, summary }: Props) {
  const [search, setSearch] = useState("");
  const [entering, setEntering] = useState<string | null>(null);
  const { update } = useSession();
  const router = useRouter();

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      c.adminEmail.toLowerCase().includes(search.toLowerCase())
  );

  const handleEnter = async (companyId: string, companyName: string) => {
    setEntering(companyId);
    try {
      await fetch("/api/admin/impersonate-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, action: "enter" }),
      });
      await update({ impersonateCompanyId: companyId });
      // Full reload để server đọc lại session cookie với impersonating=true
      window.location.href = "/dashboard";
    } catch {
      setEntering(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Danh sách Công ty</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý tất cả công ty trên nền tảng · Bấm "Đi vào" để xem dashboard của họ</p>
        </div>
        <Link
          href="/admin/companies/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Tạo tài khoản mới
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Tổng công ty", value: summary.total, icon: Building2, color: "blue" },
          { label: "Đang dùng Pro", value: summary.pro, icon: TrendingUp, color: "green" },
          { label: "Tổng nhân viên", value: summary.employees, icon: Users, color: "purple" },
          { label: "Doanh thu", value: fmtCurrency(summary.revenue), icon: DollarSign, color: "yellow" },
        ].map((s) => {
          const bg: Record<string, string> = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600", yellow: "bg-yellow-50 text-yellow-600" };
          return (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bg[s.color]}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên công ty, slug, email admin..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 text-sm text-gray-500">
          {filtered.length} công ty{search && ` (lọc từ ${companies.length})`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Công ty</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Admin</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">NV</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Gói</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Doanh thu</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Đăng ký</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{c.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-gray-600 text-xs">{c.adminEmail}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-semibold text-gray-700">{c.employeeCount}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.plan === "business" ? "bg-slate-200 text-slate-700" : c.plan === "pro" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {c.plan === "business" ? "Business" : c.plan === "pro" ? "Pro" : "Starter"}
                    </span>
                    {(c.plan === "pro" || c.plan === "business") && c.planExpires && (
                      <p className="text-xs text-gray-400 mt-0.5">đến {fmtDate(c.planExpires)}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-gray-700 font-medium">
                    {c.totalRevenue > 0 ? fmtCurrency(c.totalRevenue) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-400">{fmtDate(c.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/checkin/${c.slug}`}
                        target="_blank"
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Xem kiosk"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleEnter(c.id, c.name)}
                        disabled={entering === c.id}
                        className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        {entering === c.id ? "Đang vào..." : "Đi vào"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p>Không tìm thấy công ty nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
