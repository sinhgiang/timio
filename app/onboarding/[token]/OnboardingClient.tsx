"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera, Loader2, AlertTriangle, ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import MobileFaceRegister from "../../register-face/[token]/MobileFaceRegister";

interface Initial {
  name: string; dateOfBirth: string; email: string; phone: string; zalo: string;
  facebook: string; cccd: string; avatarUrl: string; bankName: string; bankAccount: string;
  bankBranch: string; code: string; position: string; department: string; branchName: string;
}

export default function OnboardingClient({
  token, companyName, logoUrl, hasFace, initial,
}: {
  token: string;
  companyName: string;
  logoUrl: string | null;
  hasFace: boolean;
  initial: Initial;
}) {
  const [step, setStep] = useState<"profile" | "face">("profile");
  const [faceToken, setFaceToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [f, setF] = useState({
    name: initial.name, dateOfBirth: initial.dateOfBirth, email: initial.email, phone: initial.phone,
    zalo: initial.zalo, facebook: initial.facebook, cccd: initial.cccd, avatarUrl: initial.avatarUrl,
    bankName: initial.bankName, bankAccount: initial.bankAccount, bankBranch: initial.bankBranch,
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400 * 1024) { setError("Ảnh quá lớn (tối đa 400KB)."); return; }
    const reader = new FileReader();
    reader.onload = () => set("avatarUrl", String(reader.result));
    reader.readAsDataURL(file);
  }

  async function submitProfile() {
    setError(null);
    if (f.name.trim().length < 2) { setError("Vui lòng nhập họ tên."); return; }
    if (f.phone && !/^0\d{9}$/.test(f.phone.replace(/[\s.]/g, ""))) {
      setError("Số điện thoại chưa đúng (10 số, bắt đầu bằng 0)."); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...f }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error || "Không lưu được hồ sơ."); setSaving(false); return; }
      setFaceToken(data.faceToken);
      setStep("face");
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    }
    setSaving(false);
  }

  if (step === "face" && faceToken) {
    return <MobileFaceRegister token={faceToken} employeeName={f.name} />;
  }

  const input = "w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none";
  const label = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={companyName} className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 size={20} className="text-blue-600" strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-blue-600 font-medium">Hoàn thiện hồ sơ nhân viên</p>
            <h1 className="text-base font-bold text-gray-800 truncate">{companyName}</h1>
          </div>
        </div>
        {/* Progress */}
        <div className="max-w-lg mx-auto px-4 pb-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span> Thông tin
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 rounded" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[11px]">2</span> Quét khuôn mặt
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 mb-4 flex items-start gap-2.5">
          <CheckCircle2 size={18} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-sm text-gray-700">
            Chào mừng bạn gia nhập <b>{companyName}</b>{initial.branchName ? <> — chi nhánh <b>{initial.branchName}</b></> : null}{initial.position ? <>, vị trí <b>{initial.position}</b></> : null}. Vui lòng điền thông tin để hoàn thiện hồ sơ.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
              {f.avatarUrl ? (
                <Image src={f.avatarUrl} alt="Ảnh" width={64} height={64} className="w-full h-full object-cover" unoptimized />
              ) : (
                <Camera size={22} className="text-gray-300" />
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium cursor-pointer border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50">
                <Camera size={15} /> Chọn ảnh đại diện
                <input type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
              </label>
              <p className="text-xs text-gray-400 mt-1">JPG/PNG, tối đa 400KB</p>
            </div>
          </div>

          <div>
            <label className={label}>Họ và tên <span className="text-red-500">*</span></label>
            <input className={input} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Nguyễn Văn A" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Ngày sinh</label>
              <input type="date" className={input} value={f.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </div>
            <div>
              <label className={label}>Số điện thoại</label>
              <input type="tel" inputMode="numeric" className={input} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0912345678" />
            </div>
          </div>
          <div>
            <label className={label}>Email</label>
            <input type="email" className={input} value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Zalo</label>
              <input className={input} value={f.zalo} onChange={(e) => set("zalo", e.target.value)} placeholder="Số Zalo" />
            </div>
            <div>
              <label className={label}>Facebook</label>
              <input className={input} value={f.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="Link/tên Facebook" />
            </div>
          </div>
          <div>
            <label className={label}>Căn cước công dân</label>
            <input className={input} inputMode="numeric" value={f.cccd} onChange={(e) => set("cccd", e.target.value)} placeholder="12 số" />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Thông tin ngân hàng (để nhận lương)</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Tên ngân hàng</label>
                  <input className={input} value={f.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="VD: Vietcombank" />
                </div>
                <div>
                  <label className={label}>Số tài khoản</label>
                  <input className={input} inputMode="numeric" value={f.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} placeholder="VD: 0123456789" />
                </div>
              </div>
              <div>
                <label className={label}>Chi nhánh ngân hàng</label>
                <input className={input} value={f.bankBranch} onChange={(e) => set("bankBranch", e.target.value)} placeholder="VD: CN Hà Nội" />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={submitProfile}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? (<><Loader2 size={18} className="animate-spin" /> Đang lưu...</>) : (<>Tiếp tục — Quét khuôn mặt <ArrowRight size={18} /></>)}
          </button>
          <p className="text-center text-xs text-gray-400">
            {hasFace ? "Bạn đã đăng ký khuôn mặt trước đó — có thể quét lại để cập nhật." : "Bước tiếp theo: quét khuôn mặt để chấm công. Mã PIN sẽ do công ty cấp sau."}
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Vận hành bởi <span className="font-medium text-gray-500">Timio</span></p>
      </main>
    </div>
  );
}
