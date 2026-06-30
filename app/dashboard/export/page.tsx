import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Download, FileSpreadsheet, Users, Clock, FileText, Banknote } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Xuất dữ liệu" };
export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) redirect("/login");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Xuất dữ liệu</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Tải toàn bộ dữ liệu công ty về file Excel để lưu trữ hoặc phân tích.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <FileSpreadsheet size={22} className="text-green-600" strokeWidth={1.5} />
            <h2 className="font-semibold text-gray-800">File Excel toàn bộ dữ liệu</h2>
          </div>
          <p className="text-sm text-gray-500 ml-9">
            Xuất tất cả dữ liệu vào một file <code className="bg-gray-100 px-1 rounded text-xs">.xlsx</code> với nhiều sheet.
          </p>
        </div>

        <ul className="divide-y divide-gray-50">
          {[
            { icon: Users, label: "Nhân viên", desc: "Thông tin, lương cơ bản, ngày vào làm" },
            { icon: Clock, label: "Chấm công (3 tháng gần nhất)", desc: "Giờ vào/ra, trạng thái, phạt trễ" },
            { icon: FileText, label: "Nghỉ phép", desc: "Tất cả đơn xin nghỉ và trạng thái duyệt" },
            { icon: FileText, label: "Hợp đồng", desc: "Loại hợp đồng, ngày hiệu lực" },
            { icon: Banknote, label: "Lương", desc: "Lịch sử thanh toán lương hàng tháng" },
          ].map(({ icon: Icon, label, desc }) => (
            <li key={label} className="flex items-start gap-3 px-5 py-3">
              <Icon size={16} className="text-gray-400 mt-0.5 shrink-0" strokeWidth={1.5} />
              <div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-xs text-gray-400 block">{desc}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="p-5 border-t border-gray-100 bg-gray-50">
          <a
            href="/api/admin/export"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Download size={16} strokeWidth={2} />
            Tải xuống Excel
          </a>
          <p className="text-xs text-gray-400 mt-2">
            File được tạo ngay lập tức — dữ liệu thời gian thực.
          </p>
        </div>
      </div>
    </div>
  );
}
