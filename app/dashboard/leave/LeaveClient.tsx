"use client";

import { useState } from "react";
import { ClipboardList, CheckCircle2, XCircle, Printer, ArrowRightLeft, Clock } from "lucide-react";
import dynamic from "next/dynamic";

const LeaveApprovalForm = dynamic(() => import("@/components/leave/LeaveApprovalForm"), { ssr: false });

type LeaveType = "annual" | "sick" | "unpaid" | "maternity" | "other";
type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveRequest {
  id: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  note: string | null;
  createdAt: string;
  handoverEmployeeId: string | null;
  handoverEmployeeName: string | null;
  handoverConfirmedAt: string | null;
  employee: {
    id: string;
    name: string;
    code: string;
    department: string | null;
    annualLeaveBalance: number;
    baseSalary: number;
    branch: { name: string };
  };
}

const TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Nghỉ phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Nghỉ không lương",
  maternity: "Thai sản",
  other: "Khác",
};

const STATUS_CONFIG: Record<LeaveStatus, { label: string; cls: string }> = {
  pending: { label: "Chờ duyệt", cls: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Đã duyệt", cls: "bg-green-100 text-green-700" },
  rejected: { label: "Từ chối", cls: "bg-red-100 text-red-700" },
};

interface Company {
  name: string;
  slug: string;
  signatureUrl: string | null;
  stampUrl: string | null;
}

interface Props {
  company: Company;
  requests: LeaveRequest[];
}

function fmtDate(s: string) {
  if (!s) return s;
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export default function LeaveClient({ company, requests: initialRequests }: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<LeaveStatus | "all">("pending");
  const [approving, setApproving] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{
    id: string;
    action: "approved" | "rejected";
    request: LeaveRequest;
  } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [remindDeduct, setRemindDeduct] = useState(false);
  const [remindBonus, setRemindBonus] = useState(false);
  const [printRequest, setPrintRequest] = useState<{ req: LeaveRequest; approvedDate: string } | null>(null);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const act = async (id: string, status: "approved" | "rejected", note?: string) => {
    setApproving(id);
    const res = await fetch(`/api/leave-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    if (res.ok) {
      const updated = await res.json();
      const todayDate = new Date().toLocaleDateString("vi-VN");
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: updated.status, note: updated.note } : r))
      );
      if (status === "approved") {
        const approvedReq = requests.find((r) => r.id === id);
        if (approvedReq) {
          const updatedReq = { ...approvedReq, status: "approved" as LeaveStatus, note: note ?? null };
          setPrintRequest({ req: updatedReq, approvedDate: todayDate });
        }
      }
    }
    setApproving(null);
    setNoteModal(null);
    setNoteText("");
    setRemindDeduct(false);
    setRemindBonus(false);
  };

  const openNote = (id: string, action: "approved" | "rejected", request: LeaveRequest) => {
    setNoteModal({ id, action, request });
    setNoteText("");
    setRemindDeduct(false);
    setRemindBonus(false);
  };

  const buildNote = () => {
    const parts: string[] = [];
    if (noteText.trim()) parts.push(noteText.trim());
    if (remindDeduct && noteModal) {
      const perDay = noteModal.request.employee.baseSalary
        ? Math.round(noteModal.request.employee.baseSalary / 26)
        : 0;
      parts.push(`[Kế toán] Trừ lương ${noteModal.request.employee.name}: ${noteModal.request.days} ngày × ${perDay > 0 ? perDay.toLocaleString("vi-VN") + "đ" : "(?đ/ngày)"} = ${perDay > 0 ? (perDay * noteModal.request.days).toLocaleString("vi-VN") + "đ" : "cần tính"}`);
    }
    if (remindBonus && noteModal?.request.handoverEmployeeName) {
      parts.push(`[Kế toán] Xem xét phụ cấp kiêm nhiệm cho ${noteModal.request.handoverEmployeeName}: ${noteModal.request.days} ngày`);
    }
    return parts.join("\n");
  };

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const leaveKioskUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/leave/${company.slug}`
      : `/leave/${company.slug}`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Nghỉ Phép</h1>
          <p className="text-sm text-gray-500 mt-1">Duyệt hoặc từ chối đơn xin nghỉ của nhân viên</p>
        </div>
        <a href={leaveKioskUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100">
          Kiosk xin nghỉ ↗
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {s === "all" ? "Tất cả" : STATUS_CONFIG[s].label}
            {counts[s] > 0 && (
              <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${filter === s ? "bg-white/20" : "bg-gray-100"}`}>
                {counts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
          <ClipboardList size={48} strokeWidth={1.5} className="text-gray-300 mb-3" />
          <p className="text-gray-500">Không có đơn nghỉ phép nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-blue-200 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-800 text-base">{r.employee.name}</p>
                    <span className="text-xs text-gray-400">{r.employee.code}</span>
                    {r.employee.department && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{r.employee.department}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{r.employee.branch.name}</p>

                  <div className="flex flex-wrap gap-3 text-sm mb-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                      <span className="font-medium text-blue-700">{TYPE_LABELS[r.type]}</span>
                    </span>
                    <span className="text-gray-600">
                      {fmtDate(r.fromDate)}{r.fromDate !== r.toDate ? ` → ${fmtDate(r.toDate)}` : ""}
                    </span>
                    <span className="font-semibold text-gray-700">{r.days} ngày</span>
                    {r.type === "annual" && (
                      <span className="text-xs text-gray-400">(Phép còn: {r.employee.annualLeaveBalance} ngày)</span>
                    )}
                    {r.type === "unpaid" && r.employee.baseSalary > 0 && (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        Trừ ≈ {Math.round(r.employee.baseSalary / 26 * r.days).toLocaleString("vi-VN")}đ
                      </span>
                    )}
                  </div>

                  {/* Bàn giao */}
                  {r.handoverEmployeeName && (
                    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg mb-2 w-fit ${
                      r.handoverConfirmedAt
                        ? "bg-green-50 border border-green-100 text-green-700"
                        : "bg-amber-50 border border-amber-100 text-amber-700"
                    }`}>
                      <ArrowRightLeft size={12} />
                      <span>Bàn giao → <strong>{r.handoverEmployeeName}</strong></span>
                      {r.handoverConfirmedAt
                        ? <><CheckCircle2 size={12} className="text-green-500" /> Đã xác nhận</>
                        : <><Clock size={12} className="text-amber-500" /> Chưa xác nhận</>}
                    </div>
                  )}

                  {r.reason && (
                    <p className="text-sm text-gray-500 italic line-clamp-2">&ldquo;{r.reason.replace(/\[.+?\]\s*/g, "")}&rdquo;</p>
                  )}

                  {r.note && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-line">
                      <span className="font-medium text-xs text-gray-400 block mb-0.5">Ghi chú:</span>
                      {r.note}
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-400">
                    Gửi lúc {new Date(r.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>

                {/* Right */}
                <div className="flex flex-col items-end gap-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_CONFIG[r.status].cls}`}>
                    {STATUS_CONFIG[r.status].label}
                  </span>

                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => openNote(r.id, "approved", r)} disabled={approving === r.id}
                        className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                        Duyệt
                      </button>
                      <button onClick={() => openNote(r.id, "rejected", r)} disabled={approving === r.id}
                        className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                        Từ chối
                      </button>
                    </div>
                  )}

                  {r.status === "approved" && (
                    <button onClick={() => setPrintRequest({ req: r, approvedDate: new Date().toLocaleDateString("vi-VN") })}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                      <Printer size={13} /> In phiếu
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve / Reject modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="font-bold text-gray-800 mb-1 text-lg flex items-center gap-2">
              {noteModal.action === "approved"
                ? <><CheckCircle2 size={20} className="text-green-500" /> Xác nhận duyệt nghỉ phép</>
                : <><XCircle size={20} className="text-red-500" /> Từ chối đơn</>}
            </h3>
            <p className="text-sm font-semibold text-gray-700">{noteModal.request.employee.name}</p>
            <p className="text-xs text-gray-400 mb-4">
              {TYPE_LABELS[noteModal.request.type]} · {fmtDate(noteModal.request.fromDate)} → {fmtDate(noteModal.request.toDate)} ({noteModal.request.days} ngày)
            </p>

            {/* Handover status */}
            {noteModal.request.handoverEmployeeName && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-4 ${
                noteModal.request.handoverConfirmedAt
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-amber-50 border border-amber-200 text-amber-700"
              }`}>
                <ArrowRightLeft size={13} />
                <span>Bàn giao cho <strong>{noteModal.request.handoverEmployeeName}</strong></span>
                {noteModal.request.handoverConfirmedAt
                  ? <><CheckCircle2 size={13} /> Đã xác nhận nhận việc</>
                  : <><Clock size={13} /> Chưa xác nhận — nhắc người nhận quét QR</>}
              </div>
            )}

            {/* Payroll reminders — chỉ khi duyệt */}
            {noteModal.action === "approved" && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Nhắc kế toán điều chỉnh lương</p>
                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer mb-2">
                  <input type="checkbox" checked={remindDeduct} onChange={(e) => setRemindDeduct(e.target.checked)}
                    className="mt-0.5 accent-blue-600" />
                  <span>
                    {noteModal.request.type === "unpaid"
                      ? <>Trừ lương <strong>{noteModal.request.employee.name}</strong> ({noteModal.request.days} ngày nghỉ không lương{noteModal.request.employee.baseSalary > 0 ? ` ≈ ${Math.round(noteModal.request.employee.baseSalary / 26 * noteModal.request.days).toLocaleString("vi-VN")}đ` : ""})</>
                      : <>Ghi nhận nghỉ phép năm: trừ {noteModal.request.days} ngày từ số dư phép</>}
                  </span>
                </label>
                {noteModal.request.handoverEmployeeName && (
                  <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={remindBonus} onChange={(e) => setRemindBonus(e.target.checked)}
                      className="mt-0.5 accent-blue-600" />
                    <span>Xem xét phụ cấp kiêm nhiệm cho <strong>{noteModal.request.handoverEmployeeName}</strong> ({noteModal.request.days} ngày thay thế)</span>
                  </label>
                )}
              </div>
            )}

            <p className="text-sm text-gray-500 mb-2">Ghi chú thêm <span className="text-gray-400">(không bắt buộc):</span></p>
            <textarea rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)}
              placeholder={noteModal.action === "approved" ? "VD: Đã ghi vào lịch, nhớ bàn bàn giao trước ngày..." : "VD: Thiếu nhân lực ngày đó..."}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4" />

            <div className="flex gap-2">
              <button onClick={() => setNoteModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Hủy</button>
              <button
                onClick={() => act(noteModal.id, noteModal.action, buildNote() || undefined)}
                disabled={!!approving}
                className={`flex-1 py-2.5 text-white rounded-lg text-sm font-bold disabled:opacity-50 ${
                  noteModal.action === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"
                }`}>
                {noteModal.action === "approved" ? "✓ Duyệt nghỉ phép" : "Từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print modal */}
      {printRequest && (
        <LeaveApprovalForm
          request={printRequest.req}
          company={company}
          approvedDate={printRequest.approvedDate}
          onClose={() => setPrintRequest(null)}
        />
      )}
    </div>
  );
}
