"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Props {
  employeeName: string;
  employeeId: string;
  onComplete: (descriptors: number[][]) => void;
  onCancel: () => void;
}

const REQUIRED_SAMPLES = 5;
const AUTO_HOLD_MS = 500;
const POST_CAPTURE_MS = 1000;

const CAPTURE_STEPS = [
  { icon: "😐", label: "Nhìn thẳng vào camera", hint: "Nhìn thẳng và giữ yên" },
  { icon: "⬅️", label: "Quay nhẹ sang TRÁI ←", hint: "Quay đầu sang trái của bạn" },
  { icon: "➡️", label: "Quay nhẹ sang PHẢI →", hint: "Quay đầu sang phải của bạn" },
  { icon: "⬆️", label: "Ngẩng đầu lên ↑", hint: "Ngẩng đầu nhẹ lên trên" },
  { icon: "⬇️", label: "Cúi đầu xuống ↓", hint: "Cúi đầu nhẹ xuống dưới" },
];

export default function FaceCapture({ employeeName, employeeId, onComplete, onCancel }: Props) {
  // ─── Tab ───────────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"camera" | "qr">("camera");

  // ─── Camera refs ───────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectingRef = useRef(false);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const pauseUntilRef = useRef<number>(0);
  const samplesRef = useRef<number[][]>([]);
  const baselinePosRef = useRef<{ x: number; y: number } | null>(null);
  const capturingRef = useRef(false);

  // ─── Camera state ──────────────────────────────────────────────────────────────
  const [cameraStep, setCameraStep] = useState<"intro" | "scanning" | "checking" | "done">("intro");
  const [samples, setSamples] = useState<number[][]>([]);
  const [status, setStatus] = useState("");
  const [modelsLoading, setModelsLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ scale: 1, tx: 0, ty: 0 });
  const [holdProgress, setHoldProgress] = useState(0);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);

  // ─── QR state ──────────────────────────────────────────────────────────────────
  const [qrPhase, setQrPhase] = useState<"loading" | "ready" | "done">("loading");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPageUrl, setQrPageUrl] = useState("");
  const [qrError, setQrError] = useState("");
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Sync refs ─────────────────────────────────────────────────────────────────
  useEffect(() => { samplesRef.current = samples; }, [samples]);

  // Attach stream after scanning phase mounts
  useEffect(() => {
    if (cameraStep === "scanning" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStep]);

  // ─── Stop camera ───────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // ─── Head condition check ──────────────────────────────────────────────────────
  const checkCondition = (fcXNorm: number, fcYNorm: number, stepIdx: number): boolean => {
    const bl = baselinePosRef.current;
    switch (stepIdx) {
      case 0: return fcXNorm > 0.35 && fcXNorm < 0.65 && fcYNorm > 0.28 && fcYNorm < 0.72;
      case 1: return bl !== null && fcXNorm > bl.x + 0.10;
      case 2: return bl !== null && fcXNorm < bl.x - 0.10;
      case 3: return bl !== null && fcYNorm < bl.y - 0.08;
      case 4: return bl !== null && fcYNorm > bl.y + 0.08;
      default: return false;
    }
  };

  // ─── Detection loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (cameraStep !== "scanning") return;

    let alive = true;

    const runDetect = async () => {
      if (!alive || detectingRef.current) {
        if (alive) loopRef.current = setTimeout(runDetect, 150);
        return;
      }
      const now = Date.now();
      if (now < pauseUntilRef.current) {
        if (alive) loopRef.current = setTimeout(runDetect, 100);
        return;
      }
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        if (alive) loopRef.current = setTimeout(runDetect, 200);
        return;
      }

      detectingRef.current = true;
      try {
        const { detectFaceBox } = await import("@/lib/faceApi");
        const box = await detectFaceBox(video);

        if (alive) {
          if (box) {
            const vW = video.videoWidth || 640;
            const vH = video.videoHeight || 480;
            const fcX = box.x + box.width / 2;
            const fcY = box.y + box.height / 2;
            const fcXNorm = fcX / vW;
            const fcYNorm = fcY / vH;
            const scale = Math.max(1, Math.min(3.0, (vH * 0.55) / box.height));
            const tx = (0.5 - fcXNorm) * scale * 100;
            const ty = (0.5 - fcYNorm) * scale * 100;
            setZoomStyle({ scale, tx, ty });
            setFaceDetected(true);

            const stepIdx = samplesRef.current.length;
            if (stepIdx < REQUIRED_SAMPLES && !capturingRef.current) {
              const conditionMet = checkCondition(fcXNorm, fcYNorm, stepIdx);
              if (conditionMet) {
                if (holdStartRef.current === null) holdStartRef.current = Date.now();
                const elapsed = Date.now() - holdStartRef.current;
                setHoldProgress(Math.min(100, (elapsed / AUTO_HOLD_MS) * 100));

                if (elapsed >= AUTO_HOLD_MS) {
                  capturingRef.current = true;
                  holdStartRef.current = null;
                  setHoldProgress(0);

                  try {
                    const { extractDescriptor } = await import("@/lib/faceApi");
                    const descriptor = await extractDescriptor(video);

                    if (descriptor) {
                      if (stepIdx === 0) baselinePosRef.current = { x: fcXNorm, y: fcYNorm };
                      const newSamples = [...samplesRef.current, descriptor];
                      samplesRef.current = newSamples;
                      setSamples(newSamples);
                      setCaptureFlash(true);
                      setTimeout(() => setCaptureFlash(false), 280);

                      if (newSamples.length >= REQUIRED_SAMPLES) {
                        alive = false;
                        if (loopRef.current) clearTimeout(loopRef.current);
                        stopCamera();
                        setCameraStep("checking");
                        // Duplicate detection
                        void (async () => {
                          let dup: string | null = null;
                          try {
                            const [fdRes, { findBestMatch }] = await Promise.all([
                              fetch("/api/employees/face-data"),
                              import("@/lib/faceApi"),
                            ]);
                            if (fdRes.ok) {
                              const all = await fdRes.json() as Array<{id: string; name: string; descriptors: number[][]}>;
                              const others = all.filter((e) => e.id !== employeeId);
                              if (others.length > 0) {
                                for (const desc of newSamples) {
                                  const match = findBestMatch(desc, others);
                                  if (match && match.distance < 0.45) { dup = match.name; break; }
                                }
                              }
                            }
                          } catch { /* ignore */ }
                          setDuplicateOf(dup);
                          setCameraStep("done");
                        })();
                        return;
                      }

                      pauseUntilRef.current = Date.now() + POST_CAPTURE_MS;
                      setStatus(`✅ Xong ${newSamples.length}/${REQUIRED_SAMPLES}!`);
                      setTimeout(() => setStatus(""), POST_CAPTURE_MS - 100);
                    } else {
                      holdStartRef.current = null;
                    }
                  } finally {
                    capturingRef.current = false;
                  }
                }
              } else {
                holdStartRef.current = null;
                setHoldProgress(0);
              }
            }
          } else {
            setZoomStyle({ scale: 1, tx: 0, ty: 0 });
            setFaceDetected(false);
            holdStartRef.current = null;
            setHoldProgress(0);
          }
        }
      } catch { /* ignore */ } finally {
        detectingRef.current = false;
        if (alive) loopRef.current = setTimeout(runDetect, 150);
      }
    };

    loopRef.current = setTimeout(runDetect, 200);
    return () => {
      alive = false;
      if (loopRef.current) clearTimeout(loopRef.current);
      detectingRef.current = false;
      holdStartRef.current = null;
      setZoomStyle({ scale: 1, tx: 0, ty: 0 });
      setFaceDetected(false);
      setHoldProgress(0);
    };
  }, [cameraStep, employeeId, stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Start camera ──────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setModelsLoading(true);
    setStatus("Đang tải AI nhận diện...");
    try {
      const { ensureModels } = await import("@/lib/faceApi");
      await ensureModels();
      setModelsLoading(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      setCameraStep("scanning");
      setStatus("");
    } catch (e) {
      setStatus(`Không mở được camera: ${e instanceof Error ? e.message : String(e)}`);
      setModelsLoading(false);
    }
  };

  // ─── QR setup ──────────────────────────────────────────────────────────────────
  const setupQR = useCallback(async () => {
    setQrPhase("loading");
    setQrError("");
    try {
      const res = await fetch("/api/face-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      if (!res.ok) { setQrError("Không tạo được link QR"); setQrPhase("ready"); return; }
      const data = await res.json() as { token: string };
      const pageUrl = `${window.location.origin}/register-face/${encodeURIComponent(data.token)}`;
      setQrPageUrl(pageUrl);

      const QRCode = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(pageUrl, {
        width: 256, margin: 2, color: { dark: "#1e3a5f", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
      setQrPhase("ready");

      // Start polling
      if (qrPollRef.current) clearInterval(qrPollRef.current);
      qrPollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/employees/${employeeId}/face`);
          const pollData = await pollRes.json() as { hasFace: boolean };
          if (pollData.hasFace) {
            clearInterval(qrPollRef.current!);
            qrPollRef.current = null;
            setQrPhase("done");
            setTimeout(() => onComplete([]), 1200);
          }
        } catch { /* ignore */ }
      }, 3000);
    } catch {
      setQrError("Lỗi tạo QR code");
      setQrPhase("ready");
    }
  }, [employeeId, onComplete]);

  // ─── Tab switch ────────────────────────────────────────────────────────────────
  const switchTab = (newTab: "camera" | "qr") => {
    if (newTab === tab) return;
    if (tab === "camera") { stopCamera(); }
    if (tab === "qr" && qrPollRef.current) { clearInterval(qrPollRef.current); qrPollRef.current = null; }
    setCameraStep("intro");
    setSamples([]); samplesRef.current = []; baselinePosRef.current = null;
    setDuplicateOf(null); setStatus(""); setHoldProgress(0);
    setTab(newTab);
    if (newTab === "qr") void setupQR();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (qrPollRef.current) clearInterval(qrPollRef.current);
    };
  }, [stopCamera]);

  const activeIdx = Math.min(samples.length, REQUIRED_SAMPLES - 1);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 text-white flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Đăng ký khuôn mặt</h2>
            <p className="text-blue-100 text-sm mt-0.5">{employeeName}</p>
          </div>
          <button onClick={onCancel} className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-blue-700 transition-colors mt-0.5" title="Đóng">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {(["camera", "qr"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "camera" ? "📷 Camera trực tiếp" : "📱 Dùng điện thoại"}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ══════════════════════════════════════════════════ CAMERA TAB */}
          {tab === "camera" && (
            <>
              {/* INTRO */}
              {cameraStep === "intro" && (
                <div className="text-center">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-gray-700 font-semibold mb-2">
                    Đăng ký {REQUIRED_SAMPLES} góc khuôn mặt tự động
                  </p>
                  <p className="text-gray-400 text-sm mb-6">
                    Hệ thống sẽ tự chụp khi nhận ra đúng góc — bạn chỉ cần xoay đầu theo hướng dẫn và giữ yên khoảng 1 giây.
                  </p>
                  {status && <p className="text-red-500 text-sm mb-4">{status}</p>}
                  <button
                    onClick={startCamera}
                    disabled={modelsLoading}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
                  >
                    {modelsLoading ? "Đang tải AI..." : "Mở camera & bắt đầu"}
                  </button>
                </div>
              )}

              {/* SCANNING */}
              {cameraStep === "scanning" && (
                <div>
                  <div
                    className="relative rounded-xl overflow-hidden bg-black mb-3 border-2 transition-colors duration-300"
                    style={{ borderColor: holdProgress > 0 ? "#facc15" : (faceDetected ? "#22c55e" : "#93c5fd") }}
                  >
                    <video
                      ref={videoRef}
                      className="w-full aspect-[4/3] object-cover block"
                      style={{
                        transformOrigin: "50% 50%",
                        transform: `translate(${-zoomStyle.tx}%, ${zoomStyle.ty}%) scale(${zoomStyle.scale}) scaleX(-1)`,
                        transition: "transform 0.5s ease",
                      }}
                      muted playsInline autoPlay
                    />
                    {captureFlash && <div className="absolute inset-0 bg-white/65 pointer-events-none z-10" />}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-32 h-40 rounded-full border-4 transition-colors duration-300 ${
                        holdProgress > 0 ? "border-yellow-400 opacity-90" :
                        faceDetected ? "border-green-400 opacity-90" : "border-blue-400 opacity-50"
                      }`} />
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        holdProgress > 0 ? "bg-yellow-500 text-white" :
                        faceDetected ? "bg-green-500 text-white" : "bg-black/50 text-white"
                      }`}>
                        {holdProgress > 0 ? "⏳ Giữ yên..." : faceDetected ? "✓ Đã nhận diện" : "🔍 Đang tìm mặt..."}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                      <div className="h-full bg-yellow-400 transition-all duration-75 rounded-r" style={{ width: `${holdProgress}%` }} />
                    </div>
                  </div>

                  <div className="flex gap-1.5 mb-3">
                    {CAPTURE_STEPS.map((s, i) => (
                      <div key={i} className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg border transition-all ${
                        i < samples.length ? "bg-green-50 border-green-200" :
                        i === activeIdx ? "bg-blue-600 border-blue-600" : "bg-gray-50 border-gray-100 opacity-40"
                      }`}>
                        <span className="text-sm leading-none">{s.icon}</span>
                        <span className={`text-[10px] font-bold leading-none ${
                          i < samples.length ? "text-green-600" : i === activeIdx ? "text-white" : "text-gray-400"
                        }`}>{i < samples.length ? "✓" : i + 1}</span>
                      </div>
                    ))}
                  </div>

                  <div className="min-h-[3.5rem] mb-4">
                    {status ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-lg border border-green-100">
                        <span className="text-green-700 font-semibold text-sm">{status}</span>
                      </div>
                    ) : samples.length < REQUIRED_SAMPLES ? (
                      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        holdProgress > 0 ? "bg-yellow-50 border border-yellow-100" :
                        faceDetected ? "bg-blue-50 border border-blue-100" : "bg-gray-50 border border-gray-100"
                      }`}>
                        <span className="text-2xl shrink-0">{CAPTURE_STEPS[activeIdx].icon}</span>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{CAPTURE_STEPS[activeIdx].label}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {holdProgress > 0 ? "Tốt! Giữ nguyên..." : faceDetected ? CAPTURE_STEPS[activeIdx].hint : "Đưa mặt vào khung hình"}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <button onClick={() => { stopCamera(); onCancel(); }} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
                    Hủy
                  </button>
                </div>
              )}

              {/* CHECKING */}
              {cameraStep === "checking" && (
                <div className="text-center py-4">
                  <div className="text-4xl mb-3 animate-spin">⚙️</div>
                  <p className="text-gray-600 font-medium">Đang kiểm tra trùng lặp...</p>
                </div>
              )}

              {/* DONE */}
              {cameraStep === "done" && (
                <div className="text-center">
                  {duplicateOf ? (
                    <>
                      <div className="text-5xl mb-3">⚠️</div>
                      <p className="text-amber-700 font-bold mb-1">Khuôn mặt trùng lặp!</p>
                      <p className="text-gray-600 text-sm mb-5">
                        Khuôn mặt này có vẻ đã được đăng ký cho <strong>{duplicateOf}</strong>.<br />
                        Mỗi nhân viên phải có khuôn mặt riêng.
                      </p>
                      <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
                        <button
                          onClick={() => { setSamples([]); samplesRef.current = []; baselinePosRef.current = null; setDuplicateOf(null); setCameraStep("intro"); }}
                          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                        >Thử lại</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">🎉</div>
                      <p className="text-gray-800 font-semibold mb-2">Đã chụp đủ {REQUIRED_SAMPLES} góc khuôn mặt!</p>
                      <p className="text-gray-500 text-sm mb-6">Bấm Hoàn tất để lưu khuôn mặt cho {employeeName}.</p>
                      <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
                        <button onClick={() => onComplete(samples)} className="flex-[2] py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700">
                          ✅ Hoàn tất & Lưu
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════ QR TAB */}
          {tab === "qr" && (
            <div className="text-center">
              {qrPhase === "loading" && (
                <div className="py-8">
                  <div className="text-4xl mb-3 animate-spin">⚙️</div>
                  <p className="text-gray-500 text-sm">Đang tạo QR code...</p>
                </div>
              )}

              {qrPhase === "ready" && (
                <>
                  {qrError ? (
                    <p className="text-red-500 text-sm py-4">{qrError}</p>
                  ) : (
                    <>
                      <p className="text-gray-700 font-semibold mb-1">Quét mã bằng điện thoại</p>
                      <p className="text-gray-400 text-xs mb-4">
                        Mở camera điện thoại, quét mã này → đăng ký khuôn mặt trực tiếp trên điện thoại
                      </p>
                      {qrDataUrl && (
                        <div className="inline-block rounded-xl overflow-hidden border border-gray-100 shadow-sm mb-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qrDataUrl} alt="QR Code" width={200} height={200} />
                        </div>
                      )}
                      <p className="text-gray-400 text-[11px] mb-4">Hiệu lực 20 phút · Đang chờ quét...</p>
                      <div className="flex items-center justify-center gap-2 text-blue-600 text-sm mb-4">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span>Tự động cập nhật khi xong</span>
                      </div>
                      {qrPageUrl && (
                        <p className="text-gray-300 text-[10px] break-all px-2">{qrPageUrl}</p>
                      )}
                    </>
                  )}
                  <button onClick={onCancel} className="w-full mt-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
                    Hủy
                  </button>
                </>
              )}

              {qrPhase === "done" && (
                <>
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-gray-800 font-bold mb-1">Đăng ký thành công!</p>
                  <p className="text-gray-500 text-sm">Khuôn mặt của {employeeName} đã được lưu từ điện thoại.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
