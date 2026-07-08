"use client";
import { useState, useEffect, useCallback } from "react";
import { Share2, Copy, Check, Loader2, Trophy, Gift, Users } from "lucide-react";

type JobLite = { id: string; title: string; status: string };
type EmpLite = { id: string; name: string; code: string; department: string | null };
type Referral = {
  id: string; jobId: string | null; referrerType: string; referrerId: string; referrerName: string | null;
  candidateName: string | null; status: string; rewardAmount: number | null; createdAt: string;
};
type LeaderRow = { key: string; name: string; applied: number; hired: number; rewarded: number };

const STATUS_LABEL: Record<string, string> = { applied: "Đã ứng tuyển", hired: "Đã tuyển", rewarded: "Đã thưởng" };
const STATUS_COLOR: Record<string, string> = {
  applied: "bg-blue-100 text-blue-700", hired: "bg-green-100 text-green-700", rewarded: "bg-purple-100 text-purple-700",
};

export default function ReferralPanel({ companySlug, jobs }: { companySlug: string; jobs: JobLite[] }) {
  const [employees, setEmployees] = useState<EmpLite[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [linkEmp, setLinkEmp] = useState("");
  const [linkJob, setLinkJob] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  const openJobs = jobs.filter((j) => j.status === "open");

  useEffect(() => { if (typeof window !== "undefined") setOrigin(window.location.origin); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recruitment/referrals");
      const data = await res.json();
      setEmployees(data.employees ?? []);
      setReferrals(data.referrals ?? []);
      setLeaderboard(data.leaderboard ?? []);
      if (!linkEmp && data.employees?.[0]) setLinkEmp(data.employees[0].id);
    } finally {
      setLoading(false);
    }
  }, [linkEmp]);

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (openJobs[0] && !linkJob) setLinkJob(openJobs[0].id); }, [openJobs, linkJob]);

  const link = linkEmp && linkJob && origin ? `${origin}/tuyendung/${companySlug}/${linkJob}?ref=emp_${linkEmp}` : "";

  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const markRewarded = async (r: Referral) => {
    const amountStr = prompt("Mức thưởng cho người giới thiệu (VND):", String(r.rewardAmount ?? 500000));
    if (amountStr === null) return;
    const amount = parseInt(amountStr.replace(/[^\d]/g, ""), 10) || 0;
    await fetch(`/api/recruitment/referrals/${r.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rewarded", rewardAmount: amount }),
    });
    fetchData();
  };

  return (
    <div>
      <div className="mb-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-3.5 flex items-start gap-2.5">
        <Gift size={18} className="text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
        <p className="text-sm text-gray-700">
          <b>Nhân viên giới thiệu bạn bè</b> qua link riêng. Ai được tuyển thì bạn thưởng cho người giới thiệu —
          nguồn ứng viên chất lượng, chi phí thấp, hoàn toàn hợp pháp.
        </p>
      </div>

      {/* Tạo link giới thiệu */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-1.5 mb-3 text-gray-700"><Share2 size={16} /> <span className="font-semibold text-sm">Tạo link giới thiệu</span></div>
        {openJobs.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có vị trí đang tuyển. Tạo vị trí trước để có link giới thiệu.</p>
        ) : employees.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có nhân viên nào để tạo link.</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-2.5 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nhân viên giới thiệu</label>
                <select value={linkEmp} onChange={(e) => setLinkEmp(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none">
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vị trí</label>
                <select value={linkJob} onChange={(e) => setLinkJob(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none">
                  {openJobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input readOnly value={link} className="flex-1 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 truncate" />
              <button onClick={copy} className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-amber-600 shrink-0">
                {copied ? <><Check size={14} /> Đã chép</> : <><Copy size={14} /> Chép link</>}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Gửi link này cho nhân viên. Ai nộp đơn qua link sẽ được ghi công cho họ.</p>
          </>
        )}
      </div>

      {/* Bảng vàng */}
      {leaderboard.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-1.5 mb-3 text-gray-700"><Trophy size={16} className="text-amber-500" /> <span className="font-semibold text-sm">Bảng vàng giới thiệu</span></div>
          <div className="space-y-1.5">
            {leaderboard.map((l, i) => (
              <div key={l.key} className="flex items-center gap-3 text-sm">
                <span className={`w-6 text-center font-bold ${i === 0 ? "text-amber-500" : "text-gray-400"}`}>{i + 1}</span>
                <span className="flex-1 text-gray-800 truncate">{l.name}</span>
                <span className="text-xs text-gray-500">{l.applied} ứng tuyển · <b className="text-green-600">{l.hired} tuyển</b></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách được giới thiệu */}
      <div className="flex items-center gap-1.5 mb-2 text-gray-700"><Users size={16} /> <span className="font-semibold text-sm">Ứng viên được giới thiệu ({referrals.length})</span></div>
      {loading ? (
        <div className="py-10 text-center text-gray-400"><Loader2 className="animate-spin inline" size={20} /></div>
      ) : referrals.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">Chưa có ai được giới thiệu. Chia sẻ link ở trên để bắt đầu.</div>
      ) : (
        <div className="space-y-2">
          {referrals.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-800 truncate">{r.candidateName || "Ứng viên"}</p>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${STATUS_COLOR[r.status] || "bg-gray-100 text-gray-500"}`}>{STATUS_LABEL[r.status] || r.status}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Giới thiệu bởi {r.referrerName || "—"}{r.rewardAmount ? ` · thưởng ${r.rewardAmount.toLocaleString("vi-VN")}₫` : ""}</p>
              </div>
              {r.status === "hired" && (
                <button onClick={() => markRewarded(r)} className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-1.5 rounded-lg hover:bg-purple-100 shrink-0">
                  <Gift size={13} /> Đánh dấu đã thưởng
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
