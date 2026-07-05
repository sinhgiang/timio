"use client";

import { useEffect, useState } from "react";

// Trang trung gian: bấm từ email/tin nhắn nhắc chấm công.
// - Có app Timio trong máy → mở app (scheme timio://)
// - Không có app → tự chuyển sang trang quét mặt trên web /checkin/[slug]
export default function GoCheckinPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const webUrl = `/checkin/${slug}`;
  const appUrl = "timio://";
  const [fallbackReady, setFallbackReady] = useState(false);

  useEffect(() => {
    // Thử mở app ngay
    try {
      window.location.href = appUrl;
    } catch { /* ignore */ }

    // Nếu sau 2 giây vẫn còn ở trang này (app không mở) → ra web kiosk
    const t = setTimeout(() => {
      if (document.visibilityState === "visible") {
        window.location.href = webUrl;
      }
    }, 2000);
    const t2 = setTimeout(() => setFallbackReady(true), 1200);
    return () => { clearTimeout(t); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "Arial, Helvetica, sans-serif", padding: 20 }}>
      <div style={{ maxWidth: 380, width: "100%", background: "#fff", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,.08)", padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Chấm công</div>
        <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px" }}>
          Đang mở ứng dụng Timio… Nếu chưa cài app, bấm nút bên dưới để quét mặt trên trình duyệt.
        </p>

        <a href={appUrl} style={{ display: "block", background: "#2563eb", color: "#fff", textDecoration: "none", padding: "13px 20px", borderRadius: 10, fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
          Mở ứng dụng Timio
        </a>
        <a href={webUrl} style={{ display: "block", background: "#fff", color: "#2563eb", textDecoration: "none", padding: "13px 20px", borderRadius: 10, fontWeight: 700, fontSize: 15, border: "1.5px solid #2563eb" }}>
          Quét mặt trên trình duyệt
        </a>

        {fallbackReady && (
          <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 16 }}>
            Chưa tự chuyển? Bấm &ldquo;Quét mặt trên trình duyệt&rdquo; ở trên.
          </p>
        )}
      </div>
    </div>
  );
}
