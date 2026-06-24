"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Printer, TrendingDown, TrendingUp } from "lucide-react";

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
  netSalary: number;
}

interface Props {
  rows: PayslipRow[];
  companyName: string;
  currentMonth: string;
}

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export default function PayslipListClient({ rows, companyName, currentMonth }: Props) {
  const router = useRouter();
  const [year, mon] = currentMonth.split("-");

  const totalNet = rows.reduce((s, r) => s + r.netSalary, 0);
  const totalPenalty = rows.reduce((s, r) => s + r.totalPenalty, 0);
  const totalOvertime = rows.reduce((s, r) => s + r.totalOvertimeAmount, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phiếu lương</h1>
          <p className="text-sm text-gray-500 mt-0.5">{companyName}</p>
        </div>
        <input
          type="month"
          value={currentMonth}
          onChange={(e) => router.push(`/dashboard/payslip?month=${e.target.value}`)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium mb-1">Tổng thực nhận</p>
          <p className="text-xl font-bold text-blue-700">{fmt(totalNet)}</p>
          <p className="text-xs text-gray-500 mt-1">{rows.length} nhân viên</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium mb-1 flex items-center gap-1">
            <TrendingDown size={13} /> Tổng phạt
          </p>
          <p className="text-xl font-bold text-red-600">{fmt(totalPenalty)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium mb-1 flex items-center gap-1">
            <TrendingUp size={13} /> Tổng tăng ca
          </p>
          <p className="text-xl font-bold text-green-600">{fmt(totalOvertime)}</p>
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-500">Chưa có nhân viên</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nhân viên</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Ngày công</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Trễ</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Lương cơ bản</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 text-red-600">Phạt</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600 text-green-600">Tăng ca</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-800">Thực nhận</th>
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
                  <td className="text-center px-3 py-3 text-gray-500 text-xs">
                    {r.daysLate > 0 ? `${r.daysLate} lần` : "—"}
                  </td>
                  <td className="text-right px-3 py-3 text-gray-600">{fmt(r.baseSalary)}</td>
                  <td className="text-right px-3 py-3 text-red-500 font-medium">
                    {r.totalPenalty > 0 ? `-${fmt(r.totalPenalty)}` : "—"}
                  </td>
                  <td className="text-right px-3 py-3 text-green-600 font-medium">
                    {r.totalOvertimeAmount > 0 ? `+${fmt(r.totalOvertimeAmount)}` : "—"}
                  </td>
                  <td className="text-right px-4 py-3">
                    <span className="font-bold text-gray-900">{fmt(r.netSalary)}</span>
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
                <td className="px-4 py-3 font-bold text-gray-700" colSpan={3}>Tổng cộng ({rows.length} NV)</td>
                <td className="text-right px-3 py-3 font-bold text-gray-700">
                  {fmt(rows.reduce((s, r) => s + r.baseSalary, 0))}
                </td>
                <td className="text-right px-3 py-3 font-bold text-red-500">
                  {totalPenalty > 0 ? `-${fmt(totalPenalty)}` : "—"}
                </td>
                <td className="text-right px-3 py-3 font-bold text-green-600">
                  {totalOvertime > 0 ? `+${fmt(totalOvertime)}` : "—"}
                </td>
                <td className="text-right px-4 py-3 font-bold text-blue-700 text-base">{fmt(totalNet)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Export hint */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        Tháng {mon}/{year} · Bấm "In phiếu" để xem và in phiếu lương cá nhân
      </p>
    </div>
  );
}
