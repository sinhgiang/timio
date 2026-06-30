"use client";
import { useState, useEffect, useCallback } from "react";
import { Star, Plus, Pencil, Trash2, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

type Employee = { id: string; name: string; code: string; department: string | null };
type Review = {
  id: string;
  employeeId: string;
  period: string;
  type: string;
  overallScore: number | null;
  selfScore: number | null;
  strengths: string | null;
  improvements: string | null;
  goals: string | null;
  status: string;
  reviewedBy: string | null;
  createdAt: string;
  employee: Employee;
};

const TYPE_LABELS: Record<string, string> = {
  monthly: "Tháng",
  quarterly: "Quý",
  "semi-annual": "Nửa năm",
  annual: "Năm",
};

const STATUS_CONFIG = {
  pending:         { label: "Chưa bắt đầu",   color: "bg-gray-100 text-gray-600" },
  "self-review":   { label: "NV tự đánh giá", color: "bg-blue-100 text-blue-700" },
  "manager-review":{ label: "Manager review",  color: "bg-yellow-100 text-yellow-700" },
  done:            { label: "Hoàn thành",      color: "bg-green-100 text-green-700" },
};

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} className={`text-xl transition-colors ${(value ?? 0) >= n ? "text-yellow-400" : "text-gray-200"} hover:text-yellow-400`}>
          ★
        </button>
      ))}
      {value && <span className="text-sm text-gray-500 ml-1">{value}/5</span>}
    </div>
  );
}

export default function PerformanceReviewsClient({ employees }: { employees: Employee[] }) {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const defaultPeriod = `${now.getFullYear()}-Q${q}`;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(defaultPeriod);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [saving, setSaving] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/performance-reviews?period=${period}`);
    const data = await res.json();
    setReviews(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [period]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function createForAll() {
    if (!confirm(`Tạo phiếu đánh giá cho tất cả ${employees.length} nhân viên trong kỳ ${period}?`)) return;
    for (const emp of employees) {
      await fetch("/api/performance-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: emp.id, period, type: "quarterly" }),
      });
    }
    fetch_();
  }

  async function saveReview() {
    if (!editReview) return;
    setSaving(true);
    await fetch(`/api/performance-reviews/${editReview.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        overallScore: editReview.overallScore,
        selfScore: editReview.selfScore,
        strengths: editReview.strengths,
        improvements: editReview.improvements,
        goals: editReview.goals,
        status: editReview.status,
      }),
    });
    setSaving(false);
    setEditReview(null);
    fetch_();
  }

  async function del(id: string) {
    if (!confirm("Xóa phiếu đánh giá này?")) return;
    await fetch(`/api/performance-reviews/${id}`, { method: "DELETE" });
    fetch_();
  }

  const avgScore = reviews.filter(r => r.overallScore != null).reduce((s, r, _, a) => s + (r.overallScore! / a.length), 0);
  const doneCount = reviews.filter(r => r.status === "done").length;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Star size={20} className="text-yellow-500" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Đánh giá nhân viên</h1>
            <p className="text-sm text-gray-500">Đánh giá hiệu suất định kỳ — tháng, quý, năm</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none w-36"
          placeholder="VD: 2026-Q2"
        />
        <button onClick={createForAll} className="flex items-center gap-1.5 bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-yellow-600 transition-colors">
          <Plus size={14} /> Tạo phiếu cho tất cả
        </button>
        {reviews.length > 0 && (
          <div className="flex items-center gap-4 ml-auto text-sm text-gray-500">
            <span><CheckCircle2 size={14} className="inline text-green-500 mr-1" />{doneCount}/{reviews.length} hoàn thành</span>
            {avgScore > 0 && <span><Star size={14} className="inline text-yellow-400 mr-1" />TB: {avgScore.toFixed(1)}/5</span>}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Đang tải...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <Star size={40} className="text-gray-200 mx-auto mb-3" strokeWidth={1} />
          <p className="text-gray-400">Chưa có phiếu đánh giá nào cho kỳ <strong>{period}</strong></p>
          <p className="text-gray-400 text-sm mt-1">Bấm "Tạo phiếu cho tất cả" để bắt đầu chu kỳ đánh giá</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map(r => {
            const cfg = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
            const isExpanded = expanded.has(r.id);
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-800">{r.employee?.name}</p>
                      <span className="text-xs text-gray-400">{r.employee?.department}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {r.overallScore != null && (
                        <span className="text-yellow-500 font-semibold">★ {r.overallScore}/5 (Manager)</span>
                      )}
                      {r.selfScore != null && (
                        <span>★ {r.selfScore}/5 (Tự đánh giá)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditReview({ ...r })} className="p-1.5 hover:bg-yellow-50 rounded-lg text-gray-400 hover:text-yellow-600 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => del(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                    <button onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(r.id) ? s.delete(r.id) : s.add(r.id); return s; })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 pt-0 border-t border-gray-100 text-sm text-gray-600 space-y-2">
                    {r.strengths && <div><span className="font-medium text-green-600">Điểm mạnh:</span> {r.strengths}</div>}
                    {r.improvements && <div><span className="font-medium text-orange-500">Cần cải thiện:</span> {r.improvements}</div>}
                    {r.goals && <div><span className="font-medium text-blue-600">Mục tiêu kỳ tới:</span> {r.goals}</div>}
                    {!r.strengths && !r.improvements && !r.goals && <p className="text-gray-400 italic">Chưa có nội dung đánh giá</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editReview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Đánh giá — {editReview.employee?.name}</h3>
            <p className="text-sm text-gray-400 mb-5">Kỳ {editReview.period} · {TYPE_LABELS[editReview.type] || editReview.type}</p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Điểm đánh giá (Manager)</label>
                <StarRating value={editReview.overallScore} onChange={v => setEditReview({ ...editReview, overallScore: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Điểm tự đánh giá (Nhân viên)</label>
                <StarRating value={editReview.selfScore} onChange={v => setEditReview({ ...editReview, selfScore: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Điểm mạnh</label>
                <textarea rows={2} value={editReview.strengths || ""} onChange={e => setEditReview({ ...editReview, strengths: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none resize-none" placeholder="Nhân viên thể hiện tốt ở..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cần cải thiện</label>
                <textarea rows={2} value={editReview.improvements || ""} onChange={e => setEditReview({ ...editReview, improvements: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none resize-none" placeholder="Cần chú ý hơn ở..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mục tiêu kỳ tới</label>
                <textarea rows={2} value={editReview.goals || ""} onChange={e => setEditReview({ ...editReview, goals: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none resize-none" placeholder="Kỳ tới cần đạt..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select value={editReview.status} onChange={e => setEditReview({ ...editReview, status: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 outline-none">
                  {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditReview(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={saveReview} disabled={saving} className="flex-1 bg-yellow-500 text-white rounded-xl py-2.5 text-sm hover:bg-yellow-600 disabled:opacity-60">
                {saving ? "Đang lưu..." : "Lưu đánh giá"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
