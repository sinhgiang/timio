"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  MessageSquare, X, Send, Bot, HelpCircle, SquarePen, Loader2, Lock, LifeBuoy,
  Copy, Check, MessageCircle, Facebook, Mic, Square, Volume2, PhoneOff, Radio, Settings2,
} from "lucide-react";
import ChatOnboarding from "./ChatOnboarding";
import ContactSupport from "./ContactSupport";
import { enqueueSpeak, resetSpeech, unlockAudio, setSpeakingListener } from "@/lib/speech";

// Tách các CÂU đã hoàn chỉnh khỏi buffer đang stream (để đọc dần).
// Chỉ cắt khi gặp xuống dòng, hoặc .!? theo sau là dấu cách → tránh cắt nhầm "15.000".
function extractSentences(buf: string): { sentences: string[]; rest: string } {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    const next = buf[i + 1] ?? "";
    const boundary = c === "\n" || ((c === "." || c === "!" || c === "?") && (next === " "));
    if (boundary) {
      const chunk = buf.slice(start, i + 1);
      if (chunk.trim()) out.push(chunk);
      start = i + 1;
    }
  }
  return { sentences: out, rest: buf.slice(start) };
}

// Kiểu tối giản cho Web Speech API (không có sẵn trong lib DOM của TS)
interface SpeechRecognitionResultLike { readonly isFinal: boolean; readonly length: number; [i: number]: { transcript: string } }
interface SpeechRecognitionEventLike { readonly resultIndex: number; readonly results: { readonly length: number; [i: number]: SpeechRecognitionResultLike } }
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const TUTORIAL_KEY = "timio_chat_tutorial_seen";
// Giữ mic mở qua các khoảng nghỉ; chốt lời khi im lặng đủ lâu
const INITIAL_SILENCE_MS = 6000; // TRƯỚC khi nói câu đầu → cho thời gian suy nghĩ, chưa vội chốt
const SILENCE_MS = 1300;         // SAU khi đã nói → im ~1,3s là chốt (phản hồi nhanh)
const MAX_LISTEN_MS = 25000;     // trần an toàn: nghe tối đa 1 lượt

// Nút "Chép" một phát — copy text vào clipboard
function CopyButton({ text, label = "Chép", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Fallback cho trình duyệt cũ
          const ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); } catch { /* ignore */ }
          document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
        copied ? "bg-green-100 text-green-700" : "bg-blue-600 text-white hover:bg-blue-700"
      } ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2} />}
      {copied ? "Đã chép" : label}
    </button>
  );
}

