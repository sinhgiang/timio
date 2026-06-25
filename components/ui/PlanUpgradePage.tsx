import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";

interface Props {
  requiredPlan: "pro" | "business";
  feature: string;
  description: string;
  bullets?: string[];
}

/** Full-page upgrade prompt — rendered server-side in locked page components */
export default function PlanUpgradePage({ requiredPlan, feature, description, bullets = [] }: Props) {
  const isPro = requiredPlan === "pro";
  const label = isPro ? "Pro" : "Business";
  const price = isPro ? "299.000đ/tháng" : "799.000đ/tháng";

  return (
    <div className="flex-1 flex items-center justify-center min-h-[70vh] p-6">
      <div className="max-w-md w-full text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
          isPro ? "bg-blue-100" : "bg-purple-100"
        }`}>
          <Lock size={28} className={isPro ? "text-blue-600" : "text-purple-600"} strokeWidth={1.5} />
        </div>

        <div className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 ${
          isPro ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
        }`}>
          Yêu cầu gói {label} · {price}
        </div>

        <h2 className="text-2xl font-extrabold text-gray-900 mb-3">{feature}</h2>
        <p className="text-gray-500 leading-relaxed mb-6">{description}</p>

        {bullets.length > 0 && (
          <ul className="text-left space-y-2 mb-8 bg-gray-50 rounded-xl p-4 border border-gray-100">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                <span className={`mt-0.5 text-base leading-none ${isPro ? "text-blue-500" : "text-purple-500"}`}>✓</span>
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/billing"
            className={`inline-flex items-center justify-center gap-2 font-bold px-6 py-3 rounded-xl transition-colors text-white ${
              isPro ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            Nâng cấp lên {label}
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
          >
            Quay lại tổng quan
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-5">
          Bắt đầu dùng ngay sau khi thanh toán · Không cần cài đặt thêm
        </p>
      </div>
    </div>
  );
}
