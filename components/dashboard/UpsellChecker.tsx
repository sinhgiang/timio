"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function UpsellChecker() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect if already on welcome or billing page
    if (pathname === "/dashboard/welcome" || pathname.startsWith("/dashboard/billing")) return;

    const seen = localStorage.getItem("timio_upsell_seen");
    if (!seen) {
      router.replace("/dashboard/welcome");
    }
  }, [pathname, router]);

  return null;
}
