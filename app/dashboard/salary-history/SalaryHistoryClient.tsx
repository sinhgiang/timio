"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  code: string | null;
}

interface SalaryHistoryRow {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string | null;
  oldSalary: number;
  newSalary: number;
  reason: string | null;
  adminEmail: string | null;
}

interface ApiHistoryItem {
  id: string;
  date: string;
  employeeId: string;
  oldSalary: number;
  newSalary: number;
  reason: string | null;
  adminEmail: string | null;
  employee: {
    id: string;
    name: string;
    code: string | null;
  };
}

interface Props {
  employees: Employee[];
}

function formatVND(n: number): string {
  return n.toLocaleString("vi-VN") + " đ";
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function SalaryHistoryClient({ employees }: Props) {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [rows, setRows] = useState<SalaryHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleEmployeeChange = async (employeeId: string) => {
    setSelectedEmployee(employeeId);
    if (!employeeId) {
      setRows([]);
      setFetched(false);
      return;
    }
    setLoading(true);
    setFetched(false);
    try {
      const res = await fetch(`/api/salary-history?employeeId=${encodeURIComponent(employeeId)}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = (await res.json()) as ApiHistoryItem[];
      setRows(
        data.map((item) => ({
          id: item.id,
          date: item.date,
          employeeId: item.employeeId,
          employeeName: item.employee.name,
          employeeCode: item.employee.code,
          oldSalary: item.oldSalary,
          newSalary: item.newSalary,
          reason: item.reason,
          adminEmail: item.adminEmail,
        }))
      );
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <TrendingUp size={20} className="text-blue-600" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lịch sử thay đổi lương</h1>
          <p className="text-gray-500 text-sm">Theo dõi lịch sử điều chỉnh lương của từng nhân viên</p>
        </div>
      </div>

      {/* Employee selector */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chọn nhân viên để xem lịch sử lương
        </label>
        <select
          value={selectedEmployee}
          onChange={(e) => handleEmployeeChange(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">— Chọn nhân viên —</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}{emp.code ? ` (${emp.code})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ngày</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nhân viên</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Lương cũ</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Lương mới</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Chênh lệch</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Lý do</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Admin</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Đang tải...
                  </div>
                </td>
              </tr>
            )}
            {!loading && !selectedEmployee && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  <TrendingUp size={32} className="mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                  <p>Chọn nhân viên để xem lịch sử thay đổi lương</p>
                </td>
              </tr>
            )}
            {!loading && fetched && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  <TrendingUp size={32} className="mx-auto mb-2 opacity-30" strokeWidth={1.5} />
                  <p>Chưa có lịch sử thay đổi lương</p>
                </td>
              </tr>
            )}
            {!loading && rows.map((row) => {
              const diff = row.newSalary - row.oldSalary;
              const isPositive = diff > 0;
              return (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{row.employeeName}</div>
                    {row.employeeCode && (
                      <div className="text-xs text-gray-400">{row.employeeCode}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                    {formatVND(row.oldSalary)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">
                    {formatVND(row.newSalary)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {diff === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                        {isPositive ? "+" : ""}{formatVND(diff)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.reason ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{row.adminEmail ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
