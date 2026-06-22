"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";

interface Props {
  branch: { id: string; name: string };
  companySlug: string;
  companyName: string;
}

export default function BranchQRCard({ branch, companySlug, companyName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [url, setUrl] = useState(`/checkin/${companySlug}?b=${branch.id}`);

  useEffect(() => {
    const fullUrl = `${window.location.origin}/checkin/${companySlug}?b=${branch.id}`;
    setUrl(fullUrl);
    if (!canvasRef.current) return;
    import("qrcode").then(({ toCanvas }) => {
      toCanvas(canvasRef.current!, fullUrl, {
        width: 200,
        margin: 2,
        color: { dark: "#1e3a8a", light: "#ffffff" },
      }).then(() => setReady(true)).catch(() => {});
    });
  }, [companySlug, branch.id]);

  const download = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qr-checkin-${branch.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const print = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Check-in — ${branch.name}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
        img { width: 260px; height: 260px; }
        .company { font-size: 13px; color: #94a3b8; margin-top: 16px; }
        h2 { font-size: 24px; margin: 4px 0 8px; color: #1e3a8a; font-weight: 700; }
        .sub { font-size: 14px; color: #64748b; margin: 0; }
        .url { font-size: 10px; color: #cbd5e1; margin-top: 10px; font-family: monospace; }
        @media print { @page { margin: 1.5cm; } }
      </style></head>
      <body>
        <img src="${dataUrl}" />
        <div class="company">${companyName}</div>
        <h2>${branch.name}</h2>
        <p class="sub">Quét mã để chấm công</p>
        <p class="url">${url}</p>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center">
      <div className="self-start mb-3">
        <span className="font-semibold text-gray-800 text-sm">{branch.name}</span>
        <p className="text-[11px] text-gray-400 mt-0.5">Mã QR riêng · nhân viên quét bằng điện thoại cá nhân</p>
      </div>
      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-3">
        <canvas ref={canvasRef} className={ready ? "block" : "hidden"} style={{ width: 150, height: 150 }} />
        {!ready && <div className="w-[150px] h-[150px] flex items-center justify-center text-gray-400 text-xs">Đang tạo QR...</div>}
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={download} disabled={!ready}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
          <Download size={13} /> Tải PNG
        </button>
        <button onClick={print} disabled={!ready}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
          <Printer size={13} /> In
        </button>
      </div>
    </div>
  );
}
