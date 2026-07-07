"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Volume2, VolumeX, CheckCircle2 } from "lucide-react";

type Item = { key: string; label: string; count: number; href: string };

const POLL_MS = 45000;

export default function NotificationBell() {
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [pulse, setPulse] = useState(false);

  const prevTotalRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    try { setMuted(localStorage.getItem("timio_notif_muted") === "1"); } catch { /* ignore */ }
  }, []);

  const playTing = useCallback(() => {
    if (muted) return;
    try {
      let ctx = audioRef.current;
      if (!ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC();
        audioRef.current = ctx;
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      ([[880, 0], [1320, 0.09]] as [number, number][]).forEach(([freq, t]) => {
        const o = ctx!.createOscillator();
        const g = ctx!.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        o.connect(g);
        g.connect(ctx!.destination);
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.16, now + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.35);
        o.start(now + t);
        o.stop(now + t + 0.4);
      });
    } catch { /* ignore */ }
  }, [muted]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { total: number; items: Item[] };
      setItems(data.items || []);
      setTotal(data.total || 0);
      const prev = prevTotalRef.current;
      if (prev !== null && data.total > prev) {
        playTing();
        setPulse(true);
        setTimeout(() => setPulse(false), 1200);
      }
      prevTotalRef.current = data.total;
    } catch { /* ignore */ }
  }, [playTing]);

  // Poll định kỳ + tải lại mỗi khi đổi trang (sau khi xử lý xong 1 đầu việc)
  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load, pathname]);

  // Đóng dropdown khi bấm ra ngoài
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem("timio_notif_muted", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Thông báo"
        aria-label={`Thông báo${total > 0 ? ` — ${total} việc cần xử lý` : ""}`}
        className={`relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors ${pulse ? "animate-bounce" : ""}`}
      >
        <Bell size={19} strokeWidth={2} className={total > 0 ? "text-blue-600" : ""} />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none ring-2 ring-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-[60] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">Thông báo</span>
            <button onClick={toggleMute} title={muted ? "Bật âm thanh" : "Tắt âm thanh"} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CheckCircle2 size={28} className="text-green-400 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-gray-500">Không có việc nào cần xử lý</p>
              <p className="text-xs text-gray-400 mt-0.5">Mọi thứ đã gọn gàng.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {items.map((it) => (
                <Link
                  key={it.key}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/60 transition-colors"
                >
                  <span className="shrink-0 min-w-[24px] h-6 px-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center justify-center">
                    {it.count > 99 ? "99+" : it.count}
                  </span>
                  <span className="text-sm text-gray-700 leading-snug">
                    <b className="font-semibold text-gray-800">{it.count}</b> {it.label}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="px-4 py-2 border-t border-gray-100">
            <p className="text-[11px] text-gray-400">Bấm vào từng mục để xử lý. Xong sẽ tự mất khỏi đây.</p>
          </div>
        </div>
      )}
    </div>
  );
}
