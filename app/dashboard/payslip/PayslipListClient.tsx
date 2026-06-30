"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import Link from "next/link";
import { FileText, Printer, TrendingDown, TrendingUp, ShieldCheck, CheckCircle2, Circle, Banknote, Mail, Download } from "lucide-react";

interface PayslipRow {
  id: string;
  name: string;
  code: string;
  department: string;
  position: string;
  baseSalary: number;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  totalMinutesLate: number;
  totalPenalty: number;
  totalOvertimeAmount: number;
  totalMinutesOvertime: number;
  bhxhEmployee: number;
  tncn: number;
  netSalary: number;
  email?: string | null;
}

interface PaymentInfo {
  status: string;
  paidAt: string | null;
}

interface Props {
  rows: PayslipRow[];
  companyName: string;
  currentMonth: string;
  paymentMap: Record<string, PaymentInfo>;
}

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default function PayslipListClient({ rows, companyName, currentMonth, paymentMap }: Props) {
  const router = useRouter();
  const [payments, setPayments] = useState<Record<string, PaymentInfo>>(paymentMap);
  const [paying, setPaying] = useState<Record<string, boolean>>({});
  const [emailing, setEmailing] = useState<Record<string, "sending" | "sent" | "error">>({});

  const [year, mon] = currentMonth.split("-");
  const yearN = parseInt(year);
  const monN = parseInt(mon);

  const sendPayslipEmail = useCallback(async (employeeId: string) => {
    setEmailing((e) => ({ ...e, [employeeId]: "sending" }));
    try {
      const res = await fetch("/api/payslip/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, year: yearN, month: monN }),
      });
      setEmailing((e) => ({ ...e, [employeeId]: res.ok ? "sent" : "error" }));
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Gửi email thất bại");
      }
    } catch {
      setEmailing((e) => ({ ...e, [employeeId]: "error" }));
    }
  }, [yearN, monN]);

  const markPayment = useCallback(async (employeeId: string, netSalary: number, status: "paid" | "unpaid") => {
    setPaying((p) => ({ ...p, [employeeId]: true }));
    try {
      const res = await fetch("/api/salary-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, year: yearN, month: monN, amount: netSalary, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setPayments((p) => ({
          ...p,
          [employeeId]: { status: data.status, paidAt: data.paidAt ?? null },
        }));
      }
    } finally {
      setPaying((p) => ({ ...p, [employeeId]: false }));
    }
  }, [yearN, monN]);

  const markAll = async (status: "paid" | "unpaid") => {
    for (const r of rows) {
      await markPayment(r.id, r.netSalary, status);
    }
  };

  const paidCount = rows.filter((r) => payments[r.id]?.status === "paid").length;

  const totalNet = rows.reduce((s, r) => s + r.netSalary, 0);
  const totalPenalty = rows.reduce((s, r) => s + r.totalPenalty, 0);
  const totalOvertime = rows.reduce((s, r) => s + r.totalOvertimeAmount, 0);
  const totalBhxh = rows.reduce((s, r) => s + r.bhxhEmployee, 0);
  const totalTncn = rows.reduce((s, r) => s + r.tncn, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phiếu lương</h1>
          <p className="text-sm text-gray-500 mt-0.5">{companyName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(`/api/payslip/export?year=${yearN}&month=${monN}`, "_blank")}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            title="Xuất bảng lương Excel đầy đủ"
          >
            <Download size={15} />
            Xuất Excel
          </button>
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => router.push(`/dashboard/payslip?month=${e.target.value}`)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Payment status bar */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 mb-4 shadow-sm flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Banknote size={18} className="text-green-600" />
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Trả lương tháng {mon}/{year}
              </p>
              <p className="text-xs text-gray-400">
                {paidCount}/{rows.length} nhân viên đã trả · {fmt(rows.filter(r => payments[r.id]?.status === "paid").reduce((s, r) => s + r.netSalary, 0))} đã chi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {paidCount < rows.length ? (
              <button
                onClick={() => markAll("paid")}
                className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Đánh dấu tất cả đã trả
              </button>
            ) : (
              <button
                onClick={() => markAll("unpaid")}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Đặt lại tất cả
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 col-span-1">
          <p className="text-xs text-blue-600 font-medium mb-1">Tổng thực nhận</p>
          <p className="text-lg font-bold text-blue-700">{fmt(totalNet)}</p>
          <p className="text-xs text-gray-500 mt-1">{rows.length} nhân viên</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium mb-1 flex items-center gap-1">
            <TrendingDown size={13} /> Tổng phạt
          </p>
          <p className="text-lg font-bold text-red-600">{fmt(totalPenalty)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium mb-1 flex items-center gap-1">
            <TrendingUp size={13} /> Tổng tăng ca
          </p>
          <p className="text-lg font-bold text-green-600">{fmt(totalOvertime)}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4">
          <p className="text-xs text-orange-600 font-medium mb-1 flex items-center gap-1">
            <ShieldCheck size={13} /> Tổng BHXH NV
          </p>
          <p className="text-lg font-bold text-orange-600">{fmt(totalBhxh)}</p>
          <p className="text-xs text-gray-400 mt-1">10.5% lương CB</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-xs text-purple-600 font-medium mb-1">Tổng thuế TNCN</p>
          <p className="text-lg font-bold text-purple-600">{totalTncn > 0 ? fmt(totalTncn) : "0đ (miễn thuế)"}</p>
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-500">Chưa có nhân viên</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nhân viên</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Công</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Lương CB</th>
                <th className="text-right px-3 py-3 font-semibold text-red-500">Phạt</th>
                <th className="text-right px-3 py-3 font-semibold text-green-600">Tăng ca</th>
                <th className="text-right px-3 py-3 font-semibold text-orange-500">BHXH (10.5%)</th>
                <th className="text-right px-3 py-3 font-semibold text-purple-600">Thuế TNCN</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-800">Thực nhận</th>
                <th className="text-center px-3 py-3 font-semibold text-green-700">Thanh toán</th>
                <th className="text-center px-3 py-3 font-semibold text-blue-600">Email</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.code}{r.department ? ` · ${r.department}` : ""}</p>
                  </td>
                  <td className="text-center px-3 py-3 text-gray-700">
                    <span className="font-medium">{r.daysPresent}</span>
                    {r.daysAbsent > 0 && <span className="text-xs text-red-400 ml-1">(-{r.daysAbsent})</span>}
                  </td>
                  <td className="text-right px-3 py-3 text-gray-600">{fmt(r.baseSalary)}</td>
                  <td className="text-right px-3 py-3 text-red-500 font-medium">
                    {r.totalPenalty > 0 ? `-${fmt(r.totalPenalty)}` : "—"}
                  </td>
                  <td className="text-right px-3 py-3 text-green-600 font-medium">
                    {r.totalOvertimeAmount > 0 ? `+${fmt(r.totalOvertimeAmount)}` : "—"}
                  </td>
                  <td className="text-right px-3 py-3 text-orange-500 font-medium">
                    {r.bhxhEmployee > 0 ? `-${fmt(r.bhxhEmployee)}` : "—"}
                  </td>
                  <td className="text-right px-3 py-3 text-purple-600 font-medium">
                    {r.tncn > 0 ? `-${fmt(r.tncn)}` : <span className="text-gray-400 text-xs">miễn thuế</span>}
                  </td>
                  <td className="text-right px-4 py-3">
                    <span className="font-bold text-gray-900">{fmt(r.netSalary)}</span>
                  </td>
                  <td className="text-center px-3 py-3">
                    {payments[r.id]?.status === "paid" ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 size={14} />
                          <span className="text-xs font-medium">Đã trả</span>
                        </div>
                        {payments[r.id]?.paidAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(payments[r.id].paidAt!).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                          </span>
                        )}
                        <button
                          onClick={() => markPayment(r.id, r.netSalary, "unpaid")}
                          disabled={paying[r.id]}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors underline"
                        >
                          Hoàn tác
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => markPayment(r.id, r.netSalary, "paid")}
                        disabled={paying[r.id]}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        {paying[r.id] ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <>
                            <Circle size={12} />
                            Trả lương
                          </>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="text-center px-3 py-3">
                    {r.email ? (
                      <button
                        onClick={() => sendPayslipEmail(r.id)}
                        disabled={emailing[r.id] === "sending"}
                        title={`Gửi phiếu lương tới ${r.email}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          emailing[r.id] === "sent"
                            ? "bg-green-50 text-green-600"
                            : emailing[r.id] === "error"
                            ? "bg-red-50 text-red-500"
                            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        } disabled:opacity-50`}
                      >
                        <Mail size={12} />
                        {emailing[r.id] === "sending" ? "..." : emailing[r.id] === "sent" ? "Đã gửi" : emailing[r.id] === "error" ? "Lỗi" : "Gửi"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300" title="Nhân viên chưa có email">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/dashboard/payslip/${r.id}?month=${currentMonth}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Printer size={13} />
                      In phiếu
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50/60 border-t-2 border-blue-100">
                <td className="px-4 py-3 font-bold text-gray-700" colSpan={2}>Tổng cộng ({rows.length} NV)</td>
                <td className="text-right px-3 py-3 font-bold text-gray-700">
                  {fmt(rows.reduce((s, r) => s + r.baseSalary, 0))}
                </td>
                <td className="text-right px-3 py-3 font-bold text-red-500">
                  {totalPenalty > 0 ? `-${fmt(totalPenalty)}` : "—"}
                </td>
                <td className="text-right px-3 py-3 font-bold text-green-600">
                  {totalOvertime > 0 ? `+${fmt(totalOvertime)}` : "—"}
                </td>
                <td className="text-right px-3 py-3 font-bold text-orange-500">
                  {totalBhxh > 0 ? `-${fmt(totalBhxh)}` : "—"}
                </td>
                <td className="text-right px-3 py-3 font-bold text-purple-600">
                  {totalTncn > 0 ? `-${fmt(totalTncn)}` : "—"}
                </td>
                <td className="text-right px-4 py-3 font-bold text-blue-700 text-base">{fmt(totalNet)}</td>
                <td className="text-center px-3 py-3">
                  <span className="text-xs font-medium text-green-700">{paidCount}/{rows.length} đã trả</span>
                </td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        Tháng {mon}/{year} · &quot;Thực nhận&quot; = Lương CB + Tăng ca − Phạt − BHXH (10.5%) − Thuế TNCN · Bấm &quot;In phiếu&quot; để xem chi tiết
      </p>
    </div>
  );
}
