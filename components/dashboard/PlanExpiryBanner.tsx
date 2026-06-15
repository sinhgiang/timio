"use client";

import { X } from "lucide-react";
import { useState } from "react";

interface Props {
  daysLeft: number;
  plan: string;
}

export default function PlanExpiryBanner({ daysLeft, plan }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const isUrgent = daysLeft <= 3;
  const planLabel = plan === "business" ? "Business" : "Pro";

  return (
    <div
      className={`fixed top-14 md:top-0 left-0 md:left-56 right-0 z-30 flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
        isUrgent
          ? "bg-red-600 text-white"
          : "bg-amber-50 border-b border-amber-200 text-amber-900"
      }`}
    >
      <span className="flex-1">
        {isUrgent
          ? `⚠️ Gói ${planLabel} của bạn hết hạn sau ${daysLeft} ngày — gia hạn ngay để không gián đoạn.`
          : `Gói ${planLabel} của bạn còn ${daysLeft} ngày — hãy gia hạn để tránh gián đoạn.`}
      </span>
      <a
        href="/dashboard/billing"
        className={`shrink-0 px-3 py-1 rounded-md text-xs font-semibold ${
          isUrgent
            ? "bg-white text-red-700 hover:bg-red-50"
            : "bg-amber-600 text-white hover:bg-amber-700"
        }`}
      >
        Gia hạn ngay
      </a>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-70 hover:opacity-100"
        aria-label="Đóng"
      >
        <X size={16} />
      </button>
    </div>
  );
}
