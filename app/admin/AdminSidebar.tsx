"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Building2, Gift, DollarSign, Clock, ShieldCheck, LogOut } from "lucide-react";


const NAV = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/admin/companies", label: "Công ty", icon: Building2, exact: false },
  { href: "/admin/referrals", label: "Affiliate & Referral", icon: Gift, exact: false },
  { href: "/admin/revenue", label: "Doanh thu", icon: DollarSign, exact: false },
  { href: "/admin/audit", label: "Audit Log", icon: ShieldCheck, exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-white flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">Timio</span>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded">
          Super Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 border-t border-slate-700/60 pt-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-slate-700/60 transition-colors text-left"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
