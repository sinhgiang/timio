"use client";
import Link from "next/link";
import { Lock } from "lucide-react";
import { usePlan, PLAN_ORDER } from "@/context/PlanContext";

interface PlanGateProps {
  requiredPlan: "pro" | "business";
  feature: string;
  children: React.ReactNode;
  /** Wrap mode: "section" blurs content in-place; "inline" shows a small inline badge */
  mode?: "section" | "inline";
  className?: string;
}

/**
 * Wraps content behind a blur+lock overlay if the company's plan is below requiredPlan.
 * Content is still rendered (for SEO & preview effect) but blurred and non-interactive.
 */
export default function PlanGate({
  requiredPlan,
  feature,
  children,
  mode = "section",
  className,
}: PlanGateProps) {
  const { plan } = usePlan();
  const hasAccess = (PLAN_ORDER[plan] ?? 0) >= PLAN_ORDER[requiredPlan];

  if (hasAccess) return <>{children}</>;

  const isPro = requiredPlan === "pro";
  const label = isPro ? "Pro" : "Business";
  const btnClass = isPro
    ? "bg-blue-600 hover:bg-blue-700 text-white"
    : "bg-purple-600 hover:bg-purple-700 text-white";
  const iconBg = isPro ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600";

  if (mode === "inline") {
    return (
      <Link
        href="/dashboard/billing"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
          isPro
            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
        } transition-colors`}
        title={`${feature} — Yêu cầu gói ${label}`}
      >
        <Lock size={11} />
        {label}
      </Link>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className ?? ""}`}>
      {/* Blurred background content */}
      <div className="blur-sm pointer-events-none select-none opacity-40" aria-hidden="true">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl p-4">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-3 ${iconBg}`}>
          <Lock size={20} strokeWidth={1.8} />
        </div>
        <p className="text-sm font-bold text-gray-800 mb-1 text-center">{feature}</p>
        <p className="text-xs text-gray-500 mb-4 text-center">
          Tính năng này yêu cầu gói <span className="font-semibold">{label}</span>
        </p>
        <Link
          href="/dashboard/billing"
          className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${btnClass}`}
        >
          Nâng cấp lên {label} →
        </Link>
      </div>
    </div>
  );
}
