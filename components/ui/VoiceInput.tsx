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

/**
 * Nút micro nói-thành-chữ (tiếng Việt) — giống ô nói của trợ lý chat.
 * onInterim: cập nhật chữ khi đang nói. onFinal: gọi khi nói xong (im ~1.5s).
 */
export default function VoiceInput({
  onInterim, onFinal, lang = "vi-VN", title = "Nhấn để nói",
}: {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  lang?: string;
  title?: string;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SRLike | null>(null);
  const finalRef = useRef("");
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupported(!!getCtor());
    return () => {
      if (silenceRef.current) clearTimeout(silenceRef.current);
      try { recRef.current?.abort(); } catch { /* ignore */ }
    };
  }, []);

  function stop() {
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }

  function start() {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    finalRef.current = "";

    const arm = (ms: number) => {
      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => { try { rec.stop(); } catch { /* ignore */ } }, ms);
    };

    rec.onresult = (e: SREvent) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
      finalRef.current = full.trim();
      onInterim?.(finalRef.current);
      arm(1600);
    };
    rec.onerror = () => {
      if (silenceRef.current) clearTimeout(silenceRef.current);
      setListening(false);
      recRef.current = null;
    };
    rec.onend = () => {
      if (silenceRef.current) clearTimeout(silenceRef.current);
      setListening(false);
      recRef.current = null;
      const t = finalRef.current.trim();
      if (t) onFinal?.(t);
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch { /* ignore */ }
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start())}
      title={listening ? "Đang nghe... nhấn để dừng" : title}
      className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
        listening
          ? "bg-red-500 border-red-500 text-white animate-pulse"
          : "bg-white border-purple-200 text-purple-600 hover:bg-purple-50"
      }`}
    >
      {listening ? <Square size={15} /> : <Mic size={16} />}
    </button>
  );
}
