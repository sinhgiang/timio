"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Clock, CreditCard, Copy, RefreshCw, Crown } from "lucide-react";

interface PaymentOrder {
  reference: string;
  amount: number;
  expiresAt: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferNote: string;
  qrUrl: string;
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Hết hạn"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return <span className="font-mono text-orange-600">{remaining}</span>;
}

export default function BillingPage() {
  const [companyPlan, setCompanyPlan] = useState<{ plan: string; planExpires?: string } | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "completed" | "expired">("idle");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [months, setMonths] = useState(1);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const createPayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", months, discount }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
        setPaymentStatus("pending");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = useCallback(async () => {
    if (!order) return;
    const res = await fetch(`/api/payment/status/${order.reference}`);
    const data = await res.json();
    if (data.status === "completed") {
      setPaymentStatus("completed");
    } else if (data.status === "expired") {
      setPaymentStatus("expired");
    }
  }, [order]);

  // Fetch company plan on mount
  useEffect(() => {
    fetch("/api/company/plan")
      .then((r) => r.json())
      .then((d) => setCompanyPlan(d))
      .catch(() => {});
  }, [paymentStatus]); // re-fetch after payment completes

  // Poll every 5s while pending
  useEffect(() => {
    if (paymentStatus !== "pending") return;
    const id = setInterval(checkStatus, 5000);
    return () => clearInterval(id);
  }, [paymentStatus, checkStatus]);

  const isPro = companyPlan?.plan === "pro";
  const planExpires = companyPlan?.planExpires ? new Date(companyPlan.planExpires) : null;

  const PRICE_PER_MONTH = 299000;
  const DISCOUNTS: Record<number, number> = { 1: 0, 3: 5, 6: 10, 12: 15, 24: 20 };
  const discount = DISCOUNTS[months] ?? 0;
  const discountedPrice = Math.round(PRICE_PER_MONTH * (1 - discount / 100));
  const totalPrice = discountedPrice * months;
  const savedPerMonth = PRICE_PER_MONTH - discountedPrice;

  if (paymentStatus === "completed") {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h1>
        <p className="text-gray-600 mb-6">Tài khoản đã được nâng cấp lên gói Pro.</p>
        <a
          href="/dashboard"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Về trang tổng quan
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <CreditCard className="w-7 h-7 text-blue-600" />
        Quản lý gói dịch vụ
      </h1>
      <p className="text-gray-600 mb-8">Nâng cấp để mở khóa toàn bộ tính năng Timio.</p>

      {/* Current plan */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Gói hiện tại</p>
            <div className="flex items-center gap-2">
              {isPro ? (
                <>
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <span className="text-lg font-bold text-yellow-600">Pro</span>
                </>
              ) : (
                <span className="text-lg font-bold text-gray-700">Miễn phí</span>
              )}
            </div>
          </div>
          {isPro && planExpires && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Hết hạn</p>
              <p className="font-medium text-gray-900">
                {planExpires.toLocaleDateString("vi-VN")}
              </p>
            </div>
          )}
          {!isPro && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Giới hạn</p>
              <p className="font-medium text-gray-700">5 nhân viên</p>
            </div>
          )}
        </div>
      </div>

      {/* Pro plan card */}
      {!order && (
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-yellow-300" />
            <span className="font-bold text-lg">Gói Pro</span>
          </div>
          <p className="text-blue-100 text-sm mb-6">Không giới hạn nhân viên, đầy đủ tính năng</p>

          <ul className="space-y-2 text-sm mb-6">
            {[
              "Nhân viên không giới hạn",
              "Nhiều chi nhánh",
              "Xuất Excel + báo cáo nâng cao",
              "Cảnh báo Telegram tức thì",
              "Hỗ trợ ưu tiên",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {/* Month selector */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {[1, 3, 6, 12, 24].map((m) => {
              const d = DISCOUNTS[m] ?? 0;
              return (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-all flex flex-col items-center ${
                    months === m
                      ? "bg-white text-blue-700"
                      : "bg-blue-700 text-white hover:bg-blue-600"
                  }`}
                >
                  <span>{m} tháng</span>
                  {d > 0 && (
                    <span className={`text-xs font-bold leading-none mt-0.5 ${months === m ? "text-green-600" : "text-green-300"}`}>
                      -{d}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-blue-200 text-sm">Tổng thanh toán</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{formatVND(totalPrice)}</p>
                {discount > 0 && (
                  <p className="text-blue-300 line-through text-lg">{formatVND(PRICE_PER_MONTH * months)}</p>
                )}
              </div>
              <p className="text-blue-200 text-xs mt-0.5">
                {formatVND(discountedPrice)}/tháng × {months} tháng
                {discount > 0 && (
                  <span className="text-green-300 ml-1">(tiết kiệm {formatVND(savedPerMonth * months)})</span>
                )}
              </p>
            </div>
            {discount > 0 && (
              <span className="bg-green-400 text-green-900 text-xs font-bold px-2.5 py-1.5 rounded-full">
                {months === 24 ? "Tiết kiệm nhất 🏆" : months === 12 ? "Giảm 15%" : months === 6 ? "Giảm 10%" : "Giảm 5%"}
              </span>
            )}
          </div>

          <button
            onClick={createPayment}
            disabled={loading}
            className="w-full bg-white text-blue-700 font-bold py-3 rounded-xl hover:bg-blue-50 disabled:opacity-60 transition-colors"
          >
            {loading ? "Đang tạo đơn..." : "Thanh toán ngay"}
          </button>
        </div>
      )}

      {/* Payment order */}
      {order && paymentStatus === "pending" && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Thông tin chuyển khoản</p>
              <p className="text-sm text-gray-600">Gói Pro · {months} tháng · {formatVND(order.amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" /> Hết hạn sau
              </p>
              <CountdownTimer expiresAt={order.expiresAt} />
            </div>
          </div>

          <div className="p-6 flex flex-col md:flex-row gap-6">
            {/* QR code */}
            <div className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.qrUrl}
                alt="QR chuyển khoản"
                className="w-48 h-48 rounded-xl border border-gray-200"
              />
              <p className="text-xs text-center text-gray-500 mt-2">Quét để chuyển khoản</p>
            </div>

            {/* Transfer info */}
            <div className="flex-1 space-y-3">
              {[
                { label: "Ngân hàng", value: order.bankName, copy: false },
                { label: "Số tài khoản", value: order.accountNumber, copy: true, field: "account" },
                { label: "Chủ tài khoản", value: order.accountName, copy: false },
                { label: "Số tiền", value: formatVND(order.amount), copy: true, field: "amount", copyValue: String(order.amount) },
                { label: "Nội dung CK", value: order.transferNote, copy: true, field: "note", highlight: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500 w-28 flex-shrink-0">{item.label}</span>
                  <span className={`font-medium text-sm flex-1 ${item.highlight ? "text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded" : "text-gray-900"}`}>
                    {item.value}
                  </span>
                  {item.copy && (
                    <button
                      onClick={() => copyToClipboard("copyValue" in item ? item.copyValue! : item.value, item.field!)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {copied === item.field ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border-t border-amber-100 px-6 py-3">
            <p className="text-amber-800 text-sm font-medium">
              ⚠️ Nhập đúng nội dung <strong>{order.transferNote}</strong> để hệ thống tự động xác nhận.
            </p>
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => { setOrder(null); setPaymentStatus("idle"); }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Huỷ
            </button>
            <button
              onClick={checkStatus}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Kiểm tra thanh toán
            </button>
          </div>
        </div>
      )}

      {paymentStatus === "expired" && (
        <div className="text-center py-8">
          <p className="text-red-600 font-medium mb-4">Đơn thanh toán đã hết hạn.</p>
          <button
            onClick={() => { setOrder(null); setPaymentStatus("idle"); }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Tạo đơn mới
          </button>
        </div>
      )}
    </div>
  );
}
