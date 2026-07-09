"use client";
import { useState, useRef, useEffect } from "react";
import { Briefcase, ChevronDown, Search, X } from "lucide-react";
import { JOB_CATEGORIES } from "@/lib/jobTaxonomy";

// Combobox chọn ngành nghề có GÕ ĐỂ TÌM (thay <select> native). Dùng cho cả nhà tuyển dụng & nhân viên.
export default function JobPicker({ value, onChange, placeholder = "Chọn ngành nghề", allLabel }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allLabel?: string; // nếu có: hiện mục "tất cả" ở đầu (cho bộ lọc)
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const ql = q.toLowerCase().trim();
  const filtered = JOB_CATEGORIES
    .map((cat) => ({ label: cat.label, jobs: cat.jobs.filter((j) => !ql || j.toLowerCase().includes(ql) || cat.label.toLowerCase().includes(ql)) }))
    .filter((cat) => cat.jobs.length > 0);

  const pick = (v: string) => { onChange(v); setOpen(false); setQ(""); };

  return (
    <div ref={boxRef} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-left hover:border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none">
        <Briefcase size={15} className="text-gray-400 shrink-0" />
        <span className={`flex-1 truncate ${value ? "text-gray-800" : "text-gray-400"}`}>{value || allLabel || placeholder}</span>
        {value && !allLabel && <button type="button" onClick={(e) => { e.stopPropagation(); onChange(""); }} className="text-gray-300 hover:text-gray-500"><X size={14} /></button>}
        <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-40 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-[min(70vh,22rem)] overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-50">
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Gõ để tìm nghề (vd: đầu bếp, du lịch...)" className="w-full pl-8 pr-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
            </div>
          </div>
          <div className="overflow-y-auto">
            {allLabel && (
              <button type="button" onClick={() => pick("")} className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${value === "" ? "text-blue-600 font-medium" : "text-gray-700"}`}>{allLabel}</button>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-sm text-gray-400 text-center">Không tìm thấy nghề phù hợp</p>
            ) : (
              filtered.map((cat) => (
                <div key={cat.label}>
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">{cat.label}</p>
                  {cat.jobs.map((j) => (
                    <button key={j} type="button" onClick={() => pick(j)} className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${value === j ? "text-blue-600 font-medium bg-blue-50/50" : "text-gray-700"}`}>{j}</button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
