"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Send, Plus, Sparkles, Loader2, X, Mail, Copy, Check, ChevronRight, ArrowLeft,
  Trash2, TrendingUp,
} from "lucide-react";

type JobLite = { id: string; title: string; status: string };

type Contact = {
  id: string;
  kind: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  matchScore: number | null;
  matchReason: string | null;
  step: number;
  status: string;
  draftSubject: string | null;
  draftBody: string | null;
  messages: { step: number; channel: string; subject: string; body: string; sentAt: string }[];
};

type CampaignListItem = {
  id: string;
  name: string;
  jobId: string;
  jobTitle: string;
  status: string;
  createdAt: string;
  funnel: { total: number; sent: number; replied: number; interested: number; interviewed: number; hired: number };
};

const KIND_LABEL: Record<string, string> = {
  ex_employee: "Cựu nhân viên",
  candidate: "Ứng viên cũ",
  talent: "Cộng đồng",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chưa gửi", drafted: "Đã soạn", sent: "Đã gửi", opened: "Đã mở",
  replied: "Đã trả lời", interested: "Quan tâm", interviewed: "Phỏng vấn",
  hired: "Đã tuyển", declined: "Từ chối", opted_out: "Hủy nhận tin",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500", drafted: "bg-indigo-100 text-indigo-700",
  sent: "bg-blue-100 text-blue-700", opened: "bg-cyan-100 text-cyan-700",
  replied: "bg-amber-100 text-amber-700", interested: "bg-purple-100 text-purple-700",
  interviewed: "bg-teal-100 text-teal-700", hired: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600", opted_out: "bg-gray-200 text-gray-500",
};
// Trạng thái admin có thể đặt tay (cập nhật phễu)
const ADVANCE: { k: string; label: string }[] = [
  { k: "replied", label: "Đã trả lời" },
  { k: "interested", label: "Quan tâm" },
  { k: "interviewed", label: "Đã phỏng vấn" },
  { k: "hired", label: "Đã tuyển" },
  { k: "declined", label: "Từ chối" },
];

