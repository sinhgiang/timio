"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Eye, EyeOff } from "lucide-react";

export default function NhanVienLogin() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [logging, setLogging] = useState(false);
  const [err, setErr] = useState("");

  // Nếu đã đăng nhập → chuyển thẳng tới hồ sơ cá nhân
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/worker/me");
        if (r.ok) {
          const me = await r.json();
          if (me.handle) { router.replace(`/ho-so/${me.handle}`); return; }
        }
      } catch { /* */ }
      setChecking(false);
    })();
  }, [router]);

  const login = async () => {
    setErr("");
    if (!phone || !password) { setErr("Nhập số điện thoại và mật khẩu."); return; }
    setLogging(true);
    try {
      const r = await fetch("/api/worker/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Đăng nhập thất bại."); setLogging(false); return; }
      const me = await fetch("/api/worker/me").then((x) => x.ok ? x.json() : null).catch(() => null);
      router.replace(me?.handle ? `/ho-so/${me.handle}` : "/nhanvien");
    } catch { setErr("Lỗi kết nối."); setLogging(false); }
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center text-gray-400"><Loader2 size={22} className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3"><Clock size={24} className="text-white" /></div>
          <h1 className="text-xl font-bold text-gray-800">Timio — App nhân viên</h1>
          <p className="text-sm text-gray-500 mt-1">Đăng nhập để xem hồ sơ, lương đã kiếm, chấm công.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912345678" className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none pr-10" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <button onClick={login} disabled={logging} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">
            {logging ? <Loader2 size={17} className="animate-spin" /> : null} Đăng nhập
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Chưa có tài khoản? Hỏi công ty gửi <b>link kích hoạt</b> cho bạn.</p>
      </div>
    </div>
  );
}
