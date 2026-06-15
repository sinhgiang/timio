"use client";

import { useEffect } from "react";

/**
 * Invisible component that:
 * 1. Fires a click event to /api/affiliate/click once per browser session
 * 2. Sets a 30-day attribution cookie (aff_code + aff_click_id)
 *    so registration is attributed even if user leaves and returns later
 */
export default function AffiliateTracker({ code }: { code: string }) {
  useEffect(() => {
    if (!code) return;

    // Only track once per session to avoid duplicate clicks on refresh
    const sessionKey = `aff_tracked_${code}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");

    // Set 180-day attribution cookie for aff code (survives tab close)
    setCookie("aff_code", code, 180);

    // Fire click event
    const referrer = document.referrer || "";
    fetch("/api/affiliate/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, referrer }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clickId) {
          // Store clickId for conversion attribution (180 days)
          setCookie("aff_click_id", data.clickId, 180);
        }
      })
      .catch(() => {
        // Silent fail — tracking must never break the UX
      });
  }, [code]);

  return null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
