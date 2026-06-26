"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ARTICLES } from "./docsData";

export default function DocsNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block w-52 shrink-0">
      <div className="sticky top-0 pt-8 pb-6 px-4 h-screen overflow-y-auto border-r border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Bài hướng dẫn</p>
        <nav className="space-y-0.5">
          {ARTICLES.map(({ slug, label, Icon, badge }) => {
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
                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
                <span className="flex-1 leading-tight">{label}</span>
                {badge && (
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                    badge === "Mới" ? "bg-green-100 text-green-700" :
                    badge === "Business" ? "bg-purple-100 text-purple-700" :
                    "bg-blue-100 text-blue-700"
                  )}>{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
