"use client";

import { useState, useEffect } from "react";
import { Send, CheckCircle2, AlertTriangle, Loader2, Link2, Upload, FileText, X, MessageCircleQuestion } from "lucide-react";

const MAX_CV_BYTES = 4 * 1024 * 1024; // 4MB
const CV_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

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
  const [cvMode, setCvMode] = useState<"link" | "file">("link");
  const [cvUrl, setCvUrl] = useState("");
  const [cvFile, setCvFile] = useState<string>(""); // data URI
  const [cvFileName, setCvFileName] = useState("");
  const [company, setCompany] = useState(""); // honeypot — người thật để trống

  // Mã giới thiệu (referral) từ URL ?ref=
  const [ref, setRef] = useState("");
  useEffect(() => {
    try { setRef(new URLSearchParams(window.location.search).get("ref") || ""); } catch { /* ignore */ }
  }, []);

  // Câu hỏi sàng lọc (AI, chỉ công ty Business)
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  useEffect(() => {
    let alive = true;
    fetch(`/api/public/screening?slug=${encodeURIComponent(slug)}&jobId=${encodeURIComponent(jobId)}`)
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d.questions)) setQuestions(d.questions); })
      .catch(() => {});
    return () => { alive = false; };
  }, [slug, jobId]);

  function onPickCv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (!CV_TYPES.includes(file.type)) {
      setError("Chỉ nhận file PDF hoặc ảnh (JPG/PNG).");
      return;
    }
    if (file.size > MAX_CV_BYTES) {
      setError("File quá lớn (tối đa 4MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setCvFile(String(reader.result)); setCvFileName(file.name); };
    reader.readAsDataURL(file);
  }

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
          cvUrl: cvMode === "link" ? (cvUrl.trim() || null) : null,
          cvFile: cvMode === "file" ? (cvFile || null) : null,
          cvFileName: cvMode === "file" ? (cvFileName || null) : null,
          screening: questions.map((q, i) => ({ q, a: (answers[i] || "").trim() })).filter((x) => x.a),
          ref: ref || null,
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

        {/* Câu hỏi sàng lọc AI */}
        {questions.length > 0 && (
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 space-y-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-blue-800">
              <MessageCircleQuestion size={16} strokeWidth={1.5} /> Vài câu hỏi nhanh (không bắt buộc)
            </p>
            {questions.map((q, i) => (
              <div key={i}>
                <label className="block text-sm text-gray-700 mb-1">{q}</label>
                <textarea
                  rows={2}
                  value={answers[i] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                  className={`${inputCls} resize-none`}
                  placeholder="Trả lời ngắn gọn..."
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            CV / Hồ sơ (nếu có) <span className="text-gray-400 font-normal">— giúp bạn nổi bật hơn</span>
          </label>
          {/* 2 chế độ: dán link hoặc tải file */}
          <div className="flex gap-1 mb-2 bg-gray-100 p-1 rounded-lg w-fit">
            <button type="button" onClick={() => setCvMode("link")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${cvMode === "link" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
              <Link2 size={13} /> Dán link
            </button>
            <button type="button" onClick={() => setCvMode("file")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${cvMode === "file" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500"}`}>
              <Upload size={13} /> Tải file lên
            </button>
          </div>

          {cvMode === "link" ? (
            <input
              type="url"
              value={cvUrl}
              onChange={(e) => setCvUrl(e.target.value)}
              className={inputCls}
              placeholder="Link Google Drive, Facebook... (không bắt buộc)"
            />
          ) : cvFileName ? (
            <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3.5 py-2.5">
              <FileText size={18} className="text-blue-600 shrink-0" strokeWidth={1.5} />
              <span className="text-sm text-gray-700 truncate flex-1">{cvFileName}</span>
              <button type="button" onClick={() => { setCvFile(""); setCvFileName(""); }} className="p-1 text-gray-400 hover:text-red-500">
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-3.5 py-4 text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
              <Upload size={17} strokeWidth={1.5} /> Chọn file CV (PDF hoặc ảnh, tối đa 4MB)
              <input type="file" accept=".pdf,image/*" onChange={onPickCv} className="hidden" />
            </label>
          )}
          <p className="text-xs text-gray-400 mt-1">Có CV, công ty đánh giá hồ sơ của bạn kỹ hơn.</p>
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
