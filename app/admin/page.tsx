import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Users, Building2, Gift, TrendingUp, CreditCard, Activity, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [totalCompanies, proCompanies, totalEmployees, totalAffiliates, recentCompanies, recentPayments, recentAccessLogs] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { plan: { in: ["pro", "business"] } } }),
    prisma.employee.count(),
    prisma.affiliate.count(),
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, slug: true, plan: true, referredBy: true, affiliateCode: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: { status: "completed" },
      orderBy: { paidAt: "desc" },
      take: 10,
      include: { company: { select: { name: true } } },
    }),
    prisma.impersonationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { company: { select: { name: true } } },
    }).catch(() => []),
  ]);

  const starterCompanies = totalCompanies - proCompanies;
  const totalRevenue = await prisma.payment.aggregate({ where: { status: "completed" }, _sum: { amount: true } });
  const referralCount = recentCompanies.filter((c) => c.referredBy || c.affiliateCode).length;

  const fmtDate = (d: Date) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const fmtCurrency = (n: number) => n.toLocaleString("vi-VN") + "đ";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Timio Super Admin · Tổng quan toàn hệ thống</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Tổng công ty", value: totalCompanies, sub: `${proCompanies} đang trả phí · ${starterCompanies} Starter`, icon: Building2, color: "blue" },
          { label: "Tổng nhân viên", value: totalEmployees, sub: "trên tất cả công ty", icon: Users, color: "indigo" },
          { label: "Doanh thu tích lũy", value: fmtCurrency(totalRevenue._sum.amount ?? 0), sub: "tổng thanh toán hoàn thành", icon: CreditCard, color: "green" },
          { label: "Tỷ lệ Pro", value: `${totalCompanies ? Math.round(proCompanies / totalCompanies * 100) : 0}%`, sub: `${proCompanies} / ${totalCompanies} công ty`, icon: TrendingUp, color: "purple" },
          { label: "Đối tác Affiliate", value: totalAffiliates, sub: "đã đăng ký affiliate", icon: Gift, color: "orange" },
          { label: "Qua referral", value: referralCount, sub: "trong 10 đăng ký gần nhất", icon: Activity, color: "pink" },
        ].map((s) => {
          const bg: Record<string, string> = { blue: "bg-blue-50 text-blue-600", indigo: "bg-indigo-50 text-indigo-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600", orange: "bg-orange-50 text-orange-600", pink: "bg-pink-50 text-pink-600" };
          return (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bg[s.color]}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
              <div className="text-sm font-semibold text-gray-700 mt-0.5">{s.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link href="/admin/referrals" className="group bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white hover:shadow-lg transition-shadow">
          <Gift className="w-8 h-8 mb-3 opacity-80" />
          <h3 className="font-bold text-lg">Affiliate & Referral</h3>
          <p className="text-blue-200 text-sm mt-1">Xem danh sách đối tác, hoa hồng, và leaderboard giới thiệu</p>
          <div className="mt-4 text-sm font-semibold opacity-80 group-hover:opacity-100">Xem báo cáo →</div>
        </Link>
        <Link href="/affiliate" target="_blank" className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
          <Users className="w-8 h-8 mb-3 text-green-600" />
          <h3 className="font-bold text-lg text-gray-900">Trang Affiliate Public</h3>
          <p className="text-gray-500 text-sm mt-1">Landing page cho đối tác mới đăng ký</p>
          <div className="mt-4 text-sm font-semibold text-green-600 group-hover:text-green-700">Xem trang →</div>
        </Link>
        <Link href="/admin/audit" className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
          <ShieldCheck className="w-8 h-8 mb-3 text-slate-500" />
          <h3 className="font-bold text-lg text-gray-900">Audit Log</h3>
          <p className="text-gray-500 text-sm mt-1">Nhật ký mỗi lần truy cập vào tài khoản công ty</p>
          <div className="mt-4 text-sm font-semibold text-slate-600 group-hover:text-slate-800">Xem nhật ký →</div>
        </Link>
      </div>

      {/* Three columns */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent companies */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Đăng ký gần nhất</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentCompanies.map((c) => (
              <div key={c.id} className="px-6 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{c.slug}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.plan === "pro" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {c.plan === "pro" ? "Pro" : "Free"}
                  </span>
                  {(c.referredBy || c.affiliateCode) && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">ref</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 shrink-0">{fmtDate(c.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent audit */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Truy cập gần nhất</h2>
            <Link href="/admin/audit" className="text-xs text-blue-600 hover:underline">Xem tất cả →</Link>
          </div>
          {recentAccessLogs.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Chưa có bản ghi</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentAccessLogs.map((log) => (
                <div key={log.id} className="px-6 py-3 flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${log.action === "enter" ? "bg-blue-50" : "bg-gray-50"}`}>
                    {log.action === "enter" ? <Activity className="w-3.5 h-3.5 text-blue-500" /> : <Activity className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{log.company.name}</p>
                    <p className="text-xs text-gray-400">{log.action === "enter" ? "Đi vào" : "Thoát"}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">{fmtDate(log.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Thanh toán gần nhất</h2>
          </div>
          {recentPayments.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Chưa có thanh toán nào</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentPayments.map((p) => (
                <div key={p.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.company.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.reference}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-700">{fmtCurrency(p.amount)}</p>
                    <p className="text-xs text-gray-400">{p.paidAt ? fmtDate(p.paidAt) : "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
