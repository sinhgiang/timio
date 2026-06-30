"use client";

import { X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface Props {
  trialEndsAt: string | null;
  plan: string;
}

export default function TrialBanner({ trialEndsAt, plan }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  // Chỉ hiện banner cho gói starter đang dùng thử
  if (!trialEndsAt || plan !== "starter") return null;

  const now = new Date();
  const endsAt = new Date(trialEndsAt);
  const msLeft = endsAt.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / 86400000);

  // Hết hạn quá 3 ngày → không hiện nữa
  if (daysLeft < -3) return null;

  const isExpired = daysLeft <= 0;
  const isUrgent = daysLeft <= 3 && daysLeft > 0;
  const isNormal = daysLeft > 3;

  let bgClass = "";
  let message = "";

  if (isExpired) {
    bgClass = "bg-red-600 text-white";
    message = "Thời gian dùng thử đã hết. Nâng cấp để khôi phục đầy đủ tính năng.";
  } else if (isUrgent) {
    bgClass = "bg-orange-500 text-white";
    message = `Dùng thử sắp hết — còn ${daysLeft} ngày. Nâng cấp ngay để tiếp tục sử dụng đầy đủ tính năng.`;
  } else if (isNormal) {
    bgClass = "bg-blue-600 text-white";
    message = `Bạn đang dùng thử Timio Pro — còn ${daysLeft} ngày. Nâng cấp để không bị gián đoạn.`;
  }

  return (
    <div
      className={`fixed top-14 md:top-0 left-0 md:left-56 right-0 z-30 flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${bgClass}`}
    >
      <span className="flex-1">{message}</span>
      <Link
        href="/dashboard/billing"
        className="shrink-0 px-3 py-1 rounded-md text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50"
      >
        Nâng cấp ngay
      </Link>
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
