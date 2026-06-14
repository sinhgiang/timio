"use client";

import { useEffect, useState } from "react";
import { Printer, X, CheckCircle2, XCircle } from "lucide-react";

type LeaveType = "annual" | "sick" | "unpaid" | "maternity" | "other";
type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveRequest {
  id: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string | null;
  note: string | null;
  status: LeaveStatus;
  createdAt: string;
  employeeSignature?: string | null;
  handoverEmployeeId?: string | null;
  handoverEmployeeName?: string | null;
  handoverConfirmedAt?: string | null;
  employee: {
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

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Nghỉ phép năm",
  sick: "Nghỉ ốm / Bệnh",
  unpaid: "Nghỉ không lương",
  maternity: "Nghỉ thai sản / chăm con",
  other: "Lý do khác",
};

interface Props {
  request: LeaveRequest;
  company: { name: string; signatureUrl?: string | null; stampUrl?: string | null };
  mode: "view" | "approved";
  approvedDate?: string;
  onClose: () => void;
  onApprove?: (note: string) => Promise<void>;
  onReject?: (note: string) => void;
}

function fmtDate(s: string) {
  if (!s) return "...";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function fmtDOB(s: string | null) {
  if (!s) return "............";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function fmtDateLong(s: string) {
  if (!s) return "...";
  const [y, m, d] = s.split("-");
  return `ngày ${parseInt(d)} tháng ${parseInt(m)} năm ${y}`;
}

function parseReason(reason: string | null) {
  const out: Record<string, string> = {};
  if (!reason) return out;
  for (const line of reason.split("\n")) {
    const m = line.match(/^\[(.+?)\]\s*(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (!Object.keys(out).length) out["Lý do"] = line;
  }
  return out;
}

export default function LeaveApprovalForm({
  request, company, mode, approvedDate, onClose, onApprove, onReject,
}: Props) {
  const [remindDeduct, setRemindDeduct] = useState(false);
  const [remindBonus, setRemindBonus] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const buildNote = () => {
    const parts: string[] = [];
    if (noteText.trim()) parts.push(noteText.trim());
    if (remindDeduct) {
      const perDay = request.employee.baseSalary ? Math.round(request.employee.baseSalary / 26) : 0;
      if (request.type === "unpaid") {
        parts.push(`[Kế toán] Trừ lương ${request.employee.name}: ${request.days} ngày × ${perDay > 0 ? perDay.toLocaleString("vi-VN") + "đ" : "(?đ/ngày)"}`);
      } else {
        parts.push(`[Kế toán] Ghi nhận nghỉ phép năm: trừ ${request.days} ngày từ số dư phép của ${request.employee.name}`);
      }
    }
    if (remindBonus && request.handoverEmployeeName) {
      parts.push(`[Kế toán] Xem xét phụ cấp kiêm nhiệm cho ${request.handoverEmployeeName}: ${request.days} ngày`);
    }
    return parts.join("\n");
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    setActing(true);
    await onApprove(buildNote());
    setActing(false);
  };

  const parsed = parseReason(request.reason);
  const emp = request.employee;
  const submitDate = new Date(request.createdAt);
  const displayApprovedDate = approvedDate
    ?? `ngày ${submitDate.getDate()} tháng ${submitDate.getMonth() + 1} năm ${submitDate.getFullYear()}`;

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#leave-print-root) { display: none !important; }
          #leave-print-root { position: fixed; inset: 0; z-index: 9999; background: white; overflow: visible; }
          #leave-print-bar { display: none !important; }
          .leave-a4 { box-shadow: none !important; border-radius: 0 !important; }
          @page { size: A4; margin: 1.5cm; }
        }
      `}</style>

      <div id="leave-print-root" className="fixed inset-0 z-50 bg-black/60 flex flex-col">

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto py-6 px-4 pb-44">
          <div
            className="leave-a4 bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* ── HEADER (giống kiosk) ── */}
            <div className="text-center pt-6 pb-3 border-b-2 border-gray-800 mx-6">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700">
                Cộng hoà Xã hội Chủ nghĩa Việt Nam
              </p>
              <p className="text-sm font-bold underline italic text-gray-700 mt-0.5">
                Độc lập – Tự do – Hạnh phúc
              </p>
              <p className="text-xs text-gray-400 mt-1">————★————</p>
              <h1 className="text-lg font-black uppercase tracking-widest mt-3 mb-1 text-gray-900">
                Đơn Xin Nghỉ Phép
              </h1>
              <p className="text-xs italic text-gray-500">
                ({LEAVE_TYPE_LABELS[request.type] ?? request.type})
              </p>
            </div>

            {/* ── BODY ── */}
            <div className="px-7 pt-5 pb-4 text-sm leading-7 text-gray-800">

              {/* Kính gửi */}
              <p className="mb-3">
                <span className="font-bold">Kính gửi:</span> Ban Giám đốc Công ty{" "}
                <span className="font-bold">{company.name}</span>
              </p>

              {/* Thông tin cá nhân — layout giống kiosk */}
              <p className="mb-1">
                <span className="font-bold">Tôi tên là: </span>
                <span className="font-bold text-blue-900 underline decoration-dotted">{emp.name}</span>
                <span className="mx-4 text-gray-400">·</span>
                <span className="font-bold">Mã NV: </span>
                <span className="font-mono">{emp.code}</span>
              </p>
              <p className="mb-1">
                <span className="font-bold">Ngày/ Tháng/ Năm sinh: </span>
                <span>{fmtDOB(emp.dateOfBirth)}</span>
                <span className="mx-4 text-gray-400">·</span>
                <span className="font-bold">Chức vụ: </span>
                <span>{emp.position || "............"}</span>
              </p>
              <p className="mb-1">
                <span className="font-bold">Phòng/ Ban: </span>
                <span>{emp.department || emp.branch.name}</span>
              </p>
              <p className="mb-3">
                <span className="font-bold">Điện thoại liên lạc: </span>
                <span>{emp.phone || parsed["Liên lạc"] || "............"}</span>
                {request.type === "annual" && (
                  <>
                    <span className="mx-4 text-gray-400">·</span>
                    <span className="text-blue-700 text-xs">Phép còn lại: {emp.annualLeaveBalance} ngày</span>
                  </>
                )}
              </p>

              {/* Xin phép */}
              <p className="mb-1 leading-8">
                Nay tôi làm đơn này xin phép{" "}
                <span className="font-bold text-blue-800 text-base">{request.days} ngày</span>,
                được nghỉ phép từ ngày{" "}
                <span className="font-bold border-b-2 border-blue-300 px-1">{fmtDate(request.fromDate)}</span>
                {" "}đến ngày{" "}
                <span className="font-bold border-b-2 border-blue-300 px-1">{fmtDate(request.toDate)}</span>.
              </p>

              {/* Lý do */}
              <p className="font-bold mt-3 mb-1">Lý do xin nghỉ:</p>
              <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-sm leading-relaxed rounded min-h-[60px] whitespace-pre-wrap">
                {parsed["Lý do"] || <span className="text-gray-400 italic">(chưa điền)</span>}
              </div>

              {/* Bàn giao */}
              <p className="mt-3 mb-0.5 leading-8">
                Trong thời gian xin nghỉ, tôi xin bàn giao công việc lại cho:{" "}
                {parsed["Bàn giao"] ? (
                  <span className="font-semibold text-blue-800">
                    {parsed["Bàn giao"].replace(/^Bàn giao cho\s*/i, "")}
                  </span>
                ) : (
                  <span className="text-gray-400 italic text-xs">Không bàn giao</span>
                )}
              </p>
              {request.handoverEmployeeName && (
                <p className={`text-xs px-3 py-1 rounded w-fit mb-1 ${
                  request.handoverConfirmedAt
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-amber-50 border border-amber-200 text-amber-700"
                }`}>
                  {request.handoverConfirmedAt
                    ? `✓ ${request.handoverEmployeeName} đã xác nhận bàn giao`
                    : `⏳ ${request.handoverEmployeeName} chưa xác nhận (chờ quét QR)`}
                </p>
              )}

              {/* Liên lạc khi nghỉ */}
              <p className="mt-2 leading-8">
                <span className="font-bold">Điện thoại liên lạc khi nghỉ: </span>
                <span className="font-mono">
                  {parsed["Liên lạc"] || emp.phone || "............"}
                </span>
              </p>

              {/* Ghi thêm */}
              {parsed["Ghi thêm"] && (
                <div className="mt-2 mb-1">
                  <p className="text-gray-500 text-xs italic mb-1">Thông tin thêm cần quản lý biết:</p>
                  <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-sm leading-relaxed rounded whitespace-pre-wrap">
                    {parsed["Ghi thêm"]}
                  </div>
                </div>
              )}

              {/* Cam kết */}
              <p className="mt-4 text-gray-700 leading-7">
                Tôi xin hứa sẽ cập nhật tình hình công việc thường xuyên trong thời gian nghỉ
                và cam kết trở lại làm việc đúng thời hạn quy định.
              </p>
              <p className="text-gray-700 leading-7">
                Kính mong <span className="italic">Ban Giám đốc {company.name}</span> giải quyết
                cho tôi nghỉ phép theo nguyện vọng trên.
              </p>
              <p className="text-gray-700 font-semibold mt-1">Xin trân trọng cảm ơn!</p>

              {/* Ghi chú admin (chỉ hiện khi đã duyệt) */}
              {mode === "approved" && request.note && (
                <div className="mt-3 border-l-4 border-green-500 bg-green-50 pl-4 py-2 rounded-r text-xs">
                  <p className="font-bold text-green-700 mb-0.5 uppercase tracking-wide text-[10px]">Ghi chú khi duyệt:</p>
                  <p className="text-green-700 whitespace-pre-line">{request.note}</p>
                </div>
              )}

              {/* ── CHỮ KÝ — giống kiosk ── */}
              <div className="flex justify-between items-start mt-6 mb-2">
                {/* Trái: Người duyệt */}
                <div className="text-center text-sm w-48">
                  <p className="font-bold text-[11px] uppercase tracking-wide text-gray-700">
                    Xác nhận của Trưởng phòng
                  </p>
                  <p className="text-[10px] italic text-gray-400">(Ký, ghi rõ họ tên)</p>
                  <div className="h-20 border border-dashed border-gray-300 rounded mt-2 flex items-center justify-center relative overflow-hidden">
                    {mode === "approved" && company.signatureUrl ? (
                      <>
                        <img src={company.signatureUrl} alt="Chữ ký" className="max-h-16 max-w-full object-contain" style={{ mixBlendMode: "multiply" }} />
                        {company.stampUrl && (
                          <img src={company.stampUrl} alt="Dấu" className="absolute right-0 bottom-0 max-h-14 max-w-[64px] object-contain opacity-75" style={{ mixBlendMode: "multiply" }} />
                        )}
                      </>
                    ) : (
                      <span className="text-gray-200 text-xs tracking-widest">. . . . . . . . . .</span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-800 border-t border-gray-400 mt-2 pt-1 text-sm">Ban Giám đốc</p>
                </div>

                {/* Phải: Người làm đơn */}
                <div className="text-center text-sm w-56">
                  <p className="italic text-gray-500 text-xs mb-1">
                    ......, {fmtDateLong(request.createdAt.slice(0, 10))}
                  </p>
                  <p className="font-bold text-[11px] uppercase tracking-wide text-gray-700">Người làm đơn</p>
                  <p className="text-[10px] italic text-gray-400 mb-1">(Ký và ghi rõ họ tên)</p>
                  <div
                    className="relative border border-gray-300 rounded bg-blue-50/20 flex items-center justify-center"
                    style={{ height: 90 }}
                  >
                    {request.employeeSignature ? (
                      <img
                        src={request.employeeSignature}
                        alt="Chữ ký nhân viên"
                        className="max-h-20 max-w-full object-contain"
                        style={{ mixBlendMode: "multiply" }}
                      />
                    ) : (
                      <span className="text-gray-200 text-xs tracking-widest">. . . . . . . . . .</span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-800 border-t border-gray-400 mt-2 pt-1 text-sm">{emp.name}</p>
                </div>
              </div>

              {/* Footer */}
              <p className="text-center text-[10px] text-gray-300 mt-4 border-t border-gray-100 pt-3">
                Phiếu được tạo tự động bởi hệ thống Timio · ID: {request.id.slice(-12).toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* ── BOTTOM ACTION BAR ── */}
        <div id="leave-print-bar" className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-10">
          {mode === "view" && onApprove ? (
            <div className="max-w-4xl mx-auto px-5 py-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs font-bold text-blue-700 whitespace-nowrap">Nhắc kế toán:</span>
                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={remindDeduct} onChange={(e) => setRemindDeduct(e.target.checked)} className="accent-blue-600" />
                  {request.type === "unpaid" ? `Trừ lương (${request.days} ngày)` : `Trừ ${request.days} ngày phép`}
                </label>
                {request.handoverEmployeeName && (
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer whitespace-nowrap">
                    <input type="checkbox" checked={remindBonus} onChange={(e) => setRemindBonus(e.target.checked)} className="accent-blue-600" />
                    Phụ cấp {request.handoverEmployeeName.split(" (")[0]}
                  </label>
                )}
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-0"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm hover:bg-gray-50">
                  <X size={14} className="inline mr-1" />Đóng
                </button>
                <button
                  onClick={() => onReject && onReject(noteText.trim())}
                  disabled={acting}
                  className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle size={14} className="inline mr-1" />Từ chối
                </button>
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} className="inline mr-1" />
                  {acting ? "Đang lưu..." : "✓ Duyệt nghỉ phép"}
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {mode === "approved" ? `Đã duyệt — ${displayApprovedDate}` : ""}
              </p>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  <Printer size={15} /> In phiếu
                </button>
                <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                  <X size={15} /> Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
