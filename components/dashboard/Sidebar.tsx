"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  Gift,
  Umbrella,
  BookOpen,
  Settings,
  Clock,
  LogOut,
  Menu,
  X,
  CreditCard,
  UsersRound,
  FileText,
  ClipboardEdit,
  Timer,
  Banknote,
  Wallet,
  CalendarClock,
  CalendarDays,
  BarChart2,
  Network,
  Download,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

interface Props {
  companyName: string;
  companySlug?: string;
  pendingLeaveCount?: number;
  pendingCorrectionCount?: number;
  role?: string;
  plan?: string;
  planExpires?: string | null;
}

const HIDDEN_FOR_MANAGER = new Set(["/dashboard/billing", "/dashboard/settings", "/dashboard/audit-log"]);
const HIDDEN_FOR_ACCOUNTANT = new Set([
  "/dashboard/billing",
  "/dashboard/settings",
  "/dashboard/leave",
  "/dashboard/branches",
  "/dashboard/audit-log",
]);

const navItems: { href: string; label: string; Icon: LucideIcon; badgeKey?: string }[] = [
  { href: "/dashboard", label: "Tổng quan", Icon: LayoutDashboard },
  { href: "/dashboard/employees", label: "Nhân viên", Icon: Users },
  { href: "/dashboard/branches", label: "Chi nhánh", Icon: Building2 },
  { href: "/dashboard/reports", label: "Báo cáo tháng", Icon: BarChart3 },
  { href: "/dashboard/reports/13th-month", label: "Lương tháng 13", Icon: Gift },
  { href: "/dashboard/reports/department", label: "Báo cáo phòng ban", Icon: BarChart2 },
  { href: "/dashboard/payslip", label: "Phiếu lương", Icon: FileText },
  { href: "/dashboard/leave", label: "Nghỉ phép", Icon: Umbrella, badgeKey: "leave" },
  { href: "/dashboard/leave-calendar", label: "Lịch nghỉ nhóm", Icon: CalendarDays },
  { href: "/dashboard/overtime", label: "Tăng ca", Icon: Timer },
  { href: "/dashboard/overtime-requests", label: "Duyệt tăng ca", Icon: Clock },
  { href: "/dashboard/corrections", label: "Điều chỉnh chấm công", Icon: ClipboardEdit, badgeKey: "correction" },
  { href: "/dashboard/salary-payments", label: "Thanh toán lương", Icon: Banknote },
  { href: "/dashboard/salary-advances", label: "Tạm ứng lương", Icon: Wallet },
  { href: "/dashboard/shifts", label: "Lịch phân ca", Icon: CalendarClock },
  { href: "/dashboard/team", label: "Nhóm & Quyền", Icon: UsersRound },
  { href: "/dashboard/org-chart", label: "Sơ đồ tổ chức", Icon: Network },
  { href: "/dashboard/docs", label: "Hướng dẫn", Icon: BookOpen },
  { href: "/dashboard/export", label: "Xuất dữ liệu", Icon: Download },
  { href: "/dashboard/audit-log", label: "Nhật ký hoạt động", Icon: ShieldCheck },
  { href: "/dashboard/billing", label: "Gói dịch vụ", Icon: CreditCard },
  { href: "/dashboard/settings", label: "Cài đặt", Icon: Settings },
];

function PlanBadge({ plan, planExpires }: { plan: string; planExpires?: string | null }) {
  if (plan === "business") {
    return <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 leading-tight">BUSINESS</span>;
  }
  if (plan === "pro") {
    const days = planExpires ? Math.ceil((new Date(planExpires).getTime() - Date.now()) / 86400000) : null;
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 leading-tight">
        PRO{days !== null && days <= 30 ? <span className="text-orange-500 ml-0.5">· {days}d</span> : ""}
      </span>
    );
  }
  return (
    <Link href="/dashboard/billing" className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 leading-tight transition-colors" title="Nâng cấp lên Pro">
      Miễn phí · Nâng cấp
    </Link>
  );
}

export default function Sidebar({ companyName, companySlug, pendingLeaveCount = 0, pendingCorrectionCount = 0, role = "owner", plan = "starter", planExpires }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((item) => {
    if (role === "manager") return !HIDDEN_FOR_MANAGER.has(item.href);
    if (role === "accountant") return !HIDDEN_FOR_ACCOUNTANT.has(item.href);
    return true;
  });

  return (
    <>
      {/* Mobile hamburger button — fixed top-left, only on mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 bg-white border border-gray-200 rounded-lg p-2 shadow-sm"
        aria-label="Mở menu"
      >
        <Menu size={20} className="text-gray-600" />
      </button>

      {/* Backdrop overlay — mobile only */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "w-56 bg-white border-r border-gray-200 flex flex-col shadow-sm",
          // Mobile: fixed slide-in overlay
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: static in flex flow, always visible
          "md:relative md:translate-x-0 md:transition-none"
        )}
      >
        {/* Logo + mobile close */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Clock size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight truncate max-w-[110px]">{companyName}</p>
              <div className="mt-1">
                <PlanBadge plan={plan} planExpires={planExpires} />
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                )}
              >
                <item.Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                <span className="flex-1">{item.label}</span>
                {item.badgeKey === "leave" && pendingLeaveCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {pendingLeaveCount > 99 ? "99+" : pendingLeaveCount}
                  </span>
                )}
                {item.badgeKey === "correction" && pendingCorrectionCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {pendingCorrectionCount > 99 ? "99+" : pendingCorrectionCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut size={17} strokeWidth={2} />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}
