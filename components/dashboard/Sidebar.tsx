"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/dashboard/NotificationBell";
import {
  LayoutDashboard, Users, Building2, BarChart3, Gift, Umbrella,
  BookOpen, Settings, Clock, LogOut, Menu, X, CreditCard, UsersRound,
  FileText, ClipboardEdit, Timer, Banknote, Wallet, CalendarClock,
  CalendarDays, BarChart2, Network, Download, ShieldCheck, ShieldAlert,
  Package, History, GraduationCap, TrendingUp, Filter, CalendarRange,
  ArrowLeftRight, Briefcase, Target, Megaphone, Receipt, Star,
  ClipboardCheck, ChevronDown, MessagesSquare, MessageSquare, CircleUserRound,
  Pin, PinOff, Pencil, Check, GripVertical, ArrowUp, ArrowDown,
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

type NavLeaf = { href: string; label: string; Icon: LucideIcon; badgeKey?: string; isNew?: boolean };
type NavItem = NavLeaf & { type: "item" };
type NavGroup = { type: "group"; key: string; label: string; Icon: LucideIcon; children: NavLeaf[]; badgeKey?: string };
type NavSection = { type: "section"; label: string };
type NavEntry = NavItem | NavGroup | NavSection;

const navStructure: NavEntry[] = [
  { type: "item", href: "/dashboard", label: "Tổng quan", Icon: LayoutDashboard },

  // ─── KHU 1: Vận hành chấm công hằng ngày ───
  { type: "section", label: "Hằng ngày · Chấm công" },
  {
    type: "group", key: "chamcong", label: "Chấm công", Icon: ClipboardEdit,
    children: [
      { href: "/dashboard/corrections",          label: "Điều chỉnh chấm công", Icon: ClipboardEdit, badgeKey: "correction" },
      { href: "/dashboard/overtime",             label: "Tăng ca",              Icon: Timer, badgeKey: "overtime" },
      { href: "/dashboard/early-leave-requests", label: "Về sớm / đến muộn",    Icon: LogOut, badgeKey: "earlyleave" },
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
  { type: "item", href: "/dashboard/leave", label: "Nghỉ phép", Icon: Umbrella, badgeKey: "leave" },

  // ─── KHU 2: Nhân sự · người đang làm ───
  { type: "section", label: "Nhân sự · Người đang làm" },
  { type: "item", href: "/dashboard/employees",           label: "Nhân viên",                Icon: Users },
  { type: "item", href: "/dashboard/performance-reviews", label: "Đánh giá nhân viên",       Icon: Star },
  { type: "item", href: "/dashboard/onboarding",          label: "Onboarding / Offboarding", Icon: ClipboardCheck },
  {
    type: "group", key: "tochuc", label: "Tổ chức", Icon: Network,
    children: [
      { href: "/dashboard/branches",  label: "Chi nhánh",     Icon: Building2 },
      { href: "/dashboard/team",      label: "Nhóm & Quyền",  Icon: UsersRound },
      { href: "/dashboard/org-chart", label: "Sơ đồ tổ chức", Icon: Network },
    ],
  },
  {
    type: "group", key: "hosolaodong", label: "Hồ sơ lao động", Icon: FileText,
    children: [
      { href: "/dashboard/discipline",   label: "Kỷ luật lao động",    Icon: ShieldAlert },
      { href: "/dashboard/assets",       label: "Tài sản bàn giao",    Icon: Package },
      { href: "/dashboard/certificates", label: "Chứng chỉ & Đào tạo", Icon: GraduationCap },
      { href: "/dashboard/work-history", label: "Lịch sử công tác",    Icon: History },
    ],
  },
  { type: "item", href: "/dashboard/announcements", label: "Bảng tin nội bộ", Icon: Megaphone },

  // ─── KHU 3: Lương & Tài chính ───
  { type: "section", label: "Lương & Tài chính" },
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

  // ─── KHU 4: Tuyển dụng & Ứng viên (nghề thứ 2 — tách hẳn cho dễ thấy) ───
  { type: "section", label: "Tuyển dụng & Ứng viên" },
  { type: "item", href: "/dashboard/recruitment", label: "Tin tuyển dụng",         Icon: Briefcase, badgeKey: "recruitment" },
  { type: "item", href: "/dashboard/talent-pool", label: "Kho ứng viên xác thực", Icon: ShieldCheck, isNew: true },

  // ─── KHU 5: Báo cáo & Hệ thống ───
  { type: "section", label: "Báo cáo & Hệ thống" },
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
    type: "group", key: "hethong", label: "Hệ thống", Icon: ShieldCheck,
    children: [
      { href: "/dashboard/export",       label: "Xuất dữ liệu",      Icon: Download },
      { href: "/dashboard/audit-log",    label: "Nhật ký hoạt động", Icon: ShieldCheck },
      { href: "/dashboard/chat-logs",    label: "Lịch sử chat AI",   Icon: MessagesSquare },
      { href: "/dashboard/zalo-connect", label: "Kết nối Zalo",      Icon: MessageSquare },
    ],
  },
  { type: "item", href: "/dashboard/billing",  label: "Gói dịch vụ", Icon: CreditCard },
  { type: "item", href: "/dashboard/settings", label: "Cài đặt",     Icon: Settings },
  { type: "item", href: "/dashboard/docs",     label: "Hướng dẫn",   Icon: BookOpen },
];

// All leaf hrefs (for isItemActive resolution)
const allLeafHrefs = navStructure.flatMap(e =>
  e.type === "item" ? [e.href] : e.type === "group" ? e.children.map(c => c.href) : []
);

// ─── Lối tắt cá nhân hóa (14/9/2026) ─────────────────────────────────────
// Cho phép mỗi người dùng tự ghim + sắp xếp lại menu theo thói quen của mình
// (VD: chủ shop hay vào "Nhân viên" nhiều thì ghim lên đầu, người khác lại hay
// vào "Tổ chức"). Đơn vị ghim được là: 1 mục đơn (NavItem), 1 mục con trong
// group (NavLeaf), hoặc CẢ 1 group (VD ghim nguyên "Tổ chức"). Id ghim = href
// của mục/mục con, hoặc "group:<key>" cho cả group.
type PinTarget =
  | { kind: "item"; entry: NavItem }
  | { kind: "group"; entry: NavGroup }
  | { kind: "child"; leaf: NavLeaf; parent: NavGroup };

function pinIdOf(t: PinTarget): string {
  if (t.kind === "group") return `group:${t.entry.key}`;
  if (t.kind === "item") return t.entry.href;
  return t.leaf.href;
}

// "Tổng quan" (trang chủ) không cho ghim/di chuyển — nó phải LUÔN đứng cố định trên cùng,
// trên cả khu "Lối tắt của bạn" (phản hồi 14/9/2026: ghim mục khác lên sẽ đẩy Tổng quan
// xuống dưới, giống "trang chủ" bị che mất — rất dễ gây rối UX).
const homeItem = navStructure.find((e): e is NavItem => e.type === "item" && e.href === "/dashboard");

const pinTargets: PinTarget[] = [];
navStructure.forEach(e => {
  if (e.type === "item") {
    if (e.href === "/dashboard") return;
    pinTargets.push({ kind: "item", entry: e });
  }
  else if (e.type === "group") {
    pinTargets.push({ kind: "group", entry: e });
    e.children.forEach(c => pinTargets.push({ kind: "child", leaf: c, parent: e }));
  }
});
const pinTargetById = new Map(pinTargets.map(t => [pinIdOf(t), t]));

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

  // ─── Lối tắt: ghim, sắp xếp, và gợi ý mục hay dùng ────────────────────
  // Lưu theo companySlug (localStorage — riêng cho từng trình duyệt/máy), để
  // đổi công ty khác không lẫn lối tắt của nhau.
  const storageKey = `timio_sidebar_pinned_${companySlug || "default"}`;
  const usageKey = `timio_sidebar_usage_${companySlug || "default"}`;
  const [pinned, setPinned] = useState<string[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [editMode, setEditMode] = useState(false);
  const [mounted, setMounted] = useState(false); // tránh lệch giao diện lúc hydrate
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawPins = localStorage.getItem(storageKey);
      if (rawPins) setPinned(JSON.parse(rawPins));
      const rawUsage = localStorage.getItem(usageKey);
      if (rawUsage) setUsage(JSON.parse(rawUsage));
    } catch {
      // localStorage có thể bị chặn (chế độ ẩn danh) — bỏ qua, dùng mặc định
    }
    setMounted(true);
  }, [storageKey, usageKey]);

  function persistPinned(next: string[]) {
    setPinned(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }

  function togglePin(id: string) {
    persistPinned(pinned.includes(id) ? pinned.filter(p => p !== id) : [...pinned, id]);
  }

  function movePinned(id: string, dir: -1 | 1) {
    const idx = pinned.indexOf(id);
    const newIdx = idx + dir;
    if (idx < 0 || newIdx < 0 || newIdx >= pinned.length) return;
    const next = [...pinned];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    persistPinned(next);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const next = pinned.filter(id => id !== dragId);
    const targetIdx = next.indexOf(targetId);
    next.splice(targetIdx, 0, dragId);
    persistPinned(next);
    setDragId(null);
  }

  function trackUsage(href: string) {
    setUsage(prev => {
      const next = { ...prev, [href]: (prev[href] ?? 0) + 1 };
      try { localStorage.setItem(usageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // Gợi ý ghim (chỉ hiện khi đang chỉnh sửa): mục bấm nhiều mà CHƯA ghim.
  // Chủ động gợi ý chứ không tự động xếp lại menu — tự động di chuyển vị trí
  // menu mà không hỏi rất dễ gây khó chịu (người dùng quen tay bấm 1 chỗ, hôm
  // sau menu đã đổi chỗ). Gợi ý rồi để người dùng tự bấm ghim là cách làm
  // được các app lớn (VS Code, Slack) dùng, vừa chủ động vừa không gây rối.
  const suggested = useMemo(() => {
    if (!editMode) return [];
    return Object.entries(usage)
      .filter(([href, n]) => n >= 5 && !pinned.includes(href) && !shouldHide(href))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([href]) => href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usage, pinned, editMode, role]);

  // indent=true: mục con trong 1 group đang mở. Trước đây thụt vào tới 48px (ml-3 của khung bọc +
  // border-l + pl-8 của chính link) — nhìn như bị "giấu" sâu vào 1 cái hộp riêng (phản hồi
  // 10/9/2026: "menu drop-down hay bị giấu bên trong, đẩy lùi về phía bên tay trái"). Giờ chỉ còn
  // 1 lớp thụt pl-7 (28px), không còn border-l/khung bọc riêng — khung "thẻ" bg-gray-50 ở group
  // cha đã đủ báo hiệu đây là mục con, không cần thụt sâu thêm.
  const renderItem = (leaf: NavLeaf, indent = false) => {
    if (shouldHide(leaf.href)) return null;
    const active = isItemActive(leaf.href);
    const count = getBadgeCount(leaf.badgeKey);
    const isPinned = pinned.includes(leaf.href);
    const isSuggested = suggested.includes(leaf.href);
    return (
      <div key={leaf.href} className="flex items-center gap-0.5">
        <Link
          href={leaf.href}
          onClick={() => { setMobileOpen(false); trackUsage(leaf.href); }}
          className={cn(
            "flex-1 min-w-0 flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
            indent ? "pl-7 pr-2.5 py-1.5" : "px-3 py-2.5",
            active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm"
          )}
        >
          <leaf.Icon size={15} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
          <span className="flex-1 min-w-0 leading-snug truncate">{leaf.label}</span>
          {isSuggested && (
            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 leading-none">Hay dùng</span>
          )}
          <Badge count={count} color={leaf.badgeKey === "leave" ? "bg-red-500" : "bg-orange-500"} />
        </Link>
        {editMode && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); togglePin(leaf.href); }}
            title={isPinned ? "Bỏ ghim khỏi Lối tắt" : "Ghim lên Lối tắt của bạn"}
            className={cn("shrink-0 p-1.5 rounded-lg transition-colors", isPinned ? "text-blue-600 hover:bg-blue-50" : "text-gray-300 hover:text-blue-500 hover:bg-blue-50")}
          >
            <Pin size={13} className={isPinned ? "fill-current" : ""} />
          </button>
        )}
      </div>
    );
  };

  // Nội dung hiển thị của 1 mục trong "Lối tắt của bạn" — dùng lại đúng logic active/badge
  // như ở vị trí gốc, chỉ khác phần khung (gọn hơn, không cần nút ghim riêng vì cả dòng
  // nằm trong khu Lối tắt rồi).
  function renderPinnedContent(target: PinTarget) {
    if (target.kind === "item") {
      const entry = target.entry;
      if (shouldHide(entry.href)) return null;
      const active = isItemActive(entry.href);
      const count = getBadgeCount(entry.badgeKey);
      return (
        <Link href={entry.href} onClick={() => { setMobileOpen(false); trackUsage(entry.href); }}
          className={cn("flex-1 min-w-0 flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors",
            active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-white hover:shadow-sm")}>
          <entry.Icon size={15} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
          <span className="flex-1 min-w-0 truncate">{entry.label}</span>
          <Badge count={count} color={entry.badgeKey === "leave" ? "bg-red-500" : entry.badgeKey === "recruitment" ? "bg-blue-600" : "bg-orange-500"} />
        </Link>
      );
    }
    if (target.kind === "child") {
      const leaf = target.leaf;
      if (shouldHide(leaf.href)) return null;
      const active = isItemActive(leaf.href);
      const count = getBadgeCount(leaf.badgeKey);
      return (
        <Link href={leaf.href} onClick={() => { setMobileOpen(false); trackUsage(leaf.href); }}
          className={cn("flex-1 min-w-0 flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors",
            active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-white hover:shadow-sm")}>
          <leaf.Icon size={15} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
          <span className="flex-1 min-w-0 truncate">{leaf.label}</span>
          <Badge count={count} color={leaf.badgeKey === "leave" ? "bg-red-500" : "bg-orange-500"} />
        </Link>
      );
    }
    // group — vẫn xổ/thu như bình thường, dùng CHUNG state openGroups với vị trí gốc
    const entry = target.entry;
    const visibleChildren = entry.children.filter(c => !shouldHide(c.href));
    if (visibleChildren.length === 0) return null;
    const isOpen = openGroups.has(entry.key);
    const groupActive = visibleChildren.some(c => isItemActive(c.href));
    const groupBadgeCount = getGroupBadge(entry.children);
    return (
      <div className="flex-1 min-w-0">
        <button type="button" onClick={() => toggleGroup(entry.key)}
          className={cn("w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors",
            groupActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-white hover:shadow-sm")}>
          <entry.Icon size={15} strokeWidth={groupActive ? 2.5 : 2} className="shrink-0" />
          <span className="flex-1 min-w-0 text-left truncate">{entry.label}</span>
          {!isOpen && <Badge count={groupBadgeCount} color="bg-orange-500" />}
          <ChevronDown size={13} strokeWidth={2} className={cn("shrink-0 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
        </button>
        {isOpen && (
          <div className="pb-1 pt-0.5 space-y-0.5">
            {visibleChildren.map(c => renderItem(c, true))}
          </div>
        )}
      </div>
    );
  }

  const visiblePinned = pinned.filter(id => pinTargetById.has(id));

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
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
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

        {/* Nav — đệm rộng hơn 1 chút (p-2 → p-2.5, space-y-0.5 → space-y-1) cho thoáng mắt hơn
            (phản hồi 10/9/2026: "chọn đợt hơn một chút để chúng ta dễ nhìn hơn"). */}
        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto overflow-x-hidden">
          {/* ─── Tổng quan — cố định trên cùng, không ghim/kéo được (14/9/2026) ─── */}
          {homeItem && !shouldHide(homeItem.href) && (
            <Link
              href={homeItem.href}
              onClick={() => { setMobileOpen(false); trackUsage(homeItem.href); }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                isItemActive(homeItem.href) ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              )}
            >
              <homeItem.Icon size={17} strokeWidth={isItemActive(homeItem.href) ? 2.5 : 2} className="shrink-0" />
              <span className="flex-1 min-w-0 truncate">{homeItem.label}</span>
            </Link>
          )}

          {/* ─── Lối tắt của bạn — ghim + tự sắp xếp menu theo thói quen (14/9/2026) ─── */}
          {mounted && (
            <div className="mb-1 pb-2 border-b border-gray-100">
              <div className="flex items-center justify-between px-3 pt-0.5 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 select-none">Lối tắt của bạn</p>
                <button
                  type="button"
                  onClick={() => setEditMode(v => !v)}
                  title="Ghim và sắp xếp menu theo ý bạn"
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors shrink-0",
                    editMode ? "bg-blue-600 text-white" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  )}
                >
                  {editMode ? <><Check size={11} /> Xong</> : <><Pencil size={11} /> Tùy chỉnh</>}
                </button>
              </div>

              {visiblePinned.length === 0 ? (
                editMode ? (
                  <p className="px-3 pb-1 text-xs text-gray-400 leading-snug">
                    Bấm biểu tượng ghim <Pin size={11} className="inline -mt-0.5" /> cạnh mục bạn hay dùng bên dưới để đưa lên đây.
                  </p>
                ) : (
                  <p className="px-3 pb-1 text-xs text-gray-300 leading-snug">Chưa có lối tắt nào</p>
                )
              ) : (
                <div className="space-y-0.5">
                  {visiblePinned.map((id, idx) => {
                    const target = pinTargetById.get(id)!;
                    const content = renderPinnedContent(target);
                    if (!content) return null; // ẩn theo quyền (VD manager không thấy mục lương)
                    return (
                      <div
                        key={id}
                        draggable={editMode}
                        onDragStart={() => setDragId(id)}
                        onDragOver={(e) => { if (editMode) e.preventDefault(); }}
                        onDrop={() => { if (editMode) handleDrop(id); }}
                        className={cn("flex items-center gap-0.5 rounded-lg", editMode && "bg-gray-50/80")}
                      >
                        {editMode && <GripVertical size={14} className="text-gray-300 shrink-0 cursor-grab ml-1" />}
                        {content}
                        {editMode && (
                          <div className="flex items-center shrink-0 pr-0.5">
                            <button type="button" disabled={idx === 0} onClick={() => movePinned(id, -1)}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 disabled:opacity-25 disabled:pointer-events-none" title="Đưa lên">
                              <ArrowUp size={13} />
                            </button>
                            <button type="button" disabled={idx === visiblePinned.length - 1} onClick={() => movePinned(id, 1)}
                              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 disabled:opacity-25 disabled:pointer-events-none" title="Đưa xuống">
                              <ArrowDown size={13} />
                            </button>
                            <button type="button" onClick={() => togglePin(id)}
                              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" title="Bỏ ghim">
                              <PinOff size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {navStructure.map((entry, idx) => {
            if (entry.type === "section") {
              // Ẩn tiêu đề khu nếu mọi mục trong khu đều bị ẩn theo quyền
              let hasVisible = false;
              for (let j = idx + 1; j < navStructure.length; j++) {
                const e = navStructure[j];
                if (e.type === "section") break;
                if (e.type === "item") { if (!shouldHide(e.href)) { hasVisible = true; break; } }
                else if (e.children.some(c => !shouldHide(c.href))) { hasVisible = true; break; }
              }
              if (!hasVisible) return null;
              // Vạch phân cách + khoảng trống rộng hơn giữa các khu (phản hồi 10/9/2026: các khu
              // "khó nhìn/rối" — trước chỉ cách nhau 10px không có ranh giới, giờ thêm đường kẻ
              // mảnh + đệm trên để mắt dễ "chia khối" khi lướt nhanh).
              return (
                <p key={`sec-${idx}`} className="px-3 mt-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 select-none border-t border-gray-100">
                  {entry.label}
                </p>
              );
            }
            if (entry.type === "item") {
              if (entry.href === "/dashboard") return null; // đã hiển thị cố định trên đầu, không lặp lại ở đây
              if (shouldHide(entry.href)) return null;
              const active = isItemActive(entry.href);
              const count = getBadgeCount(entry.badgeKey);
              const isPinned = pinned.includes(entry.href);
              return (
                <div key={entry.href} className="flex items-center gap-0.5">
                  <Link
                    href={entry.href}
                    onClick={() => { setMobileOpen(false); trackUsage(entry.href); }}
                    className={cn(
                      "flex-1 min-w-0 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    )}
                  >
                    <entry.Icon size={17} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{entry.label}</span>
                    {entry.isNew && count === 0 && (
                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 leading-none">MỚI</span>
                    )}
                    {count > 0 && (
                      <span className={cn("shrink-0 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none", entry.badgeKey === "leave" ? "bg-red-500" : entry.badgeKey === "recruitment" ? "bg-blue-600" : "bg-orange-500")}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </Link>
                  {editMode && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); togglePin(entry.href); }}
                      title={isPinned ? "Bỏ ghim khỏi Lối tắt" : "Ghim lên Lối tắt của bạn"}
                      className={cn("shrink-0 p-1.5 rounded-lg transition-colors", isPinned ? "text-blue-600 hover:bg-blue-50" : "text-gray-300 hover:text-blue-500 hover:bg-blue-50")}
                    >
                      <Pin size={14} className={isPinned ? "fill-current" : ""} />
                    </button>
                  )}
                </div>
              );
            }

            // Group
            const visibleChildren = entry.children.filter(c => !shouldHide(c.href));
            if (visibleChildren.length === 0) return null;

            const isOpen = openGroups.has(entry.key);
            const groupActive = visibleChildren.some(c => isItemActive(c.href));
            const groupBadgeCount = getGroupBadge(entry.children);
            const groupPinId = `group:${entry.key}`;
            const isGroupPinned = pinned.includes(groupPinId);

            // Khi mở: bọc cả nhóm trong 1 "thẻ" nền xám nhạt để báo hiệu "đây là 1 cụm" — thay cho
            // cách cũ thụt lề sâu (ml-3 + border-l + pl-8 ≈ 48px) khiến mục con như bị giấu vào 1
            // hộp riêng, lệch hẳn sang phải (phản hồi 10/9/2026). Vẫn là accordion xổ ngay tại chỗ,
            // KHÔNG đổi qua kiểu popover/flyout nổi ra ngoài (đã thử kiểu đó trước đây, không hợp).
            return (
              <div key={entry.key} className={cn("rounded-lg transition-colors", isOpen && "bg-gray-50/80")}>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => toggleGroup(entry.key)}
                    className={cn(
                      "flex-1 min-w-0 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      groupActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                    )}
                  >
                    <entry.Icon size={17} strokeWidth={groupActive ? 2.5 : 2} className="shrink-0" />
                    <span className="flex-1 min-w-0 text-left truncate">{entry.label}</span>
                    {!isOpen && groupBadgeCount > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {groupBadgeCount > 99 ? "99+" : groupBadgeCount}
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      strokeWidth={2}
                      className={cn("shrink-0 transition-transform duration-200", isOpen ? "rotate-180" : "")}
                    />
                  </button>
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => togglePin(groupPinId)}
                      title={isGroupPinned ? "Bỏ ghim khỏi Lối tắt" : "Ghim cả mục này lên Lối tắt của bạn"}
                      className={cn("shrink-0 p-1.5 mr-1 rounded-lg transition-colors", isGroupPinned ? "text-blue-600 hover:bg-blue-50" : "text-gray-300 hover:text-blue-500 hover:bg-blue-50")}
                    >
                      <Pin size={14} className={isGroupPinned ? "fill-current" : ""} />
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="pb-1.5 space-y-0.5">
                    {visibleChildren.map(child => renderItem(child, true))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Tài khoản (đổi mật khẩu, gói dịch vụ, đăng xuất) */}
        <div className="p-2 border-t border-gray-100">
          {/* Thẻ <a> thường (không phải next/link) — khi đang ở sẵn trang /dashboard/settings,
              điều hướng client-side sẽ không remount SettingsClient nên querystring ?section=account
              không được đọc lại. Dùng <a> để luôn tải mới trang, đảm bảo mở đúng tab Tài khoản. */}
          <a
            href="/dashboard/settings?section=account"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            <CircleUserRound size={17} strokeWidth={2} />
            Tài khoản
          </a>
        </div>
      </aside>
    </>
  );
}
