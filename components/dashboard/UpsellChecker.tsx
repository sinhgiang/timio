"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Chỉ mời nâng cấp cho CHỦ tài khoản đang dùng gói MIỄN PHÍ (starter), lần đầu.
// Tài khoản đã trả phí (pro/business) hoặc thành viên phụ → KHÔNG bao giờ hiện.
export default function UpsellChecker({ plan, role }: { plan: string; role: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/dashboard/welcome" || pathname.startsWith("/dashboard/billing")) return;

    const isPaid = plan !== "starter" && plan !== "free" && plan !== "";
    if (isPaid || role !== "owner") {
      // Đã trả phí hoặc không phải chủ tài khoản → tắt hẳn upsell
      try { localStorage.setItem("timio_upsell_seen", "1"); } catch { /* ignore */ }
      return;
    }

    const seen = localStorage.getItem("timio_upsell_seen");
    if (!seen) router.replace("/dashboard/welcome");
  }, [pathname, router, plan, role]);

  return null;
}
