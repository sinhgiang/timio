"use client";

import { useState } from "react";

export interface PenaltyScopeValue {
  scopeType: "all" | "department" | "employee";
  scopeDepartments: string[];
  scopeEmployeeIds: string[];
  scopeDays: number[]; // 0=CN...6=T7, rỗng = tất cả các ngày
}

export const DEFAULT_PENALTY_SCOPE: PenaltyScopeValue = {
  scopeType: "all",
  scopeDepartments: [],
  scopeEmployeeIds: [],
  scopeDays: [],
};

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 0, label: "CN" },
];

interface EmployeeOpt {
  id: string;
  name: string;
  department?: string | null;
}

interface Props {
  departments: string[];
  employees: EmployeeOpt[];
  value: PenaltyScopeValue;
  onChange: (v: PenaltyScopeValue) => void;
}

/**
 * Bộ chọn phạm vi áp dụng cho 1 mức phạt: Tất cả / theo phòng ban / theo nhân viên cụ thể
 * + áp dụng vào những ngày nào trong tuần (mặc định tất cả). Dùng chung cho form phạt
 * đến muộn và phạt về sớm — thiết kế giống hệt nhau ở cả 2 nơi.
 */
export default function PenaltyScopePicker({ departments, employees, value, onChange }: Props) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  const setScopeType = (scopeType: PenaltyScopeValue["scopeType"]) => {
    onChange({ ...value, scopeType, scopeDepartments: [], scopeEmployeeIds: [] });
  };

  const toggleDepartment = (dept: string) => {
    const has = value.scopeDepartments.includes(dept);
    onChange({
      ...value,
      scopeDepartments: has ? value.scopeDepartments.filter((d) => d !== dept) : [...value.scopeDepartments, dept],
    });
  };

  const toggleEmployee = (id: string) => {
    const has = value.scopeEmployeeIds.includes(id);
    onChange({
      ...value,
      scopeEmployeeIds: has ? value.scopeEmployeeIds.filter((e) => e !== id) : [...value.scopeEmployeeIds, id],
    });
  };

  const toggleDay = (day: number) => {
    const has = value.scopeDays.includes(day);
    onChange({
      ...value,
      scopeDays: has ? value.scopeDays.filter((d) => d !== day) : [...value.scopeDays, day],
    });
  };

  const filteredEmployees = employeeSearch.trim()
    ? employees.filter((e) => e.name.toLowerCase().includes(employeeSearch.trim().toLowerCase()))
    : employees;

  return (
    <div className="space-y-3 border-t border-gray-100 pt-3 mt-1">
      {/* Áp dụng cho */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Áp dụng cho</label>
        <div className="flex gap-1.5">
          {([
            { key: "all", label: "Tất cả nhân viên" },
            { key: "department", label: "Theo phòng ban" },
            { key: "employee", label: "Theo nhân viên" },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setScopeType(opt.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                value.scopeType === opt.key
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {value.scopeType === "department" && (
        <div>
          {departments.length === 0 ? (
            <p className="text-xs text-gray-400">Chưa có phòng ban nào. Thêm phòng ban ở trang Nhân viên trước.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {departments.map((dept) => {
                const active = value.scopeDepartments.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDepartment(dept)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      active
                        ? "bg-blue-50 border-blue-400 text-blue-700"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>
          )}
          {value.scopeDepartments.length === 0 && (
            <p className="text-[11px] text-amber-500 mt-1">Chưa chọn phòng ban nào — vui lòng chọn ít nhất 1.</p>
          )}
        </div>
      )}

      {value.scopeType === "employee" && (
        <div>
          <input
            type="text"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Tìm tên nhân viên..."
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs mb-1.5"
          />
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
            {filteredEmployees.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">Không tìm thấy nhân viên</p>
            )}
            {filteredEmployees.map((emp) => {
              const active = value.scopeEmployeeIds.includes(emp.id);
              return (
                <label
                  key={emp.id}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50"
                >
                  <input type="checkbox" checked={active} onChange={() => toggleEmployee(emp.id)} className="accent-blue-600" />
                  <span className="text-gray-700">{emp.name}</span>
                  {emp.department && <span className="text-gray-400">· {emp.department}</span>}
                </label>
              );
            })}
          </div>
          {value.scopeEmployeeIds.length === 0 ? (
            <p className="text-[11px] text-amber-500 mt-1">Chưa chọn nhân viên nào — vui lòng chọn ít nhất 1.</p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-1">Đã chọn {value.scopeEmployeeIds.length} nhân viên</p>
          )}
        </div>
      )}

      {/* Áp dụng ngày */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Áp dụng vào ngày</label>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((d) => {
            const active = value.scopeDays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`w-9 h-8 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          {value.scopeDays.length === 0 ? "Không chọn = áp dụng tất cả các ngày" : `Chỉ áp dụng: ${DAY_LABELS.filter((d) => value.scopeDays.includes(d.value)).map((d) => d.label).join(", ")}`}
        </p>
      </div>
    </div>
  );
}
