const BASE = "https://timio.vn";

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

export async function getTodayStatus(
  employeeId: string,
  pin: string
): Promise<AttendanceStatus> {
  const res = await fetch(
    `${BASE}/api/mobile/status?employeeId=${encodeURIComponent(employeeId)}&pin=${encodeURIComponent(pin)}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Không lấy được trạng thái");
  return data as AttendanceStatus;
}

export async function doCheckIn(
  employeeId: string,
  pin: string,
  offlineTimestamp?: string
): Promise<CheckInResult> {
  const res = await fetch(`${BASE}/api/attendance/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId, pin, offlineTimestamp }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Chấm công thất bại");
  return data as CheckInResult;
}
