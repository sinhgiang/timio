"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Building2 } from "lucide-react";

interface Props {
  needsSetup: boolean;
  userEmail: string;
  userName: string;
}

export default function CompanySetupModal({ needsSetup, userEmail, userName }: Props) {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!needsSetup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/setup-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, name: userName, companyName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Lỗi tạo công ty"); setLoading(false); return; }

      // Đăng nhập lại bằng setup token — tạo session mới với companyId
      await signIn("setup", { email: userEmail, token: data.setupToken, callbackUrl: "/dashboard" });
    } catch {
      setError("Có lỗi xảy ra, vui lòng thử lại");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base">Chào mừng đến với Timio!</h2>
            <p className="text-xs text-gray-500 mt-0.5">Đặt tên công ty để bắt đầu (chỉ 1 lần)</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Tên công ty của bạn
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="VD: Công ty TNHH ABC"
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Tên này sẽ được đọc trên kiosk chấm công</p>
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-50 rounded-lg py-2 px-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !companyName.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? "Đang tạo..." : "Xác nhận & vào Dashboard →"}
          </button>
        </form>
      </div>
    </div>
  );
}
