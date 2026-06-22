"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mail, KeyRound, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AffiliateLoginPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();

  const [step, setStep]         = useState<"email" | "otp">("email");
  const [email, setEmail]       = useState("");
  const [otp, setOtp]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [resendLeft, setResendLeft] = useState(0);

  const sendOTP = async () => {
    if (!email.trim()) { setError("Vui lòng nhập email"); return; }
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/affiliate/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: params.code, email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Lỗi gửi mã"); return; }
      setStep("otp");
      // Countdown 60s before resend
      setResendLeft(60);
      const t = setInterval(() => setResendLeft((n) => { if (n <= 1) { clearInterval(t); return 0; } return n - 1; }), 1000);
    } catch {
      setError("Lỗi kết nối, thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp.trim() || otp.length < 6) { setError("Vui lòng nhập đủ 6 chữ số"); return; }
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/affiliate/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: params.code, email, otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Mã không đúng"); return; }
      router.push(`/affiliate/${params.code}`);
      router.refresh();
    } catch {
      setError("Lỗi kết nối, thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-white font-bold text-xl mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-black">T</span>
            </div>
            Timio · Đối tác
          </div>
          <p className="text-blue-300 text-sm">Dashboard affiliate</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">

          {step === "email" ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">Xác thực đăng nhập</h1>
                  <p className="text-xs text-gray-500">Nhập email đã đăng ký để nhận mã OTP</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email của bạn</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendOTP()}
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={sendOTP}
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {loading ? "Đang gửi..." : "Gửi mã OTP"}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">Nhập mã xác thực</h1>
                  <p className="text-xs text-gray-500">Mã 6 số đã gửi đến <strong>{email}</strong></p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-700">Email đã gửi — kiểm tra hộp thư, kể cả thư mục Spam</p>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mã OTP (6 chữ số)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && verifyOTP()}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono text-center text-2xl tracking-widest focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                  autoFocus
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={verifyOTP}
                disabled={loading || otp.length < 6}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm mb-3"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {loading ? "Đang xác thực..." : "Xác nhận"}
              </button>

              <div className="text-center">
                {resendLeft > 0 ? (
                  <p className="text-xs text-gray-400">Gửi lại sau {resendLeft}s</p>
                ) : (
                  <button
                    onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Không nhận được? Gửi lại mã
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-center text-blue-400 text-xs mt-6">
          Mã xác thực có hiệu lực 15 phút · Session lưu 7 ngày
        </p>
      </div>
    </div>
  );
}
