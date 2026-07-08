"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, IdCard } from "lucide-react";

const tabs = [
  { href: "/nhanvien", label: "Trang chủ", Icon: Home },
  { href: "/nhanvien/ho-so", label: "Hồ sơ", Icon: IdCard },
];

export default function WorkerNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gray-100">
      <div className="max-w-3xl mx-auto flex">
        {tabs.map((t) => {
          const active = path === t.href;
          return (
            <Link key={t.href} href={t.href} className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${active ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}>
              <t.Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
