"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, User, Calendar, CheckCircle2, AlertTriangle, XCircle, Send, LogOut, ChevronLeft, FileText, Umbrella, CalendarClock, UserCog } from "lucide-react";

interface EmployeeInfo {
  employeeId: string;
  name: string;
  code: string;
  companyId: string;
  companyName: string;
  department: string;
  position: string;
  branch: string;
  phone: string;
  email: string;
  baseSalary: number;
  annualLeaveBalance: number;
  joinDate: string;
}

interface DayLog {
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  minutesLate: number;
  status: string;
  penaltyAmount: number;
  minutesOvertime: number;
  correction: { id: string; status: string; type: string } | null;
}

type Phase = "login" | "dashboard" | "correction" | "payslip" | "leave" | "shifts" | "profile";

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}
function fmtVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  on_time: { label: "Đúng giờ", cls: "bg-green-100 text-green-700" },
  late: { label: "Trễ", cls: "bg-yellow-100 text-yellow-700" },
  very_late: { label: "Trễ nhiều", cls: "bg-orange-100 text-orange-700" },
  absent: { label: "Vắng", cls: "bg-red-100 text-red-700" },
  leave: { label: "Nghỉ phép", cls: "bg-blue-100 text-blue-700" },
  holiday: { label: "Ngày lễ", cls: "bg-purple-100 text-purple-700" },
};