// Khối nội dung có nút Chép (dùng cho tin nhắn mẫu để gửi tay Zalo/Facebook)
function CopyBlock({ text }: { text: string }) {
  return (
    <div className="my-1.5 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 bg-gray-100/70">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nội dung tin nhắn</span>
        <CopyButton text={text} />
      </div>
      <p className="px-3 py-2.5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}

// Biến URL trong text thành link/nút bấm được. Zalo & Facebook hiện thành nút mở luôn.
function linkify(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const urlRe = /(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const url = m[1];
    const isZalo = /zalo\.me/i.test(url);
    const isFb = /facebook\.com/i.test(url);
    if (isZalo || isFb) {
      nodes.push(
        <a
          key={`${keyPrefix}-btn-${idx++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
            isZalo ? "bg-[#0068ff] hover:bg-[#0057d9]" : "bg-[#1877f2] hover:bg-[#0f66d9]"
          }`}
        >
          {isZalo ? <MessageCircle className="w-3.5 h-3.5" strokeWidth={2} /> : <Facebook className="w-3.5 h-3.5" strokeWidth={2} />}
          {isZalo ? "Mở Zalo" : "Mở Facebook"}
        </a>
      );
    } else {
      nodes.push(
        <a
          key={`${keyPrefix}-a-${idx++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline break-all"
        >
          {url}
        </a>
      );
    }
    last = urlRe.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// Render inline **đậm** + link trong 1 dòng
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(...linkify(text.slice(lastIndex, m.index), `${keyPrefix}-t${idx}`));
    nodes.push(
      <strong key={`${keyPrefix}-b-${idx++}`} className="font-semibold text-gray-900">
        {m[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(...linkify(text.slice(lastIndex), `${keyPrefix}-t-end`));
  return nodes;
}

// Chuyển markdown thô của AI thành giao diện đẹp: đậm, tiêu đề, gạch đầu dòng,
// và tách khối code ``` thành CopyBlock (có nút Chép).
function AssistantContent({ text }: { text: string }) {
  const segments: { type: "text" | "code"; content: string }[] = [];
  const fenceRe = /```[a-zA-Z]*\n?([\s\S]*?)```/g;
  let cursor = 0;
  let fm: RegExpExecArray | null;
  while ((fm = fenceRe.exec(text)) !== null) {
    if (fm.index > cursor) segments.push({ type: "text", content: text.slice(cursor, fm.index) });
    segments.push({ type: "code", content: fm[1].replace(/\n+$/, "") });
    cursor = fenceRe.lastIndex;
  }
  // Xử lý khối code ĐANG stream (mở ``` nhưng chưa đóng)
  const tail = text.slice(cursor);
  const openIdx = tail.indexOf("```");
  if (openIdx !== -1) {
    if (openIdx > 0) segments.push({ type: "text", content: tail.slice(0, openIdx) });
    segments.push({ type: "code", content: tail.slice(openIdx + 3).replace(/^[a-zA-Z]*\n?/, "") });
  } else if (tail) {
    segments.push({ type: "text", content: tail });
  }

  return (
    <div>
      {segments.map((seg, si) =>
        seg.type === "code"
          ? seg.content.trim() && <CopyBlock key={`code-${si}`} text={seg.content.trim()} />
          : <TextBlocks key={`txt-${si}`} text={seg.content} keyPrefix={`s${si}`} />
      )}
    </div>
  );
}

// Render 1 đoạn text thường: đậm, tiêu đề, gạch đầu dòng
function TextBlocks({ text, keyPrefix }: { text: string; keyPrefix: string }) {
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
        <p key={`${keyPrefix}-h-${i}`} className="font-bold text-gray-900 mt-1.5 mb-0.5">
          {renderInline(headingMatch[1], `${keyPrefix}-h-${i}`)}
        </p>
      );
      return;
    }

    if (line.trim() === "") {
      blocks.push(<div key={`${keyPrefix}-sp-${i}`} className="h-1.5" />);
      return;
    }

    blocks.push(
      <p key={`${keyPrefix}-p-${i}`} className="leading-relaxed">
        {renderInline(line, `${keyPrefix}-p-${i}`)}
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

  const send = useCallback(async (text: string, speak = false) => {
    const message = text.trim();
    if (!message || sending) return;
    setInput("");
    setSending(true);
    setToolStatus("");
    resetSpeech(); // dừng đọc câu trả lời trước (nếu đang đọc)
    let ttsBuffer = ""; // gom chữ để cắt câu đọc dần (chỉ khi speak=true)
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
              if (speak) {
                ttsBuffer += ev.text;
                const { sentences, rest } = extractSentences(ttsBuffer);
                for (const sen of sentences) enqueueSpeak(sen);
                ttsBuffer = rest;
              }
            } else if (ev.type === "tool") {
              if (ev.name === "send_email_reminder") setToolStatus("Đang gửi thông báo...");
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
      if (speak && ttsBuffer.trim()) enqueueSpeak(ttsBuffer); // đọc nốt câu cuối
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

  // ── Nhận giọng nói (Web Speech API — miễn phí, tiếng Việt) ──
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // Chế độ trò chuyện liên tục (hands-free)
  const [voiceMode, setVoiceMode] = useState<"ptt" | "conversation">("ptt");
  const [convoActive, setConvoActive] = useState(false); // đang trong phiên trò chuyện
  const [convoPaused, setConvoPaused] = useState(false);  // tạm dừng vì im lặng
  const [showModeChoice, setShowModeChoice] = useState(false);
  const convoActiveRef = useRef(false);
  const voiceModeRef = useRef<"ptt" | "conversation">("ptt");
  const emptyTurnsRef = useRef(0);
  const userTypingRef = useRef(false); // đang gõ tay giữa lúc trò chuyện
  const startAfterChoiceRef = useRef(false); // chọn chế độ xong có nói luôn không
  const reopenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingRef = useRef(false);
  const speakingRef = useRef(false);
  const listeningRef = useRef(false);
  // Cảm biến âm lượng (VAD) để phát hiện anh nói chen ngang KHI AI đang đọc — có khử vọng âm
  const vadStreamRef = useRef<MediaStream | null>(null);
  const vadRafRef = useRef<number | null>(null);
  const vadCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!Ctor);
    const m = localStorage.getItem("timio_voice_mode");
    if (m === "conversation" || m === "ptt") { setVoiceMode(m); voiceModeRef.current = m; }
  }, []);

  useEffect(() => { setSpeakingListener(setSpeaking); return () => setSpeakingListener(null); }, []);
  useEffect(() => { convoActiveRef.current = convoActive; }, [convoActive]);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { sendingRef.current = sending; }, [sending]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { listeningRef.current = listening; }, [listening]);

  const clearListenTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
  }, []);

  const stopVoice = useCallback(() => {
    clearListenTimers();
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setListening(false);
  }, [clearListenTimers]);

  const stopVad = useCallback(() => {
    if (vadRafRef.current) { cancelAnimationFrame(vadRafRef.current); vadRafRef.current = null; }
    vadStreamRef.current?.getTracks().forEach((t) => t.stop());
    vadStreamRef.current = null;
    try { vadCtxRef.current?.close(); } catch { /* ignore */ }
    vadCtxRef.current = null;
  }, []);

  const endConversation = useCallback(() => {
    setConvoActive(false); convoActiveRef.current = false;
    setConvoPaused(false);
    emptyTurnsRef.current = 0;
    if (reopenTimerRef.current) { clearTimeout(reopenTimerRef.current); reopenTimerRef.current = null; }
    stopVad();
    stopVoice();
    resetSpeech();
  }, [stopVoice, stopVad]);

  // Mở mic nghe 1 lượt (AI đã im — không có vọng âm). onend tự nối lượt tiếp trong trò chuyện.
  const beginListening = useCallback(() => {
    if (sendingRef.current || blocked || listeningRef.current) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    unlockAudio();
    resetSpeech();
    const rec: SpeechRecognitionLike = new Ctor();
    rec.lang = "vi-VN";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    let lastFull = "";

    const armSilence = (ms: number) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        try { rec.stop(); } catch { /* ignore */ }
      }, ms);
    };

    rec.onresult = (e: SpeechRecognitionEventLike) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
      lastFull = full.trim();
      setInput(lastFull);
      armSilence(SILENCE_MS);
    };
    rec.onerror = () => { clearListenTimers(); stopVoice(); };
    rec.onend = () => {
      clearListenTimers();
      recognitionRef.current = null;
      setListening(false);
      if (userTypingRef.current) return;
      const text = lastFull.trim();
      if (text) {
        emptyTurnsRef.current = 0;
        setInput("");
        send(text, true);
      } else if (convoActiveRef.current) {
        emptyTurnsRef.current += 1;
        if (emptyTurnsRef.current >= 2) {
          setConvoActive(false); convoActiveRef.current = false;
          setConvoPaused(true);
        } else {
          setTimeout(() => {
            if (convoActiveRef.current && !sendingRef.current && !speakingRef.current && !listeningRef.current) beginListening();
          }, 400);
        }
      }
    };

    userTypingRef.current = false;
    recognitionRef.current = rec;
    setInput("");
    setListening(true);
    try {
      rec.start();
      armSilence(INITIAL_SILENCE_MS);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
      maxTimerRef.current = setTimeout(() => { try { rec.stop(); } catch { /* ignore */ } }, MAX_LISTEN_MS);
    } catch { setListening(false); }
  }, [blocked, send, stopVoice, clearListenTimers]);

  // ── VAD: phát hiện anh nói chen ngang KHI AI đang đọc (khử vọng âm nên KHÔNG dính tiếng AI) ──
  const startVad = useCallback(async (onVoice: () => void) => {
    if (vadStreamRef.current || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // TẮT autoGainControl để tiếng ở xa/nhỏ KHÔNG bị khuếch đại lên (giữ đúng độ to thật)
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      });
      // AI có thể đã đọc xong trong lúc xin quyền → khỏi chạy
      if (!speakingRef.current || !convoActiveRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      vadStreamRef.current = stream;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      vadCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      // Chỉ cắt AI khi âm THẬT SỰ TO (giọng anh nói gần mic), bỏ qua tiếng ồn/người nói xa:
      const ABS_MIN = 0.11; // ngưỡng tuyệt đối — phải to như nói gần mic mới xét
      const FACTOR = 3.2;   // và phải to gấp ~3 lần nền ồn hiện tại
      const NEED = 9;       // liên tục ~150ms mới tính là anh nói (bỏ tiếng động ngắn)
      let noise = 0.02;     // nền ồn ước lượng (tự cập nhật lúc yên)
      let voiceFrames = 0;
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / data.length);
        const trigger = Math.max(ABS_MIN, noise * FACTOR);
        if (rms > trigger) {
          voiceFrames++;
          if (voiceFrames >= NEED) { onVoice(); return; }
        } else {
          voiceFrames = 0;
          noise = 0.9 * noise + 0.1 * rms; // học nền ồn khi không có tiếng to
        }
        vadRafRef.current = requestAnimationFrame(loop);
      };
      vadRafRef.current = requestAnimationFrame(loop);
    } catch { /* không có quyền mic → bỏ qua chen ngang, không sao */ }
  }, []);

  // Chọn chế độ (lần đầu / khi đổi) rồi bắt đầu nghe luôn
  const chooseMode = useCallback((mode: "ptt" | "conversation") => {
    localStorage.setItem("timio_voice_mode", mode);
    setVoiceMode(mode); voiceModeRef.current = mode;
    setShowModeChoice(false);
    if (!startAfterChoiceRef.current) return; // mở từ nút cài đặt → chỉ đổi mặc định
    startAfterChoiceRef.current = false;
    emptyTurnsRef.current = 0; setConvoPaused(false);
    if (mode === "conversation") { setConvoActive(true); convoActiveRef.current = true; }
    beginListening();
  }, [beginListening]);

  // Bắt đầu nói ngay theo một chế độ (dùng cho 2 nút chọn luôn hiện)
  const startWithMode = useCallback((mode: "ptt" | "conversation") => {
    if (sending || blocked) return;
    if (convoActiveRef.current || listeningRef.current) { endConversation(); return; }
    localStorage.setItem("timio_voice_mode", mode);
    setVoiceMode(mode); voiceModeRef.current = mode;
    emptyTurnsRef.current = 0; setConvoPaused(false);
    if (mode === "conversation") { setConvoActive(true); convoActiveRef.current = true; }
    beginListening();
  }, [sending, blocked, beginListening, endConversation]);

  const startVoice = useCallback(() => {
    if (sending || blocked) return;
    // Đang nghe / đang trò chuyện → bấm để dừng hẳn
    if (listening || convoActiveRef.current) { endConversation(); return; }
    // Lần đầu dùng mic → hỏi chọn chế độ rồi nói luôn
    if (!localStorage.getItem("timio_voice_mode")) { startAfterChoiceRef.current = true; setShowModeChoice(true); return; }
    emptyTurnsRef.current = 0; setConvoPaused(false);
    if (voiceMode === "conversation") { setConvoActive(true); convoActiveRef.current = true; }
    beginListening();
  }, [sending, blocked, listening, voiceMode, beginListening, endConversation]);

  // Chế độ trò chuyện: AI đọc XONG → tự mở lại mic.
  // Debounce 500ms + chờ speaking đứng yên để KHÔNG mở sớm giữa các câu đang đọc.
  useEffect(() => {
    if (voiceMode !== "conversation" || !convoActive) return;
    if (!open || blocked) return;
    if (sending || speaking || listening) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content) return;
    const id = setTimeout(() => {
      if (convoActiveRef.current && !sendingRef.current && !speakingRef.current && !listeningRef.current && !userTypingRef.current) {
        beginListening();
      }
    }, 300);
    reopenTimerRef.current = id;
    return () => clearTimeout(id);
  }, [voiceMode, convoActive, open, blocked, sending, speaking, listening, messages, beginListening]);

  // Chế độ trò chuyện: khi AI đang đọc → bật cảm biến âm lượng. Anh nói (giọng thật) → cắt AI + nghe anh.
  useEffect(() => {
    if (voiceMode !== "conversation" || !convoActive || !open || blocked) { stopVad(); return; }
    if (!speaking || sending || listening) { stopVad(); return; }
    startVad(() => {
      stopVad();
      resetSpeech();     // cắt lời AI
      beginListening();  // AI đã im → nghe anh, không dính vọng âm
    });
    return () => stopVad();
  }, [voiceMode, convoActive, open, blocked, speaking, sending, listening, startVad, stopVad, beginListening]);

  // Đóng khung chat → dừng nghe, dừng đọc, kết thúc trò chuyện
  useEffect(() => {
    if (!open) {
      if (listening) stopVoice();
      stopVad();
      resetSpeech();
      setConvoActive(false); convoActiveRef.current = false;
      setConvoPaused(false);
      if (reopenTimerRef.current) { clearTimeout(reopenTimerRef.current); reopenTimerRef.current = null; }
    }
  }, [open, listening, stopVoice, stopVad]);

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
              {voiceSupported && (
                <button
                  onClick={() => setShowModeChoice(true)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
                  title="Cách nói chuyện bằng giọng"
                  aria-label="Chế độ giọng nói"
                >
                  <Settings2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}
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

              {/* 2 nút chọn cách nói (luôn hiện khi rảnh) — nút đang chọn sáng xanh */}
              {voiceSupported && !convoActive && !listening && !speaking && !sending && !blocked && (
                <div className="px-3 pt-2 shrink-0 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startWithMode("conversation")}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      voiceMode === "conversation"
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                    title="Nói xong AI đọc trả lời, đọc xong tự mở mic để nói tiếp"
                  >
                    <Radio className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Trò chuyện liên tục
                  </button>
                  <button
                    type="button"
                    onClick={() => startWithMode("ptt")}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      voiceMode === "ptt"
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                    title="Nói 1 lần rồi AI trả lời"
                  >
                    <Mic className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Nói 1 lần
                  </button>
                </div>
              )}

              {/* Đang trò chuyện liên tục → thanh trạng thái + nút Kết thúc */}
              {convoActive && (
                <div className="px-3 pt-2 shrink-0 flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 text-xs text-gray-500">
                    <Radio className="w-4 h-4 text-blue-600 animate-pulse" strokeWidth={1.75} />
                    {speaking ? "Trợ lý đang đọc — nói để chen ngang" : listening ? "Đang nghe... nói đi anh" : "Trò chuyện liên tục"}
                  </div>
                  <button
                    type="button"
                    onClick={endConversation}
                    className="flex items-center gap-1.5 bg-red-500 text-white rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-red-600 transition-colors"
                  >
                    <PhoneOff className="w-3.5 h-3.5" strokeWidth={2} />
                    Kết thúc
                  </button>
                </div>
              )}

              {/* Đã tạm dừng vì im lặng */}
              {convoPaused && !convoActive && (
                <div className="px-3 pt-2 shrink-0">
                  <p className="text-center text-xs text-gray-400">Đã tạm dừng nghe — bấm nút micro để tiếp tục</p>
                </div>
              )}

              {/* Nút Dừng đọc — hiện khi AI đang đọc (chế độ bấm-từng-lần) */}
              {speaking && !convoActive && (
                <div className="px-3 pt-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { resetSpeech(); setSpeaking(false); }}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-full py-2 text-sm font-semibold hover:bg-red-100 transition-colors"
                  >
                    <Square className="w-3.5 h-3.5 fill-red-600" strokeWidth={0} />
                    Dừng đọc
                    <Volume2 className="w-4 h-4 animate-pulse" strokeWidth={1.5} />
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="border-t border-gray-100 bg-white p-3 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const speak = convoActiveRef.current; // đang trò chuyện → vẫn đọc trả lời
                    userTypingRef.current = false;
                    send(input, speak);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      // Gõ tay giữa lúc đang trò chuyện → tạm dừng mic (không để nó chen vào)
                      if (convoActiveRef.current && listeningRef.current) {
                        userTypingRef.current = true;
                        clearListenTimers();
                        if (reopenTimerRef.current) { clearTimeout(reopenTimerRef.current); reopenTimerRef.current = null; }
                        try { recognitionRef.current?.abort(); } catch { /* ignore */ }
                        recognitionRef.current = null;
                        setListening(false);
                      }
                    }}
                    placeholder={listening ? "Đang nghe... nói đi anh" : blocked ? "Đã hết quota hôm nay" : "Nhập câu hỏi..."}
                    disabled={sending || !!blocked}
                    className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
                  />
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={startVoice}
                      disabled={sending || !!blocked}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 ${
                        listening || convoActive
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                      aria-label={listening || convoActive ? "Dừng nói" : "Nói để nhập"}
                      title={convoActive ? "Đang trò chuyện — bấm để kết thúc" : listening ? "Đang nghe... bấm để dừng" : "Bấm rồi nói"}
                    >
                      {convoActive ? <PhoneOff className="w-4 h-4" strokeWidth={1.75} /> : <Mic className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  )}
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

          {/* Bảng chọn cách nói chuyện bằng giọng */}
          {showModeChoice && (
            <div className="absolute inset-0 z-20 bg-black/40 flex items-end md:items-center justify-center p-4" onClick={() => setShowModeChoice(false)}>
              <div className="bg-white rounded-3xl w-full max-w-[340px] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-1">
                  <Mic className="w-5 h-5 text-blue-600" strokeWidth={1.75} />
                  <h3 className="font-bold text-gray-900">Cách nói chuyện bằng giọng</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Chọn kiểu anh muốn. Đổi lại bất cứ lúc nào ở nút cài đặt trên cùng.</p>

                <button
                  onClick={() => chooseMode("conversation")}
                  className={`w-full text-left rounded-2xl border p-3.5 mb-2.5 transition-colors ${voiceMode === "conversation" ? "border-blue-500 bg-blue-50/50" : "border-gray-200 hover:border-blue-300"}`}
                >
                  <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
                    <Radio className="w-4 h-4 text-blue-600" strokeWidth={1.75} />
                    Trò chuyện liên tục
                    {voiceMode === "conversation" && <Check className="w-4 h-4 text-blue-600 ml-auto" strokeWidth={2.5} />}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Nói xong AI trả lời, đọc xong tự mở mic để nói tiếp — như gọi điện. Đang đọc mà anh nói chen vào thì AI dừng ngay để nghe anh. Im lặng 2 lượt thì tự tạm dừng.</p>
                </button>

                <button
                  onClick={() => chooseMode("ptt")}
                  className={`w-full text-left rounded-2xl border p-3.5 transition-colors ${voiceMode === "ptt" ? "border-blue-500 bg-blue-50/50" : "border-gray-200 hover:border-blue-300"}`}
                >
                  <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
                    <Mic className="w-4 h-4 text-gray-600" strokeWidth={1.75} />
                    Bấm từng lần
                    {voiceMode === "ptt" && <Check className="w-4 h-4 text-blue-600 ml-auto" strokeWidth={2.5} />}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Mỗi lần muốn nói thì bấm nút micro. AI vẫn đọc trả lời cho anh.</p>
                </button>

                <button onClick={() => setShowModeChoice(false)} className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1">Để sau</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
