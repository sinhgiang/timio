"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  slug: string;
  jobId: string;
  jobTitle: string;
}

export default function ApplyForm({ slug, jobId, jobTitle }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [experience, setExperience] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [company, setCompany] = useState(""); // honeypot — người thật để trống

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = /^0\d{9}$/.test(phone.replace(/[\s.]/g, ""));
  const canSubmit = name.trim().length >= 2 && phoneValid && !submitting;

  async function submit() {
    setError(null);
    if (name.trim().length < 2) {
      setError("Vui lòng nhập họ tên của bạn.");
      return;
    }
    if (!phoneValid) {
      setError("Số điện thoại chưa đúng. Nhập 10 số, bắt đầu bằng 0 (VD: 0912345678).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          jobId,
          name: name.trim(),
          phone: phone.replace(/[\s.]/g, ""),
          email: email.trim() || null,
          birthYear: birthYear.trim() || null,
          experience: experience.trim() || null,
          cvUrl: cvUrl.trim() || null,
          company, // honeypot
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Không gửi được đơn. Vui lòng thử lại sau ít phút.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <CheckCircle2 size={44} className="text-green-600 mx-auto mb-3" strokeWidth={1.5} />
        <h3 className="text-lg font-bold text-gray-800">Đã gửi đơn ứng tuyển!</h3>
        <p className="text-sm text-gray-600 mt-2">
          Cảm ơn bạn đã ứng tuyển vị trí <span className="font-medium">{jobTitle}</span>.
          Công ty sẽ liên hệ với bạn qua số điện thoại <span className="font-medium">{phone}</span> sớm nhất.
        </p>
      </div>
    );
  }

  const inputCls =
    "w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h3 className="text-lg font-bold text-gray-800 mb-1">Ứng tuyển ngay</h3>
      <p className="text-xs text-gray-500 mb-4">
        Điền thông tin bên dưới, công ty sẽ gọi lại cho bạn. Mục có dấu <span className="text-red-500">*</span> bắt buộc.
      </p>

      <div className="space-y-3.5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Họ và tên <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số điện thoại <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
            placeholder="0912345678"
            autoComplete="tel"
          />
          {phone.length > 0 && !phoneValid && (
            <p className="text-xs text-amber-600 mt-1">Số điện thoại gồm 10 số, bắt đầu bằng 0.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="(không bắt buộc)"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Năm sinh</label>
            <input
              type="number"
              inputMode="numeric"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className={inputCls}
              placeholder="VD: 1998"
              min={1950}
              max={2015}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kinh nghiệm / Giới thiệu bản thân
          </label>
          <textarea
            rows={4}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className={`${inputCls} resize-none`}
            placeholder="VD: Đã làm phục vụ 1 năm, chăm chỉ, ở gần chỗ làm, có thể làm ca tối..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link CV (nếu có)
          </label>
          <input
            type="url"
            value={cvUrl}
            onChange={(e) => setCvUrl(e.target.value)}
            className={inputCls}
            placeholder="Link Google Drive, Facebook... (không bắt buộc)"
          />
        </div>

        {/* Honeypot — ẩn với người thật, bot sẽ điền */}
        <div className="hidden" aria-hidden="true">
          <label>
            Tên công ty (bỏ trống)
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Đang gửi...
            </>
          ) : (
            <>
              <Send size={18} strokeWidth={1.5} /> Gửi đơn ứng tuyển
            </>
          )}
        </button>
      </div>
    </div>
  );
}
