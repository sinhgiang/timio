"use client";

import { useState, useEffect, useCallback } from "react";
import { MessagesSquare, Search, ChevronDown, ChevronUp, Bot, User } from "lucide-react";

interface SessionItem {
  id: string;
  userName: string;
  userRole: string;
  userEmail: string | null;
  messageCount: number;
  lastMessages: { role: string; preview: string; createdAt: string }[];
  updatedAt: string;
}

interface FullMessage {
  id: string;
  role: string;
  content: string;
  toolsUsed: string | null;
  createdAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Admin",
  accountant: "Kế toán",
  manager: "Quản lý",
};

export default function ChatLogsClient() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullMessages, setFullMessages] = useState<Record<string, FullMessage[]>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/sessions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lỗi tải dữ liệu");
      setSessions(data.sessions);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!fullMessages[id]) {
      try {
        const res = await fetch(`/api/chat/sessions?sessionId=${id}`);
        const data = await res.json();
        if (res.ok) setFullMessages((prev) => ({ ...prev, [id]: data.messages }));
      } catch { /* ignore */ }
    }
  }

  const filtered = sessions.filter(
    (s) =>
      !search ||
      s.userName.toLowerCase().includes(search.toLowerCase()) ||
      (s.userEmail ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <MessagesSquare className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lịch sử chat AI</h1>
          <p className="text-sm text-gray-500">Xem nhân viên của bạn đã hỏi trợ lý AI những gì</p>
        </div>
      </div>

      <div className="relative my-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc email..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-20 text-center text-gray-400">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-400">Chưa có cuộc trò chuyện nào</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button className="w-full text-left px-5 py-4 hover:bg-gray-50" onClick={() => toggleExpand(s.id)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{s.userName}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {ROLE_LABEL[s.userRole] ?? s.userRole}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {s.lastMessages[s.lastMessages.length - 1]?.preview ?? "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{new Date(s.updatedAt).toLocaleString("vi-VN")}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-1">
                      {s.messageCount} tin
                      {expandedId === s.id
                        ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                        : <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />}
                    </p>
                  </div>
                </div>
              </button>

              {expandedId === s.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/60 space-y-3 max-h-96 overflow-y-auto">
                  {!fullMessages[s.id] ? (
                    <p className="text-sm text-gray-400 text-center py-4">Đang tải...</p>
                  ) : (
                    fullMessages[s.id].map((m) => (
                      <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                          m.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-100 text-gray-800"
                        }`}>
                          <div className="flex items-center gap-1.5 mb-1 opacity-70">
                            {m.role === "user"
                              ? <User className="w-3 h-3" strokeWidth={1.5} />
                              : <Bot className="w-3 h-3" strokeWidth={1.5} />}
                            <span className="text-[10px]">{new Date(m.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          {m.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
