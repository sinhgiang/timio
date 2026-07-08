import Link from "next/link";
import { Fragment } from "react";
import { Check, X, Clock, Sparkles, BadgeCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bảng giá — Timio",
  description: "Bảng giá phần mềm chấm công + tuyển dụng AI Timio. Từ ~12.000đ/nhân viên/tháng. Không cần mua máy.",
};

type Row = { label: string; starter: boolean | string; pro: boolean | string; business: boolean | string };

const ROWS: { group: string; rows: Row[] }[] = [
  {
    group: "Chấm công",
    rows: [
      { label: "Chấm công bằng khuôn mặt (điện thoại/kiosk)", starter: true, pro: true, business: true },
      { label: "Chấm công QR + app nhân viên", starter: true, pro: true, business: true },
      { label: "Báo cáo công, đi trễ, tăng ca", starter: true, pro: true, business: true },
      { label: "Nhiều chi nhánh + phân quyền", starter: false, pro: true, business: true },
    ],
  },
  {
    group: "Nhân sự & Lương",
    rows: [
      { label: "Nghỉ phép, đơn từ", starter: false, pro: true, business: true },
      { label: "Bảng lương, phiếu lương, BHXH", starter: false, pro: true, business: true },
      { label: "Hợp đồng, chữ ký số, sơ đồ tổ chức", starter: false, pro: false, business: true },
    ],
  },
  {
    group: "Tuyển dụng",
    rows: [
      { label: "Trang tuyển dụng công ty + đăng tin", starter: false, pro: true, business: true },
      { label: "Quản lý ứng viên (kanban) + tuyển 1 chạm", starter: false, pro: true, business: true },
      { label: "AI viết tin + chấm điểm + đánh giá theo tiêu chí", starter: false, pro: false, business: true },
      { label: "Kho ứng viên XÁC THỰC bằng chấm công", starter: false, pro: false, business: true },
      { label: "AI liên hệ chủ động cựu NV + báo cáo phễu", starter: false, pro: false, business: true },
    ],
  },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check size={17} className="text-green-600 mx-auto" />;
  if (v === false) return <X size={16} className="text-gray-300 mx-auto" />;
  return <span className="text-xs text-gray-600">{v}</span>;
}

export default function PricingPage() {
  const plans = [
    { key: "starter", name: "Khởi đầu", price: "~12.000đ", unit: "/nhân viên/tháng", desc: "Chấm công khuôn mặt cho doanh nghiệp nhỏ", cta: "Dùng thử", href: "/register", highlight: false },
    { key: "pro", name: "Chuyên nghiệp", price: "~20.000đ", unit: "/nhân viên/tháng", desc: "Đủ bộ nhân sự + tuyển dụng cơ bản", cta: "Dùng thử", href: "/register", highlight: true },
    { key: "business", name: "Doanh nghiệp", price: "Liên hệ", unit: "", desc: "Tuyển dụng AI + kho ứng viên xác thực", cta: "Liên hệ tư vấn", href: "mailto:team@timio.vn", highlight: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="max-w-5xl mx-auto px-4 pt-10 pb-6 text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1 rounded-full mb-3">
          <Clock size={13} /> Timio
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Bảng giá đơn giản, minh bạch</h1>
        <p className="text-gray-500 mt-2 max-w-xl mx-auto">Chấm công bằng khuôn mặt — <b>không cần mua máy ~4 triệu</b>, chỉ cần điện thoại. Nâng cấp lên tuyển dụng AI khi cần.</p>
      </header>

      {/* 3 gói */}
      <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-4 mb-10">
        {plans.map((p) => (
          <div key={p.key} className={`rounded-3xl border bg-white p-6 flex flex-col ${p.highlight ? "border-blue-400 ring-2 ring-blue-100 shadow-lg" : "border-gray-200"}`}>
            {p.highlight && <span className="self-start text-[11px] font-bold text-white bg-blue-600 px-2.5 py-1 rounded-full mb-2">Phổ biến nhất</span>}
            <h2 className="text-lg font-bold text-gray-800">{p.name}</h2>
            <p className="text-sm text-gray-500 mb-4 min-h-[40px]">{p.desc}</p>
            <div className="mb-4">
              <span className="text-3xl font-extrabold text-gray-900">{p.price}</span>
              {p.unit && <span className="text-sm text-gray-400"> {p.unit}</span>}
            </div>
            <Link href={p.href} className={`text-center rounded-xl py-2.5 font-medium text-sm transition-colors ${p.highlight ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Bảng so sánh chi tiết */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-5 py-3 font-semibold">Tính năng</th>
                  <th className="px-4 py-3 font-semibold text-center">Khởi đầu</th>
                  <th className="px-4 py-3 font-semibold text-center bg-blue-50 text-blue-700">Chuyên nghiệp</th>
                  <th className="px-4 py-3 font-semibold text-center">Doanh nghiệp</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((g) => (
                  <Fragment key={g.group}>
                    <tr className="bg-gray-50/50">
                      <td colSpan={4} className="px-5 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">{g.group}</td>
                    </tr>
                    {g.rows.map((r, i) => (
                      <tr key={`${g.group}-${i}`} className="border-t border-gray-50">
                        <td className="px-5 py-2.5 text-gray-700">{r.label}</td>
                        <td className="px-4 py-2.5 text-center"><Cell v={r.starter} /></td>
                        <td className="px-4 py-2.5 text-center bg-blue-50/40"><Cell v={r.pro} /></td>
                        <td className="px-4 py-2.5 text-center"><Cell v={r.business} /></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Điểm khác biệt */}
        <div className="grid sm:grid-cols-2 gap-3 mt-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start gap-2.5">
            <BadgeCheck size={20} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={1.6} />
            <p className="text-sm text-gray-700"><b>Hồ sơ ứng viên xác thực bằng chấm công</b> — bằng chứng khách quan về đúng giờ, chuyên cần, thâm niên. Điều mà job board thông thường không có.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start gap-2.5">
            <Sparkles size={20} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={1.6} />
            <p className="text-sm text-gray-700"><b>Tuyển dụng AI có kiểm soát</b> — AI tìm người + soạn tin, bạn duyệt và bấm gửi. Đúng luật, không spam.</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">Giá tham khảo, có thể thay đổi theo quy mô. Liên hệ để được tư vấn gói phù hợp.</p>
      </div>
    </div>
  );
}
