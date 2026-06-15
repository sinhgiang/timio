import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Users, TrendingUp, Gift, DollarSign, type LucideIcon } from "lucide-react";

const PRO_PRICE = 299000;

export default async function AdminReferralsPage() {
  const companies = await prisma.company.findMany({
    select: {
      id: true, name: true, slug: true, plan: true,
      planExpires: true, referredBy: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Build referral map: slug → list of referred companies
  const referralMap = new Map<string, typeof companies>();
  for (const c of companies) {
    if (c.referredBy) {
      const list = referralMap.get(c.referredBy) ?? [];
      list.push(c);
      referralMap.set(c.referredBy, list);
    }
  }

  // Referrers: companies that have referred at least 1 other
  const referrers = companies
    .filter((c) => referralMap.has(c.slug))
    .map((c) => {
      const referred = referralMap.get(c.slug) ?? [];
      const converted = referred.filter((r) => r.plan === "pro").length;
      const revenue = converted * PRO_PRICE;
      const commission10 = Math.round(revenue * 0.1);
      return { ...c, referred, converted, revenue, commission10 };
    })
    .sort((a, b) => b.converted - a.converted);

  // Global stats
  const totalReferred = companies.filter((c) => c.referredBy).length;
  const totalConverted = companies.filter((c) => c.referredBy && c.plan === "pro").length;
  const totalRevenue = totalConverted * PRO_PRICE;

  const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("vi-VN");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Báo cáo Referral</h1>
        <p className="text-gray-500 text-sm mt-1">Theo dõi ai đang giới thiệu khách hàng mới cho Timio</p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tổng giới thiệu" value={totalReferred} sub="người đăng ký qua link" Icon={Users} color="blue" />
        <StatCard label="Đã mua Pro" value={totalConverted} sub={`tỷ lệ ${totalReferred ? Math.round(totalConverted / totalReferred * 100) : 0}%`} Icon={TrendingUp} color="green" />
        <StatCard label="Doanh thu từ referral" value={formatCurrency(totalRevenue)} sub="tổng lũy kế" Icon={DollarSign} color="purple" fmt />
        <StatCard label="Hoa hồng ước tính" value={formatCurrency(Math.round(totalRevenue * 0.1))} sub="tối thiểu 10%" Icon={Gift} color="yellow" fmt />
      </div>

      {/* Referrers table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Danh sách người giới thiệu ({referrers.length})</h2>
          <span className="text-xs text-gray-400">Sắp xếp theo số người đã mua Pro</span>
        </div>

        {referrers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Gift size={48} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
            <p>Chưa có ai giới thiệu thành công</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Công ty</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Link giới thiệu</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Đăng ký</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Mua Pro</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Doanh thu</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Tier</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Hoa hồng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {referrers.map((r, i) => {
                  const tier = r.converted >= 21 ? { label: "Vàng", pct: 20, cls: "bg-yellow-100 text-yellow-700" }
                    : r.converted >= 6 ? { label: "Bạc", pct: 15, cls: "bg-gray-100 text-gray-600" }
                    : { label: "Đồng", pct: 10, cls: "bg-orange-100 text-orange-700" };
                  const commission = Math.round(r.revenue * tier.pct / 100);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-800">{r.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.slug} · tham gia {fmtDate(r.createdAt)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          /register?ref={r.slug}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-gray-700">{r.referred.length}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-bold text-green-700">{r.converted}</span>
                        {r.referred.length > 0 && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({Math.round(r.converted / r.referred.length * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-700">{formatCurrency(r.revenue)}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.cls}`}>
                          {tier.label} {tier.pct}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-green-700">
                        {formatCurrency(commission)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Referred companies detail */}
      {referrers.some((r) => r.referred.length > 0) && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Chi tiết — Ai giới thiệu ai</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {referrers.filter((r) => r.referred.length > 0).map((r) => (
              <div key={r.id} className="px-6 py-4">
                <p className="font-semibold text-gray-800 mb-2">
                  {r.name}
                  <span className="ml-2 text-xs text-gray-400 font-normal">→ giới thiệu {r.referred.length} công ty</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {r.referred.map((ref) => (
                    <span key={ref.id} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${
                      ref.plan === "pro"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}>
                      {ref.name}
                      <span className={`font-bold ${ref.plan === "pro" ? "text-green-600" : "text-gray-400"}`}>
                        {ref.plan === "pro" ? "Pro ✓" : "Starter"}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, Icon, color, fmt }: {
  label: string; value: string | number; sub: string;
  Icon: LucideIcon;
  color: string; fmt?: boolean;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100 text-blue-500",
    green: "bg-green-50 border-green-100 text-green-500",
    purple: "bg-purple-50 border-purple-100 text-purple-500",
    yellow: "bg-yellow-50 border-yellow-100 text-yellow-500",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]?.split(" ").slice(0, 2).join(" ")}`}>
      <Icon size={24} className={colors[color]?.split(" ")[2] ?? "text-gray-400"} />
      <div className="mt-3 text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs font-semibold text-gray-700 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
