"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Props {
  employeeName: string;
  onComplete: (descriptors: number[][]) => void;
  onCancel: () => void;
}

const REQUIRED_SAMPLES = 5;
const AUTO_HOLD_MS = 500; // giữ đúng vị trí bao lâu thì tự chụp
const POST_CAPTURE_MS = 1000; // nghỉ sau khi chụp trước khi detect bước tiếp

const CAPTURE_STEPS = [
  { icon: "😐", label: "Nhìn thẳng vào camera", hint: "Nhìn thẳng và giữ yên" },
  { icon: "⬅️", label: "Quay nhẹ sang TRÁI ←", hint: "Quay đầu sang trái của bạn" },
  { icon: "➡️", label: "Quay nhẹ sang PHẢI →", hint: "Quay đầu sang phải của bạn" },
  { icon: "⬆️", label: "Ngẩng đầu lên ↑", hint: "Ngẩng đầu nhẹ lên trên" },
  { icon: "⬇️", label: "Cúi đầu xuống ↓", hint: "Cúi đầu nhẹ xuống dưới" },
];

export default function FaceCapture({ employeeName, onComplete, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectingRef = useRef(false);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const pauseUntilRef = useRef<number>(0);
  const samplesRef = useRef<number[][]>([]);
  const baselinePosRef = useRef<{ x: number; y: number } | null>(null);
  const capturingRef = useRef(false);

  const [step, setStep] = useState<"intro" | "camera" | "done">("intro");
  const [samples, setSamples] = useState<number[][]>([]);
  const [status, setStatus] = useState("");
  const [modelsLoading, setModelsLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ scale: 1, tx: 0, ty: 0 });
  const [holdProgress, setHoldProgress] = useState(0);
  const [captureFlash, setCaptureFlash] = useState(false);

  // samplesRef theo dõi state để dùng trong closure
  useEffect(() => { samplesRef.current = samples; }, [samples]);

  // Gán stream sau khi video element mount
  useEffect(() => {
    if (step === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step]);

  // Kiểm tra điều kiện tự chụp theo bước hiện tại (tọa độ raw video, không mirror)
  const checkCondition = (fcXNorm: number, fcYNorm: number, stepIdx: number): boolean => {
    const bl = baselinePosRef.current;
    switch (stepIdx) {
      case 0: // Thẳng — gần giữa màn hình
        return fcXNorm > 0.35 && fcXNorm < 0.65 && fcYNorm > 0.28 && fcYNorm < 0.72;
      case 1: // Trái (hiển thị trái = raw phải vì mirror) → fcXNorm tăng
        return bl !== null && fcXNorm > bl.x + 0.10;
      case 2: // Phải (hiển thị phải = raw trái) → fcXNorm giảm
        return bl !== null && fcXNorm < bl.x - 0.10;
      case 3: // Ngẩng lên → fcYNorm giảm
        return bl !== null && fcYNorm < bl.y - 0.08;
      case 4: // Cúi xuống → fcYNorm tăng
        return bl !== null && fcYNorm > bl.y + 0.08;
      default:
        return false;
    }
  };

  // Vòng lặp detect + auto-zoom + auto-capture
  useEffect(() => {
    if (step !== "camera") return;

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
                const progress = Math.min(100, (elapsed / AUTO_HOLD_MS) * 100);
                setHoldProgress(progress);

                if (elapsed >= AUTO_HOLD_MS) {
                  // Đủ thời gian → tự chụp
                  capturingRef.current = true;
                  holdStartRef.current = null;
                  setHoldProgress(0);

                  try {
                    const { extractDescriptor } = await import("@/lib/faceApi");
                    const descriptor = await extractDescriptor(video);

                    if (descriptor) {
                      if (stepIdx === 0) {
                        baselinePosRef.current = { x: fcXNorm, y: fcYNorm };
                      }
                      const newSamples = [...samplesRef.current, descriptor];
                      samplesRef.current = newSamples;
                      setSamples(newSamples);

                      // Flash trắng ngắn
                      setCaptureFlash(true);
                      setTimeout(() => setCaptureFlash(false), 280);

                      if (newSamples.length >= REQUIRED_SAMPLES) {
                        stopCamera();
                        setStep("done");
                        return;
                      }

                      // Báo thành công + dừng detect để user đổi góc
                      pauseUntilRef.current = Date.now() + POST_CAPTURE_MS;
                      setStatus(`✅ Xong ${newSamples.length}/${REQUIRED_SAMPLES}!`);
                      setTimeout(() => setStatus(""), POST_CAPTURE_MS - 100);
                    } else {
                      setStatus("Không thấy mặt rõ, thử lại...");
                      setTimeout(() => setStatus(""), 1500);
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
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

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
      setStep("camera");
      setStatus("");
    } catch (e) {
      setStatus(`Không mở được camera: ${e instanceof Error ? e.message : String(e)}`);
      setModelsLoading(false);
    }
  };

  const activeIdx = Math.min(samples.length, REQUIRED_SAMPLES - 1);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 px-6 py-4 text-white">
          <h2 className="text-lg font-bold">Đăng ký khuôn mặt</h2>
          <p className="text-blue-100 text-sm mt-0.5">{employeeName}</p>
        </div>

        <div className="p-6">
          {/* INTRO */}
          {step === "intro" && (
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

          {/* CAMERA */}
          {step === "camera" && (
            <div>
              {/* Video */}
              <div
                className="relative rounded-xl overflow-hidden bg-black mb-3 border-2 transition-colors duration-300"
                style={{
                  borderColor: holdProgress > 0 ? "#facc15" : (faceDetected ? "#22c55e" : "#93c5fd"),
                }}
              >
                <video
                  ref={videoRef}
                  className="w-full aspect-[4/3] object-cover block"
                  style={{
                    transformOrigin: "50% 50%",
                    // Mirror như gương selfie — trái/phải trực quan với người dùng
                    transform: `translate(${-zoomStyle.tx}%, ${zoomStyle.ty}%) scale(${zoomStyle.scale}) scaleX(-1)`,
                    transition: "transform 0.5s ease",
                  }}
                  muted
                  playsInline
                  autoPlay
                />

                {/* Flash trắng khi chụp */}
                {captureFlash && (
                  <div className="absolute inset-0 bg-white/65 pointer-events-none z-10" />
                )}

                {/* Oval guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-32 h-40 rounded-full border-4 transition-colors duration-300 ${
                    holdProgress > 0 ? "border-yellow-400 opacity-90" :
                    faceDetected ? "border-green-400 opacity-90" : "border-blue-400 opacity-50"
                  }`} />
                </div>

                {/* Badge */}
                <div className="absolute top-2 right-2 pointer-events-none">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    holdProgress > 0 ? "bg-yellow-500 text-white" :
                    faceDetected ? "bg-green-500 text-white" : "bg-black/50 text-white"
                  }`}>
                    {holdProgress > 0 ? "⏳ Giữ yên..." :
                     faceDetected ? "✓ Đã nhận diện" : "🔍 Đang tìm mặt..."}
                  </span>
                </div>

                {/* Progress bar đáy video */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-75 rounded-r"
                    style={{ width: `${holdProgress}%` }}
                  />
                </div>
              </div>

              {/* Step bubbles */}
              <div className="flex gap-1.5 mb-3">
                {CAPTURE_STEPS.map((s, i) => (
                  <div
                    key={i}
                    className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg border transition-all ${
                      i < samples.length
                        ? "bg-green-50 border-green-200"
                        : i === activeIdx
                        ? "bg-blue-600 border-blue-600"
                        : "bg-gray-50 border-gray-100 opacity-40"
                    }`}
                  >
                    <span className="text-sm leading-none">{s.icon}</span>
                    <span className={`text-[10px] font-bold leading-none ${
                      i < samples.length ? "text-green-600" :
                      i === activeIdx ? "text-white" : "text-gray-400"
                    }`}>
                      {i < samples.length ? "✓" : i + 1}
                    </span>
                  </div>
                ))}
              </div>

              {/* Hướng dẫn bước hiện tại */}
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
                        {holdProgress > 0
                          ? "Tốt! Giữ nguyên..."
                          : faceDetected
                          ? CAPTURE_STEPS[activeIdx].hint
                          : "Đưa mặt vào khung hình"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                onClick={() => { stopCamera(); onCancel(); }}
                className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          )}

          {/* DONE */}
          {step === "done" && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-gray-800 font-semibold mb-2">
                Đã chụp đủ {REQUIRED_SAMPLES} góc khuôn mặt!
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Bấm Hoàn tất để lưu khuôn mặt cho {employeeName}.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={() => onComplete(samples)}
                  className="flex-[2] py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
                >
                  ✅ Hoàn tất & Lưu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
