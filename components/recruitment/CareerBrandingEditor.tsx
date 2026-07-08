"use client";
import { useState } from "react";
import { Pencil, Check, X, Loader2, ImagePlus, Trash2, Plus, Building2 } from "lucide-react";
import { PerkIcon, PERK_OPTIONS, type Perk } from "./perkIcons";

interface Props {
  initialIntro: string;
  initialCover: string | null;
  initialPerks: Perk[];
}

// Resize ảnh về chiều rộng tối đa rồi trả base64 JPEG (giữ nhẹ)
function resizeImage(file: File, maxW: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CareerBrandingEditor({ initialIntro, initialCover, initialPerks }: Props) {
  const [editing, setEditing] = useState(false);
  const [intro, setIntro] = useState(initialIntro);
  const [cover, setCover] = useState<string | null>(initialCover);
  const [perks, setPerks] = useState<Perk[]>(initialPerks);
  // bản nháp khi đang sửa
  const [dIntro, setDIntro] = useState(initialIntro);
  const [dCover, setDCover] = useState<string | null>(initialCover);
  const [dPerks, setDPerks] = useState<Perk[]>(initialPerks);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const openEdit = () => { setDIntro(intro); setDCover(cover); setDPerks(perks); setErr(""); setEditing(true); };

  const onCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("Vui lòng chọn ảnh."); return; }
    try {
      const b64 = await resizeImage(f, 1200);
      if (b64.length > 2_000_000) { setErr("Ảnh quá lớn, thử ảnh nhỏ hơn."); return; }
      setDCover(b64); setErr("");
    } catch { setErr("Không đọc được ảnh."); }
  };

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const r = await fetch("/api/company/career", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerIntro: dIntro, careerCoverUrl: dCover ?? "", careerPerks: dPerks }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Lưu thất bại."); setSaving(false); return; }
      setIntro(dIntro); setCover(dCover); setPerks(dPerks); setEditing(false);
    } finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <div className="mb-4">
        {/* Preview cho owner + nút sửa */}
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="Ảnh bìa" className="w-full h-40 object-cover rounded-2xl mb-3" />
        )}
        {intro && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3 flex items-start gap-2.5">
            <Building2 size={18} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line flex-1">{intro}</p>
          </div>
        )}
        {perks.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {perks.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg">
                <PerkIcon icon={p.icon} size={14} /> {p.label}
              </span>
            ))}
          </div>
        )}
        <button onClick={openEdit} className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg">
          <Pencil size={14} /> {intro || cover || perks.length ? "Sửa trang thương hiệu" : "Trang trí trang tuyển dụng (chỉ bạn thấy nút này)"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-blue-200 p-4 mb-4 space-y-4">
      <p className="font-semibold text-gray-800 text-sm">Trang trí trang tuyển dụng công ty</p>

      {/* Ảnh bìa */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Ảnh bìa</label>
        {dCover ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dCover} alt="bìa" className="w-full h-36 object-cover rounded-xl" />
            <button onClick={() => setDCover(null)} className="absolute top-2 right-2 bg-white/90 rounded-lg p-1.5 text-gray-600 hover:text-red-500 shadow"><Trash2 size={15} /></button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 rounded-xl py-6 text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-600">
            <ImagePlus size={22} strokeWidth={1.5} /> Tải ảnh bìa lên (ảnh môi trường/cửa hàng)
            <input type="file" accept="image/*" onChange={onCover} className="hidden" />
          </label>
        )}
      </div>

      {/* Giới thiệu */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Giới thiệu công ty</label>
        <textarea value={dIntro} onChange={(e) => setDIntro(e.target.value)} rows={3} placeholder="VD: Chuỗi cà phê 20 chi nhánh, môi trường trẻ trung, lộ trình thăng tiến rõ ràng..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" />
      </div>

      {/* Vì sao làm ở đây */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Vì sao làm ở đây (phúc lợi)</label>
        <div className="space-y-2">
          {dPerks.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-blue-600 shrink-0"><PerkIcon icon={p.icon} size={16} /></span>
              <select value={p.icon} onChange={(e) => setDPerks((prev) => prev.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white w-28 shrink-0">
                {PERK_OPTIONS.map((o) => <option key={o.icon} value={o.icon}>{o.label.split(" ")[0]}</option>)}
              </select>
              <input value={p.label} onChange={(e) => setDPerks((prev) => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: Bao ăn ca" />
              <button onClick={() => setDPerks((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500"><X size={15} /></button>
            </div>
          ))}
          {dPerks.length < 8 && (
            <div className="flex flex-wrap gap-1.5">
              {PERK_OPTIONS.filter((o) => !dPerks.some((p) => p.label === o.label)).slice(0, 6).map((o) => (
                <button key={o.icon} onClick={() => setDPerks((prev) => [...prev, { ...o }])} className="inline-flex items-center gap-1 text-xs border border-gray-200 text-gray-600 rounded-lg px-2 py-1 hover:bg-gray-50">
                  <Plus size={11} /> <PerkIcon icon={o.icon} size={12} /> {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu
        </button>
        <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"><X size={14} /> Hủy</button>
      </div>
    </div>
  );
}
