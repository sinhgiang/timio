"use client";

import { useState } from "react";
import { ClipboardList, CheckCircle2, ArrowRightLeft, Clock, FileText, Printer } from "lucide-react";
import dynamic from "next/dynamic";

const LeaveApprovalForm = dynamic(() => import("@/components/leave/LeaveApprovalForm"), { ssr: false });

type LeaveType = "annual" | "sick" | "unpaid" | "maternity" | "other" | "wedding" | "funeral" | "paternity";
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
  employeeSignature?: string | null;
  handoverEmployeeId: string | null;
  handoverEmployeeName: string | null;
  handoverConfirmedAt: string | null;
  employee: {
    id: string;
    name: string;
    code: string;
    department: string | null;
    position: string | null;
    phone: string | null;
    dateOfBirth: string | null;
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
  wedding: "Nghỉ cưới",
  funeral: "Nghỉ tang",
  paternity: "Nghỉ con sinh",
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
  const [viewRequest, setViewRequest] = useState<{
    req: LeaveRequest;
    mode: "view" | "approved";
    approvedDate: string;
  } | null>(null);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };
  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  // Lịch tháng — approved leaves overlapping current month
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const monthStart = `${thisYear}-${String(thisMonth).padStart(2, "0")}-01`;
  const monthEnd = `${thisYear}-${String(thisMonth).padStart(2, "0")}-31`;
  const thisMonthLeaves = requests.filter(
    (r) => r.status === "approved" && r.fromDate <= monthEnd && r.toDate >= monthStart
  ).sort((a, b) => a.fromDate.localeCompare(b.fromDate));

  const leaveKioskUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/leave/${company.slug}`
      : `/leave/${company.slug}`;

  const openView = (req: LeaveRequest) => {
    if (req.status === "pending") {
      setViewRequest({ req, mode: "view", approvedDate: "" });
    } else {
      setViewRequest({ req, mode: "approved", approvedDate: new Date().toLocaleDateString("vi-VN") });
    }
  };

  const handleApprove = async (note: string) => {
    if (!viewRequest) return;
    const { req } = viewRequest;
    const res = await fetch(`/api/leave-requests/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved", note: note || null }),
    });
    if (res.ok) {
      const updated = await res.json();
      const approvedDate = new Date().toLocaleDateString("vi-VN");
      const updatedReq = { ...req, status: "approved" as LeaveStatus, note: updated.note };
      setRequests((prev) => prev.map((r) => (r.id === req.id ? updatedReq : r)));
      // Stay on the form but switch to "approved" mode so admin can print
      setViewRequest({ req: updatedReq, mode: "approved", approvedDate });
    }
  };

  const handleReject = async (note: string) => {
    if (!viewRequest) return;
    const { req } = viewRequest;
    await fetch(`/api/leave-requests/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", note: note || null }),
    });
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: "rejected" as LeaveStatus, note: note || null } : r))
    );
    setViewRequest(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Quản lý Nghỉ Phép</h1>
          <p className="text-sm text-gray-500 mt-0.5">Xem đơn, duyệt hoặc từ chối đơn xin nghỉ của nhân viên</p>
        </div>
        <a href={leaveKioskUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100">
          Kiosk xin nghỉ ↗
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
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
        <button
          onClick={() => setFilter("month" as LeaveStatus)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-auto ${
            filter === ("month" as LeaveStatus) ? "bg-purple-600 text-white" : "bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100"
          }`}
        >
          📅 Lịch tháng {thisMonth}/{thisYear}
          {thisMonthLeaves.length > 0 && (
            <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${filter === ("month" as LeaveStatus) ? "bg-white/20" : "bg-purple-100"}`}>
              {thisMonthLeaves.length}
            </span>
          )}
        </button>
      </div>

      {/* Lịch tháng view */}
      {filter === ("month" as LeaveStatus) && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">Nghỉ phép tháng {thisMonth}/{thisYear}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Danh sách nhân viên đã được duyệt nghỉ trong tháng này</p>
            </div>
            {thisMonthLeaves.length === 0 && <span className="text-sm text-gray-400">Không có ai nghỉ</span>}
          </div>
          {thisMonthLeaves.length > 0 && (
            <>
              {/* Mobile: cards */}
              <div className="md:hidden divide-y divide-gray-50">
                {thisMonthLeaves.map((r) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const isActive = r.fromDate <= today && r.toDate >= today;
                  return (
                    <div key={r.id} className={`px-4 py-3 ${isActive ? "bg-purple-50/50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-800">{r.employee.name}</span>
                            {isActive && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Đang nghỉ</span>}
                          </div>
                          {r.employee.department && <p className="text-xs text-gray-400 mt-0.5">{r.employee.department}</p>}
                        </div>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0">{TYPE_LABELS[r.type]}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 font-mono">
                        <span>{fmtDate(r.fromDate)} → {fmtDate(r.toDate)}</span>
                        <span className="font-bold text-gray-800">{r.days} ngày</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {r.handoverEmployeeName ? (
                          <span className={`text-xs ${r.handoverConfirmedAt ? "text-green-600" : "text-amber-600"}`}>
                            {r.handoverConfirmedAt ? "✓ " : "⏳ "}Bàn giao: {r.handoverEmployeeName.split(" (")[0]}
                          </span>
                        ) : <span />}
                        <button onClick={() => openView(r)} className="text-xs text-blue-600 hover:underline">In phiếu</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-gray-500 font-medium">Nhân viên</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Loại nghỉ</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Từ ngày</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Đến ngày</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-medium">Số ngày</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Bàn giao</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {thisMonthLeaves.map((r) => {
                      const today = new Date().toISOString().slice(0, 10);
                      const isActive = r.fromDate <= today && r.toDate >= today;
                      return (
                        <tr key={r.id} className={isActive ? "bg-purple-50/50" : "hover:bg-gray-50"}>
                          <td className="px-5 py-3">
                            <span className="font-medium text-gray-800">{r.employee.name}</span>
                            {r.employee.department && <span className="ml-2 text-xs text-gray-400">{r.employee.department}</span>}
                            {isActive && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Đang nghỉ</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{TYPE_LABELS[r.type]}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-gray-700">{fmtDate(r.fromDate)}</td>
                          <td className="px-4 py-3 font-mono text-sm text-gray-700">{fmtDate(r.toDate)}</td>
                          <td className="px-4 py-3 text-center font-bold text-gray-800">{r.days}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {r.handoverEmployeeName ? (
                              <span className={r.handoverConfirmedAt ? "text-green-600" : "text-amber-600"}>
                                {r.handoverConfirmedAt ? "✓ " : "⏳ "}{r.handoverEmployeeName.split(" (")[0]}
                              </span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => openView(r)} className="text-xs text-blue-600 hover:underline">In phiếu</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

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
                    <button
                      onClick={() => openView(r)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      <FileText size={14} /> Xem & Duyệt
                    </button>
                  )}

                  {r.status === "approved" && (
                    <button
                      onClick={() => openView(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                    >
                      <Printer size={13} /> In phiếu
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {viewRequest && (
        <LeaveApprovalForm
          request={viewRequest.req}
          company={company}
          mode={viewRequest.mode}
          approvedDate={viewRequest.approvedDate || undefined}
          onClose={() => setViewRequest(null)}
          onApprove={viewRequest.mode === "view" ? handleApprove : undefined}
          onReject={viewRequest.mode === "view" ? handleReject : undefined}
        />
      )}
    </div>
  );
}
