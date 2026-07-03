"use client";

import { useState, useEffect, useCallback } from "react";
import { LifeBuoy, RefreshCw, Send, CheckCircle2, Clock3, Inbox } from "lucide-react";

interface Ticket {
  id: string;
  companyName: string;
  userEmail: string;
  userName: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: "Mới",
  in_progress: "Đang xử lý",
  resolved: "Đã xong",
};

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "new", label: "Mới" },
  { key: "in_progress", label: "Đang xử lý" },
  { key: "resolved", label: "Đã xong" },
];

export default function SupportTicketsClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/support-tickets?status=${status}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi tải dữ liệu");
      setTickets(data.tickets);
      setCounts(data.counts ?? {});
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, [load, filter]);

  async function update(id: string, patch: { status?: string; adminReply?: string }) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/support-tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi cập nhật");
      await load(filter);
      if (patch.adminReply) setReplyText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi cập nhật");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <LifeBuoy className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-sm text-gray-500">
              {counts.new ?? 0} mới · {counts.in_progress ?? 0} đang xử lý · {counts.resolved ?? 0} đã xong
            </p>
          </div>
        </div>
        <button
          onClick={() => load(filter)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={1.5} /> Làm mới
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              filter === f.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-400">Đang tải...</div>
      ) : tickets.length === 0 ? (
        <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
          <Inbox className="w-10 h-10" strokeWidth={1.5} />
          Không có ticket nào
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                className="w-full text-left px-5 py-4 hover:bg-gray-50"
                onClick={() => { setExpandedId(expandedId === t.id ? null : t.id); setReplyText(t.adminReply ?? ""); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        t.priority === "urgent" ? "bg-red-500" : t.priority === "low" ? "bg-green-500" : "bg-yellow-500"
                      }`} />
                      <span className="font-semibold text-gray-900">{t.title}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {t.companyName} — {t.userName} ({t.userEmail}) · {new Date(t.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    t.status === "new" ? "bg-blue-100 text-blue-700"
                    : t.status === "in_progress" ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                  }`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
              </button>

              {expandedId === t.id && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 mb-4">{t.description}</p>

                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phản hồi (gửi email cho user)</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Nhập nội dung phản hồi..."
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      disabled={saving || !replyText.trim()}
                      onClick={() => update(t.id, { adminReply: replyText.trim(), status: "in_progress" })}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" strokeWidth={1.5} /> Gửi phản hồi
                    </button>
                    {t.status !== "in_progress" && (
                      <button
                        disabled={saving}
                        onClick={() => update(t.id, { status: "in_progress" })}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <Clock3 className="w-4 h-4" strokeWidth={1.5} /> Đang xử lý
                      </button>
                    )}
                    {t.status !== "resolved" && (
                      <button
                        disabled={saving}
                        onClick={() => update(t.id, { status: "resolved" })}
                        className="flex items-center gap-2 px-4 py-2 border border-green-200 text-green-700 rounded-xl text-sm hover:bg-green-50 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} /> Đã xong
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
