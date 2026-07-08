"use client";
import { useState } from "react";
import { BadgeCheck, Clock, CalendarCheck, TrendingUp, Award, Timer, Info, X } from "lucide-react";

export interface VerifiedStats {
  vScore?: number | null;        // điểm chấm công tổng 0-100
  vAttendance?: number | null;   // chuyên cần %
  vPunctuality?: number | null;  // đúng giờ %
  vTenureMonths?: number | null; // thâm niên (tháng)
  vPromotions?: number | null;   // số lần thăng chức
  vDevScore?: number | null;     // điểm phát triển 0-100
  vDevTrend?: string | null;     // "up" | "flat" | "down"
  vReviewCount?: number | null;  // số lần được đánh giá
}

function scoreColor(s: number | null | undefined) {
  if (s == null) return { text: "text-gray-400", ring: "#d1d5db", bg: "bg-gray-100" };
  if (s >= 80) return { text: "text-green-600", ring: "#16a34a", bg: "bg-green-50" };
  if (s >= 60) return { text: "text-amber-600", ring: "#d97706", bg: "bg-amber-50" };
  return { text: "text-gray-500", ring: "#9ca3af", bg: "bg-gray-100" };
}

function fmtTenure(m: number | null | undefined) {
  if (!m) return "—";
  const y = Math.floor(m / 12);
  const mo = m % 12;
  if (y > 0) return mo > 0 ? `${y} năm ${mo} tháng` : `${y} năm`;
  return `${m} tháng`;
}

// Thanh tiến trình cho chỉ số %
function Bar({ pct }: { pct: number }) {
  const w = Math.max(0, Math.min(100, pct));
  const color = w >= 80 ? "bg-green-500" : w >= 60 ? "bg-amber-500" : "bg-gray-400";
  return (
    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
    </div>
  );
}

/**
 * Thẻ "Hồ sơ xác thực bởi Timio" — hiện điểm tin cậy từ dữ liệu chấm công THẬT.
 * mode="compact" cho thẻ danh sách; mode="full" cho trang chi tiết / hồ sơ công khai.
 */
export default function VerifiedBadge({ stats, mode = "full" }: { stats: VerifiedStats; mode?: "compact" | "full" }) {
  const [showInfo, setShowInfo] = useState(false);
  const sc = scoreColor(stats.vScore);
  const hasAny = stats.vScore != null || stats.vAttendance != null || stats.vDevScore != null;

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400 flex items-center gap-1.5">
        <BadgeCheck size={14} /> Chưa đủ dữ liệu chấm công để xác thực
      </div>
    );
  }

  const rows: { icon: React.ReactNode; label: string; pct?: number | null; value?: string; accent?: string }[] = [];
  if (stats.vPunctuality != null) rows.push({ icon: <Clock size={14} />, label: "Đúng giờ", pct: stats.vPunctuality });
  if (stats.vAttendance != null) rows.push({ icon: <CalendarCheck size={14} />, label: "Chuyên cần", pct: stats.vAttendance });
  if (stats.vTenureMonths != null) rows.push({ icon: <Timer size={14} />, label: "Thâm niên", value: fmtTenure(stats.vTenureMonths) });
  if ((stats.vPromotions ?? 0) > 0) rows.push({ icon: <Award size={14} />, label: "Thăng tiến", value: `${stats.vPromotions} lần`, accent: "text-emerald-600" });
  if (stats.vDevScore != null) rows.push({ icon: <TrendingUp size={14} />, label: "Phát triển", pct: stats.vDevScore, accent: stats.vDevTrend === "up" ? "text-emerald-600" : undefined });

  const compact = mode === "compact";

  return (
    <div className={`rounded-2xl border ${sc.bg} border-gray-200/70 overflow-hidden`}>
      {/* Header: badge + điểm tổng */}
      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
          <BadgeCheck size={18} className="text-blue-600" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide leading-tight flex items-center gap-1">
            Hồ sơ xác thực
            <button onClick={(e) => { e.stopPropagation(); setShowInfo(true); }} className="text-gray-400 hover:text-blue-600"><Info size={12} /></button>
          </p>
          <p className="text-[10px] text-gray-400 leading-tight">Từ dữ liệu chấm công thật, không tự khai</p>
        </div>
        {stats.vScore != null && (
          <div className="text-right shrink-0">
            <p className={`text-2xl font-extrabold leading-none ${sc.text}`}>{stats.vScore}</p>
            <p className="text-[9px] text-gray-400">/100</p>
          </div>
        )}
      </div>

      {/* Các chỉ số */}
      <div className="px-3.5 pb-3 space-y-1.5">
        {(compact ? rows.slice(0, 3) : rows).map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 shrink-0">{r.icon}</span>
            <span className="text-gray-600 w-20 shrink-0">{r.label}</span>
            {r.pct != null ? (
              <>
                <Bar pct={r.pct} />
                <span className={`w-9 text-right font-semibold shrink-0 ${r.accent || "text-gray-700"}`}>{r.pct}%</span>
              </>
            ) : (
              <span className={`font-semibold ${r.accent || "text-gray-700"}`}>{r.value}</span>
            )}
          </div>
        ))}
        {compact && rows.length > 3 && (
          <p className="text-[10px] text-gray-400">+{rows.length - 3} chỉ số khác</p>
        )}
      </div>

      {/* Popup giải thích cách tính */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={() => setShowInfo(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-1.5"><BadgeCheck size={18} className="text-blue-600" /> Hồ sơ xác thực Timio</h3>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Điểm được tính TỰ ĐỘNG từ dữ liệu chấm công & làm việc thật của người này — <b>không phải tự khai như CV thông thường</b>.</p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex gap-2"><Clock size={15} className="text-blue-500 shrink-0 mt-0.5" /><span><b>Đúng giờ:</b> tỷ lệ ngày đi làm không trễ.</span></li>
              <li className="flex gap-2"><CalendarCheck size={15} className="text-blue-500 shrink-0 mt-0.5" /><span><b>Chuyên cần:</b> tỷ lệ ngày công đầy đủ.</span></li>
              <li className="flex gap-2"><Timer size={15} className="text-blue-500 shrink-0 mt-0.5" /><span><b>Thâm niên:</b> thời gian gắn bó thực tế.</span></li>
              <li className="flex gap-2"><TrendingUp size={15} className="text-blue-500 shrink-0 mt-0.5" /><span><b>Phát triển:</b> xu hướng đánh giá + thăng tiến − kỷ luật.</span></li>
            </ul>
            <p className="text-xs text-gray-400 mt-3">Người lao động đã đồng ý chia sẻ hồ sơ này và có thể rút lại bất cứ lúc nào (Luật 91/2025).</p>
          </div>
        </div>
      )}
    </div>
  );
}
