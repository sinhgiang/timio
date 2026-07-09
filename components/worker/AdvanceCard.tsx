"use client";
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Loader2, Info, CheckCircle2, Clock, XCircle, Banknote } from "lucide-react";

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

interface Option {
  employeeId: string; companyId: string; companyName: string;
  ewaEnabled: boolean; approvalMode: string;
  earnedSoFar: number; maxPercent: number; advanceCap: number;
  alreadyAdvanced: number; available: number;
  advancesThisMonth: number; maxPerMonth: number;
  feeType: string; feeValue: number; reason: string | null;
  baseMaxPercent: number; trustBoost: number;
}
interface Hist { id: string; amount: number; fee: number; status: string; disbursed: boolean; companyName: string; }
interface Data { consentFinance: boolean; monthLabel: string; options: Option[]; history: Hist[]; trustLevel?: string; trustBoost?: number; }

const TRUST_LABEL: Record<string, string> = { gold: "Vàng", silver: "Bạc", bronze: "Đồng", new: "Mới" };

const MIN_ADVANCE = 50000;
function computeFee(feeType: string, feeValue: number, amount: number) {
  if (feeType === "percent") return Math.round((amount * feeValue) / 1000);
  return feeValue;
}

function StatusBadge({ status, disbursed }: { status: string; disbursed: boolean }) {
  if (status === "rejected") return <span className="inline-flex items-center gap-1 text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><XCircle size={11} /> Từ chối</span>;
  if (status === "pending") return <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={11} /> Chờ duyệt</span>;
  if (status === "approved" && !disbursed) return <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><Clock size={11} /> Chờ chi tiền</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Đã nhận</span>;
}

