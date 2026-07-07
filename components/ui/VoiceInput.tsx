"use client";

import { useRef, useState, useEffect } from "react";
import { Mic, Square } from "lucide-react";

// Kiểu tối thiểu cho Web Speech API (không augment global để tránh trùng khai báo)
interface SRResult { readonly isFinal: boolean; readonly length: number; [i: number]: { transcript: string } }
interface SREvent { readonly results: { readonly length: number; [i: number]: SRResult } }
interface SRLike {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
}
type SRCtor = new () => SRLike;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const MAX_LISTEN_MS = 180_000; // trần an toàn 3 phút

/**
 * Nút micro nói-thành-chữ (tiếng Việt).
 * - Mặc định: tự dừng sau ~1.6s im (silenceMs).
 * - manualStop=true: KHÔNG tự dừng khi ngập ngừng; tự nghe lại qua các khoảng lặng;
 *   chỉ kết thúc khi người dùng bấm nút dừng → gọi onFinal.
 */
export default function VoiceInput({
  onInterim, onFinal, lang = "vi-VN", title = "Nhấn để nói",
  manualStop = false, silenceMs = 1600,
}: {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  lang?: string;
  title?: string;
  manualStop?: boolean;
  silenceMs?: number;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SRLike | null>(null);
  const bankRef = useRef("");        // chữ đã chốt qua các lần nghe lại
  const sessionRef = useRef("");     // chữ của phiên nghe hiện tại
  const activeRef = useRef(false);   // đang muốn nghe (chưa bấm dừng)
  const stoppingRef = useRef(false); // người dùng đã bấm dừng
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
  };

  useEffect(() => {
    setSupported(!!getCtor());
    return () => {
      clearTimers();
      if (maxRef.current) clearTimeout(maxRef.current);
      activeRef.current = false;
      try { recRef.current?.abort(); } catch { /* ignore */ }
    };
  }, []);

  const combined = () => `${bankRef.current} ${sessionRef.current}`.replace(/\s+/g, " ").trim();

  function launch() {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    sessionRef.current = "";

    const armSilence = () => {
      if (manualStop) return; // chế độ thủ công: không tự dừng khi im
      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => { stoppingRef.current = true; activeRef.current = false; try { rec.stop(); } catch { /* ignore */ } }, silenceMs);
    };

    rec.onresult = (e: SREvent) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
      sessionRef.current = full.trim();
      onInterim?.(combined());
      armSilence();
    };
    rec.onerror = () => {
      // Bỏ qua — để onend xử lý (nghe lại nếu ở chế độ thủ công)
    };
    rec.onend = () => {
      clearTimers();
      // Chốt chữ phiên này vào bank
      const merged = combined();
      // Nếu chế độ thủ công và người dùng CHƯA bấm dừng → nghe lại (vượt qua timeout im lặng của trình duyệt)
      if (manualStop && activeRef.current && !stoppingRef.current) {
        bankRef.current = merged;
        sessionRef.current = "";
        try { launch(); } catch { /* ignore */ }
        return;
      }
      // Kết thúc thật sự
      if (maxRef.current) { clearTimeout(maxRef.current); maxRef.current = null; }
      recRef.current = null;
      activeRef.current = false;
      stoppingRef.current = false;
      setListening(false);
      const finalText = merged;
      bankRef.current = "";
      sessionRef.current = "";
      if (finalText) onFinal?.(finalText);
    };

    recRef.current = rec;
    try { rec.start(); } catch { /* ignore */ }
  }

  function start() {
    if (!getCtor()) return;
    bankRef.current = "";
    sessionRef.current = "";
    stoppingRef.current = false;
    activeRef.current = true;
    setListening(true);
    // Trần an toàn
    if (maxRef.current) clearTimeout(maxRef.current);
    maxRef.current = setTimeout(() => { stoppingRef.current = true; activeRef.current = false; try { recRef.current?.stop(); } catch { /* ignore */ } }, MAX_LISTEN_MS);
    launch();
  }

  function stop() {
    stoppingRef.current = true;
    activeRef.current = false;
    clearTimers();
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start())}
      title={listening ? "Đang nghe... nhấn để dừng & viết" : title}
      className={`shrink-0 flex items-center justify-center gap-1 h-9 rounded-lg border transition-colors ${
        listening
          ? "px-3 bg-red-500 border-red-500 text-white animate-pulse"
          : "w-9 bg-white border-purple-200 text-purple-600 hover:bg-purple-50"
      }`}
    >
      {listening ? <><Square size={14} /> <span className="text-xs font-medium">Dừng</span></> : <Mic size={16} />}
    </button>
  );
}
