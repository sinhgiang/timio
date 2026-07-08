"use client";
import { useState, useEffect } from "react";
import { Heart } from "lucide-react";

const KEY = "timio_saved_jobs";

// Nút "thả tim" lưu việc — lưu trong trình duyệt (localStorage), không cần đăng nhập.
export default function SaveJobButton({ jobKey }: { jobKey: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
      setSaved(arr.includes(jobKey));
    } catch { /* ignore */ }
  }, [jobKey]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const arr = JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
      const next = arr.includes(jobKey) ? arr.filter((x) => x !== jobKey) : [...arr, jobKey];
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaved(next.includes(jobKey));
    } catch { /* ignore */ }
  };

  return (
    <button
      onClick={toggle}
      title={saved ? "Bỏ lưu" : "Lưu việc này"}
      aria-label={saved ? "Bỏ lưu" : "Lưu việc"}
      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${saved ? "bg-red-50 border-red-200 text-red-500" : "border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200"}`}
    >
      <Heart size={16} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
