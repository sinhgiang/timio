"use client";

import { useState, useEffect, useRef } from "react";

// ─── ComboField — dropdown chọn sẵn + "Tạo mới" inline ──────────────────────────
// Dùng chung cho form nhân viên (phòng ban / chức vụ) và form đăng tuyển (phòng ban).

export default function ComboField({
  label, value, onChange, options, onAddOption, customEntries, placeholder, entityName, columns = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onAddOption?: (v: string) => void;
  customEntries?: Set<string>;
  placeholder?: string;
  entityName?: string;
  columns?: 1 | 2;
}) {
  const [open, setOpen] = useState(false);
  const [creatingInline, setCreatingInline] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  const filtered = searchText.trim()
    ? options.filter((o) => o.toLowerCase().includes(searchText.toLowerCase()))
    : options;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreatingInline(false);
        setNewItemName("");
        setSearchText("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (creatingInline) {
      requestAnimationFrame(() => { inlineInputRef.current?.focus(); });
    }
  }, [creatingInline]);

  const confirmNew = () => {
    const name = newItemName.trim();
    if (!name) return;
    onAddOption?.(name);
    onChange(name);
    setCreatingInline(false);
    setNewItemName("");
    setOpen(false);
  };

  const handleOpenInline = () => {
    setOpen(true);
    setCreatingInline(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setSearchText(e.target.value); setOpen(true); setCreatingInline(false); }}
          onFocus={() => { setSearchText(""); setOpen(true); }}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 pr-8 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => { e.preventDefault(); if (!creatingInline) { setSearchText(""); setOpen((o) => !o); } }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
        >▾</button>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">

          {creatingInline ? (
            <div className="border-b-2 border-emerald-300">
              <div className="p-3 bg-emerald-50">
                <p className="text-xs font-semibold text-emerald-700 mb-2">
                  ✚ Tên {entityName ?? "mục"} mới:
                </p>
                <div className="flex gap-2">
                  <input
                    ref={inlineInputRef}
                    autoFocus
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); confirmNew(); }
                      if (e.key === "Escape") { setCreatingInline(false); setNewItemName(""); }
                    }}
                    placeholder="Gõ tên vào đây..."
                    className="flex-1 px-3 py-2 border-2 border-emerald-400 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500 shadow-inner"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); confirmNew(); }}
                    disabled={!newItemName.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-30 whitespace-nowrap"
                  >✓</button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setCreatingInline(false); setNewItemName(""); }}
                    className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg text-base leading-none"
                  >✕</button>
                </div>
              </div>
              {newItemName.trim() && (() => {
                const matches = options.filter((o) =>
                  o.toLowerCase().includes(newItemName.trim().toLowerCase())
                );
                return matches.length > 0 ? (
                  <div className="bg-amber-50 px-3 py-2 max-h-36 overflow-y-auto">
                    <p className="text-xs text-amber-600 font-medium mb-1.5">Đã có sẵn — chọn để dùng:</p>
                    <div className="flex flex-col gap-0.5">
                      {matches.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(opt); setCreatingInline(false); setNewItemName(""); setOpen(false); }}
                          className="text-left px-2.5 py-1.5 text-sm rounded-lg text-amber-800 hover:bg-amber-100 transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <div className="p-1.5 border-b border-gray-100">
              <button
                type="button"
                onClick={handleOpenInline}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <span>✚</span>
                <span>Tạo {entityName ?? "mục"} mới</span>
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="max-h-52 overflow-y-auto p-2">
              <div className={`grid gap-0.5 ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                {filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); onChange(opt); setSearchText(""); setOpen(false); setCreatingInline(false); }}
                    className={`text-left px-2.5 py-1.5 text-sm rounded-lg transition-colors flex items-center justify-between gap-1 ${
                      value === opt ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{opt}</span>
                    {customEntries?.has(opt) && (
                      <span className="text-xs px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-200 font-normal shrink-0">Mới</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {filtered.length === 0 && !creatingInline && (
            <p className="text-center text-sm text-gray-400 py-3">Không tìm thấy — bấm &quot;Tạo mới&quot; ở trên</p>
          )}
        </div>
      )}
    </div>
  );
}
