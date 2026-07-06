"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Clock, CreditCard, Copy, RefreshCw, Crown, Building2, Zap } from "lucide-react";
import { Suspense } from "react";

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

const PLANS = {
  pro: {
    name: "Pro",
    price: 299000,
    color: "blue",
    icon: Crown,
    tagline: "Doanh nghiệp đang phát triển",
    features: [
      "20 nhân viên · 3 chi nhánh",
      "3 người dùng (chủ + 2 thành viên)",
      "Trợ lý AI hội thoại (giọng nói) — 100 tin/ngày mỗi người",
      "Chấm công khuôn mặt AI + QR code",
      "GPS xác minh vị trí",
      "Quản lý nghỉ phép (kiosk + phiếu duyệt)",
      "Đổi ca cho nhau + nhiều ca/ngày",
      "Duyệt về sớm · Kỷ luật lao động",
      "Phân tích xu hướng trễ/vắng",
      "Báo cáo tùy chỉnh + tổng kết năm",
      "Import từ Tanca / Amis / Base HRM",
      "Xuất Excel mọi báo cáo",
      "Lưu dữ liệu 1 năm",
      "Thông báo Email + Telegram + Zalo",
      "Hỗ trợ qua email",
    ],
  },
  business: {
    name: "Business",
    price: 799000,
    color: "slate",
    icon: Building2,
    tagline: "Doanh nghiệp lớn, nhiều chi nhánh",
    features: [
      "100 nhân viên · 20 chi nhánh",
      "Không giới hạn người dùng quản lý",
      "Tất cả tính năng Pro",
      "Trợ lý AI hội thoại — KHÔNG giới hạn tin nhắn",
      "Phiếu duyệt A4 có chữ ký số + dấu công ty",
      "Tài sản bàn giao nhân viên",
      "Lịch sử công tác & chứng chỉ",
      "Quản lý hợp đồng lao động",
      "Tính BHXH & TNCN tự động",
      "Giới hạn IP đăng nhập admin",
      "Báo cáo nâng cao + so sánh chi nhánh",
      "Lưu dữ liệu 3 năm",
      "Thông báo Email + Telegram + Zalo",
      "Hỗ trợ ưu tiên (phản hồi trong 4h)",
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;

const DISCOUNTS: Record<number, number> = { 1: 0, 3: 5, 6: 10, 12: 15, 24: 20 };

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

function BillingContent() {
  const searchParams = useSearchParams();
  const defaultPlan = (searchParams.get("plan") === "business" ? "business" : "pro") as PlanKey;

  const [companyPlan, setCompanyPlan] = useState<{ plan: string; planExpires?: string } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(defaultPlan);
  const [months, setMonths] = useState(1);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "completed" | "expired">("idle");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const plan = PLANS[selectedPlan];
  const discount = DISCOUNTS[months] ?? 0;
  const discountedPrice = Math.round(plan.price * (1 - discount / 100));
  const totalPrice = discountedPrice * months;
  const savedPerMonth = plan.price - discountedPrice;

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
        body: JSON.stringify({ plan: selectedPlan, months, discount }),
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
    if (data.status === "completed") setPaymentStatus("completed");
    else if (data.status === "expired") setPaymentStatus("expired");
  }, [order]);

  useEffect(() => {
    fetch("/api/company/plan").then((r) => r.json()).then((d) => setCompanyPlan(d)).catch(() => {});
  }, [paymentStatus]);

  useEffect(() => {
    if (paymentStatus !== "pending") return;
    const id = setInterval(checkStatus, 5000);
    return () => clearInterval(id);
  }, [paymentStatus, checkStatus]);

  const currentPlan = companyPlan?.plan ?? "starter";
  const planExpires = companyPlan?.planExpires ? new Date(companyPlan.planExpires) : null;

  if (paymentStatus === "completed") {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h1>
        <p className="text-gray-600 mb-6">Tài khoản đã được nâng cấp lên gói <strong>{plan.name}</strong>.</p>
        <a href="/dashboard" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700">
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
              {currentPlan === "business" ? (
                <><Building2 className="w-5 h-5 text-slate-700" /><span className="text-lg font-bold text-slate-700">Business</span></>
              ) : currentPlan === "pro" ? (
                <><Crown className="w-5 h-5 text-yellow-500" /><span className="text-lg font-bold text-yellow-600">Pro</span></>
              ) : (
                <span className="text-lg font-bold text-gray-700">Starter (Miễn phí)</span>
              )}
            </div>
          </div>
          {planExpires && currentPlan !== "starter" ? (
            <div className="text-right">
              <p className="text-sm text-gray-500">Hết hạn</p>
              <p className="font-medium text-gray-900">{planExpires.toLocaleDateString("vi-VN")}</p>
            </div>
          ) : currentPlan === "starter" ? (
            <div className="text-right">
              <p className="text-sm text-gray-500">Giới hạn</p>
              <p className="font-medium text-gray-700">15 nhân viên · 1 chi nhánh</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Plan selector */}
      {!order && (
        <>
          <div className="flex gap-3 mb-6">
            {(["pro", "business"] as PlanKey[]).map((key) => {
              const p = PLANS[key];
              const isActive = selectedPlan === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`flex-1 rounded-2xl p-5 border-2 text-left transition-all ${
                    isActive
                      ? key === "business"
                        ? "border-slate-800 bg-slate-900 text-white"
                        : "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p.icon className={`w-4 h-4 ${isActive ? (key === "business" ? "text-white" : "text-blue-600") : "text-gray-400"}`} />
                    <span className={`font-bold ${isActive ? (key === "business" ? "text-white" : "text-gray-900") : "text-gray-600"}`}>
                      {p.name}
                    </span>
                    {key === "pro" && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold ml-auto">PHỔ BIẾN</span>
                    )}
                  </div>
                  <div className={`text-2xl font-extrabold ${isActive && key === "business" ? "text-white" : "text-gray-900"}`}>
                    {p.price.toLocaleString("vi-VN")}đ
                    <span className={`text-xs font-normal ml-1 ${isActive && key === "business" ? "text-slate-300" : "text-gray-400"}`}>/tháng</span>
                  </div>
                  <p className={`text-xs mt-1 ${isActive && key === "business" ? "text-slate-400" : "text-gray-400"}`}>{p.tagline}</p>
                </button>
              );
            })}
          </div>

          {/* Selected plan detail */}
          <div className={`rounded-2xl p-6 text-white mb-6 ${selectedPlan === "business" ? "bg-gradient-to-br from-slate-700 to-slate-900" : "bg-gradient-to-br from-blue-600 to-blue-800"}`}>
            <div className="flex items-center gap-2 mb-1">
              {selectedPlan === "business" ? <Building2 className="w-5 h-5 text-slate-300" /> : <Crown className="w-5 h-5 text-yellow-300" />}
              <span className="font-bold text-lg">Gói {plan.name}</span>
            </div>
            <p className={`text-sm mb-5 ${selectedPlan === "business" ? "text-slate-400" : "text-blue-100"}`}>{plan.tagline}</p>

            <ul className="space-y-1.5 text-sm mb-5 grid grid-cols-2 gap-x-4">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${selectedPlan === "business" ? "text-emerald-400" : "text-green-300"}`} />
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
                        ? "bg-white text-gray-900"
                        : selectedPlan === "business" ? "bg-slate-600 text-white hover:bg-slate-500" : "bg-blue-700 text-white hover:bg-blue-600"
                    }`}
                  >
                    <span>{m} tháng</span>
                    {d > 0 && (
                      <span className={`text-xs font-bold leading-none mt-0.5 ${months === m ? "text-green-600" : "text-green-300"}`}>-{d}%</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-end justify-between mb-5">
              <div>
                <p className={`text-sm ${selectedPlan === "business" ? "text-slate-400" : "text-blue-200"}`}>Tổng thanh toán</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">{formatVND(totalPrice)}</p>
                  {discount > 0 && (
                    <p className={`line-through text-lg ${selectedPlan === "business" ? "text-slate-500" : "text-blue-300"}`}>
                      {formatVND(plan.price * months)}
                    </p>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${selectedPlan === "business" ? "text-slate-400" : "text-blue-200"}`}>
                  {formatVND(discountedPrice)}/tháng × {months} tháng
                  {discount > 0 && <span className="text-green-300 ml-1">(tiết kiệm {formatVND(savedPerMonth * months)})</span>}
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
              className={`w-full font-bold py-3 rounded-xl disabled:opacity-60 transition-colors flex items-center justify-center gap-2 ${
                selectedPlan === "business"
                  ? "bg-white text-slate-900 hover:bg-slate-100"
                  : "bg-white text-blue-700 hover:bg-blue-50"
              }`}
            >
              <Zap className="w-4 h-4" />
              {loading ? "Đang tạo đơn..." : `Thanh toán gói ${plan.name}`}
            </button>
          </div>
        </>
      )}

      {/* Payment order */}
      {order && paymentStatus === "pending" && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Thông tin chuyển khoản</p>
              <p className="text-sm text-gray-600">Gói {plan.name} · {months} tháng · {formatVND(order.amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" /> Hết hạn sau
              </p>
              <CountdownTimer expiresAt={order.expiresAt} />
            </div>
          </div>

          <div className="p-6 flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.qrUrl} alt="QR chuyển khoản" className="w-48 h-48 rounded-xl border border-gray-200" />
              <p className="text-xs text-center text-gray-500 mt-2">Quét để chuyển khoản</p>
            </div>
            <div className="flex-1 space-y-3">
              {[
                { label: "Ngân hàng",    value: order.bankName,      copy: false },
                { label: "Số tài khoản", value: order.accountNumber, copy: true, field: "account" },
                { label: "Chủ tài khoản",value: order.accountName,  copy: false },
                { label: "Số tiền",      value: formatVND(order.amount), copy: true, field: "amount", copyValue: String(order.amount) },
                { label: "Nội dung CK",  value: order.transferNote,  copy: true, field: "note", highlight: true },
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
                      {copied === item.field ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
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
            <button onClick={() => { setOrder(null); setPaymentStatus("idle"); }} className="text-sm text-gray-500 hover:text-gray-700">
              Huỷ
            </button>
            <button onClick={checkStatus} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <RefreshCw className="w-4 h-4" /> Kiểm tra thanh toán
            </button>
          </div>
        </div>
      )}

      {paymentStatus === "expired" && (
        <div className="text-center py-8">
          <p className="text-red-600 font-medium mb-4">Đơn thanh toán đã hết hạn.</p>
          <button onClick={() => { setOrder(null); setPaymentStatus("idle"); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Tạo đơn mới
          </button>
        </div>
      )}

    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  );
}
