const BASE = "https://timio.vn";

// ─── Employee types ────────────────────────────────────────────────
export interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  companyName: string;
  slug: string;
}

export interface AttendanceStatus {
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string | null;
  minutesLate: number;
}

export interface CheckInResult {
  action: "check_in" | "check_out";
  status: string;
  message: string;
  minutesLate?: number;
  penaltyAmount?: number;
}

// ─── Manager types ─────────────────────────────────────────────────
export interface ManagerSession {
  token: string;
  adminId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  adminName: string;
  email: string;
  role: string;
}

export interface DailyStats {
  total: number;
  present: number;
  late: number;
  absent: number;
  pendingLeave: number;
}

export interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  minutesLate: number;
}

export interface EmployeeItem {
  id: string;
  name: string;
  code: string;
  department: string;
  position: string;
  status: string;
  phone: string;
  email: string;
  joinDate: string | null;
  baseSalary: number;
  annualLeaveBalance: number;
  branchName: string;
}

export interface LeaveRequestItem {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
  note: string;
  createdAt: string;
}

export interface ReportRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  totalMinutesLate: number;
  totalPenalty: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  records: ReportRecord[];
  totals: { daysPresent: number; daysLate: number; daysAbsent: number };
}

// ─── Employee API ──────────────────────────────────────────────────
export async function mobileAuth(slug: string, pin: string): Promise<Employee> {
  const res = await fetch(`${BASE}/api/mobile/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Đăng nhập thất bại");
  return data as Employee;
}

export async function getTodayStatus(employeeId: string, pin: string): Promise<AttendanceStatus> {
  const res = await fetch(
    `${BASE}/api/mobile/status?employeeId=${encodeURIComponent(employeeId)}&pin=${encodeURIComponent(pin)}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Không lấy được trạng thái");
  return data as AttendanceStatus;
}

export async function doCheckIn(employeeId: string, pin: string, offlineTimestamp?: string): Promise<CheckInResult> {
  const res = await fetch(`${BASE}/api/attendance/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId, pin, offlineTimestamp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Chấm công thất bại");
  return data as CheckInResult;
}

// ─── Manager API ───────────────────────────────────────────────────
function mgrHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function managerAuth(email: string, password: string): Promise<ManagerSession> {
  const res = await fetch(`${BASE}/api/mobile/manager-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Đăng nhập thất bại");
  return data as ManagerSession;
}

export async function getManagerStats(token: string): Promise<DailyStats> {
  const res = await fetch(`${BASE}/api/mobile/manager/stats`, { headers: mgrHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Không lấy được thống kê");
  return data as DailyStats;
}

export async function getAttendanceToday(token: string, date?: string): Promise<AttendanceRecord[]> {
  const url = date
    ? `${BASE}/api/mobile/manager/attendance?date=${date}`
    : `${BASE}/api/mobile/manager/attendance`;
  const res = await fetch(url, { headers: mgrHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Không lấy được chấm công");
  return data as AttendanceRecord[];
}

export async function getEmployeeList(token: string): Promise<EmployeeItem[]> {
  const res = await fetch(`${BASE}/api/mobile/manager/employees`, { headers: mgrHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Không lấy được danh sách nhân viên");
  return data as EmployeeItem[];
}

export async function getLeaveRequests(token: string, status = "pending"): Promise<LeaveRequestItem[]> {
  const res = await fetch(`${BASE}/api/mobile/manager/leave?status=${status}`, {
    headers: mgrHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Không lấy được đơn nghỉ phép");
  return data as LeaveRequestItem[];
}

export async function updateLeaveRequest(
  token: string,
  id: string,
  status: "approved" | "rejected",
  note?: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/mobile/manager/leave/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status, note }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Cập nhật thất bại");
}

export async function getMonthlyReport(token: string, year: number, month: number): Promise<MonthlyReport> {
  const res = await fetch(`${BASE}/api/mobile/manager/report?year=${year}&month=${month}`, {
    headers: mgrHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Không lấy được báo cáo");
  return data as MonthlyReport;
}

// ─── AI Chat API ───────────────────────────────────────────────────
export interface ChatHistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatAccess {
  allowed: boolean;
  reason?: "plan" | "limit";
  message?: string;
  remaining?: number | null;
}

export interface ChatHistory {
  sessionId: string | null;
  messages: ChatHistoryMessage[];
  access: ChatAccess;
  role: string;
}

export async function getChatHistory(token: string): Promise<ChatHistory> {
  const res = await fetch(`${BASE}/api/chat/history`, { headers: mgrHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Không tải được lịch sử chat");
  return data as ChatHistory;
}

export interface ChatReply {
  sessionId: string;
  text: string;
  remaining: number | null;
}

/**
 * Gửi tin nhắn chat. Server trả SSE — React Native fetch không stream được
 * nên đọc toàn bộ text rồi ghép các event lại.
 */
export async function sendChatMessage(
  token: string,
  message: string,
  sessionId?: string | null
): Promise<ChatReply> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, sessionId: sessionId ?? undefined }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { error?: string }));
    throw new Error((data as { error?: string }).error ?? "Lỗi kết nối AI");
  }

  const raw = await res.text();
  let text = "";
  let sid = sessionId ?? "";
  let remaining: number | null = null;
  let errorMsg = "";

  for (const part of raw.split("\n\n")) {
    const line = part.trim();
    if (!line.startsWith("data: ")) continue;
    try {
      const ev = JSON.parse(line.slice(6));
      if (ev.type === "text") text += ev.text;
      else if (ev.type === "session") {
        sid = ev.sessionId;
        if (typeof ev.remaining === "number") remaining = Math.max(0, ev.remaining - 1);
      } else if (ev.type === "done") sid = ev.sessionId;
      else if (ev.type === "error") errorMsg = ev.error;
    } catch { /* skip */ }
  }

  if (!text && errorMsg) throw new Error(errorMsg);
  return { sessionId: sid, text: text || "(Không có phản hồi)", remaining };
}

export async function submitSupportTicket(
  token: string,
  title: string,
  description: string,
  priority: string
): Promise<string> {
  const res = await fetch(`${BASE}/api/support/ticket`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, description, priority }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Không gửi được ticket");
  return data.message as string;
}
