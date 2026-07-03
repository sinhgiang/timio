"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare, X, Send, Bot, HelpCircle, SquarePen, Loader2, Lock, LifeBuoy,
} from "lucide-react";
import ChatOnboarding from "./ChatOnboarding";
import ContactSupport from "./ContactSupport";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const TUTORIAL_KEY = "timio_chat_tutorial_seen";

// Render inline **đậm** trong 1 dòng
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    nodes.push(
      <strong key={`${keyPrefix}-b-${idx++}`} className="font-semibold text-gray-900">
        {m[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// Chuyển markdown thô của AI thành giao diện đẹp: đậm, tiêu đề, gạch đầu dòng
function AssistantContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const items = [...bullets];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="space-y-1 my-1">
        {items.map((b, j) => (
          <li key={j} className="flex gap-2">
            <span className="text-blue-500 shrink-0 leading-relaxed">•</span>
            <span className="flex-1">{renderInline(b, `li-${blocks.length}-${j}`)}</span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const bulletMatch = line.match(/^\s*[-*•]\s+(.*)/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1]);
      return;
    }
    flushBullets();

    const headingMatch = line.match(/^#{1,6}\s+(.*)/);
    if (headingMatch) {
      blocks.push(
        <p key={`h-${i}`} className="font-bold text-gray-900 mt-1.5 mb-0.5">
          {renderInline(headingMatch[1], `h-${i}`)}
        </p>
      );
      return;
    }

    if (line.trim() === "") {
      blocks.push(<div key={`sp-${i}`} className="h-1.5" />);
      return;
    }

    blocks.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {renderInline(line, `p-${i}`)}
      </p>
    );
  });
  flushBullets();

  return <div>{blocks}</div>;
}

function getSuggestions(role: string): string[] {
  if (role === "manager") {
    return [
      "Hôm nay có bao nhiêu người đi làm?",
      "Còn đơn nghỉ phép nào chưa duyệt?",
      "Ai đi trễ nhiều nhất tháng này?",
    ];
  }
  if (role === "accountant") {
    return [
      "Tổng quỹ lương tháng này là bao nhiêu?",
      "Ai bị phạt đi trễ tháng này?",
      "Hôm nay có bao nhiêu người đi làm?",
    ];
  }
  return [
    "Hôm nay có bao nhiêu người đi làm?",
    "Có việc gì đang chờ tôi duyệt không?",
    "Tổng quỹ lương tháng này là bao nhiêu?",
  ];
}

export default function ChatWidget({ role, plan }: { role: string; plan: string }) {
  const [open, setOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [toolStatus, setToolStatus] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [blocked, setBlocked] = useState<{ reason: string; message: string } | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasChatPlan = plan === "pro" || plan === "business";

  // Load lịch sử khi mở lần đầu
  useEffect(() => {
    if (!open || historyLoaded || !hasChatPlan) return;
    (async () => {
      try {
        const res = await fetch("/api/chat/history");
        if (!res.ok) return;
        const data = await res.json();
        if (data.sessionId) {
          setSessionId(data.sessionId);
          setMessages(
            (data.messages as { role: string; content: string }[]).map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        }
        if (data.access && !data.access.allowed && data.access.reason === "limit") {
          setBlocked({ reason: "limit", message: data.access.message });
        }
        if (typeof data.access?.remaining === "number") setRemaining(data.access.remaining);
      } catch { /* ignore */ }
      setHistoryLoaded(true);
    })();
  }, [open, historyLoaded, hasChatPlan]);

  // Onboarding lần đầu
  useEffect(() => {
    if (open && hasChatPlan && !localStorage.getItem(TUTORIAL_KEY)) {
      setShowOnboarding(true);
    }
  }, [open, hasChatPlan]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, toolStatus, open]);

  const send = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    setToolStatus("");
    setMessages((prev) => [...prev, { role: "user", content: message }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.error ?? "Lỗi kết nối, thử lại nhé.";
        if (data.reason === "limit" || data.reason === "plan") {
          setBlocked({ reason: data.reason, message: errMsg });
        }
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${errMsg}` };
          return copy;
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Không đọc được stream");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "session") {
              setSessionId(ev.sessionId);
              if (typeof ev.remaining === "number") setRemaining(Math.max(0, ev.remaining - 1));
            } else if (ev.type === "text") {
              setToolStatus("");
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                copy[copy.length - 1] = { ...last, content: last.content + ev.text };
                return copy;
              });
            } else if (ev.type === "tool") {
              if (ev.name === "send_email_reminder") setToolStatus("Đang gửi email...");
              else if (ev.name === "preview_email_recipients") setToolStatus("Đang kiểm tra danh sách...");
              else setToolStatus("Đang tra cứu dữ liệu...");
            } else if (ev.type === "error") {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content || `⚠️ ${ev.error}`,
                };
                return copy;
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "⚠️ Mất kết nối. Thử lại nhé." };
        return copy;
      });
    } finally {
      setSending(false);
      setToolStatus("");
      inputRef.current?.focus();
    }
  }, [sending, sessionId]);

  function newChat() {
    setSessionId(null);
    setMessages([]);
    setBlocked((b) => (b?.reason === "limit" ? b : null));
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 flex items-center gap-2 bg-blue-600 text-white rounded-full pl-4 pr-5 py-3 shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all"
          aria-label="Mở trợ lý AI"
        >
          <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm font-semibold hidden sm:inline">Trợ lý AI</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-50 flex flex-col bg-white md:rounded-3xl md:shadow-2xl md:border md:border-gray-200 md:w-[400px] md:h-[620px] md:max-h-[calc(100vh-48px)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm leading-tight">Trợ lý Timio</p>
                <p className="text-xs text-gray-400">
                  {remaining !== null ? `Còn ${remaining} tin hôm nay` : "Hỏi gì về công ty cũng được"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowOnboarding(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
                title="Hướng dẫn sử dụng"
                aria-label="Hướng dẫn"
              >
                <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={newChat}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
                title="Cuộc trò chuyện mới"
                aria-label="Chat mới"
              >
                <SquarePen className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!hasChatPlan ? (
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-amber-600" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Tính năng gói Pro</h3>
              <p className="text-sm text-gray-500 mb-5">
                Trợ lý AI giúp bạn tra cứu chấm công, lương, nghỉ phép chỉ bằng một câu hỏi. Có ở gói Pro và Business.
              </p>
              <Link
                href="/dashboard/billing"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
              >
                Nâng cấp ngay
              </Link>
            </div>
          ) : showOnboarding ? (
            <ChatOnboarding
              role={role}
              onDone={() => {
                localStorage.setItem(TUTORIAL_KEY, "1");
                setShowOnboarding(false);
                inputRef.current?.focus();
              }}
            />
          ) : (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/60">
                {messages.length === 0 && (
                  <div className="pt-6">
                    <p className="text-center text-sm text-gray-500 mb-4">
                      Chào bạn! Tôi có thể tra cứu dữ liệu công ty giúp bạn. Thử hỏi:
                    </p>
                    <div className="space-y-2">
                      {getSuggestions(role).map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          disabled={sending || !!blocked}
                          className="w-full text-left text-sm bg-white border border-gray-200 rounded-xl px-4 py-2.5 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                        m.role === "user"
                          ? "bg-blue-600 text-white rounded-br-md whitespace-pre-wrap"
                          : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
                      }`}
                    >
                      {m.content ? (
                        m.role === "assistant" ? (
                          <AssistantContent text={m.content} />
                        ) : (
                          m.content
                        )
                      ) : sending && i === messages.length - 1 ? (
                        <span className="flex items-center gap-2 text-gray-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {toolStatus || "Đang suy nghĩ..."}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {/* Blocked banner */}
              {blocked && (
                <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 text-xs text-amber-800">
                  {blocked.message}{" "}
                  {blocked.reason !== "limit" ? null : (
                    <Link href="/dashboard/billing" className="font-semibold underline">Nâng cấp</Link>
                  )}
                </div>
              )}

              {/* Input */}
              <div className="border-t border-gray-100 bg-white p-3 shrink-0">
                <form
                  onSubmit={(e) => { e.preventDefault(); send(input); }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={blocked ? "Đã hết quota hôm nay" : "Nhập câu hỏi..."}
                    disabled={sending || !!blocked}
                    className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim() || !!blocked}
                    className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 shrink-0"
                    aria-label="Gửi"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </form>
                <button
                  onClick={() => setShowSupport(true)}
                  className="mt-2 mx-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600"
                >
                  <LifeBuoy className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Cần người thật hỗ trợ? Liên hệ Timio
                </button>
              </div>
            </>
          )}

          {showSupport && <ContactSupport onClose={() => setShowSupport(false)} />}
        </div>
      )}
    </>
  );
}
