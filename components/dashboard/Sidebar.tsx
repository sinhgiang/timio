"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/dashboard/NotificationBell";
import {
  LayoutDashboard, Users, Building2, BarChart3, Gift, Umbrella,
  BookOpen, Settings, Clock, LogOut, Menu, X, CreditCard, UsersRound,
  FileText, ClipboardEdit, Timer, Banknote, Wallet, CalendarClock,
  CalendarDays, BarChart2, Network, Download, ShieldCheck, ShieldAlert,
  Package, History, GraduationCap, TrendingUp, Filter, CalendarRange,
  ArrowLeftRight, Briefcase, Target, Megaphone, Receipt, Star,
  ClipboardCheck, ChevronDown, MessagesSquare, MessageSquare,
  type LucideIcon,
} from "lucide-react";

interface Props {
  companyName: string;
  companySlug?: string;
  /** Số việc đang chờ, key theo badgeKey: leave, correction, overtime, earlyleave, shiftswap, recruitment */
  counts?: Record<string, number>;
  role?: string;
  plan?: string;
  planExpires?: string | null;
}

const HIDDEN_FOR_MANAGER = new Set(["/dashboard/billing", "/dashboard/settings", "/dashboard/audit-log", "/dashboard/chat-logs", "/dashboard/zalo-connect",
  // Quản lý KHÔNG xem dữ liệu lương
  "/dashboard/payslip", "/dashboard/salary-payments", "/dashboard/salary-history", "/dashboard/commission"]);
const HIDDEN_FOR_ACCOUNTANT = new Set([
  "/dashboard/billing", "/dashboard/settings", "/dashboard/leave",
  "/dashboard/branches", "/dashboard/audit-log", "/dashboard/chat-logs", "/dashboard/zalo-connect",
]);

type NavLeaf = { href: string; label: string; Icon: LucideIcon; badgeKey?: string };
type NavItem = NavLeaf & { type: "item" };
type NavGroup = { type: "group"; key: string; label: string; Icon: LucideIcon; children: NavLeaf[]; badgeKey?: string };
type NavEntry = NavItem | NavGroup;

