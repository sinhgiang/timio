"use client";

import { useState, useCallback } from "react";
import { History, Plus, X, ChevronRight } from "lucide-react";

interface EmployeeRef {
  id: string;
  name: string;
  code: string;
  department: string | null;
}

export interface WorkHistoryRow {
  id: string;
  employeeId: string;
  date: string;
  type: string;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  createdAt: string;
  employee: { id: string; name: string; code: string };
}

interface Props {
  employees: EmployeeRef[];
}

const TYPE_LABEL: Record<string, string> = {
  promotion:         "Thăng chức",
  transfer:          "Luân chuyển",
  salary_change:     "Thay đổi lương",
  title_change:      "Thay đổi chức danh",
  department_change: "Thay đổi phòng ban",
  other:             "Khác",
};

const TYPE_COLOR: Record<string, string> = {
  promotion:         "bg-purple-50 text-purple-700 border-purple-200",
  transfer:          "bg-blue-50 text-blue-700 border-blue-200",
  salary_change:     "bg-green-50 text-green-700 border-green-200",
  title_change:      "bg-teal-50 text-teal-700 border-teal-200",
  department_change: "bg-orange-50 text-orange-700 border-orange-200",
  other:             "bg-gray-50 text-gray-600 border-gray-200",
};

const TYPE_DOT: Record<string, string> = {
  promotion:         "bg-purple-400",
  transfer:          "bg-blue-400",
  salary_change:     "bg-green-400",
  title_change:      "bg-teal-400",
  department_change: "bg-orange-400",
  other:             "bg-gray-400",
};

export default function WorkHistoryClient({ employees }: Props) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [history, setHistory] = useState<WorkHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    type: "promotion",
    description: "",
    oldValue: "",
    newValue: "",
    note: "",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  const loadHistory = useCallback(async (empId: string) => {
    if (!empId) { setHistory([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/work-history?employeeId=${empId}`);
      if (res.ok) {
        const data = await res.json() as WorkHistoryRow[];
        setHistory(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmployeeId(empId);
    void loadHistory(empId);
    setAddForm((f) => ({ ...f, employeeId: empId }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.employeeId || !addForm.date || !addForm.description) return;
    setAddSubmitting(true);
    try {
      const res = await fetch("/api/work-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: addForm.employeeId,
          date: addForm.date,
          type: addForm.type,
          description: addForm.description,
          oldValue: addForm.oldValue || undefined,
          newValue: addForm.newValue || undefined,
          note: addForm.note || undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json() as WorkHistoryRow;
        // Reload if viewing same employee
        if (addForm.employeeId === selectedEmployeeId) {
          setHistory((prev) => [created, ...prev]);
        } else {
          setSelectedEmployeeId(addForm.employeeId);
          await loadHistory(addForm.employeeId);
        }
        setAddForm((f) => ({
          ...f,
          description: "",
          oldValue: "",
          newValue: "",
          note: "",
        }));
        setShowAdd(false);
      }
    } finally {
      setAddSubmitting(false);
    }
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const inputCls =
    "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full";

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <History size={20} strokeWidth={1.5} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Lịch sử công tác</h1>
            <p className="text-sm text-gray-500 mt-0.5">Ghi nhận thăng chức, luân chuyển và thay đổi</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} strokeWidth={2} />
          Thêm sự kiện
        </button>
      </div>

      {/* Employee selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <label className="block text-xs font-medium text-gray-500 mb-2">Chọn nhân viên để xem lịch sử</label>
        <select
          value={selectedEmployeeId}
          onChange={(e) => handleEmployeeChange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white w-full sm:w-80"
        >
          <option value="">-- Chọn nhân viên --</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({emp.code}){emp.department ? ` — ${emp.department}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {!selectedEmployeeId ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <History size={36} strokeWidth={1.5} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chọn nhân viên để xem lịch sử công tác</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">Đang tải...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <History size={36} strokeWidth={1.5} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Chưa có lịch sử công tác nào cho{" "}
            <span className="font-medium">{selectedEmployee?.name}</span>
          </p>
          <p className="text-gray-400 text-xs mt-1">Bấm "Thêm sự kiện" để ghi nhận</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-5">
            <p className="text-sm font-semibold text-gray-700">
              {selectedEmployee?.name}
            </p>
            <span className="text-gray-300">·</span>
            <p className="text-xs text-gray-400">{history.length} sự kiện</p>
          </div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-100" />
            <div className="space-y-5">
              {history.map((entry) => (
                <div key={entry.id} className="relative flex gap-4">
                  {/* Dot */}
                  <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${TYPE_DOT[entry.type] ?? "bg-gray-300"}`}>
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLOR[entry.type] ?? TYPE_COLOR.other}`}>
                        {TYPE_LABEL[entry.type] ?? entry.type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.date).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{entry.description}</p>
                    {(entry.oldValue || entry.newValue) && (
                      <div className="flex items-center gap-2 mt-1">
                        {entry.oldValue && (
                          <span className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded border border-red-100 line-through">
                            {entry.oldValue}
                          </span>
                        )}
                        {entry.oldValue && entry.newValue && (
                          <ChevronRight size={14} strokeWidth={1.5} className="text-gray-300" />
                        )}
                        {entry.newValue && (
                          <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-100">
                            {entry.newValue}
                          </span>
                        )}
                      </div>
                    )}
                    {entry.note && (
                      <p className="text-xs text-gray-400 mt-1 italic">{entry.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === Add Event Modal === */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-800">Thêm sự kiện công tác</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={18} strokeWidth={1.5} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nhân viên *</label>
                <select
                  required
                  value={addForm.employeeId}
                  onChange={(e) => setAddForm((f) => ({ ...f, employeeId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code}){emp.department ? ` — ${emp.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Ngày *</label>
                <input
                  required
                  type="date"
                  value={addForm.date}
                  onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Loại sự kiện *</label>
                <select
                  required
                  value={addForm.type}
                  onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value }))}
                  className={inputCls}
                >
                  <option value="promotion">Thăng chức</option>
                  <option value="transfer">Luân chuyển</option>
                  <option value="salary_change">Thay đổi lương</option>
                  <option value="title_change">Thay đổi chức danh</option>
                  <option value="department_change">Thay đổi phòng ban</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Mô tả *</label>
                <input
                  required
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="VD: Thăng chức từ Senior lên Lead"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Giá trị cũ</label>
                  <input
                    type="text"
                    value={addForm.oldValue}
                    onChange={(e) => setAddForm((f) => ({ ...f, oldValue: e.target.value }))}
                    placeholder="VD: Senior Dev"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Giá trị mới</label>
                  <input
                    type="text"
                    value={addForm.newValue}
                    onChange={(e) => setAddForm((f) => ({ ...f, newValue: e.target.value }))}
                    placeholder="VD: Lead Dev"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Ghi chú</label>
                <input
                  type="text"
                  value={addForm.note}
                  onChange={(e) => setAddForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Ghi chú thêm (tùy chọn)"
                  className={inputCls}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {addSubmitting ? "Đang lưu..." : "Thêm sự kiện"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
