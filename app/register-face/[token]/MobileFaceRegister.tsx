"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Props {
  token: string;
  employeeName: string;
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

export default function MobileFaceRegister({ token, employeeName }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectingRef = useRef(false);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const pauseUntilRef = useRef<number>(0);
  const samplesRef = useRef<number[][]>([]);
  const baselinePosRef = useRef<{ x: number; y: number } | null>(null);
  const capturingRef = useRef(false);

  const [phase, setPhase] = useState<"intro" | "camera" | "submitting" | "done" | "error">("intro");
  const [samples, setSamples] = useState<number[][]>([]);
  const [faceDetected, setFaceDetected] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ scale: 1, tx: 0, ty: 0 });
  const [holdProgress, setHoldProgress] = useState(0);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [status, setStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => { samplesRef.current = samples; }, [samples]);

  useEffect(() => {
    if (phase === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

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

  useEffect(() => {
    if (phase !== "camera") return;
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
                      setTimeout(() => setCaptureFlash(false), 250);

                      if (newSamples.length >= REQUIRED_SAMPLES) {
                        stopCamera();
                        submitFace(newSamples);
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
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const submitFace = async (descriptors: number[][]) => {
    setPhase("submitting");
    try {
      const res = await fetch("/api/register-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, descriptors }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { setErrorMsg(data.error ?? "Lỗi lưu khuôn mặt"); setPhase("error"); return; }
      setPhase("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Lỗi kết nối");
      setPhase("error");
    }
  };

  const startCamera = async () => {
    setModelsLoading(true);
    try {
      const { ensureModels } = await import("@/lib/faceApi");
      await ensureModels();
      setModelsLoading(false);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      setPhase("camera");
    } catch (e) {
      setErrorMsg(`Không mở được camera: ${e instanceof Error ? e.message : String(e)}`);
      setModelsLoading(false);
      setPhase("error");
    }
  };

  const activeIdx = Math.min(samples.length, REQUIRED_SAMPLES - 1);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-white">
      {/* Header */}
      <div className="bg-blue-700 px-5 py-4">
        <p className="text-blue-200 text-xs font-medium uppercase tracking-widest">Đăng ký khuôn mặt</p>
        <h1 className="text-lg font-bold mt-0.5">{employeeName}</h1>
      </div>

      <div className="flex-1 flex flex-col p-5">
        {/* INTRO */}
        {phase === "intro" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-5">📷</div>
            <h2 className="text-xl font-bold mb-2">Sẵn sàng chụp khuôn mặt</h2>
            <p className="text-slate-400 text-sm mb-8">
              Hệ thống sẽ tự chụp 5 góc — bạn chỉ cần xoay đầu theo hướng dẫn và giữ yên ~1 giây.
            </p>
            <button
              onClick={startCamera}
              disabled={modelsLoading}
              className="w-full max-w-xs py-4 bg-blue-600 rounded-2xl font-bold text-lg disabled:opacity-60"
            >
              {modelsLoading ? "Đang tải AI..." : "Bắt đầu →"}
            </button>
          </div>
        )}

        {/* CAMERA */}
        {phase === "camera" && (
          <div className="flex-1 flex flex-col">
            {/* Video */}
            <div
              className="relative rounded-2xl overflow-hidden border-2 transition-colors mb-3"
              style={{ borderColor: holdProgress > 0 ? "#facc15" : (faceDetected ? "#22c55e" : "#60a5fa") }}
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
              {captureFlash && <div className="absolute inset-0 bg-white/60 z-10 pointer-events-none" />}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-32 h-40 rounded-full border-4 transition-colors ${
                  holdProgress > 0 ? "border-yellow-400" : faceDetected ? "border-green-400 opacity-80" : "border-blue-400 opacity-40"
                }`} />
              </div>
              <div className="absolute top-2 right-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  holdProgress > 0 ? "bg-yellow-500 text-white" :
                  faceDetected ? "bg-green-500 text-white" : "bg-black/50 text-white"
                }`}>
                  {holdProgress > 0 ? "⏳ Giữ yên..." : faceDetected ? "✓ Nhận diện được" : "🔍 Tìm mặt..."}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                <div className="h-full bg-yellow-400 transition-all duration-75" style={{ width: `${holdProgress}%` }} />
              </div>
            </div>

            {/* Steps */}
            <div className="flex gap-1.5 mb-3">
              {CAPTURE_STEPS.map((s, i) => (
                <div key={i} className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg border transition-all ${
                  i < samples.length ? "bg-green-900/40 border-green-700" :
                  i === activeIdx ? "bg-blue-600 border-blue-500" : "bg-slate-800 border-slate-700 opacity-40"
                }`}>
                  <span className="text-sm leading-none">{s.icon}</span>
                  <span className={`text-[10px] font-bold ${i < samples.length ? "text-green-400" : i === activeIdx ? "text-white" : "text-slate-500"}`}>
                    {i < samples.length ? "✓" : i + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Instruction */}
            <div className="min-h-[3rem]">
              {status ? (
                <div className="bg-green-900/40 border border-green-700 rounded-xl px-3 py-2 text-green-300 text-sm font-semibold">{status}</div>
              ) : samples.length < REQUIRED_SAMPLES ? (
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${holdProgress > 0 ? "bg-yellow-900/40 border border-yellow-700" : "bg-slate-800 border border-slate-700"}`}>
                  <span className="text-xl shrink-0">{CAPTURE_STEPS[activeIdx].icon}</span>
                  <div>
                    <p className="font-bold text-sm">{CAPTURE_STEPS[activeIdx].label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {holdProgress > 0 ? "Giữ nguyên..." : faceDetected ? CAPTURE_STEPS[activeIdx].hint : "Đưa mặt vào khung hình"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* SUBMITTING */}
        {phase === "submitting" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4 animate-spin">⚙️</div>
            <p className="text-lg font-semibold">Đang lưu khuôn mặt...</p>
            <p className="text-slate-400 text-sm mt-1">Vui lòng chờ</p>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">Đăng ký thành công!</h2>
            <p className="text-slate-400 text-sm mb-2">Khuôn mặt của <span className="text-white font-semibold">{employeeName}</span> đã được lưu.</p>
            <p className="text-slate-500 text-xs">Bạn có thể đóng trang này.</p>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold mb-2">Có lỗi xảy ra</h2>
            <p className="text-red-400 text-sm mb-6">{errorMsg}</p>
            <button onClick={() => { setPhase("intro"); setErrorMsg(""); setSamples([]); samplesRef.current = []; baselinePosRef.current = null; }}
              className="px-6 py-3 bg-blue-600 rounded-xl font-semibold">
              Thử lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
