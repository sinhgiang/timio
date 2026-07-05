import { prisma } from "@/lib/prisma";

export interface ScopeUser {
  companyId?: string;
  role?: string;
  branchId?: string | null;
}

/**
 * Chi nhánh mà 1 quản lý bị giới hạn. Trả về:
 *  - string branchId  → quản lý chi nhánh (chỉ được xem/sửa chi nhánh này)
 *  - null             → owner / accountant / "quản lý tổng" (branchId=null) → không giới hạn
 */
export function managerBranchId(user: ScopeUser | undefined | null): string | null {
  return user?.role === "manager" && user.branchId ? user.branchId : null;
}

/** true nếu user là kế toán/quản lý KHÔNG được xem lương (chỉ owner + accountant xem lương) */
export function canSeeSalary(user: ScopeUser | undefined | null): boolean {
  return user?.role === "owner" || user?.role === "accountant";
}

/**
 * Bộ lọc Prisma cho bảng có cột branchId trực tiếp (Employee, AttendanceLog, ShiftAssignment).
 * Manager chi nhánh → { branchId }, còn lại → {}.
 */
export function branchWhere(user: ScopeUser | undefined | null): { branchId?: string } {
  const b = managerBranchId(user);
  return b ? { branchId: b } : {};
}

/**
 * Bộ lọc cho bảng employee-scoped (lọc qua quan hệ employee): { employee: { branchId } }.
 */
export function employeeBranchWhere(user: ScopeUser | undefined | null): { employee?: { branchId: string } } {
  const b = managerBranchId(user);
  return b ? { employee: { branchId: b } } : {};
}

/**
 * Kiểm tra 1 nhân viên có thuộc chi nhánh của quản lý không (dùng TRƯỚC khi sửa/xóa theo id).
 * Trả về true nếu được phép (không phải manager-chi-nhánh, hoặc nhân viên đúng chi nhánh).
 */
export async function employeeInScope(user: ScopeUser | undefined | null, employeeId: string): Promise<boolean> {
  const b = managerBranchId(user);
  if (!b) return true;
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, companyId: user?.companyId, branchId: b },
    select: { id: true },
  });
  return !!emp;
}
