"use client";

import { useState, useMemo } from "react";
import { Building2, Users, Search, ChevronDown } from "lucide-react";

interface EmployeeNode {
  id: string;
  name: string;
  code: string;
  department: string | null;
  position: string | null;
}

interface BranchNode {
  id: string;
  name: string;
  employees: EmployeeNode[];
}

interface Props {
  companyName: string;
  branches: BranchNode[];
}

// ─── Suy ra CẤP BẬC từ tên chức vụ (0 = cao nhất) ────────────────────────────────
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

function rankOf(position: string | null): number {
  const p = stripAccents(position || "");
  if (!p) return 5; // không ghi chức vụ → coi là nhân viên
  // 0 — Lãnh đạo cao nhất
  if (/(chu tich|tong giam doc|tong gd|founder|co-?founder|dong sang lap|nha sang lap|ceo|chairman|president)/.test(p)) return 0;
  // 3 — Trợ lý / Phó phòng / Giám sát (đặt TRƯỚC Giám đốc để "trợ lý giám đốc" không lọt lên cấp Giám đốc)
  if (/(tro ly|pho phong|pho quan ly|pho truong|giam sat|supervisor|deputy|assistant)/.test(p)) return 3;
  // 1 — Giám đốc / Phó giám đốc
  if (/(pho tong giam doc|pho giam doc|pho gd|giam doc|director|\bgd\b|cto|cfo|coo|cmo)/.test(p)) return 1;
  // 2 — Quản lý / Trưởng phòng / Trưởng bộ phận / Trưởng chi nhánh
  if (/(truong phong|quan ly|manager|truong bo phan|truong chi nhanh|cua hang truong|store manager|head|truong khoi|chi huy)/.test(p)) return 2;
  // 4 — Trưởng nhóm / Tổ trưởng / Trưởng ca
  if (/(truong nhom|nhom truong|to truong|truong ca|ca truong|doi truong|truong doi|team ?lead|leader|to pho)/.test(p)) return 4;
  // 6 — Cộng tác viên / Thực tập / Thời vụ
  if (/(cong tac vien|ctv|thuc tap|intern|hoc viec|thoi vu|part ?time|tap su)/.test(p)) return 6;
  // 5 — Nhân viên / Chuyên viên / Kỹ thuật viên... (mặc định)
  return 5;
}

const BAND_LABELS: Record<number, string> = {
  0: "Ban lãnh đạo",
  1: "Giám đốc",
  2: "Quản lý · Trưởng phòng",
  3: "Phó phòng · Giám sát",
  4: "Trưởng nhóm · Tổ trưởng",
  5: "Nhân viên",
  6: "Cộng tác viên · Thực tập",
};

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

interface Tier { level: number; employees: EmployeeNode[]; }

function buildTiers(employees: EmployeeNode[]): Tier[] {
  const byLevel = new Map<number, EmployeeNode[]>();
  for (const e of employees) {
    const lv = rankOf(e.position);
    if (!byLevel.has(lv)) byLevel.set(lv, []);
    byLevel.get(lv)!.push(e);
  }
  return Array.from(byLevel.entries())
    .sort(([a], [b]) => a - b)
    .map(([level, emps]) => ({
      level,
      employees: emps.sort((x, y) => (x.position || "").localeCompare(y.position || "") || x.name.localeCompare(y.name)),
    }));
}

function PersonCard({ emp, top }: { emp: EmployeeNode; top: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center bg-white rounded-2xl px-3 py-3 shadow-sm w-[150px] transition-all hover:shadow-md ${top ? "border-2 border-blue-300 ring-2 ring-blue-50" : "border border-gray-200"}`}>
      <div className={`${top ? "w-12 h-12" : "w-10 h-10"} rounded-full ${getAvatarColor(emp.name)} flex items-center justify-center shrink-0 mb-1.5`}>
        <span className="text-white text-sm font-bold">{getInitials(emp.name)}</span>
      </div>
      <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{emp.name}</p>
      {emp.position && <p className="text-[11px] text-blue-600 font-medium leading-tight mt-0.5 line-clamp-1">{emp.position}</p>}
      {emp.department && <p className="text-[10px] text-gray-400 leading-tight mt-0.5 line-clamp-1">{emp.department}</p>}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex flex-col items-center text-gray-300 py-0.5" aria-hidden>
      <div className="w-px h-5 bg-gray-300" />
      <ChevronDown size={16} className="-mt-2" />
    </div>
  );
}

function BranchTree({ branch, search }: { branch: BranchNode; search: string }) {
  const filtered = useMemo(() => {
    if (!search) return branch.employees;
    const q = stripAccents(search);
    return branch.employees.filter(
      (e) => stripAccents(e.name).includes(q) || stripAccents(e.position || "").includes(q) || stripAccents(e.department || "").includes(q)
    );
  }, [branch.employees, search]);

  const tiers = useMemo(() => buildTiers(filtered), [filtered]);

  if (branch.employees.length === 0) {
    return <p className="text-center py-10 text-gray-400 text-sm">Chi nhánh này chưa có nhân viên.</p>;
  }
  if (filtered.length === 0) {
    return <p className="text-center py-10 text-gray-400 text-sm">Không tìm thấy nhân viên phù hợp.</p>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-fit flex flex-col items-center">
        {/* Gốc: chi nhánh */}
        <div className="inline-flex items-center gap-2.5 bg-blue-600 text-white rounded-2xl px-4 py-2.5 shadow">
          <Building2 size={18} className="shrink-0" />
          <div className="text-left">
            <p className="font-bold text-sm leading-tight">{branch.name}</p>
            <p className="text-[11px] text-blue-100 leading-tight">{branch.employees.length} nhân viên</p>
          </div>
        </div>

        {/* Các tầng cấp bậc, trên xuống dưới */}
        {tiers.map((tier, i) => (
          <div key={tier.level} className="flex flex-col items-center w-full">
            <Connector />
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {BAND_LABELS[tier.level] || "Khác"}
            </p>
            <div className="flex flex-wrap justify-center gap-3 px-2">
              {tier.employees.map((emp) => (
                <PersonCard key={emp.id} emp={emp} top={i === 0} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrgChartClient({ companyName, branches }: Props) {
  const [search, setSearch] = useState("");
  const [activeBranch, setActiveBranch] = useState(branches[0]?.id ?? "");

  const totalEmps = branches.reduce((s, b) => s + b.employees.length, 0);
  const showTabs = branches.length > 1;
  const current = branches.find((b) => b.id === activeBranch) ?? branches[0];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Sơ đồ tổ chức</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalEmps} nhân viên đang hoạt động · phân cấp theo chức vụ</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm theo tên, chức vụ hoặc phòng ban..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
        {/* Gốc công ty */}
        <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-base">{companyName}</p>
            <p className="text-xs text-gray-400">{branches.length} chi nhánh · {totalEmps} nhân viên</p>
          </div>
        </div>

        {branches.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">Chưa có chi nhánh nào.</p>
        ) : (
          <>
            {/* Tab chi nhánh — chỉ hiện khi có nhiều hơn 1 văn phòng */}
            {showTabs && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setActiveBranch(b.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      current?.id === b.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {b.name}
                    <span className={`ml-1.5 text-xs ${current?.id === b.id ? "text-blue-100" : "text-gray-400"}`}>{b.employees.length}</span>
                  </button>
                ))}
              </div>
            )}

            {current && <BranchTree branch={current} search={search} />}
          </>
        )}
      </div>
    </div>
  );
}
