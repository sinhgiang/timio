"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Clock, CalendarClock, Loader2, XCircle, PartyPopper, Briefcase } from "lucide-react";

type App = {
  name: string; jobTitle: string; companyName: string; logoUrl: string | null;
  status: string; interviewAt: string | null; appliedAt: string;
};

function fmt(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ApplicationTrackPage({ params }: { params: { token: string } }) {
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const load = () => {
    fetch(`/api/public/application/${params.token}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (ok) setApp(d); else setErr(d.error || "Không tải được hồ sơ."); })
      .catch(() => setErr("Lỗi kết nối."))
      .finally(() => setLoading(false));
  };
  useEffect(load, [params.token]);

  const withdraw = async () => {
    if (!confirm("Bạn chắc chắn muốn rút hồ sơ ứng tuyển này?")) return;
    setWithdrawing(true);
    try {
      const r = await fetch(`/api/public/application/${params.token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "withdraw" }) });
      const d = await r.json();
      if (r.ok) load(); else alert(d.error || "Không rút được hồ sơ.");
    } finally { setWithdrawing(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400"><Loader2 size={22} className="animate-spin" /></div>;
  if (err || !app) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm">
        <XCircle size={40} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
        <h1 className="font-bold text-gray-800">Không tìm thấy hồ sơ</h1>
        <p className="text-sm text-gray-500 mt-1">{err || "Liên kết không hợp lệ hoặc đã hết hạn."}</p>
      </div>
    </div>
  );

  const order: Record<string, number> = { new: 1, reviewing: 2, interview: 3, offer: 4, hired: 5 };
  const rank = order[app.status] ?? 1;
  const rejected = app.status === "rejected";
  const hired = app.status === "hired";

  // Các bước: done (xanh) / current (đang) / pending (xám)
  const steps = [
    { key: "received", label: "Đã nhận hồ sơ", sub: fmtDate(app.appliedAt), reached: true, current: rank === 1 && !rejected },
    { key: "review", label: "Đang xem xét", sub: "", reached: rank >= 2, current: rank === 2 && !rejected },
    { key: "interview", label: "Phỏng vấn", sub: app.interviewAt ? fmt(app.interviewAt) : "", reached: rank >= 3, current: rank === 3 && !rejected },
    { key: "result", label: "Kết quả", sub: hired ? "Chúc mừng — bạn được nhận!" : "", reached: rank >= 5, current: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-5">
          {app.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.logoUrl} alt={app.companyName} className="w-12 h-12 rounded-xl object-cover border border-gray-100 mx-auto mb-2" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2"><Briefcase size={22} className="text-blue-600" strokeWidth={1.5} /></div>
          )}
          <p className="text-xs text-blue-600 font-medium">Hồ sơ ứng tuyển</p>
          <h1 className="text-xl font-bold text-gray-800">{app.jobTitle}</h1>
          <p className="text-sm text-gray-500">{app.companyName} · {app.name}</p>
        </div>

        {/* Kết quả nổi bật */}
        {hired && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 text-center">
            <PartyPopper size={32} className="text-green-600 mx-auto mb-1.5" />
            <p className="font-bold text-green-700">Chúc mừng! Bạn được nhận</p>
            <p className="text-sm text-gray-600 mt-0.5">Công ty sẽ liên hệ hướng dẫn bạn các bước tiếp theo.</p>
          </div>
        )}
        {rejected && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4 text-center">
            <p className="text-sm text-gray-600">Hồ sơ này đã kết thúc. Cảm ơn bạn đã quan tâm — chúc bạn sớm tìm được công việc phù hợp!</p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="space-y-0">
            {steps.map((s, i) => {
              const isLast = i === steps.length - 1;
              const done = s.reached && !s.current;
              return (
                <div key={s.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {s.current ? <Clock size={22} className="text-blue-600" /> :
                     done ? <CheckCircle2 size={22} className="text-green-600" /> :
                     <Circle size={22} className="text-gray-300" />}
                    {!isLast && <div className={`w-0.5 flex-1 my-1 ${s.reached ? "bg-green-300" : "bg-gray-200"}`} style={{ minHeight: 24 }} />}
                  </div>
                  <div className={`pb-4 ${isLast ? "" : ""}`}>
                    <p className={`text-sm font-semibold ${s.current ? "text-blue-700" : done ? "text-gray-800" : "text-gray-400"}`}>
                      {s.key === "result" && rejected ? "Kết quả: đã kết thúc" : s.label}
                    </p>
                    {s.sub && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">{s.key === "interview" && <CalendarClock size={12} />} {s.sub}</p>}
                    {s.current && <p className="text-xs text-blue-500 mt-0.5">Đang ở bước này</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rút hồ sơ */}
        {!hired && !rejected && (
          <button onClick={withdraw} disabled={withdrawing} className="w-full mt-4 text-sm text-gray-500 border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 disabled:opacity-50">
            {withdrawing ? "Đang xử lý..." : "Rút hồ sơ ứng tuyển"}
          </button>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">Cập nhật tự động khi nhà tuyển dụng xử lý hồ sơ · <span className="font-medium text-gray-500">Timio</span></p>
      </div>
    </div>
  );
}
