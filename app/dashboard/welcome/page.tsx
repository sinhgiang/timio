"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  CheckCircle,
  ArrowRight,
  Zap,
  Users,
  BarChart3,
  Bell,
  Shield,
  X,
  Clock,
} from "lucide-react";

const PROMO_PRICE = 150000;
const REGULAR_PRICE = 299000;
const BUSINESS_PRICE = 799000;
const PROMO_MONTHS = 2;

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<{
    reference: string;
    qrUrl: string;
    amount: number;
    accountNumber: string;
    accountName: string;
    bankName: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const dismiss = () => {
    localStorage.setItem("timio_upsell_seen", "1");
    router.replace("/dashboard");
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", months: PROMO_MONTHS, promo: "welcome" }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
        localStorage.setItem("timio_upsell_seen", "1");
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white text-center">
            <Crown className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
            <h2 className="text-xl font-bold">Chuyển khoản để kích hoạt Pro</h2>
            <p className="text-blue-100 text-sm mt-1">Hệ thống tự động xác nhận trong vài giây</p>
          </div>

          <div className="p-6">
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.qrUrl} alt="QR chuyển khoản" className="w-52 h-52 rounded-2xl border border-gray-100 shadow" />
            </div>

            <div className="space-y-3 mb-5">
              {[
                { label: "Ngân hàng", value: order.bankName },
                { label: "Số tài khoản", value: order.accountNumber, copyable: true },
                { label: "Chủ tài khoản", value: order.accountName },
                { label: "Số tiền", value: fmt(order.amount), copyable: true, copyVal: String(order.amount) },
                { label: "Nội dung CK", value: order.reference, copyable: true, highlight: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-28 shrink-0">{item.label}</span>
                  <span className={`text-sm font-medium flex-1 ${item.highlight ? "text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded" : "text-gray-800"}`}>
                    {item.value}
                  </span>
                  {item.copyable && (
                    <button onClick={() => copy(item.copyVal ?? item.value)} className="text-gray-300 hover:text-blue-500 transition-colors text-xs">
                      {copied ? "✓" : "copy"}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm mb-4">
              ⚠️ Nhập đúng nội dung <strong>{order.reference}</strong> để hệ thống tự xác nhận.
            </div>

            <button
              onClick={() => router.replace("/dashboard/billing?ref=" + order.reference)}
              className="w-full text-center text-blue-600 text-sm font-medium py-2 hover:underline"
            >
              Xem trạng thái thanh toán →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">

        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span className="bg-yellow-400 text-yellow-900 font-bold text-sm px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Zap className="w-4 h-4" />
            ƯU ĐÃI CHỈ DÀNH CHO THÀNH VIÊN MỚI
          </span>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-7 text-center text-white">
            <Crown className="w-10 h-10 text-yellow-300 mx-auto mb-3" />
            <h1 className="text-2xl font-extrabold mb-2">
              Nâng cấp Pro với giá đặc biệt
            </h1>
            <p className="text-blue-100 text-sm">
              Chào mừng bạn đến Timio — hãy bắt đầu đúng cách ngay hôm nay
            </p>
          </div>

          <div className="px-8 py-7">
            {/* Price comparison */}
            <div className="flex items-center justify-center gap-6 mb-7 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Giá thường</p>
                <p className="text-2xl font-bold text-gray-300 line-through">{fmt(REGULAR_PRICE)}</p>
                <p className="text-xs text-gray-400">/tháng</p>
              </div>
              <ArrowRight className="w-6 h-6 text-blue-400 shrink-0" />
              <div className="text-center">
                <p className="text-xs text-blue-600 font-bold mb-1">GIÁ ƯU ĐÃI</p>
                <p className="text-4xl font-extrabold text-blue-700">{fmt(PROMO_PRICE)}</p>
                <p className="text-xs text-blue-500 font-medium">/tháng × {PROMO_MONTHS} tháng đầu</p>
              </div>
            </div>

            {/* Savings callout */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-6">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-green-800 text-sm font-medium">
                Tiết kiệm <strong>{fmt((REGULAR_PRICE - PROMO_PRICE) * PROMO_MONTHS)}</strong> trong {PROMO_MONTHS} tháng đầu — sau đó {fmt(REGULAR_PRICE)}/tháng
              </p>
            </div>

            {/* What you get */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Gói Pro bao gồm</p>
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {[
                { icon: Users, text: "30 nhân viên, 5 chi nhánh" },
                { icon: BarChart3, text: "Báo cáo đầy đủ + so sánh chi nhánh" },
                { icon: Bell, text: "Cảnh báo Telegram tức thì" },
                { icon: Shield, text: "Quản lý nghỉ phép & lương tháng 13" },
                { icon: Clock, text: "Lưu dữ liệu 1 năm" },
                { icon: Zap, text: "Xuất Excel 1 click" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2 text-sm text-gray-700">
                  <Icon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            {/* Business upsell hint */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">Cần nhiều hơn? Gói Business</p>
                <p className="text-xs text-slate-400 mt-0.5">100 nhân viên · 20 chi nhánh · Lưu 3 năm</p>
              </div>
              <a href="/dashboard/billing?plan=business" onClick={() => { localStorage.setItem("timio_upsell_seen", "1"); }} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-700 shrink-0">
                799.000đ/tháng →
              </a>
            </div>

            {/* CTA */}
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg py-4 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              {loading ? "Đang tạo đơn..." : (
                <>
                  <Crown className="w-5 h-5 text-yellow-300" />
                  Nhận ngay ưu đãi {fmt(PROMO_PRICE)}/tháng
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-center text-gray-400 text-xs mt-3">
              Tổng thanh toán: <strong className="text-gray-600">{fmt(PROMO_PRICE * PROMO_MONTHS)}</strong> cho {PROMO_MONTHS} tháng · Không tự động gia hạn
            </p>
          </div>
        </div>

        {/* Skip link — small, subtle */}
        <div className="text-center mt-6">
          <button
            onClick={dismiss}
            className="inline-flex items-center gap-1.5 text-blue-300 hover:text-white text-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Không cần, tôi chỉ dùng gói miễn phí
          </button>
        </div>

      </div>
    </div>
  );
}
