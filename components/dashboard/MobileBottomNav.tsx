"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Umbrella, BarChart3, Users } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Tổng quan", Icon: LayoutDashboard },
  { href: "/dashboard/employees", label: "Nhân viên", Icon: Users },
  { href: "/dashboard/leave", label: "Nghỉ phép", Icon: Umbrella },
  { href: "/dashboard/reports", label: "Báo cáo", Icon: BarChart3 },
];

export default function MobileBottomNav({ pendingLeaveCount = 0 }: { pendingLeaveCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 flex safe-area-inset-bottom">
      {tabs.map(({ href, label, Icon }) => {
        const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        const showBadge = href === "/dashboard/leave" && pendingLeaveCount > 0;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
              isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              {showBadge && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {pendingLeaveCount > 9 ? "9+" : pendingLeaveCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
