"use client";

import { useEffect } from "react";

/**
 * Invisible tracker — fires once per browser session.
 * Source detection priority (most → least reliable):
 *   1. UTM params (?utm_source=google&utm_medium=cpc) — survive ALL redirect chains
 *   2. document.referrer — works for organic social/search
 *   3. Empty string → server records as "Trực tiếp"
 *
 * 180-day attribution cookie persists so user can return later and still be attributed.
 */
export default function AffiliateTracker({ code }: { code: string }) {
  useEffect(() => {
    if (!code) return;

    const sessionKey = `aff_tracked_${code}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");

    // Attribution cookie (180 days) — survives tab close
    setCookie("aff_code", code, 180);

    // UTM params survive Google Ads / Facebook / TikTok redirect chains
    // document.referrer is unreliable when referrer-policy strips it (Google Ads, etc.)
    const urlParams   = new URLSearchParams(window.location.search);
    const utmSource   = urlParams.get("utm_source")   || "";
    const utmMedium   = urlParams.get("utm_medium")   || "";
    const utmCampaign = urlParams.get("utm_campaign") || "";

    const source = utmSource
      ? `utm:${[utmSource, utmMedium, utmCampaign].filter(Boolean).join("/")}`
      : (document.referrer || "");

    fetch("/api/affiliate/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, referrer: source }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clickId) setCookie("aff_click_id", data.clickId, 180);
      })
      .catch(() => { /* silent fail — tracking never breaks UX */ });
  }, [code]);

  return null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