export default function OutreachPanel({ jobs }: { jobs: JobLite[] }) {
  const [view, setView] = useState<"list" | "detail">("list");
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Tạo chiến dịch
  const [showCreate, setShowCreate] = useState(false);
  const [createJobId, setCreateJobId] = useState("");
  const [sources, setSources] = useState<string[]>(["ex_employee", "candidate"]);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  // Chi tiết
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ contacts: Contact[]; job: { title: string } | null; campaign: CampaignListItem | null } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openJobs = jobs.filter((j) => j.status === "open");

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recruitment/outreach/campaigns");
      const data = await res.json();
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setActiveId(id);
    setView("detail");
    try {
      const res = await fetch(`/api/recruitment/outreach/campaigns/${id}`);
      const data = await res.json();
      setDetail({ contacts: data.contacts ?? [], job: data.job ?? null, campaign: null });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const create = async () => {
    if (!createJobId || sources.length === 0) return;
    setCreating(true);
    setCreateErr("");
    try {
      const res = await fetch("/api/recruitment/outreach/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: createJobId, sources }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateErr(data.error || "Không tạo được chiến dịch."); return; }
      setShowCreate(false);
      setCreateJobId("");
      await fetchCampaigns();
      loadDetail(data.campaignId);
    } finally {
      setCreating(false);
    }
  };

  const delCampaign = async (id: string) => {
    if (!confirm("Xóa chiến dịch này?")) return;
    await fetch(`/api/recruitment/outreach/campaigns/${id}`, { method: "DELETE" });
    fetchCampaigns();
  };

  return (
    <div>
      <div className="mb-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-2.5">
        <Send size={18} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={1.5} />
        <p className="text-sm text-gray-700">
          <b>AI tìm người phù hợp + soạn sẵn tin nhắn</b> cho vị trí đang tuyển — bạn xem lại rồi <b>bấm gửi</b>.
          Chỉ liên hệ người <b>đã có quan hệ</b> (cựu NV / ứng viên cũ). Mỗi email có nút từ chối nhận tin (đúng luật).
        </p>
      </div>

      {view === "list" ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Chiến dịch liên hệ ({campaigns.length})</h3>
            <button
              onClick={() => { setShowCreate(true); setCreateJobId(openJobs[0]?.id || ""); }}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus size={15} /> Tạo chiến dịch
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400"><Loader2 className="animate-spin inline" size={22} /></div>
          ) : campaigns.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
              Chưa có chiến dịch nào. Bấm "Tạo chiến dịch" để AI tìm ứng viên phù hợp.
            </div>
          ) : (
            <div className="space-y-2.5">
              {campaigns.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <button onClick={() => loadDetail(c.id)} className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.jobTitle} · {c.funnel.total} ứng viên</p>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => delCampaign(c.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
                      <button onClick={() => loadDetail(c.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><ChevronRight size={16} /></button>
                    </div>
                  </div>
                  <FunnelBar f={c.funnel} />
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <CampaignDetail
          loading={detailLoading}
          contacts={detail?.contacts ?? []}
          jobTitle={detail?.job?.title ?? ""}
          campaignId={activeId!}
          onBack={() => { setView("list"); fetchCampaigns(); }}
          onReload={() => activeId && loadDetail(activeId)}
        />
      )}

      {/* Modal tạo chiến dịch */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Tạo chiến dịch liên hệ</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            {openJobs.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">Chưa có vị trí nào đang tuyển. Hãy tạo vị trí ở tab "Vị trí tuyển" trước.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí cần tuyển</label>
                  <select value={createJobId} onChange={(e) => setCreateJobId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                    {openJobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tìm ứng viên trong</label>
                  <div className="space-y-2">
                    {[
                      { k: "ex_employee", label: "Cựu nhân viên của công ty", desc: "Người từng làm ở đây (boomerang)" },
                      { k: "candidate", label: "Ứng viên đã từng nộp", desc: "Người đã ứng tuyển trước đây" },
                    ].map((s) => (
                      <label key={s.k} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={sources.includes(s.k)} onChange={(e) => setSources((prev) => e.target.checked ? [...prev, s.k] : prev.filter((x) => x !== s.k))} className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{s.label}</p>
                          <p className="text-xs text-gray-400">{s.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                {createErr && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{createErr}</p>}
                <button onClick={create} disabled={creating || !createJobId || sources.length === 0} className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {creating ? <><Loader2 size={16} className="animate-spin" /> Đang tìm ứng viên...</> : <><Sparkles size={16} /> Tìm ứng viên phù hợp</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Thanh phễu nhỏ trên thẻ chiến dịch ──────────────────────────────────────────
function FunnelBar({ f }: { f: CampaignListItem["funnel"] }) {
  const steps = [
    { label: "Đã gửi", n: f.sent, color: "text-blue-600" },
    { label: "Trả lời", n: f.replied, color: "text-amber-600" },
    { label: "Quan tâm", n: f.interested, color: "text-purple-600" },
    { label: "Phỏng vấn", n: f.interviewed, color: "text-teal-600" },
    { label: "Chốt", n: f.hired, color: "text-green-600" },
  ];
  return (
    <div className="flex items-center gap-1 mt-3 flex-wrap">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-1">
          <div className="text-center px-2 py-1 rounded-lg bg-gray-50 min-w-[52px]">
            <p className={`text-base font-bold leading-none ${s.color}`}>{s.n}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
          {i < steps.length - 1 && <ChevronRight size={12} className="text-gray-300" />}
        </div>
      ))}
    </div>
  );
}

// ─── Chi tiết chiến dịch ─────────────────────────────────────────────────────────
function CampaignDetail({
  loading, contacts, jobTitle, campaignId, onBack, onReload,
}: {
  loading: boolean; contacts: Contact[]; jobTitle: string; campaignId: string;
  onBack: () => void; onReload: () => void;
}) {
  const [drafting, setDrafting] = useState<Record<string, boolean>>({});
  const [msgFor, setMsgFor] = useState<Contact | null>(null);
  const [draftingAll, setDraftingAll] = useState(false);

  // Phễu tổng
  const sent = contacts.filter((c) => ["sent", "opened", "replied", "interested", "interviewed", "hired"].includes(c.status)).length;
  const replied = contacts.filter((c) => ["replied", "interested", "interviewed", "hired"].includes(c.status)).length;
  const interested = contacts.filter((c) => ["interested", "interviewed", "hired"].includes(c.status)).length;
  const interviewed = contacts.filter((c) => ["interviewed", "hired"].includes(c.status)).length;
  const hired = contacts.filter((c) => c.status === "hired").length;

  const draftOne = async (c: Contact) => {
    setDrafting((p) => ({ ...p, [c.id]: true }));
    try {
      const res = await fetch(`/api/recruitment/outreach/campaigns/${campaignId}/draft`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: [c.id] }),
      });
      const data = await res.json();
      if (res.ok && data.drafts?.[0]) {
        setMsgFor({ ...c, draftSubject: data.drafts[0].subject, draftBody: data.drafts[0].body });
      } else {
        alert(data.error || "Không soạn được tin.");
      }
    } finally {
      setDrafting((p) => ({ ...p, [c.id]: false }));
    }
  };

  const draftAllPending = async () => {
    const pend = contacts.filter((c) => c.status === "pending").slice(0, 30).map((c) => c.id);
    if (pend.length === 0) { alert("Không còn ai chưa soạn tin."); return; }
    setDraftingAll(true);
    try {
      await fetch(`/api/recruitment/outreach/campaigns/${campaignId}/draft`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: pend }),
      });
      onReload();
    } finally {
      setDraftingAll(false);
    }
  };

  const setStatus = async (c: Contact, status: string) => {
    await fetch(`/api/recruitment/outreach/contacts/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    onReload();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><ArrowLeft size={18} /></button>
        <div>
          <h3 className="font-semibold text-gray-800">{jobTitle}</h3>
          <p className="text-xs text-gray-400">{contacts.length} ứng viên trong chiến dịch</p>
        </div>
      </div>

      {/* Phễu tổng + đường chuẩn tham khảo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
        <div className="flex items-center gap-1.5 mb-2 text-gray-600"><TrendingUp size={15} /> <span className="text-sm font-medium">Phễu tuyển</span></div>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { label: "Đã gửi", n: sent, c: "text-blue-600" },
            { label: "Trả lời", n: replied, c: "text-amber-600" },
            { label: "Quan tâm", n: interested, c: "text-purple-600" },
            { label: "Phỏng vấn", n: interviewed, c: "text-teal-600" },
            { label: "Chốt", n: hired, c: "text-green-600" },
          ].map((s) => (
            <div key={s.label} className="text-center bg-gray-50 rounded-xl py-2">
              <p className={`text-xl font-bold leading-none ${s.c}`}>{s.n}</p>
              <p className="text-[11px] text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Tham khảo ngành (Gem): ~78% mở · ~21% trả lời · ~8% quan tâm trên tổng đã gửi.
          {sent > 0 && ` Bạn đang có ${Math.round((replied / sent) * 100)}% trả lời.`}
        </p>
      </div>

      <div className="flex justify-end mb-2">
        <button onClick={draftAllPending} disabled={draftingAll} className="flex items-center gap-1.5 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50">
          {draftingAll ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI soạn tin cho tất cả (chưa gửi)
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400"><Loader2 className="animate-spin inline" size={22} /></div>
      ) : contacts.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">Không có ứng viên nào.</div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${STATUS_COLOR[c.status] || "bg-gray-100 text-gray-500"}`}>{STATUS_LABEL[c.status] || c.status}</span>
                    <span className="text-[11px] text-gray-400">{KIND_LABEL[c.kind] || c.kind}</span>
                    {c.matchScore != null && <span className="text-[11px] text-blue-600 font-medium">Khớp {c.matchScore}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {c.position || "—"}{c.email ? ` · ${c.email}` : c.phone ? ` · ${c.phone}` : " · (chưa có liên hệ)"}
                    {c.step > 0 && ` · đã gửi ${c.step} lần`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.status === "opted_out" ? (
                    <span className="text-xs text-gray-400">Đã từ chối</span>
                  ) : (
                    <button
                      onClick={() => c.draftBody ? setMsgFor(c) : draftOne(c)}
                      disabled={drafting[c.id]}
                      className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {drafting[c.id] ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {c.draftBody ? "Xem / Gửi" : c.step > 0 ? "Soạn bước tiếp" : "AI soạn tin"}
                    </button>
                  )}
                </div>
              </div>
              {/* Cập nhật trạng thái phễu nhanh */}
              {["sent", "opened", "replied", "interested", "interviewed"].includes(c.status) && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  <span className="text-[11px] text-gray-400">Cập nhật:</span>
                  {ADVANCE.map((a) => (
                    <button key={a.k} onClick={() => setStatus(c, a.k)} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">{a.label}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {msgFor && (
        <MessageModal
          contact={msgFor}
          onClose={() => setMsgFor(null)}
          onSent={() => { setMsgFor(null); onReload(); }}
        />
      )}
    </div>
  );
}

// ─── Modal soạn + gửi tin ────────────────────────────────────────────────────────
function MessageModal({ contact, onClose, onSent }: { contact: Contact; onClose: () => void; onSent: () => void }) {
  const [subject, setSubject] = useState(contact.draftSubject || "");
  const [body, setBody] = useState(contact.draftBody || "");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const send = async (channel: string) => {
    if (!body.trim()) { setErr("Nội dung trống."); return; }
    if (channel === "email" && !contact.email) { setErr("Ứng viên chưa có email — dùng Zalo/thủ công."); return; }
    setSending(true);
    setErr("");
    try {
      const res = await fetch(`/api/recruitment/outreach/contacts/${contact.id}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, channel }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Gửi thất bại."); return; }
      onSent();
    } finally {
      setSending(false);
    }
  };

  const copyZalo = async () => {
    try { await navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-bold text-gray-800">Gửi tin cho {contact.name}</h3>
            <p className="text-xs text-gray-400">{contact.email || contact.phone || "(chưa có liên hệ)"} · bước {contact.step + 1}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tiêu đề email</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nội dung (sửa thoải mái trước khi gửi)</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none leading-relaxed" />
          </div>
          <p className="text-[11px] text-gray-400">Email tự động kèm nút "Từ chối nhận tin" ở cuối (đúng luật chống tin rác).</p>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        </div>
        <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={copyZalo} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2.5 rounded-xl text-sm hover:bg-gray-50">
            {copied ? <><Check size={15} className="text-green-600" /> Đã chép</> : <><Copy size={15} /> Chép (Zalo)</>}
          </button>
          {contact.phone && (
            <button onClick={() => send("zalo")} disabled={sending} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2.5 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50">
              Đã gửi tay
            </button>
          )}
          <button onClick={() => send("email")} disabled={sending || !contact.email} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Gửi email
          </button>
        </div>
      </div>
    </div>
  );
}
