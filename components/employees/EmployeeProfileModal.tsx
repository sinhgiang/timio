"use client";

import { X, Phone, CreditCard, Calendar, Building2, Clock, Banknote, User, CheckCircle2, XCircle, Printer } from "lucide-react";

interface ShiftOverride {
  name?: string;
  checkInTime: string;
  checkOutTime: string;
  workDays: string;
  gracePeriod: number;
}

interface Employee {
  id: string;
  name: string;
  code: string;
  department: string | null;
  position: string | null;
  status: string;
  branchName: string;
  shiftOverride: string | null;
  hasFace: boolean;
  pin: string | null;
  createdAt: string;
  baseSalary: number | null;
  joinDate: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  cccd: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankBranch: string | null;
}

const DAY_LABELS: Record<number, string> = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7", 0: "CN" };

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmtSalary(n: number | null) {
  if (!n) return "—";
  return n.toLocaleString("vi-VN") + " đ";
}

function Row({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {icon && <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1 grid grid-cols-2 gap-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className="text-sm text-gray-800 font-medium">{value ?? "—"}</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 pb-1 border-b border-gray-100">{title}</p>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

export default function EmployeeProfileModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const ov: ShiftOverride | null = employee.shiftOverride ? JSON.parse(employee.shiftOverride) : null;
  const workDays = (ov?.workDays ?? "").split(",").map(Number).filter((n) => !isNaN(n));
  const initials = employee.name.split(" ").slice(-2).map((w) => w.charAt(0)).join("").toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-6 shadow-2xl print:shadow-none print:rounded-none print:my-0">

        {/* Header bar — ẩn khi in */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <User size={14} />
            <span>Hồ sơ nhân viên</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Printer size={13} /> In hồ sơ
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* A4 content */}
        <div className="p-8">

          {/* Identity header */}
          <div className="flex items-center gap-5 mb-7">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-2xl">{initials}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{employee.name}</h1>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${employee.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {employee.status === "active" ? "Đang làm" : "Đã nghỉ"}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {[employee.position, employee.department].filter(Boolean).join(" · ")}
              </p>
              <p className="text-xs font-mono text-gray-400 mt-0.5">#{employee.code}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">

            {/* Cột trái */}
            <div>
              <Section title="Thông tin cá nhân">
                <Row icon={<Phone size={13} />} label="Số điện thoại" value={employee.phone} />
                <Row icon={<CreditCard size={13} />} label="Căn cước CD" value={employee.cccd} />
                <Row icon={<Calendar size={13} />} label="Ngày sinh" value={
                  employee.dateOfBirth
                    ? (() => { const [y, m, d] = employee.dateOfBirth.split("-"); return `${d}/${m}/${y}`; })()
                    : null
                } />
                <Row icon={<Calendar size={13} />} label="Ngày vào làm" value={fmtDate(employee.joinDate)} />
              </Section>

              <Section title="Lương & ngân hàng">
                <Row icon={<Banknote size={13} />} label="Lương cơ bản" value={fmtSalary(employee.baseSalary)} />
                <Row label="Ngân hàng" value={employee.bankName} />
                <Row label="Số tài khoản" value={
                  employee.bankAccount
                    ? <span className="font-mono">{employee.bankAccount}</span>
                    : null
                } />
                <Row label="Chi nhánh NH" value={employee.bankBranch} />
              </Section>
            </div>

            {/* Cột phải */}
            <div>
              <Section title="Lịch làm việc">
                <Row icon={<Building2 size={13} />} label="Chi nhánh" value={employee.branchName} />
                <Row icon={<Clock size={13} />} label="Ca làm" value={
                  ov ? (
                    <span>{ov.name ?? "Tự đặt"} · {ov.checkInTime}–{ov.checkOutTime}</span>
                  ) : (
                    <span className="text-gray-400">Theo chi nhánh</span>
                  )
                } />
                <Row label="Ngày làm" value={
                  workDays.length > 0 ? (
                    <span className="flex gap-1 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                        <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${workDays.includes(d) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
                          {DAY_LABELS[d]}
                        </span>
                      ))}
                    </span>
                  ) : <span className="text-gray-400">Theo chi nhánh</span>
                } />
                <Row label="Cho phép trễ" value={ov?.gracePeriod != null ? `${ov.gracePeriod} phút` : null} />
              </Section>

              <Section title="Trạng thái">
                <Row icon={<User size={13} />} label="Khuôn mặt" value={
                  employee.hasFace
                    ? <span className="flex items-center gap-1 text-green-700"><CheckCircle2 size={13} /> Đã đăng ký</span>
                    : <span className="flex items-center gap-1 text-gray-400"><XCircle size={13} /> Chưa đăng ký</span>
                } />
                <Row label="PIN cổng NV" value={
                  employee.pin && !/^\$2[ab]\$/.test(employee.pin)
                    ? <span className="font-mono font-bold tracking-widest text-gray-700">{employee.pin}</span>
                    : <span className="text-gray-400">—</span>
                } />
                <Row icon={<Calendar size={13} />} label="Ngày tạo" value={fmtDate(employee.createdAt)} />
              </Section>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 print:hidden">
          <p className="text-xs text-gray-400 text-center">Timio · Hồ sơ nhân viên · {new Date().toLocaleDateString("vi-VN")}</p>
        </div>

      </div>
    </div>
  );
}
