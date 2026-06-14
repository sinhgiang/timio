"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, X, CheckCircle2, XCircle, ArrowRightLeft, Clock } from "lucide-react";

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
    annualLeaveBalance: number;
    baseSalary: number;
    branch: { name: string };
  };
}

const TYPE_LABELS: Record<string, string> = {
  annual: "Nghỉ phép năm",
  sick: "Nghỉ ốm / Bệnh",
  unpaid: "Nghỉ không lương",
  maternity: "Nghỉ thai sản / chăm con",
  other: "Lý do khác",
};

interface Props {
  request: LeaveRequest;
  company: { name: string; signatureUrl?: string | null; stampUrl?: string | null };
  /** "view" = đang chờ duyệt, "approved" = đã duyệt rồi */
  mode: "view" | "approved";
  approvedDate?: string;
  onClose: () => void;
  onApprove?: (note: string) => Promise<void>;
  onReject?: (note: string) => void;
}

function fmtDate(s: string) {
  if (!s) return s;
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export default function LeaveApprovalForm({
  request, company, mode, approvedDate, onClose, onApprove, onReject,
}: Props) {
  const [remindDeduct, setRemindDeduct] = useState(false);
  const [remindBonus, setRemindBonus] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const buildNote = () => {
    const parts: string[] = [];
    if (noteText.trim()) parts.push(noteText.trim());
    if (remindDeduct) {
      const perDay = request.employee.baseSalary ? Math.round(request.employee.baseSalary / 26) : 0;
      if (request.type === "unpaid") {
        parts.push(`[Kế toán] Trừ lương ${request.employee.name}: ${request.days} ngày × ${perDay > 0 ? perDay.toLocaleString("vi-VN") + "đ" : "(?đ/ngày)"} = ${perDay > 0 ? (perDay * request.days).toLocaleString("vi-VN") + "đ" : "cần tính"}`);
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

  const handleReject = () => {
    if (!onReject) return;
    onReject(noteText.trim());
  };

  const parsedReason = request.reason
    ? Object.fromEntries(
        request.reason.split("\n").filter(Boolean).map((line) => {
          const m = line.match(/^\[(.+?)\]\s*(.*)$/);
          return m ? [m[1], m[2]] : ["", line];
        })
      )
    : {};

  const displayDate = approvedDate ?? new Date().toLocaleDateString("vi-VN");

  return (
    <>
      <style jsx global>{`
        @media print {
          body > *:not(#leave-print-root) { display: none !important; }
          #leave-print-root { position: fixed; inset: 0; z-index: 9999; background: white; }
          #leave-print-controls { display: none !important; }
          .leave-form-page { box-shadow: none !important; border: none !important; }
          @page { size: A4; margin: 1.5cm; }
        }
      `}</style>

      <div
        id="leave-print-root"
        className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4"
      >
        {/* ── Controls (hidden on print) ── */}
        <div id="leave-print-controls" className="fixed top-4 right-4 z-10 flex flex-col gap-2 w-72">

          {mode === "view" && onApprove && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 space-y-3">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Nhắc kế toán điều chỉnh lương</p>

              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={remindDeduct} onChange={(e) => setRemindDeduct(e.target.checked)} className="mt-0.5 accent-blue-600" />
                <span>
                  {request.type === "unpaid"
                    ? <>Trừ lương ({request.days} ngày × {request.employee.baseSalary > 0 ? Math.round(request.employee.baseSalary / 26).toLocaleString("vi-VN") + "đ" : "?"})</>
                    : <>Ghi nhận nghỉ phép năm ({request.days} ngày từ số dư)</>}
                </span>
              </label>

              {request.handoverEmployeeName && (
                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={remindBonus} onChange={(e) => setRemindBonus(e.target.checked)} className="mt-0.5 accent-blue-600" />
                  <span>Phụ cấp kiêm nhiệm cho <strong>{request.handoverEmployeeName}</strong></span>
                </label>
              )}

              <textarea
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ghi chú thêm cho kế toán..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={acting}
                  className="flex-1 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                >
                  <XCircle size={14} className="inline mr-1" />Từ chối
                </button>
                <button
                  onClick={handleApprove}
                  disabled={acting}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {acting ? "Đang lưu..." : <><CheckCircle2 size={14} className="inline mr-1" />Duyệt</>}
                </button>
              </div>
            </div>
          )}

          {mode === "approved" && (
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:bg-blue-700"
            >
              <Printer size={16} /> In phiếu
            </button>
          )}

          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 rounded-xl font-medium shadow-lg hover:bg-gray-50 border border-gray-200"
          >
            <X size={16} /> Đóng
          </button>
        </div>

        {/* ── A4 Page ── */}
        <div
          className="leave-form-page bg-white shadow-2xl rounded-lg w-full max-w-[210mm] min-h-[297mm] p-[1.5cm] font-serif text-gray-900 mr-80"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          {/* Header */}
          <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
            <p className="text-sm font-bold uppercase tracking-widest text-gray-600">Cộng hoà Xã hội Chủ nghĩa Việt Nam</p>
            <p className="text-sm text-gray-500 italic mb-3">Độc lập – Tự do – Hạnh phúc</p>
            <h1 className="text-2xl font-black uppercase tracking-wider text-gray-900">PHIẾU XIN NGHỈ PHÉP</h1>
            <p className="text-sm text-gray-500 mt-1">{company.name}</p>
          </div>

          {/* Meta info */}
          <div className="flex justify-between text-sm mb-6">
            <div>
              <p><span className="font-bold">Mã phiếu:</span> #{request.id.slice(-8).toUpperCase()}</p>
              <p><span className="font-bold">Ngày gửi đơn:</span> {new Date(request.createdAt).toLocaleDateString("vi-VN")}</p>
            </div>
            <div className="text-right">
              {mode === "approved" && (
                <p><span className="font-bold">Ngày duyệt:</span> {displayDate}</p>
              )}
              <p>
                <span className="font-bold">Trạng thái:</span>{" "}
                {mode === "approved"
                  ? <span className="text-green-700 font-bold">ĐÃ DUYỆT ✓</span>
                  : <span className="text-amber-600 font-bold">CHỜ DUYỆT</span>}
              </p>
            </div>
          </div>

          {/* Employee info table */}
          <table className="w-full border-collapse text-sm mb-6">
            <tbody>
              <tr className="border border-gray-300">
                <td className="border border-gray-300 bg-gray-50 px-4 py-2 font-bold w-1/3">Họ và tên</td>
                <td className="border border-gray-300 px-4 py-2 font-semibold text-base">{request.employee.name}</td>
              </tr>
              <tr className="border border-gray-300">
                <td className="border border-gray-300 bg-gray-50 px-4 py-2 font-bold">Mã nhân viên</td>
                <td className="border border-gray-300 px-4 py-2">{request.employee.code}</td>
              </tr>
              <tr className="border border-gray-300">
                <td className="border border-gray-300 bg-gray-50 px-4 py-2 font-bold">Phòng ban / Chi nhánh</td>
                <td className="border border-gray-300 px-4 py-2">
                  {[request.employee.department, request.employee.branch.name].filter(Boolean).join(" · ")}
                </td>
              </tr>
              <tr className="border border-gray-300">
                <td className="border border-gray-300 bg-gray-50 px-4 py-2 font-bold">Loại nghỉ</td>
                <td className="border border-gray-300 px-4 py-2 font-semibold">{TYPE_LABELS[request.type] ?? request.type}</td>
              </tr>
              <tr className="border border-gray-300">
                <td className="border border-gray-300 bg-gray-50 px-4 py-2 font-bold">Thời gian nghỉ</td>
                <td className="border border-gray-300 px-4 py-2">
                  Từ ngày <strong>{fmtDate(request.fromDate)}</strong> đến ngày <strong>{fmtDate(request.toDate)}</strong>
                  &nbsp;·&nbsp;<strong>{request.days} ngày</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Handover info */}
          {request.handoverEmployeeName && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-4 w-fit ${
              request.handoverConfirmedAt
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-amber-50 border border-amber-200 text-amber-700"
            }`}>
              <ArrowRightLeft size={12} />
              <span>Bàn giao → <strong>{request.handoverEmployeeName}</strong></span>
              {request.handoverConfirmedAt
                ? <><CheckCircle2 size={12} /> Đã xác nhận</>
                : <><Clock size={12} /> Chưa xác nhận</>}
            </div>
          )}

          {/* Questions / Reason */}
          <div className="border border-gray-300 rounded mb-6">
            <div className="bg-gray-50 border-b border-gray-300 px-4 py-2 font-bold text-sm">
              NỘI DUNG ĐƠN XIN NGHỈ
            </div>
            <div className="px-4 py-4 space-y-4 text-sm leading-relaxed">
              {parsedReason["Lý do"] && (
                <div>
                  <p className="font-bold text-gray-700 mb-1">1. Lý do xin nghỉ:</p>
                  <p className="pl-4 border-l-2 border-gray-200">{parsedReason["Lý do"]}</p>
                </div>
              )}
              {parsedReason["Bàn giao"] && (
                <div>
                  <p className="font-bold text-gray-700 mb-1">2. Bàn giao công việc:</p>
                  <p className="pl-4 border-l-2 border-gray-200">{parsedReason["Bàn giao"]}</p>
                </div>
              )}
              {parsedReason["Liên lạc"] && (
                <div>
                  <p className="font-bold text-gray-700 mb-1">3. Liên lạc trong thời gian nghỉ:</p>
                  <p className="pl-4 border-l-2 border-gray-200">{parsedReason["Liên lạc"]}</p>
                </div>
              )}
              {parsedReason["Ghi thêm"] && (
                <div>
                  <p className="font-bold text-gray-700 mb-1">4. Thông tin khẩn cấp:</p>
                  <p className="pl-4 border-l-2 border-gray-200">{parsedReason["Ghi thêm"]}</p>
                </div>
              )}
              {!Object.keys(parsedReason).length && request.reason && (
                <p className="text-gray-700 whitespace-pre-line">{request.reason}</p>
              )}
              {!request.reason && (
                <p className="text-gray-400 italic">Không có thông tin lý do</p>
              )}
            </div>
          </div>

          {/* Admin note (only in approved mode) */}
          {mode === "approved" && request.note && (
            <div className="border border-green-300 bg-green-50 rounded px-4 py-3 text-sm mb-6">
              <p className="font-bold text-green-800 mb-1">Ghi chú của quản lý:</p>
              <p className="text-green-700 whitespace-pre-line">{request.note}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="mt-10 grid grid-cols-2 gap-8 text-center text-sm">
            {/* Employee signature */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-bold text-gray-700 mb-2">NGƯỜI XIN NGHỈ</p>
              <p className="text-xs text-gray-400 italic mb-2">
                {new Date(request.createdAt).toLocaleDateString("vi-VN")}
              </p>
              <div className="h-20 flex items-center justify-center border-b border-dashed border-gray-300 mb-2">
                {request.employeeSignature ? (
                  <img
                    src={request.employeeSignature}
                    alt="Chữ ký nhân viên"
                    className="max-h-16 max-w-full object-contain"
                    style={{ mixBlendMode: "multiply" }}
                  />
                ) : (
                  <p className="text-gray-300 text-xs">________________</p>
                )}
              </div>
              <p className="font-semibold text-gray-700">{request.employee.name}</p>
            </div>

            {/* Admin signature */}
            <div className="border border-gray-200 rounded-lg p-4 relative">
              <p className="font-bold text-gray-700 mb-2">NGƯỜI DUYỆT</p>
              <p className="text-xs text-gray-400 italic mb-2">
                {mode === "approved" ? `Ngày ${displayDate}` : " "}
              </p>
              <div className="h-20 flex items-center justify-center relative">
                {mode === "approved" && company.signatureUrl ? (
                  <img
                    src={company.signatureUrl}
                    alt="Chữ ký"
                    className="max-h-16 max-w-full object-contain"
                    style={{ mixBlendMode: "multiply" }}
                  />
                ) : (
                  <p className="text-gray-300 text-xs">________________</p>
                )}
                {mode === "approved" && company.stampUrl && (
                  <img
                    src={company.stampUrl}
                    alt="Dấu công ty"
                    className="absolute -right-2 -bottom-2 max-h-20 max-w-20 object-contain opacity-80"
                    style={{ mixBlendMode: "multiply" }}
                  />
                )}
              </div>
              <p className="font-semibold text-gray-700 mt-2">Quản lý duyệt</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            <p>Phiếu này được tạo tự động bởi hệ thống Timio · ID: {request.id}</p>
          </div>
        </div>
      </div>
    </>
  );
}
