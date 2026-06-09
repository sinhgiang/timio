"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email hoặc mật khẩu không đúng");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col items-center justify-center p-6">
      {/* Branding nhỏ */}
      <div className="mb-8 text-center">
        <div className="text-3xl font-bold text-white tracking-tight">
          🕐 <span className="text-blue-300">Timio</span>
        </div>
        <p className="text-blue-400 text-xs mt-1 uppercase tracking-widest">
          Quản lý · Dành cho admin
        </p>
      </div>

      {/* Form gọn */}
      <div className="w-full max-w-xs">
        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              placeholder="admin@congty.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-red-300 text-xs text-center bg-red-500/10 rounded-lg py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="text-center text-blue-500/60 text-xs mt-6">
          Màn hình chấm công nhân viên:{" "}
          <a href="/checkin/demo" className="text-blue-400 hover:text-blue-300 underline">
            /checkin/demo
          </a>
        </p>
      </div>
    </div>
  );
}