const navStructure: NavEntry[] = [
  { type: "item",  href: "/dashboard",          label: "Tổng quan",   Icon: LayoutDashboard },
  { type: "item",  href: "/dashboard/employees", label: "Nhân viên",   Icon: Users },
  { type: "item",  href: "/dashboard/recruitment", label: "Tuyển dụng", Icon: Briefcase, badgeKey: "recruitment" },
  { type: "item",  href: "/dashboard/leave",     label: "Nghỉ phép",   Icon: Umbrella, badgeKey: "leave" },
  {
    type: "group", key: "chamcong", label: "Chấm công", Icon: ClipboardEdit,
    children: [
      { href: "/dashboard/corrections",          label: "Điều chỉnh chấm công", Icon: ClipboardEdit, badgeKey: "correction" },
      { href: "/dashboard/overtime",             label: "Tăng ca",              Icon: Timer },
      { href: "/dashboard/overtime-requests",    label: "Duyệt tăng ca",        Icon: Clock, badgeKey: "overtime" },
      { href: "/dashboard/early-leave-requests", label: "Duyệt về sớm",         Icon: LogOut, badgeKey: "earlyleave" },
      { href: "/dashboard/shift-swap-requests",  label: "Đổi ca cho nhau",      Icon: ArrowLeftRight, badgeKey: "shiftswap" },
    ],
  },
  {
    type: "group", key: "lichca", label: "Lịch ca", Icon: CalendarClock,
    children: [
      { href: "/dashboard/shifts",          label: "Lịch phân ca",   Icon: CalendarClock },
      { href: "/dashboard/shift-templates", label: "Mẫu lịch ca",   Icon: CalendarClock },
      { href: "/dashboard/leave-calendar",  label: "Lịch nghỉ nhóm", Icon: CalendarDays },
    ],
  },
  {
    type: "group", key: "luong", label: "Lương & Tài chính", Icon: Banknote,
    children: [
      { href: "/dashboard/payslip",         label: "Phiếu lương",         Icon: FileText },
      { href: "/dashboard/salary-payments", label: "Thanh toán lương",    Icon: Banknote },
      { href: "/dashboard/salary-advances", label: "Tạm ứng lương",       Icon: Wallet, badgeKey: "advances" },
      { href: "/dashboard/salary-history",  label: "Lịch sử lương",       Icon: TrendingUp },
      { href: "/dashboard/commission",      label: "Lương Doanh Số / KPI", Icon: Target },
      { href: "/dashboard/expenses",        label: "Chi phí công tác",    Icon: Receipt },
    ],
  },
  {
    type: "group", key: "baocao", label: "Báo cáo", Icon: BarChart3,
    children: [
      { href: "/dashboard/reports",            label: "Báo cáo tháng",     Icon: BarChart3 },
      { href: "/dashboard/reports/department", label: "Báo cáo phòng ban", Icon: BarChart2 },
      { href: "/dashboard/reports/13th-month", label: "Lương tháng 13",    Icon: Gift },
      { href: "/dashboard/reports/custom",     label: "Báo cáo tùy chỉnh", Icon: Filter },
      { href: "/dashboard/reports/annual",     label: "Tổng kết năm",      Icon: CalendarRange },
      { href: "/dashboard/analytics",          label: "Phân tích xu hướng", Icon: TrendingUp },
    ],
  },
  {
    type: "group", key: "nhansu", label: "Nhân sự", Icon: UsersRound,
    children: [
      { href: "/dashboard/talent-pool",        label: "Kho ứng viên xác thực",    Icon: ShieldCheck },
      { href: "/dashboard/branches",           label: "Chi nhánh",                Icon: Building2 },
      { href: "/dashboard/team",               label: "Nhóm & Quyền",             Icon: UsersRound },
      { href: "/dashboard/org-chart",          label: "Sơ đồ tổ chức",            Icon: Network },
      { href: "/dashboard/performance-reviews",label: "Đánh giá nhân viên",       Icon: Star },
      { href: "/dashboard/onboarding",         label: "Onboarding / Offboarding", Icon: ClipboardCheck },
      { href: "/dashboard/announcements",      label: "Bảng tin nội bộ",          Icon: Megaphone },
      { href: "/dashboard/discipline",         label: "Kỷ luật lao động",         Icon: ShieldAlert },
      { href: "/dashboard/assets",             label: "Tài sản bàn giao",         Icon: Package },
      { href: "/dashboard/work-history",       label: "Lịch sử công tác",         Icon: History },
      { href: "/dashboard/certificates",       label: "Chứng chỉ & Đào tạo",     Icon: GraduationCap },
    ],
  },
  {
    type: "group", key: "hethong", label: "Hệ thống", Icon: ShieldCheck,
    children: [
      { href: "/dashboard/export",    label: "Xuất dữ liệu",      Icon: Download },
      { href: "/dashboard/audit-log", label: "Nhật ký hoạt động", Icon: ShieldCheck },
      { href: "/dashboard/chat-logs", label: "Lịch sử chat AI",   Icon: MessagesSquare },
      { href: "/dashboard/zalo-connect", label: "Kết nối Zalo",   Icon: MessageSquare },
      { href: "/dashboard/billing",   label: "Gói dịch vụ",       Icon: CreditCard },
    ],
  },
  { type: "item", href: "/dashboard/settings", label: "Cài đặt",   Icon: Settings },
  { type: "item", href: "/dashboard/docs",     label: "Hướng dẫn", Icon: BookOpen },
];

// All leaf hrefs (for isItemActive resolution)
const allLeafHrefs = navStructure.flatMap(e =>
  e.type === "item" ? [e.href] : e.children.map(c => c.href)
);

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

