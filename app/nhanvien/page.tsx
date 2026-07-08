"use client";
import { useState, useEffect, useCallback } from "react";
import { Clock, Loader2, Eye, EyeOff, Wallet, CalendarDays, Building2, LogOut, Briefcase, TrendingUp, Sparkles, ChevronRight } from "lucide-react";

type Me = {
  name: string; phone: string; email: string | null; avatarUrl: string | null; consentFinance: boolean;
  companies: { companyName: string; position: string | null; department: string | null; active: boolean }[];
};
type Earn = {
  monthLabel: string; total: number; totalDaysWorked: number;
  companies: { companyName: string; daysWorked: number; baseSalary: number; earnedSoFar: number; payday: number; daysToPayday: number }[];
};

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export default function NhanVienPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [earn, setEarn] = useState<Earn | null>(null);

  // login form
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [logging, setLogging] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/worker/me");
      if (r.ok) {
        setMe(await r.json());
        const er = await fetch("/api/worker/earnings");
        if (er.ok) setEarn(await er.json());
      } else {
        setMe(null);
      }
    } catch { setMe(null); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const login = async () => {
    setErr("");
    if (!phone || !password) { setErr("Nhập số điện thoại và mật khẩu."); return; }
    setLogging(true);
    try {
      const r = await fetch("/api/worker/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Đăng nhập thất bại."); setLogging(false); return; }
      setPassword("");
      await load();
    } catch { setErr("Lỗi kết nối."); }
    setLogging(false);
  };

  const logout = async () => {
    await fetch("/api/worker/logout", { method: "POST" }).catch(() => {});
    setMe(null); setEarn(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400"><Loader2 size={22} className="animate-spin" /></div>;

  // ── Chưa đăng nhập ──
  if (!me) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3"><Clock size={24} className="text-white" /></div>
            <h1 className="text-xl font-bold text-gray-800">Timio — App nhân viên</h1>
            <p className="text-sm text-gray-500 mt-1">Đăng nhập để xem lương đã kiếm, lịch làm và hơn thế.</p>
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

  // ── Đã đăng nhập: trang chủ ──
  const firstName = me.name.trim().split(/\s+/).pop() || me.name;
  const minDaysToPay = earn?.companies.length ? Math.min(...earn.companies.map((c) => c.daysToPayday)) : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-700 text-white px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {me.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatarUrl} alt={me.name} className="w-11 h-11 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center font-bold">{firstName[0]}</div>
            )}
            <div>
              <p className="text-blue-200 text-xs">Xin chào</p>
              <p className="font-bold text-lg leading-tight">{me.name}</p>
            </div>
          </div>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-white/10" title="Đăng xuất"><LogOut size={18} /></button>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {/* Thẻ thu nhập đã kiếm (Phần 2) */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><Wallet size={17} className="text-green-600" /></div>
            <p className="text-sm font-semibold text-gray-700">Thu nhập đã kiếm {earn ? `· ${earn.monthLabel}` : ""}</p>
          </div>
          {earn ? (
            <>
              <p className="text-3xl font-extrabold text-gray-900">~{vnd(earn.total)}<span className="text-base font-semibold text-gray-400"> đ</span></p>
              <p className="text-sm text-gray-500 mt-0.5">Bạn đã đi làm <b className="text-gray-700">{earn.totalDaysWorked} ngày</b>{minDaysToPay != null ? <> · còn <b className="text-gray-700">{minDaysToPay} ngày</b> tới kỳ lương</> : null}</p>
              <p className="text-[11px] text-gray-400 mt-1">Số tạm tính từ ngày công. Số cuối cùng do công ty chốt.</p>
              {earn.companies.length > 1 && (
                <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-2">
                  {earn.companies.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 flex items-center gap-1"><Building2 size={12} /> {c.companyName}</span>
                      <span className="font-semibold text-gray-700">{c.daysWorked} ngày · ~{vnd(c.earnedSoFar)}đ</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Chưa có dữ liệu chấm công tháng này.</p>
          )}
        </div>

        {/* Ứng lương (Phần 3 — sắp có) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 opacity-90">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"><TrendingUp size={19} className="text-amber-600" /></div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 text-sm">Ứng lương sớm</p>
            <p className="text-xs text-gray-400">Rút trước phần lương đã kiếm — <b>sắp ra mắt</b></p>
          </div>
          <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Sắp có</span>
        </div>

        {/* Công ty của tôi */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Briefcase size={15} /> Nơi tôi làm việc</p>
          <div className="space-y-1.5">
            {me.companies.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Building2 size={16} className="text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{c.companyName}</p>
                  <p className="text-xs text-gray-400 truncate">{c.position || "Nhân viên"}{c.department ? ` · ${c.department}` : ""}</p>
                </div>
                {!c.active && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Đã nghỉ</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Tìm việc (nối recruitment) */}
        <a href="/viec-lam" className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:border-blue-200 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Sparkles size={19} className="text-blue-600" /></div>
          <div className="flex-1"><p className="font-semibold text-gray-800 text-sm">Tìm việc tốt hơn</p><p className="text-xs text-gray-400">Hồ sơ của bạn được xác thực bằng chấm công</p></div>
          <ChevronRight size={18} className="text-gray-300" />
        </a>

        {/* Hồ sơ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm">
          <p className="text-gray-500 flex items-center gap-1.5 mb-1"><CalendarDays size={14} /> {me.phone}{me.email ? ` · ${me.email}` : ""}</p>
        </div>
      </div>
    </div>
  );
}
