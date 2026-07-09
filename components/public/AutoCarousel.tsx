"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Slider tự chạy: 50s/trang, DỪNG khi rê chuột / chạm / focus, tiếp tục khi rời.
export default function AutoCarousel({ pages, intervalMs = 50000, accent = "blue" }: { pages: React.ReactNode[]; intervalMs?: number; accent?: "blue" | "orange" }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = pages.length;

  useEffect(() => {
    if (paused || n <= 1) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), intervalMs);
    return () => clearInterval(t);
  }, [paused, n, intervalMs]);

  if (n === 0) return null;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const dot = accent === "orange" ? "bg-orange-500" : "bg-blue-600";

  return (
    <div
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${i * 100}%)` }}>
          {pages.map((p, k) => <div key={k} className="w-full shrink-0" aria-hidden={k !== i}>{p}</div>)}
        </div>
      </div>
      {n > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => go(-1)} aria-label="Trước" className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50"><ChevronLeft size={16} /></button>
          <div className="flex gap-1.5">
            {pages.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`Trang ${k + 1}`} className={`h-2 rounded-full transition-all ${k === i ? `w-6 ${dot}` : "w-2 bg-gray-300"}`} />)}
          </div>
          <button onClick={() => go(1)} aria-label="Sau" className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
