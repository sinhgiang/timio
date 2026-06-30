"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Banknote, ChevronLeft, ChevronRight, Download } from "lucide-react";

interface Row {
  id: string;
  name: string;
  code: string;
  department: string;
  branchName: string;
  baseSalary: number;
  netSalary: number;
  advanceAmount: number;
  netAfterAdvance: number;
}

interface PaymentInfo {
  status: string;
  paidAt: string | null;
  note: string | null;
  amount: number;
}

interface Props {
  rows: Row[];
  companyName: string;
  currentMonth: string;
  paymentMap: Record<string, PaymentInfo>;
}

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function fmtPaidAt(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default function SalaryPaymentsClient({ rows, companyName, currentMonth, paymentMap }: Props) {
  const router = useRouter();
  const [payments, setPayments] = useState<Record<string, PaymentInfo>>(paymentMap);
  const [paying, setPaying] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);

  const [yearStr, monStr] = currentMonth.split("-");
  const year  = parseInt(yearStr);
  const month = parseInt(monStr);

  const changeMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/dashboard/salary-payments?month=${m}`);
  };

  const paidCount   = rows.filter((r) => payments[r.id]?.status === "paid").length;
  const unpaidCount = rows.length - paidCount;
  const totalNet    = rows.reduce((s, r) => s + r.netAfterAdvance, 0);
  const totalPaid   = rows.filter((r) => payments[r.id]?.status === "paid").reduce((s, r) => s + r.netAfterAdvance, 0);
  const totalUnpaid = totalNet - totalPaid;

  const downloadExport = (filter: "all" | "unpaid") => {
    window.open(`/api/salary-payments/export?year=${year}&month=${month}&filter=${filter}`, "_blank");
  };

  const togglePayment = async (employeeId: string, currentStatus: string) => {
    const row = rows.find((r) => r.id === employeeId);
    if (!row) return;
    const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
    setPaying((p) => ({ ...p, [employeeId]: true }));
    try {
      const res = await fetch("/api/salary-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, year, month, amount: row.netAfterAdvance, status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setPayments((p) => ({
          ...p,
          [employeeId]: {
            status: data.status,
            paidAt: data.paidAt ?? null,
            note: data.note ?? null,
            amount: data.amount ?? 0,
          },
        }));
      }
    } finally {
      setPaying((p) => ({ ...p, [employeeId]: false }));
    }
  };

  const markAllPaid = async () => {
    const unpaidRows = rows.filter((r) => payments[r.id]?.status !== "paid");
    if (unpaidRows.length === 0) return;
    if (!confirm(`Đánh dấu tất cả ${unpaidRows.length} nhân viên chưa trả là "Đã thanh toán"?`)) return;
    setBulkLoading(true);
    await Promise.all(
      unpaidRows.map((r) =>
        fetch("/api/salary-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: r.id, year, month, amount: r.netAfterAdvance, status: "paid" }),
        })
          .then((res) => res.json())
          .then((data) =>
            setPayments((p) => ({
              ...p,
              [r.id]: { status: data.status, paidAt: data.paidAt ?? null, note: data.note ?? null, amount: data.amount ?? 0 },
            }))
          )
          .catch(() => null)
      )
    );
    setBulkLoading(false);
  };

  const monthLabel = new Date(year, month - 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Thanh toán lương</h1>
          <p className="text-sm text-gray-500 mt-0.5">{companyName} — theo dõi chi lương hàng tháng</p>
        </div>
        {/* Month picker */}
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <span className="font-semibold text-gray-700 text-sm min-w-[130px] text-center capitalize">{monthLabel}</span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Tổng nhân viên</p>
          <p className="text-2xl font-bold text-gray-800">{rows.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
          <p className="text-xs text-green-600 mb-1">Đã thanh toán</p>
          <p className="text-2xl font-bold text-green-700">{paidCount}</p>
          {totalPaid > 0 && <p className="text-xs text-green-500 mt-0.5">{fmt(totalPaid)}</p>}
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
          <p className="text-xs text-orange-600 mb-1">Chưa thanh toán</p>
          <p className="text-2xl font-bold text-orange-700">{unpaidCount}</p>
          {totalUnpaid > 0 && <p className="text-xs text-orange-500 mt-0.5">{fmt(totalUnpaid)}</p>}
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <p className="text-xs text-blue-600 mb-1">Tổng chi lương</p>
          <p className="text-lg font-bold text-blue-700">{fmt(totalNet)}</p>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadExport("unpaid")}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Xuất file chuyển khoản cho nhân viên chưa trả"
          >
            <Download size={14} strokeWidth={1.5} />
            Xuất CK chưa trả
          </button>
          <button
            onClick={() => downloadExport("all")}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Xuất file chuyển khoản tất cả nhân viên"
          >
            <Download size={14} strokeWidth={1.5} />
            Xuất CK tất cả
          </button>
        </div>
        {unpaidCount > 0 && (
          <button
            onClick={markAllPaid}
            disabled={bulkLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 size={14} strokeWidth={2} />
            {bulkLoading ? "Đang cập nhật..." : `Đánh dấu tất cả đã trả (${unpaidCount} NV)`}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nhân viên</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Thực nhận</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Tạm ứng</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Còn lại CK</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => {
              const p = payments[row.id];
              const isPaid = p?.status === "paid";
              return (
                <tr key={row.id} className={`hover:bg-gray-50/50 transition-colors ${isPaid ? "opacity-70" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{row.name}</p>
                    <p className="text-xs text-gray-400">
                      {row.code}
                      {row.department && ` · ${row.department}`}
                      {` · ${row.branchName}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(row.netSalary)}</td>
                  <td className="px-4 py-3 text-right text-orange-600 text-xs">{row.advanceAmount > 0 ? `-${fmt(row.advanceAmount)}` : "—"}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(row.netAfterAdvance)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => togglePayment(row.id, p?.status ?? "unpaid")}
                        disabled={paying[row.id]}
                        title={isPaid ? `Đã trả ${fmtPaidAt(p?.paidAt ?? null)} — nhấn để đổi` : "Đánh dấu đã trả"}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                          isPaid
                            ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100"
                            : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {isPaid ? (
                          <><CheckCircle2 size={12} strokeWidth={2} /> Đã trả{p?.paidAt ? ` ${fmtPaidAt(p.paidAt)}` : ""}</>
                        ) : (
                          <><Circle size={12} strokeWidth={2} /> Chưa trả</>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="px-4 py-3 font-semibold text-gray-700">Tổng cộng ({rows.length} NV)</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-700">
                {fmt(rows.reduce((s, r) => s + r.netSalary, 0))}
              </td>
              <td className="px-4 py-3 text-right text-orange-600 text-xs font-medium">
                {rows.some((r) => r.advanceAmount > 0) ? `-${fmt(rows.reduce((s, r) => s + r.advanceAmount, 0))}` : "—"}
              </td>
              <td className="px-4 py-3 text-right font-bold text-blue-700">{fmt(totalNet)}</td>
              <td className="px-4 py-3 text-center text-xs text-gray-500">
                <span className="text-green-600 font-medium">{paidCount} đã trả</span>
                {unpaidCount > 0 && <> · <span className="text-orange-500 font-medium">{unpaidCount} chưa trả</span></>}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        <Banknote size={12} className="inline mr-1" />
        Nhấn vào "Chưa trả" để đánh dấu đã thanh toán. Dữ liệu đồng bộ với trang Phiếu lương.
      </p>
    </div>
  );
}
