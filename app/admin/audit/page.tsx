import { prisma } from "@/lib/prisma";
import { ShieldCheck, LogIn, LogOut } from "lucide-react";

function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default async function AdminAuditPage() {
  const logs = await prisma.impersonationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { company: { select: { name: true, slug: true } } },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-extrabold text-gray-900">Audit Log — Truy cập hỗ trợ</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Ghi lại mỗi lần Superadmin truy cập vào dashboard công ty · {logs.length} bản ghi gần nhất
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-700">
        Theo Điều khoản dịch vụ (Điều 5), mọi lần truy cập vào tài khoản khách hàng đều được ghi lại tại đây.
        Khách hàng có quyền yêu cầu xuất báo cáo này qua <strong>support@timio.vn</strong>.
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-20 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">Chưa có bản ghi truy cập nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Thời gian</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Hành động</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Công ty</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Quản trị viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 text-gray-500 text-xs font-mono">
                      {fmtDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      {log.action === "enter" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                          <LogIn className="w-3 h-3" /> Đi vào
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                          <LogOut className="w-3 h-3" /> Thoát
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-800">{log.company.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{log.company.slug}</p>
                    </td>
                    <td className="px-6 py-3.5 text-gray-500 text-xs">{log.adminEmail}</td>
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