export default function AdvanceCard() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selIdx, setSelIdx] = useState(0);
  const [amount, setAmount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/worker/advance");
      if (r.ok) setData(await r.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-2 text-gray-400 text-sm">
      <Loader2 size={16} className="animate-spin" /> Đang tải ứng lương...
    </div>
  );
  if (!data) return null;

  const enabledOptions = data.options.filter((o) => o.ewaEnabled);

  // Chưa đồng ý tài chính
  if (!data.consentFinance) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><TrendingUp size={17} className="text-amber-600" /></div>
          <p className="text-sm font-semibold text-gray-700">Ứng lương sớm</p>
        </div>
        <p className="text-xs text-gray-500">Bạn chưa bật tính năng tài chính. Vào lại link kích hoạt và tích chọn <b>&quot;cho phép tính năng tài chính&quot;</b> để dùng ứng lương.</p>
      </div>
    );
  }

  // Không công ty nào bật EWA
  if (enabledOptions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 opacity-90">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"><TrendingUp size={19} className="text-amber-600" /></div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-sm">Ứng lương sớm</p>
          <p className="text-xs text-gray-400">Công ty của bạn chưa mở tính năng này.</p>
        </div>
      </div>
    );
  }

  const opt = enabledOptions[Math.min(selIdx, enabledOptions.length - 1)];
  const fee = amount >= MIN_ADVANCE ? computeFee(opt.feeType, opt.feeValue, amount) : 0;
  const canSubmit = amount >= MIN_ADVANCE && amount <= opt.available && !submitting;

  const submit = async () => {
    setMsg(null); setSubmitting(true);
    try {
      const r = await fetch("/api/worker/advance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: opt.employeeId, amount }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ type: "err", text: d.error || "Không gửi được yêu cầu." }); setSubmitting(false); return; }
      setMsg({ type: "ok", text: d.message || "Đã gửi yêu cầu." });
      setOpen(false); setAmount(0);
      await load();
    } catch { setMsg({ type: "err", text: "Lỗi kết nối." }); }
    setSubmitting(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><TrendingUp size={17} className="text-amber-600" /></div>
        <p className="text-sm font-semibold text-gray-700">Ứng lương sớm</p>
      </div>

      {/* Chọn công ty nếu làm nhiều nơi */}
      {enabledOptions.length > 1 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {enabledOptions.map((o, i) => (
            <button key={o.employeeId} onClick={() => { setSelIdx(i); setAmount(0); setOpen(false); }}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${i === selIdx ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-gray-200 text-gray-500"}`}>
              {o.companyName}
            </button>
          ))}
        </div>
      )}

      <p className="text-2xl font-extrabold text-gray-900">Ứng tối đa {vnd(opt.available)}<span className="text-sm font-semibold text-gray-400"> đ</span></p>
      <p className="text-xs text-gray-500 mt-0.5">
        Đã kiếm {vnd(opt.earnedSoFar)}đ · trần {opt.maxPercent}% = {vnd(opt.advanceCap)}đ
        {opt.alreadyAdvanced > 0 && <> · đã ứng {vnd(opt.alreadyAdvanced)}đ</>}
      </p>
      {opt.trustBoost > 0 && (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1 mt-1.5 inline-flex items-center gap-1">
          <TrendingUp size={11} /> Điểm tin cậy {TRUST_LABEL[data.trustLevel ?? "new"]} → ứng thêm <b>+{opt.trustBoost}%</b> (từ {opt.baseMaxPercent}%)
        </p>
      )}

      {opt.reason && opt.available < MIN_ADVANCE ? (
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Info size={12} /> {opt.reason}</p>
      ) : !open ? (
        <button onClick={() => { setOpen(true); setAmount(opt.available); setMsg(null); }}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-amber-600 text-white rounded-xl py-2.5 font-semibold text-sm hover:bg-amber-700">
          <Banknote size={16} /> Ứng tiền
        </button>
      ) : (
        <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
          <label className="block text-xs font-medium text-gray-600">Số tiền muốn ứng</label>
          <input type="number" value={amount || ""} min={MIN_ADVANCE} max={opt.available} step={50000}
            onChange={(e) => setAmount(Math.floor(Number(e.target.value)))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
          <div className="flex gap-1.5">
            {[0.5, 1].map((f) => {
              const v = f === 1 ? opt.available : Math.max(MIN_ADVANCE, Math.floor((opt.available * f) / 50000) * 50000);
              return <button key={f} onClick={() => setAmount(v)} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">{f === 1 ? "Tối đa" : "50%"} ({vnd(v)}đ)</button>;
            })}
          </div>
          <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-gray-600">
            Phí dịch vụ: <b className="text-gray-800">{vnd(fee)}đ</b> · Cuối tháng lương trừ <b className="text-gray-800">{vnd((amount || 0) + fee)}đ</b>
            <div className="text-[11px] text-gray-400 mt-0.5">{opt.approvalMode === "auto" ? "Duyệt tự động, công ty sẽ chuyển tiền." : "Công ty duyệt rồi chuyển tiền cho bạn."}</div>
          </div>
          {amount > 0 && amount < MIN_ADVANCE && <p className="text-xs text-red-500">Ứng tối thiểu {vnd(MIN_ADVANCE)}đ.</p>}
          {amount > opt.available && <p className="text-xs text-red-500">Vượt quá mức tối đa {vnd(opt.available)}đ.</p>}
          <div className="flex gap-2">
            <button onClick={() => { setOpen(false); setAmount(0); }} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
            <button onClick={submit} disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 text-white rounded-xl py-2.5 font-semibold text-sm hover:bg-amber-700 disabled:opacity-50">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : null} Xác nhận ứng
            </button>
          </div>
        </div>
      )}

      {msg && <p className={`text-xs mt-2 rounded-lg px-3 py-2 ${msg.type === "ok" ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>{msg.text}</p>}

      {/* Lịch sử ứng tháng này */}
      {data.history.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2 space-y-1.5">
          <p className="text-[11px] text-gray-400 font-medium">Ứng lương {data.monthLabel}</p>
          {data.history.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{vnd(h.amount)}đ {h.fee > 0 && <span className="text-gray-400">(phí {vnd(h.fee)}đ)</span>}{enabledOptions.length > 1 && <span className="text-gray-400"> · {h.companyName}</span>}</span>
              <StatusBadge status={h.status} disbursed={h.disbursed} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
