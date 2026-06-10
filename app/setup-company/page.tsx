"use client";

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Clock, Building2 } from "lucide-react";

function SetupCompanyForm() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const email = session?.user?.email ?? "";
  const name = session?.user?.name ?? "";

  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/setup-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, companyName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Lỗi tạo công ty"); setLoading(false); return; }

      // Refresh JWT (triggers jwt callback with trigger="update") → companyId set
      await update();
      router.push("/dashboard");
    } catch {
      setError("Có lỗi xảy ra, vui lòng thử lại");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Timio</span>
        </div>
        <p className="text-blue-200 text-sm">Xin chào <strong className="text-white">{name || email}</strong>!</p>
        <p className="text-blue-300/70 text-sm mt-1">Chỉ còn một bước nữa để bắt đầu</p>
      </div>

      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl shadow-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">{(name || email).charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{name || "Người dùng mới"}</p>
              <p className="text-blue-300/70 text-xs">{email}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5 uppercase tracking-wide">
              <Building2 className="inline w-3.5 h-3.5 mr-1" />
              Tên công ty của bạn
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="VD: Công ty TNHH ABC"
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
            <p className="text-blue-300/50 text-xs mt-1">Tên này sẽ hiển thị trên dashboard và báo cáo của bạn.</p>
          </div>

          {error && (
            <p className="text-red-300 text-xs text-center bg-red-500/10 rounded-lg py-2 px-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !companyName.trim()}
            className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? "Đang tạo tài khoản..." : "Bắt đầu sử dụng Timio →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetupCompanyPage() {
  return <SetupCompanyForm />;
}