export default function EmployeePortal({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [phase, setPhase] = useState<Phase>("login");
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const [calendar, setCalendar] = useState<DayLog[]>([]);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Payslip state
  const [payslipMonth, setPayslipMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [payslipData, setPayslipData] = useState<Record<string, unknown> | null>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);
  const [payslipError, setPayslipError] = useState("");

  const fetchPayslip = async (employeeId: string, month: string) => {
    setPayslipLoading(true); setPayslipError("");
    const res = await fetch(`/api/employee/payslip?employeeId=${employeeId}&month=${month}`);
    if (res.ok) { setPayslipData(await res.json()); }
    else { setPayslipError("Không tìm thấy dữ liệu phiếu lương"); }
    setPayslipLoading(false);
  };

  // Leave request form
  const [leaveFromDate, setLeaveFromDate] = useState("");
  const [leaveToDate, setLeaveToDate] = useState("");
  const [leaveType, setLeaveType] = useState("annual");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const calcLeaveDays = () => {
    if (!leaveFromDate || !leaveToDate) return 0;
    const from = new Date(leaveFromDate);
    const to   = new Date(leaveToDate);
    if (to < from) return 0;
    return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  };

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    const days = calcLeaveDays();
    if (days <= 0) { setLeaveError("Ngày kết thúc phải sau ngày bắt đầu"); return; }
    if (!leaveReason.trim() || leaveReason.trim().length < 10) { setLeaveError("Vui lòng nhập lý do ít nhất 10 ký tự"); return; }
    setLeaveLoading(true); setLeaveError("");
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.employeeId,
          companyId: employee.companyId,
          type: leaveType,
          fromDate: leaveFromDate,
          toDate: leaveToDate,
          days,
          reason: leaveReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setLeaveError(data.error ?? "Gửi thất bại"); return; }
      setLeaveSuccess(true);
    } catch {
      setLeaveError("Lỗi kết nối, thử lại sau");
    } finally {
      setLeaveLoading(false);
    }
  };

  // Correction form
  const [corrDate, setCorrDate] = useState("");
  const [corrType, setCorrType] = useState<"check_in" | "check_out" | "both">("check_in");
  const [corrCheckIn, setCorrCheckIn] = useState("");
  const [corrCheckOut, setCorrCheckOut] = useState("");
  const [corrReason, setCorrReason] = useState("");
  const [corrLoading, setCorrLoading] = useState(false);
  const [corrSuccess, setCorrSuccess] = useState(false);
  const [corrError, setCorrError] = useState("");

  // Shifts state
  const [shiftsData, setShiftsData] = useState<{date: string; shiftLabel: string; checkIn: string; checkOut: string}[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);

  const fetchShifts = useCallback(async (employeeId: string, m: string) => {
    setShiftsLoading(true);
    const [y, mo] = m.split("-");
    const from = `${y}-${mo}-01`;
    const lastDay = new Date(parseInt(y), parseInt(mo), 0).getDate();
    const to = `${y}-${mo}-${String(lastDay).padStart(2, "0")}`;
    const res = await fetch(`/api/employee/shifts?employeeId=${employeeId}&from=${from}&to=${to}`);
    if (res.ok) setShiftsData(((await res.json()).shifts ?? []) as {date: string; shiftLabel: string; checkIn: string; checkOut: string}[]);
    setShiftsLoading(false);
  }, []);

  // Profile state
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  const openProfile = () => {
    setProfilePhone(employee?.phone ?? "");
    setProfileEmail(employee?.email ?? "");
    setProfileSuccess(false); setProfileError("");
    setPhase("profile");
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setProfileLoading(true); setProfileError("");
    try {
      const res = await fetch("/api/employee/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employee.employeeId, phone: profilePhone, email: profileEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setProfileError(data.error ?? "Cập nhật thất bại"); return; }
      setProfileSuccess(true);
      // Update stored session data
      const stored = sessionStorage.getItem("timio_employee");
      if (stored) {
        const emp = JSON.parse(stored) as EmployeeInfo;
        emp.phone = profilePhone;
        sessionStorage.setItem("timio_employee", JSON.stringify(emp));
        setEmployee(emp);
      }
    } catch {
      setProfileError("Lỗi kết nối");
    } finally {
      setProfileLoading(false);
    }
  };

  // Restore session
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("timio_employee");
      if (stored) {
        const emp = JSON.parse(stored) as EmployeeInfo;
        setEmployee(emp);
        setCompanyName(emp.companyName);
        setPhase("dashboard");
      }
    } catch { /* ignore */ }
  }, []);

  const fetchAttendance = useCallback(async (employeeId: string, month: string) => {
    const res = await fetch(`/api/employee/attendance?employeeId=${employeeId}&month=${month}`);
    if (res.ok) {
      const data = await res.json();
      setCalendar(data.calendar ?? []);
      setSummary(data.summary);
    }
  }, []);

  useEffect(() => {
    if (employee && phase === "dashboard") {
      fetchAttendance(employee.employeeId, currentMonth);
    }
  }, [employee, phase, currentMonth, fetchAttendance]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/employee/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, code: code.toUpperCase(), pin }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error ?? "Đăng nhập thất bại"); return; }
      sessionStorage.setItem("timio_employee", JSON.stringify(data));
      setEmployee(data);
      setCompanyName(data.companyName);
      setPhase("dashboard");
    } catch {
      setLoginError("Lỗi kết nối, thử lại sau");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("timio_employee");
    setEmployee(null);
    setCode(""); setPin("");
    setPhase("login");
  };

  const openCorrection = (date: string) => {
    setCorrDate(date); setCorrType("check_in"); setCorrCheckIn(""); setCorrCheckOut("");
    setCorrReason(""); setCorrSuccess(false); setCorrError("");
    setPhase("correction");
  };

  const submitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    setCorrLoading(true); setCorrError("");
    try {
      const res = await fetch("/api/attendance/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.employeeId,
          date: corrDate,
          type: corrType,
          requestedCheckIn: corrCheckIn || undefined,
          requestedCheckOut: corrCheckOut || undefined,
          reason: corrReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCorrError(data.error ?? "Gửi thất bại"); return; }
      setCorrSuccess(true);
      fetchAttendance(employee.employeeId, currentMonth);
    } catch {
      setCorrError("Lỗi kết nối");
    } finally {
      setCorrLoading(false);
    }
  };

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const presentDays = calendar.filter(d => d.status !== "absent" && d.status !== "holiday").length;
  const lateDays = calendar.filter(d => d.minutesLate > 0).length;
  const totalPenalty = calendar.reduce((s, d) => s + (d.penaltyAmount ?? 0), 0);

  // ── Login ──
  if (phase === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
                <Clock size={28} className="text-white" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Cổng nhân viên</h1>
            {companyName && <p className="text-sm text-gray-500 text-center mb-6">{companyName}</p>}
            {!companyName && <p className="text-sm text-gray-400 text-center mb-6">Tra cứu chấm công của bạn</p>}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mã nhân viên</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="VD: NV001"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">PIN (4 số)</label>
                <input
                  type="password"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle size={14} /> {loginError}
                </div>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loginLoading ? "Đang xác nhận..." : "Đăng nhập"}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">Timio · Cổng thông tin nhân viên</p>
        </div>
      </div>
    );
  }

  // ── Leave request form ──
  if (phase === "leave") {
    const days = calcLeaveDays();
    return (
      <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6 pt-4">
          <button onClick={() => { setPhase("dashboard"); setLeaveSuccess(false); setLeaveError(""); }} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900">Xin nghỉ phép</h1>
        </div>

        {leaveSuccess ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-bold text-gray-900 text-lg mb-2">Đã gửi đơn nghỉ phép!</h2>
            <p className="text-sm text-gray-500 mb-6">Quản lý sẽ xem xét và phản hồi sớm nhất có thể.</p>
            <button
              onClick={() => { setPhase("dashboard"); setLeaveSuccess(false); setLeaveFromDate(""); setLeaveToDate(""); setLeaveReason(""); setLeaveType("annual"); }}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Quay lại
            </button>
          </div>
        ) : (
          <form onSubmit={submitLeave} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Loại nghỉ</label>
              <select
                value={leaveType}
                onChange={e => setLeaveType(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="annual">Nghỉ phép năm</option>
                <option value="sick">Nghỉ ốm</option>
                <option value="unpaid">Nghỉ không lương</option>
                <option value="maternity">Nghỉ thai sản</option>
                <option value="wedding">Nghỉ cưới</option>
                <option value="funeral">Nghỉ tang</option>
                <option value="paternity">Nghỉ con sinh</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Từ ngày</label>
                <input
                  type="date"
                  value={leaveFromDate}
                  onChange={e => setLeaveFromDate(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Đến ngày</label>
                <input
                  type="date"
                  value={leaveToDate}
                  onChange={e => setLeaveToDate(e.target.value)}
                  min={leaveFromDate}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            {days > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-sm text-blue-700 font-medium">
                Tổng: {days} ngày · Phép còn: {employee?.annualLeaveBalance ?? 0} ngày
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lý do xin nghỉ</label>
              <textarea
                value={leaveReason}
                onChange={e => setLeaveReason(e.target.value)}
                placeholder="Mô tả lý do xin nghỉ (ít nhất 10 ký tự)..."
                rows={4}
                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
                minLength={10}
              />
            </div>
            {leaveError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle size={14} /> {leaveError}
              </div>
            )}
            <button
              type="submit"
              disabled={leaveLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Send size={15} />
              {leaveLoading ? "Đang gửi..." : "Gửi đơn nghỉ phép"}
            </button>
          </form>
        )}
      </div>
    );
  }

  // ── Correction form ──
  if (phase === "correction") {
    return (
      <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6 pt-4">
          <button onClick={() => setPhase("dashboard")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900">Xin điều chỉnh chấm công</h1>
        </div>

        {corrSuccess ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-bold text-gray-900 text-lg mb-2">Đã gửi yêu cầu!</h2>
            <p className="text-sm text-gray-500 mb-6">HR sẽ xem xét và phản hồi sớm nhất có thể.</p>
            <button onClick={() => setPhase("dashboard")} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              Quay lại
            </button>
          </div>
        ) : (
          <form onSubmit={submitCorrection} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ngày</label>
              <input
                type="date"
                value={corrDate}
                onChange={e => setCorrDate(e.target.value)}
                max={todayStr}
                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Loại điều chỉnh</label>
              <select
                value={corrType}
                onChange={e => setCorrType(e.target.value as typeof corrType)}
                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="check_in">Quên chấm vào</option>
                <option value="check_out">Quên chấm ra</option>
                <option value="both">Quên cả vào và ra</option>
              </select>
            </div>
            {(corrType === "check_in" || corrType === "both") && (
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Giờ vào thực tế</label>
                <input
                  type="time"
                  value={corrCheckIn}
                  onChange={e => setCorrCheckIn(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}
            {(corrType === "check_out" || corrType === "both") && (
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Giờ ra thực tế</label>
                <input
                  type="time"
                  value={corrCheckOut}
                  onChange={e => setCorrCheckOut(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lý do</label>
              <textarea
                value={corrReason}
                onChange={e => setCorrReason(e.target.value)}
                placeholder="Giải thích lý do xin điều chỉnh..."
                rows={3}
                className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
                minLength={10}
              />
            </div>
            {corrError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle size={14} /> {corrError}
              </div>
            )}
            <button
              type="submit"
              disabled={corrLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Send size={15} />
              {corrLoading ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </form>
        )}
      </div>
    );
  }

  // ── Payslip ──
  if (phase === "payslip") {
    const ps = payslipData as {
      month?: number; year?: number; baseSalary?: number; earnedBase?: number;
      standardWorkDays?: number; grossIncome?: number;
      bhxhEmployee?: number; tncn?: number; netTakeHome?: number;
      totalPenalty?: number; totalReward?: number; totalOvertimeAmount?: number;
      daysPresent?: number; daysLate?: number;
      allowances?: {label: string; amount: number}[];
      totalAllowances?: number;
    } | null;
    const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => setPhase("dashboard")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="font-bold text-gray-900">Phiếu lương</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="flex items-center gap-3">
            <input type="month" value={payslipMonth}
              onChange={(e) => { setPayslipMonth(e.target.value); if (employee) fetchPayslip(employee.employeeId, e.target.value); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => employee && fetchPayslip(employee.employeeId, payslipMonth)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              Xem
            </button>
          </div>
          {payslipLoading && <p className="text-center text-sm text-gray-400 py-8">Đang tải...</p>}
          {payslipError && <p className="text-center text-sm text-red-500 py-8">{payslipError}</p>}
          {ps && !payslipLoading && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="font-bold text-gray-900 mb-1">Phiếu lương tháng {ps.month}/{ps.year}</p>
                <p className="text-xs text-gray-400">{employee?.name} · {employee?.code}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-gray-50 bg-green-50">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Thu nhập</p>
                </div>
                <div className="divide-y divide-gray-50">
                  <PayslipRow label="Lương cơ bản (full)" value={fmt(ps.baseSalary ?? 0)} />
                  {ps.earnedBase !== undefined && ps.earnedBase !== ps.baseSalary && (
                    <PayslipRow
                      label={`Ngày công thực: ${ps.daysPresent ?? 0}/${ps.standardWorkDays ?? 26} ngày`}
                      value={fmt(ps.earnedBase)}
                    />
                  )}
                  {(ps.totalReward ?? 0) > 0 && <PayslipRow label="Thưởng chuyên cần" value={`+${fmt(ps.totalReward ?? 0)}`} positive />}
                  {(ps.allowances ?? []).map((a) => (
                    <PayslipRow key={a.label} label={a.label} value={`+${fmt(a.amount)}`} positive />
                  ))}
                  {(ps.totalOvertimeAmount ?? 0) > 0 && <PayslipRow label="Tăng ca" value={`+${fmt(ps.totalOvertimeAmount ?? 0)}`} positive />}
                  {(ps.totalPenalty ?? 0) > 0 && <PayslipRow label="Phạt" value={`-${fmt(ps.totalPenalty ?? 0)}`} negative />}
                  <PayslipRow label="Thu nhập trước thuế" value={fmt(ps.grossIncome ?? 0)} bold />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-gray-50 bg-red-50">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Khấu trừ</p>
                </div>
                <div className="divide-y divide-gray-50">
                  <PayslipRow label="BHXH+BHYT+BHTN (10.5%)" value={`-${fmt(ps.bhxhEmployee ?? 0)}`} negative />
                  <PayslipRow label="Thuế TNCN" value={ps.tncn ? `-${fmt(ps.tncn)}` : "0đ (miễn thuế)"} negative={!!ps.tncn} />
                </div>
              </div>
              <div className="bg-blue-600 rounded-2xl p-5 text-white text-center">
                <p className="text-sm opacity-80 mb-1">Thực nhận</p>
                <p className="text-3xl font-bold">{fmt(ps.netTakeHome ?? 0)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Chấm công</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Ngày công: </span><span className="font-bold">{ps.daysPresent} ngày</span></div>
                  <div><span className="text-gray-500">Lần trễ: </span><span className="font-bold text-orange-500">{ps.daysLate} lần</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Shifts ──
  if (phase === "shifts") {
    const DAYS = ["CN","T2","T3","T4","T5","T6","T7"];
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => setPhase("dashboard")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="font-bold text-gray-900">Lịch ca làm việc</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="flex items-center gap-3">
            <input type="month" value={currentMonth}
              onChange={(e) => { setCurrentMonth(e.target.value); if (employee) fetchShifts(employee.employeeId, e.target.value); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {shiftsLoading && <p className="text-center text-sm text-gray-400 py-8">Đang tải...</p>}
          {!shiftsLoading && shiftsData.length === 0 && (
            <div className="text-center py-12">
              <CalendarClock size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Chưa có lịch ca nào trong tháng này</p>
            </div>
          )}
          {!shiftsLoading && shiftsData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {shiftsData.map((s) => {
                  const d = new Date(s.date);
                  const dayName = DAYS[d.getDay()];
                  return (
                    <div key={s.date} className="flex items-center px-4 py-3 gap-3">
                      <div className="w-12 text-center shrink-0">
                        <p className="font-bold text-gray-900 text-sm">{s.date.split("-")[2]}</p>
                        <p className="text-xs text-gray-400">{dayName}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{s.shiftLabel}</p>
                        {(s.checkIn || s.checkOut) && (
                          <p className="text-xs text-gray-400">{s.checkIn} – {s.checkOut}</p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium shrink-0">Ca làm</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Profile ──
  if (phase === "profile") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => setPhase("dashboard")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="font-bold text-gray-900">Thông tin cá nhân</h1>
          </div>
        </div>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="font-bold text-gray-900 mb-1">{employee?.name}</p>
            <p className="text-xs text-gray-400">{employee?.code} · {employee?.department ?? employee?.branch}</p>
          </div>
          {profileSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
              <CheckCircle2 size={36} className="text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-green-700">Cập nhật thành công</p>
              <button onClick={() => setPhase("dashboard")} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
                Về trang chính
              </button>
            </div>
          ) : (
            <form onSubmit={submitProfile} className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Số điện thoại</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="VD: 0901234567"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email cá nhân</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="VD: ten@gmail.com"
                    className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email dùng để nhận phiếu lương điện tử</p>
                </div>
              </div>
              {profileError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle size={14} /> {profileError}
                </div>
              )}
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <UserCog size={15} />
                {profileLoading ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{employee?.name}</p>
              <p className="text-xs text-gray-500">{employee?.code} · {employee?.department || employee?.branch}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Month picker */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Chấm công tháng</h2>
          <input
            type="month"
            value={currentMonth}
            onChange={e => setCurrentMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-green-600">{presentDays}</p>
            <p className="text-xs text-gray-500 mt-0.5">Ngày công</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-orange-500">{lateDays}</p>
            <p className="text-xs text-gray-500 mt-0.5">Lần trễ</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-red-500">{totalPenalty > 0 ? fmtVND(totalPenalty) : "0đ"}</p>
            <p className="text-xs text-gray-500 mt-0.5">Tiền phạt</p>
          </div>
        </div>

        {/* Leave balance */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar size={18} className="text-blue-600" />
            <p className="text-sm font-medium text-blue-700">Ngày phép còn lại</p>
          </div>
          <p className="text-xl font-bold text-blue-700">{employee?.annualLeaveBalance ?? 0} ngày</p>
        </div>

        {/* Phiếu lương shortcut */}
        <button
          onClick={() => {
            if (employee) { fetchPayslip(employee.employeeId, payslipMonth); }
            setPhase("payslip");
          }}
          className="w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Phiếu lương</p>
              <p className="text-xs text-gray-400">Xem lương, BHXH, thuế tháng này</p>
            </div>
          </div>
          <ChevronLeft size={16} className="text-gray-400 rotate-180" />
        </button>

        {/* Xin nghỉ phép shortcut */}
        <button
          onClick={() => { setLeaveFromDate(todayStr); setLeaveToDate(todayStr); setLeaveSuccess(false); setLeaveError(""); setPhase("leave"); }}
          className="w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <Umbrella size={16} className="text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Xin nghỉ phép</p>
              <p className="text-xs text-gray-400">Gửi đơn xin nghỉ — quản lý duyệt online</p>
            </div>
          </div>
          <ChevronLeft size={16} className="text-gray-400 rotate-180" />
        </button>

        {/* Lịch ca làm việc */}
        <button
          onClick={() => { if (employee) fetchShifts(employee.employeeId, currentMonth); setPhase("shifts"); }}
          className="w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarClock size={16} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Lịch ca làm việc</p>
              <p className="text-xs text-gray-400">Xem ca làm việc được phân công</p>
            </div>
          </div>
          <ChevronLeft size={16} className="text-gray-400 rotate-180" />
        </button>

        {/* Thông tin cá nhân */}
        <button
          onClick={openProfile}
          className="w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserCog size={16} className="text-purple-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Thông tin cá nhân</p>
              <p className="text-xs text-gray-400">Cập nhật số điện thoại, email</p>
            </div>
          </div>
          <ChevronLeft size={16} className="text-gray-400 rotate-180" />
        </button>

        {/* Attendance list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800 text-sm">Chi tiết từng ngày</h3>
            <button
              onClick={() => openCorrection(todayStr)}
              className="text-xs text-blue-600 font-medium hover:underline"
            >
              + Xin điều chỉnh
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {calendar.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Không có dữ liệu</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {[...calendar].reverse().map((day) => {
                  const badge = STATUS_BADGE[day.status] ?? { label: day.status, cls: "bg-gray-100 text-gray-600" };
                  const isWeekend = [0, 6].includes(new Date(day.date).getDay());
                  if (isWeekend && day.status === "absent") return null;

                  return (
                    <div key={day.date} className="flex items-center px-4 py-3 gap-3">
                      <div className="w-12 text-center shrink-0">
                        <p className="font-bold text-gray-900 text-sm">{day.date.split("-")[2]}</p>
                        <p className="text-xs text-gray-400">{["CN","T2","T3","T4","T5","T6","T7"][new Date(day.date).getDay()]}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                          {day.minutesLate > 0 && (
                            <span className="text-xs text-orange-500">+{day.minutesLate} phút</span>
                          )}
                          {day.correction && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              day.correction.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                              day.correction.status === "approved" ? "bg-green-100 text-green-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {day.correction.status === "pending" ? "Chờ duyệt" : day.correction.status === "approved" ? "Đã duyệt" : "Từ chối"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {day.checkInAt ? `Vào: ${fmtTime(day.checkInAt)}` : "Chưa chấm vào"}
                          {day.checkOutAt ? ` · Ra: ${fmtTime(day.checkOutAt)}` : ""}
                          {day.penaltyAmount > 0 ? ` · Phạt: ${fmtVND(day.penaltyAmount)}` : ""}
                        </p>
                      </div>
                      {/* Xin điều chỉnh nếu chưa có correction pending */}
                      {!day.correction && (day.status === "absent" || !day.checkInAt || !day.checkOutAt) && (
                        <button
                          onClick={() => openCorrection(day.date)}
                          className="shrink-0 text-xs text-blue-500 hover:text-blue-700 font-medium"
                        >
                          Điều chỉnh
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Timio · Cổng thông tin nhân viên · {employee?.companyName}
        </p>
      </div>
    </div>
  );
}

function PayslipRow({ label, value, bold, positive, negative }: { label: string; value: string; bold?: boolean; positive?: boolean; negative?: boolean }) {
  const color = positive ? "text-green-600" : negative ? "text-red-500" : "text-gray-800";
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-${bold ? "bold" : "medium"} ${color}`}>{value}</span>
    </div>
  );
}
