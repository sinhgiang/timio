"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Breakdown {
  month: number;
  eligible: boolean;
  daysPresent: number;
}

interface EmployeeTh13 {
  id: string;
  name: string;
  code: string;
  department: string | null;
  baseSalary: number;
  joinDate: string | null;
  eligibleMonths: number;
  amount: number;
  breakdown: Breakdown[];
}

const MONTHS = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

export default function Th13Client({ currentYear }: { currentYear: number }) {
  const [year, setYear] = useState(currentYear);
  const [minDays, setMinDays] = useState(15);
  const [data, setData] = useState<EmployeeTh13[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/13th-month?year=${year}&minDays=${minDays}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [year, minDays]);

  useEffect(() => { void load(); }, [load]);

  const totalAmount = data.reduce((s, e) => s + e.amount, 0);

  const handleExport = async () => {
    setExporting(true);
    const res = await fetch(`/api/reports/export?type=13th-month&year=${year}&minDays=${minDays}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `luong-thang-13-${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lương tháng 13</h1>
          <p className="text-gray-500 text-sm mt-0.5">Tính thưởng Tết theo số tháng đủ điều kiện</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Năm:</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Ngưỡng ngày tối thiểu:</label>
            <input
              type="number"
              min={1}
              max={31}
              value={minDays}
              onChange={(e) => setMinDays(Number(e.target.value))}
              className="w-16 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-center"
            />
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || loading || data.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex items-center justify-between gap-4">
        <p className="text-sm text-blue-700">
          <strong>Công thức:</strong> Lương T13 = Lương cơ bản × (Số tháng đủ điều kiện / 12)
          &nbsp;·&nbsp; Tháng đủ điều kiện = tháng có ≥ <strong>{minDays}</strong> ngày đi làm
        </p>
        <Link
          href="/dashboard/reports/13th-month/guide"
          className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          Xem chi tiết
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Đang tải...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Chưa có nhân viên nào</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1E3A5F] text-white">
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap sticky left-0 bg-[#1E3A5F]">Nhân viên</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Lương CB</th>
                <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">Ngày vào</th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-2 py-3 text-center font-semibold w-10">{m}</th>
                ))}
                <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">Tháng đủ</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Lương T13</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((emp, i) => (
                <tr key={emp.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3 sticky left-0 bg-inherit">
                    <div className="font-medium text-gray-800">{emp.name}</div>
                    <div className="text-xs text-gray-400">{emp.code}{emp.department ? ` · ${emp.department}` : ""}</div>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 whitespace-nowrap">
                    {emp.baseSalary > 0 ? formatCurrency(emp.baseSalary) : <span className="text-gray-300 italic">Chưa có</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-gray-500 whitespace-nowrap text-xs">
                    {emp.joinDate ? emp.joinDate.slice(0, 10).split("-").reverse().join("/") : <span className="text-gray-300">—</span>}
                  </td>
                  {emp.breakdown.map((b) => (
                    <MonthCell key={b.month} breakdown={b} />
                  ))}
                  <td className="px-3 py-3 text-center font-semibold text-gray-700">
                    {emp.eligibleMonths}
                  </td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                    {emp.baseSalary > 0 ? (
                      <span className="text-green-700">{formatCurrency(emp.amount)}</span>
                    ) : (
                      <span className="text-gray-300 font-normal italic">Chưa có lương CB</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#1E3A5F] text-white font-semibold">
                <td className="px-4 py-3 sticky left-0 bg-[#1E3A5F]">Tổng cộng</td>
                <td colSpan={14} />
                <td className="px-4 py-3 text-right whitespace-nowrap text-lg">{formatCurrency(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> Đủ điều kiện (≥ {minDays} ngày)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Không đủ</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Chưa có dữ liệu</span>
      </div>
    </div>
  );
}

function MonthCell({ breakdown }: { breakdown: Breakdown }) {
  const { eligible, daysPresent } = breakdown;
  const hasData = daysPresent > 0;

  let cellClass = "bg-gray-50 text-gray-300";
  let label = "—";

  if (hasData || eligible) {
    if (eligible) {
      cellClass = "bg-green-100 text-green-700 font-semibold";
      label = "✓";
    } else {
      cellClass = "bg-red-50 text-red-400";
      label = String(daysPresent);
    }
  }

  return (
    <td className="px-1 py-3 text-center">
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs ${cellClass}`}
        title={`${daysPresent} ngày`}
      >
        {label}
      </span>
    </td>
  );
}
