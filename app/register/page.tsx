"use client";

export const dynamic = "force-dynamic";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, Gift } from "lucide-react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";
  const affCode = searchParams.get("aff") ?? "";

  const [form, setForm] = useState({ companyName: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    try {
      // 1. Tạo tài khoản
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: form.companyName, email: form.email, password: form.password, referralCode: refCode || undefined, affiliateCode: affCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Đăng ký thất bại"); return; }

      // 2. Tự động đăng nhập
      const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (result?.error) { setError("Tạo tài khoản thành công nhưng đăng nhập thất bại — vui lòng đăng nhập thủ công"); return; }

      // 3. Vào dashboard
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Timio</span>
        </Link>
        <p className="text-blue-300 text-sm">Tạo tài khoản miễn phí — bắt đầu ngay hôm nay</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Referral / Affiliate banner */}
        {(refCode || affCode) && (
          <div className="bg-green-500/15 border border-green-400/30 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <Gift className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-green-300 text-xs font-semibold">Bạn được giới thiệu bởi một đối tác Timio</p>
              {refCode && <p className="text-green-200/70 text-xs mt-0.5">Khi nâng cấp Pro, cả hai bên được tặng thêm <strong className="text-green-300">30 ngày</strong> miễn phí!</p>}
              {affCode && !refCode && <p className="text-green-200/70 text-xs mt-0.5">Bạn sẽ nhận được hỗ trợ ưu tiên từ đối tác giới thiệu.</p>}
            </div>
          </div>
        )}

        {/* Free tier benefits */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-5 flex flex-wrap gap-x-4 gap-y-2">
          {["Miễn phí mãi mãi", "Tối đa 5 nhân viên", "Chấm công khuôn mặt AI", "Không cần thẻ tín dụng"].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-green-300 text-xs">
              <CheckCircle className="w-3.5 h-3.5" /> {t}
            </span>
          ))}
        </div>

        {/* Google sign up */}
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors shadow-lg mb-4 text-sm"
        >
          <GoogleIcon />
          Đăng ký với Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 border-t border-white/20" />
          <span className="text-blue-300/50 text-xs">hoặc đăng ký bằng email</span>
          <div className="flex-1 border-t border-white/20" />
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">Tên công ty</label>
            <input
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder="VD: Công ty TNHH ABC"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">Email đăng nhập</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="admin@congty.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">Mật khẩu</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">Xác nhận mật khẩu</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>

          {error && (
            <p className="text-red-300 text-xs text-center bg-red-500/10 rounded-lg py-2 px-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản miễn phí"}
          </button>

          <p className="text-center text-blue-300/60 text-xs">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-blue-300 hover:text-white underline-offset-2 hover:underline">
              Đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
