"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, ArrowRight, RefreshCw } from "lucide-react";

export default function AffiliateLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [otp, setOtp]           = useState("");
  const [step, setStep]         = useState<"email" | "otp">("email");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  const sendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) { setError("Vui lòng nhập email"); return; }
    setLoading(true); setError("");
    const res  = await fetch("/api/affiliate/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Lỗi gửi OTP"); return; }
    setStep("otp");
    startCountdown();
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) { setError("Vui lòng nhập mã OTP"); return; }
    setLoading(true); setError("");
    const res  = await fetch("/api/affiliate/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Mã OTP không đúng"); return; }
    router.push(`/affiliate/${data.code}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-7 text-white text-center">
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
            {step === "email"
              ? <Mail className="w-6 h-6 text-white" strokeWidth={1.5} />
              : <KeyRound className="w-6 h-6 text-white" strokeWidth={1.5} />}
          </div>
          <h1 className="text-xl font-bold mb-1">Đăng nhập Dashboard Đối tác</h1>
          <p className="text-blue-100 text-sm">
            {step === "email"
              ? "Nhập email bạn đã đăng ký làm đối tác Timio"
              : `Nhập mã 6 số đã gửi đến ${email}`}
          </p>
        </div>

        <div className="px-8 py-7">
          {step === "email" ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email đối tác</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {loading ? "Đang gửi..." : <><span>Gửi mã xác thực</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mã xác thực (6 số)</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  autoFocus
                  maxLength={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold tracking-[0.5em] text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {loading ? "Đang xác thực..." : <><span>Xác nhận & Đăng nhập</span><ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ← Đổi email
                </button>
                {countdown > 0 ? (
                  <span className="text-gray-400">Gửi lại sau {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendOtp()}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Gửi lại mã
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              Chưa có tài khoản đối tác?{" "}
              <a href="/affiliate/register" className="text-blue-600 font-medium hover:underline">
                Đăng ký ngay
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
