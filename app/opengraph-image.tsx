import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span style={{ color: "white", fontSize: "56px", fontWeight: "bold", letterSpacing: "-1px" }}>
            Timio
          </span>
        </div>

        {/* Tagline */}
        <p style={{ color: "rgba(255,255,255,0.95)", fontSize: "32px", fontWeight: "600", textAlign: "center", margin: "0 0 16px" }}>
          Phần mềm chấm công thông minh
        </p>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "22px", textAlign: "center", margin: "0" }}>
          Nhận diện khuôn mặt · Báo cáo tự động · Tính lương chính xác
        </p>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "16px", marginTop: "48px" }}>
          {["Kiosk PWA", "Đa chi nhánh", "Xuất Excel", "Telegram Alert"].map((f) => (
            <div
              key={f}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "100px",
                padding: "10px 24px",
                color: "white",
                fontSize: "18px",
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
