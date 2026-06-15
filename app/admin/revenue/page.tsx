import { prisma } from "@/lib/prisma";
import { DollarSign, TrendingUp, CreditCard, Calendar } from "lucide-react";

function fmtCurrency(n: number) { return n.toLocaleString("vi-VN") + "đ"; }
function fmtDate(d: Date) { return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); }

export default async function AdminRevenuePage() {
  const [payments, summary] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "completed" },
      orderBy: { paidAt: "desc" },
      include: { company: { select: { name: true, slug: true } } },
    }),
    prisma.payment.aggregate({ where: { status: "completed" }, _sum: { amount: true }, _count: true }),
  ]);

  const totalRevenue = summary._sum.amount ?? 0;
  const totalCount = summary._count;

  // Group by month
  const byMonth = new Map<string, number>();
  for (const p of payments) {
    if (!p.paidAt) continue;
    const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + p.amount);
  }
  const monthlyData = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);

  const thisMonth = new Date();
  const thisMonthKey = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthRevenue = byMonth.get(thisMonthKey) ?? 0;
  const lastMonthDate = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthRevenue = byMonth.get(lastMonthKey) ?? 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">Doanh thu</h1>
        <p className="text-gray-500 text-sm mt-1">Tổng hợp tất cả giao dịch đã hoàn thành</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Tổng doanh thu", value: fmtCurrency(totalRevenue), sub: "lũy kế", icon: DollarSign, color: "green" },
          { label: "Tháng này", value: fmtCurrency(thisMonthRevenue), sub: lastMonthRevenue > 0 ? `tháng trước ${fmtCurrency(lastMonthRevenue)}` : "—", icon: Calendar, color: "blue" },
          { label: "Tổng đơn", value: totalCount, sub: "giao dịch Pro", icon: CreditCard, color: "purple" },
          { label: "Giá trị TB", value: totalCount > 0 ? fmtCurrency(Math.round(totalRevenue / totalCount)) : "—", sub: "mỗi đơn", icon: TrendingUp, color: "yellow" },
        ].map((s) => {
          const bg: Record<string, string> = { green: "bg-green-50 text-green-600", blue: "bg-blue-50 text-blue-600", purple: "bg-purple-50 text-purple-600", yellow: "bg-yellow-50 text-yellow-600" };
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

      {/* Monthly summary */}
      {monthlyData.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Doanh thu theo tháng</h2>
          <div className="space-y-3">
            {monthlyData.map(([month, amount]) => {
              const maxAmount = Math.max(...monthlyData.map((m) => m[1]));
              const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
              const [y, m] = month.split("-");
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 w-20 shrink-0">T{m}/{y}</span>
                  <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden">
                    <div className="h-full bg-blue-100 rounded-lg flex items-center px-3 transition-all" style={{ width: `${pct}%`, minWidth: "2rem" }}>
                      <span className="text-xs font-bold text-blue-700 whitespace-nowrap">{fmtCurrency(amount)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Lịch sử giao dịch ({payments.length})</h2>
        </div>
        {payments.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Chưa có giao dịch nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Công ty</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Mã giao dịch</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-medium">Tháng</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">Số tiền</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Ngày thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-gray-800">{p.company.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.company.slug}</p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{p.reference}</td>
                    <td className="px-4 py-3.5 text-center text-gray-600">{p.months} tháng</td>
                    <td className="px-4 py-3.5 text-right font-bold text-green-700">{fmtCurrency(p.amount)}</td>
                    <td className="px-6 py-3.5 text-gray-500 text-xs">{p.paidAt ? fmtDate(p.paidAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
