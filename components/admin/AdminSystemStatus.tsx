"use client";

import { useState } from "react";
import { Mail, CheckCircle2, XCircle, Send } from "lucide-react";

interface Props {
  smtpConfigured: boolean;
  smtpUser: string;
}

export default function AdminSystemStatus({ smtpConfigured, smtpUser }: Props) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const testEmail = async () => {
    setTesting(true);
    setResult(null);
    const res = await fetch("/api/settings/test-email", { method: "POST" });
    const data = await res.json();
    setResult(
      res.ok
        ? { ok: true, msg: "Email gửi thành công! Kiểm tra hộp thư admin." }
        : { ok: false, msg: data.error ?? "Gửi thất bại" }
    );
    setTesting(false);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-blue-500" />
        <h2 className="font-bold text-gray-900">Email (SMTP)</h2>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {smtpConfigured ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            <span className="text-sm text-green-700 font-medium">Đã cấu hình</span>
            <span className="text-xs text-gray-400 font-mono ml-1">{smtpUser}</span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm text-red-600 font-medium">Chưa cấu hình SMTP</span>
          </>
        )}
      </div>

      <div className="space-y-2 text-xs text-gray-500 mb-4">
        <p>· Tự động gửi khi nhân viên nộp đơn xin nghỉ → email đến admin công ty</p>
        <p>· Tự động gửi khi affiliate có đơn hàng mới → email đến đối tác</p>
      </div>

      <button
        onClick={testEmail}
        disabled={testing}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        <Send className="w-3.5 h-3.5" />
        {testing ? "Đang gửi..." : "Gửi email kiểm tra"}
      </button>

      {result && (
        <p className={`mt-3 text-sm font-medium ${result.ok ? "text-green-600" : "text-red-500"}`}>
          {result.ok ? "✅" : "❌"} {result.msg}
        </p>
      )}
    </div>
  );
}
