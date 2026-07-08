"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function ActivatePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [show, setShow] = useState(false);
  const [consentApp, setConsentApp] = useState(false);
  const [consentFinance, setConsentFinance] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    if (password.length < 4) { setErr("Mật khẩu tối thiểu 4 ký tự."); return; }
    if (password !== password2) { setErr("Hai mật khẩu chưa khớp."); return; }
    if (!consentApp) { setErr("Vui lòng đồng ý điều khoản để tiếp tục."); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/worker/activate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password, consentApp, consentFinance }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Kích hoạt thất bại."); setSaving(false); return; }
      router.push("/nhanvien");
    } catch { setErr("Lỗi kết nối."); setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3"><Clock size={24} className="text-white" /></div>
          <h1 className="text-xl font-bold text-gray-800">Kích hoạt tài khoản của bạn</h1>
          <p className="text-sm text-gray-500 mt-1">Đặt mật khẩu để dùng app Timio: xem lương đã kiếm, lịch làm, và hơn thế.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tối thiểu 4 ký tự" className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none pr-10" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu</label>
            <input type={show ? "text" : "password"} value={password2} onChange={(e) => setPassword2(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
          </div>

          <label className="flex items-start gap-2.5 text-sm text-gray-600 pt-1">
            <input type="checkbox" checked={consentApp} onChange={(e) => setConsentApp(e.target.checked)} className="mt-0.5 w-4 h-4 accent-blue-600" />
            <span>Tôi đồng ý dùng app và cho phép Timio xử lý dữ liệu công việc của tôi (theo Luật Bảo vệ Dữ liệu Cá nhân).</span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-gray-600">
            <input type="checkbox" checked={consentFinance} onChange={(e) => setConsentFinance(e.target.checked)} className="mt-0.5 w-4 h-4 accent-blue-600" />
            <span>Cho phép hiện <b>thu nhập đã kiếm</b> và bật các tính năng tài chính (như ứng lương). <span className="text-gray-400">(tùy chọn)</span></span>
          </label>

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <button onClick={submit} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Kích hoạt & vào app
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Đã có tài khoản? <a href="/nhanvien" className="text-blue-600">Đăng nhập</a></p>
      </div>
    </div>
  );
}
