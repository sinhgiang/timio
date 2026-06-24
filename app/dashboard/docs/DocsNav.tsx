"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Zap, Camera, Users, Building2, BarChart3, FileText,
  Umbrella, CalendarDays, MessageSquare, Gift, type LucideIcon,
} from "lucide-react";

export const ARTICLES: { slug: string; label: string; Icon: LucideIcon }[] = [
  { slug: "getting-started", label: "Bắt đầu nhanh", Icon: Zap },
  { slug: "kiosk", label: "Máy chấm công", Icon: Camera },
  { slug: "employees", label: "Nhân viên", Icon: Users },
  { slug: "branches", label: "Chi nhánh & Ca làm", Icon: Building2 },
  { slug: "reports", label: "Báo cáo tháng", Icon: BarChart3 },
  { slug: "payslip", label: "Phiếu lương", Icon: FileText },
  { slug: "leave", label: "Nghỉ phép", Icon: Umbrella },
  { slug: "holidays", label: "Lịch nghỉ lễ", Icon: CalendarDays },
  { slug: "telegram", label: "Thông báo Telegram", Icon: MessageSquare },
  { slug: "salary13", label: "Lương tháng 13", Icon: Gift },
];

export default function DocsNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block w-52 shrink-0">
      <div className="sticky top-0 pt-8 pb-6 px-4 h-screen overflow-y-auto border-r border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Bài hướng dẫn</p>
        <nav className="space-y-0.5">
          {ARTICLES.map(({ slug, label, Icon }) => {
            const isActive = pathname === `/dashboard/docs/${slug}`;
            return (
              <Link
                key={slug}
                href={`/dashboard/docs/${slug}`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                )}
              >
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