export default function Sidebar({ companyName, companySlug, counts = {}, role = "owner", plan = "starter", planExpires }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Init: auto-open the group that contains the current page
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const open = new Set<string>();
    navStructure.forEach(e => {
      if (e.type === "group" && e.children.some(c => pathname === c.href || pathname.startsWith(c.href + "/"))) {
        open.add(e.key);
      }
    });
    return open;
  });

  // Auto-open on navigation
  useEffect(() => {
    navStructure.forEach(e => {
      if (e.type === "group" && e.children.some(c => pathname === c.href || pathname.startsWith(c.href + "/"))) {
        setOpenGroups(prev => { const n = new Set(Array.from(prev)); n.add(e.key); return n; });
      }
    });
  }, [pathname]);

  function toggleGroup(key: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function isItemActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (pathname === href) return true;
    if (!pathname.startsWith(href + "/")) return false;
    return !allLeafHrefs.some(
      h => h !== href && h.startsWith(href) && (pathname === h || pathname.startsWith(h + "/"))
    );
  }

  function shouldHide(href: string): boolean {
    if (role === "manager") return HIDDEN_FOR_MANAGER.has(href);
    if (role === "accountant") return HIDDEN_FOR_ACCOUNTANT.has(href);
    return false;
  }

  function getBadgeCount(badgeKey?: string): number {
    if (!badgeKey) return 0;
    return counts[badgeKey] ?? 0;
  }

  // Số của menu MẸ = tổng số việc chờ của các menu CON (cuộn lên); mở ra thì hiện đúng con nào có việc
  function getGroupBadge(children: NavLeaf[]): number {
    return children.reduce((sum, c) => (shouldHide(c.href) ? sum : sum + getBadgeCount(c.badgeKey)), 0);
  }

  function Badge({ count, color }: { count: number; color: string }) {
    if (count <= 0) return null;
    return (
      <span className={cn("min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none shrink-0", color)}>
        {count > 99 ? "99+" : count}
      </span>
    );
  }

  const renderItem = (leaf: NavLeaf, indent = false) => {
    if (shouldHide(leaf.href)) return null;
    const active = isItemActive(leaf.href);
    const count = getBadgeCount(leaf.badgeKey);
    return (
      <Link
        key={leaf.href}
        href={leaf.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
          indent ? "pl-8 pr-3 py-2" : "px-3 py-2.5",
          active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
        )}
      >
        <leaf.Icon size={15} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
        <span className="flex-1 leading-snug whitespace-nowrap">{leaf.label}</span>
        <Badge count={count} color={leaf.badgeKey === "leave" ? "bg-red-500" : "bg-orange-500"} />
      </Link>
    );
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 bg-white border border-gray-200 rounded-lg p-2 shadow-sm"
        aria-label="Mở menu"
      >
        <Menu size={20} className="text-gray-600" />
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm",
        "fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "md:relative md:translate-x-0 md:transition-none"
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Clock size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight truncate max-w-[130px]">{companyName}</p>
              <div className="mt-1"><PlanBadge plan={plan} planExpires={planExpires} /></div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <NotificationBell />
            <button onClick={() => setMobileOpen(false)} className="md:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" aria-label="Đóng menu">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navStructure.map(entry => {
            if (entry.type === "item") {
              if (shouldHide(entry.href)) return null;
              const active = isItemActive(entry.href);
              const count = getBadgeCount(entry.badgeKey);
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  )}
                >
                  <entry.Icon size={17} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                  <span className="flex-1 whitespace-nowrap">{entry.label}</span>
                  {count > 0 && (
                    <span className={cn("min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none", entry.badgeKey === "leave" ? "bg-red-500" : entry.badgeKey === "recruitment" ? "bg-blue-600" : "bg-orange-500")}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </Link>
              );
            }

            // Group
            const visibleChildren = entry.children.filter(c => !shouldHide(c.href));
            if (visibleChildren.length === 0) return null;

            const isOpen = openGroups.has(entry.key);
            const groupActive = visibleChildren.some(c => isItemActive(c.href));
            const groupBadgeCount = getGroupBadge(entry.children);

            return (
              <div key={entry.key}>
                <button
                  onClick={() => toggleGroup(entry.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    groupActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  )}
                >
                  <entry.Icon size={17} strokeWidth={groupActive ? 2.5 : 2} className="shrink-0" />
                  <span className="flex-1 text-left whitespace-nowrap">{entry.label}</span>
                  {!isOpen && groupBadgeCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    strokeWidth={2}
                    className={cn("shrink-0 transition-transform duration-200", isOpen ? "rotate-180" : "")}
                  />
                </button>

                {isOpen && (
                  <div className="mt-0.5 mb-1 ml-3 border-l-2 border-gray-100 pl-1 space-y-0.5">
                    {visibleChildren.map(child => renderItem(child, true))}
                  </div>
                )}
              </div>
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
