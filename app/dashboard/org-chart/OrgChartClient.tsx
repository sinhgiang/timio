"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Building2, Layers, Users, Search } from "lucide-react";

interface EmployeeNode {
  id: string;
  name: string;
  code: string;
  department: string;
  position: string | null;
}

interface DepartmentNode {
  name: string;
  employees: EmployeeNode[];
}

interface BranchNode {
  id: string;
  name: string;
  departments: DepartmentNode[];
}

interface Props {
  companyName: string;
  branches: BranchNode[];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function EmployeeCard({ emp }: { emp: EmployeeNode }) {
  return (
    <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all min-w-[160px] max-w-[200px]">
      <div className={`w-8 h-8 rounded-full ${getAvatarColor(emp.name)} flex items-center justify-center shrink-0`}>
        <span className="text-white text-xs font-bold">{getInitials(emp.name)}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate leading-tight">{emp.name}</p>
        {emp.position && <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">{emp.position}</p>}
      </div>
    </div>
  );
}

function DeptSection({ dept, searchQuery }: { dept: DepartmentNode; searchQuery: string }) {
  const [open, setOpen] = useState(true);

  const filteredEmps = useMemo(() => {
    if (!searchQuery) return dept.employees;
    const q = searchQuery.toLowerCase();
    return dept.employees.filter(
      (e) => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
    );
  }, [dept.employees, searchQuery]);

  if (searchQuery && filteredEmps.length === 0) return null;

  return (
    <div className="ml-6 border-l-2 border-dashed border-gray-200 pl-4 pb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 py-1.5 mb-2 text-left group"
      >
        <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-purple-200 transition-colors">
          {open ? <ChevronDown size={13} className="text-purple-600" /> : <ChevronRight size={13} className="text-purple-600" />}
        </div>
        <Layers size={13} className="text-purple-500 shrink-0" />
        <span className="text-sm font-semibold text-purple-700">{dept.name}</span>
        <span className="text-xs text-purple-400 ml-1">({filteredEmps.length})</span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 ml-6 mb-2">
          {filteredEmps.map((emp) => (
            <EmployeeCard key={emp.id} emp={emp} />
          ))}
          {filteredEmps.length === 0 && (
            <p className="text-xs text-gray-400 italic">Không có nhân viên</p>
          )}
        </div>
      )}
    </div>
  );
}

function BranchSection({ branch, searchQuery, forceOpen }: { branch: BranchNode; searchQuery: string; forceOpen: boolean | null }) {
  const [open, setOpen] = useState(true);
  const isOpen = forceOpen !== null ? forceOpen : open;

  const totalEmps = branch.departments.reduce((s, d) => s + d.employees.length, 0);

  const visibleDepts = useMemo(() => {
    if (!searchQuery) return branch.departments;
    const q = searchQuery.toLowerCase();
    return branch.departments
      .map((dept) => ({
        ...dept,
        employees: dept.employees.filter(
          (e) => e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
        ),
      }))
      .filter((dept) => dept.employees.length > 0);
  }, [branch.departments, searchQuery]);

  if (searchQuery && visibleDepts.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 mb-3 group"
      >
        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
          {isOpen ? <ChevronDown size={15} className="text-blue-600" /> : <ChevronRight size={15} className="text-blue-600" />}
        </div>
        <Building2 size={16} className="text-blue-500 shrink-0" />
        <span className="text-base font-bold text-blue-700">{branch.name}</span>
        <span className="text-xs text-blue-400 ml-1">{totalEmps} nhân viên</span>
      </button>
      {isOpen && (
        <div className="space-y-2">
          {visibleDepts.map((dept) => (
            <DeptSection key={dept.name} dept={dept} searchQuery={searchQuery} />
          ))}
          {visibleDepts.length === 0 && (
            <p className="ml-6 text-sm text-gray-400 italic">Không có phòng ban nào</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrgChartClient({ companyName, branches }: Props) {
  const [search, setSearch] = useState("");
  const [forceOpen, setForceOpen] = useState<boolean | null>(null);

  const totalEmps = branches.reduce(
    (s, b) => s + b.departments.reduce((s2, d) => s2 + d.employees.length, 0),
    0
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Sơ đồ tổ chức</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalEmps} nhân viên đang hoạt động</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setForceOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Mở tất cả
          </button>
          <button
            onClick={() => setForceOpen(false)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Thu gọn
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm nhân viên hoặc phòng ban..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Org tree */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
        {/* Company root */}
        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-base">{companyName}</p>
            <p className="text-xs text-gray-400">{branches.length} chi nhánh · {totalEmps} nhân viên</p>
          </div>
        </div>

        {/* Branches */}
        {branches.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">Chưa có chi nhánh nào</p>
        ) : (
          <div className="space-y-2">
            {branches.map((branch) => (
              <BranchSection
                key={branch.id}
                branch={branch}
                searchQuery={search}
                forceOpen={forceOpen}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
