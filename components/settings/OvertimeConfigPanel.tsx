"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

interface OvertimeConfig {
  weekday: number;
  weekend: number;
  minMinutes: number;
}

const DEFAULT: OvertimeConfig = { weekday: 1.5, weekend: 2.0, minMinutes: 30 };

// Cấu hình tăng ca — hệ số lương + ngưỡng phút tối thiểu để tính là tăng ca thật (25/8/2026,
// theo phản hồi: ra muộn vài phút không nên tự động tính tăng ca/tạo bản ghi chờ duyệt).
export default function OvertimeConfigPanel() {
  const [cfg, setCfg] = useState<OvertimeConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/company/overtime-config")
      .then((r) => r.json())
      .then((d) => { if (d.config) setCfg(d.config); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await fetch("/api/company/overtime-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: cfg }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { if (data.config) setCfg(data.config); setMsg("✅ Đã lưu cấu hình tăng ca."); }
    else setMsg(`❌ ${data.error ?? "Lưu thất bại"}`);
  };

  if (loading) {
    return <div className="mt-8 border-t border-gray-100 pt-6 text-sm text-gray-400">Đang tải cấu hình tăng ca…</div>;
  }

  const inputCls = "w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400";

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <div className="flex items-center gap-2 mb-1">
        <Timer size={20} className="text-orange-500" />
        <h2 className="text-base font-bold text-gray-800">Cấu hình tăng ca</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Nhân viên chấm công ra <b>muộn hơn giờ tan ca</b> mới được tính là tăng ca — nhưng chỉ khi muộn hơn
        <b> ngưỡng tối thiểu</b> bên dưới, để tránh vài phút lệch giờ cũng tự tạo bản ghi &quot;chờ duyệt&quot; không cần thiết.
        Tăng ca dưới ngưỡng sẽ không được ghi nhận và không cộng tiền.
      </p>

      <div className="space-y-4 max-w-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Ngưỡng phút tối thiểu</p>
            <p className="text-xs text-gray-400">Ra muộn từ mức này trở lên mới tính là tăng ca</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number" min={0} max={240}
              value={cfg.minMinutes}
              onChange={(e) => setCfg((c) => ({ ...c, minMinutes: Number(e.target.value) }))}
              className={inputCls}
            />
            <span className="text-sm text-gray-500">phút</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Hệ số ngày thường</p>
            <p className="text-xs text-gray-400">Vd 1.5 = trả 150% lương giờ</p>
          </div>
          <input
            type="number" min={1} max={5} step={0.1}
            value={cfg.weekday}
            onChange={(e) => setCfg((c) => ({ ...c, weekday: Number(e.target.value) }))}
            className={inputCls}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Hệ số cuối tuần</p>
            <p className="text-xs text-gray-400">Vd 2.0 = trả 200% lương giờ</p>
          </div>
          <input
            type="number" min={1} max={5} step={0.1}
            value={cfg.weekend}
            onChange={(e) => setCfg((c) => ({ ...c, weekend: Number(e.target.value) }))}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
        {msg && <span className={`text-sm font-medium ${msg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{msg}</span>}
      </div>
    </div>
  );
}
