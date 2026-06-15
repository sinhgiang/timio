import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Building2, Users, Crown } from "lucide-react";

export default async function SuperAdminPage() {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      admins: { select: { email: true }, take: 1 },
      _count: { select: { employees: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý khách hàng</h1>
          <p className="text-gray-400 text-sm mt-1">{companies.length} công ty đang hoạt động</p>
        </div>
        <Link
          href="/super-admin/new"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo tài khoản mới
        </Link>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Công ty</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email admin</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gói</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nhân viên</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ngày tạo</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Kiosk URL</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-700 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-gray-300" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{c.name}</p>
                      <p className="text-gray-500 text-xs">{c.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300 text-sm">{c.admins[0]?.email ?? "—"}</td>
                <td className="px-6 py-4">
                  {c.plan === "business" ? (
                    <span className="inline-flex items-center gap-1 bg-slate-700/60 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Crown className="w-3 h-3" /> Business
                    </span>
                  ) : c.plan === "pro" ? (
                    <span className="inline-flex items-center gap-1 bg-yellow-900/40 text-yellow-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Crown className="w-3 h-3" /> Pro
                    </span>
                  ) : (
                    <span className="inline-block bg-gray-800 text-gray-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                      Free
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-gray-300 text-sm">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    {c._count.employees}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-6 py-4">
                  <a
                    href={`/checkin/${c.slug}`}
                    target="_blank"
                    className="text-purple-400 hover:text-purple-300 text-xs font-mono underline-offset-2 hover:underline"
                  >
                    /checkin/{c.slug}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {companies.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Chưa có công ty nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
