"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Props {
  employeeName: string;
  onComplete: (descriptors: number[][]) => void;
  onCancel: () => void;
}

const REQUIRED_SAMPLES = 5;

const CAPTURE_STEPS = [
  { icon: "😐", label: "Nhìn thẳng vào camera" },
  { icon: "⬅️", label: "Quay mặt sang trái nhẹ (~15°)" },
  { icon: "➡️", label: "Quay mặt sang phải nhẹ (~15°)" },
  { icon: "⬆️", label: "Ngẩng đầu lên nhẹ" },
  { icon: "⬇️", label: "Cúi đầu xuống nhẹ" },
];

export default function FaceCapture({ employeeName, onComplete, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectingRef = useRef(false);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [step, setStep] = useState<"intro" | "camera" | "done">("intro");
  const [samples, setSamples] = useState<number[][]>([]);
  const [status, setStatus] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ scale: 1, tx: 0, ty: 0 });

  // Gán stream sau khi video element mount (step = "camera")
  useEffect(() => {
    if (step === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [step]);

  // Vòng lặp auto-zoom: detect mặt liên tục, tính scale + translate
  useEffect(() => {
    if (step !== "camera") return;

    let alive = true;

    const runDetect = async () => {
      if (!alive || detectingRef.current) {
        if (alive) loopRef.current = setTimeout(runDetect, 500);
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        if (alive) loopRef.current = setTimeout(runDetect, 300);
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
            // Mục tiêu: chiều cao mặt chiếm ~55% frame
            const scale = Math.max(1, Math.min(3.0, (vH * 0.55) / box.height));
            // translate(tx%, ty%) + scale(S) với transform-origin 50% 50%
            // Công thức: kéo face center về giữa display
            const tx = (0.5 - fcX / vW) * scale * 100;
            const ty = (0.5 - fcY / vH) * scale * 100;
            setZoomStyle({ scale, tx, ty });
            setFaceDetected(true);
          } else {
            setZoomStyle({ scale: 1, tx: 0, ty: 0 });
            setFaceDetected(false);
          }
        }
      } catch {
        // ignore detection errors during loop
      } finally {
        detectingRef.current = false;
        if (alive) loopRef.current = setTimeout(runDetect, 600);
      }
    };

    loopRef.current = setTimeout(runDetect, 300);

    return () => {
      alive = false;
      if (loopRef.current) clearTimeout(loopRef.current);
      detectingRef.current = false;
      setZoomStyle({ scale: 1, tx: 0, ty: 0 });
      setFaceDetected(false);
    };
  }, [step]);

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
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`Không mở được camera: ${msg}`);
      setModelsLoading(false);
    }
  };

  const captureOne = async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);
    setStatus("Đang nhận diện khuôn mặt...");

    try {
      const { extractDescriptor } = await import("@/lib/faceApi");
      const descriptor = await extractDescriptor(videoRef.current);

      if (!descriptor) {
        setStatus("⚠️ Không thấy khuôn mặt. Nhìn thẳng vào camera, đủ ánh sáng rồi thử lại.");
        setCapturing(false);
        return;
      }

      const newSamples = [...samples, descriptor];
      setSamples(newSamples);

      if (newSamples.length >= REQUIRED_SAMPLES) {
        setStep("done");
        stopCamera();
      } else {
        // Flash thông báo chụp thành công rồi tự xóa để hiện hướng dẫn bước tiếp
        setStatus(`✅ Lưu ảnh ${newSamples.length}/${REQUIRED_SAMPLES}`);
        setTimeout(() => setStatus(""), 1200);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`Lỗi: ${msg}`);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 text-white">
          <h2 className="text-lg font-bold">Đăng ký khuôn mặt</h2>
          <p className="text-blue-100 text-sm mt-0.5">{employeeName}</p>
        </div>

        <div className="p-6">
          {/* INTRO */}
          {step === "intro" && (
            <div className="text-center">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-600 mb-2 font-medium">
                Chụp {REQUIRED_SAMPLES} ảnh khuôn mặt để đăng ký
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Camera sẽ tự động zoom vào khuôn mặt — mỗi ảnh thay đổi góc nhẹ
                (thẳng, trái, phải, lên, xuống) để tăng độ chính xác.
              </p>
              {status && <p className="text-red-500 text-sm mb-4">{status}</p>}
              <button
                onClick={startCamera}
                disabled={modelsLoading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {modelsLoading ? "Đang tải AI..." : "Mở camera"}
              </button>
            </div>
          )}

          {/* CAMERA */}
          {step === "camera" && (
            <div>
              {/* Video container với auto-zoom */}
              <div
                className="relative rounded-xl overflow-hidden bg-black mb-4 border-2 transition-colors duration-300"
                style={{ borderColor: faceDetected ? "#22c55e" : "#93c5fd" }}
              >
                <video
                  ref={videoRef}
                  className="w-full aspect-[4/3] object-cover block"
                  style={{
                    transformOrigin: "50% 50%",
                    transform: `translate(${zoomStyle.tx}%, ${zoomStyle.ty}%) scale(${zoomStyle.scale})`,
                    transition: "transform 0.5s ease",
                  }}
                  muted
                  playsInline
                  autoPlay
                />

                {/* Oval face guide — luôn ở giữa, face sẽ được zoom vào đây */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`w-32 h-40 rounded-full border-4 transition-colors duration-300 ${
                      faceDetected
                        ? "border-green-400 opacity-90"
                        : "border-blue-400 opacity-60"
                    }`}
                  />
                </div>

                {/* Badge trạng thái */}
                <div className="absolute top-2 right-2 pointer-events-none">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                      faceDetected
                        ? "bg-green-500 text-white"
                        : "bg-black/50 text-white"
                    }`}
                  >
                    {faceDetected ? "✓ Đã nhận diện mặt" : "🔍 Đang tìm mặt..."}
                  </span>
                </div>
              </div>

              {/* Progress steps với hướng dẫn */}
              <div className="flex gap-1.5 mb-3">
                {CAPTURE_STEPS.map((s, i) => (
                  <div
                    key={i}
                    className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all border ${
                      i < samples.length
                        ? "bg-blue-50 border-blue-200 opacity-60"
                        : i === samples.length
                        ? "bg-blue-600 border-blue-600 shadow-sm"
                        : "bg-gray-50 border-gray-100 opacity-40"
                    }`}
                  >
                    <span className="text-sm leading-none">{s.icon}</span>
                    <span
                      className={`text-[10px] font-medium leading-tight text-center px-0.5 ${
                        i === samples.length ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {i < samples.length ? "✓" : i + 1}
                    </span>
                  </div>
                ))}
              </div>

              {/* Hướng dẫn bước hiện tại */}
              <div className="mb-4 min-h-[2.5rem]">
                {status ? (
                  <p className="text-xs text-center text-gray-500">{status}</p>
                ) : samples.length < REQUIRED_SAMPLES ? (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${faceDetected ? "bg-blue-50" : "bg-gray-50"}`}>
                    <span className="text-xl shrink-0">{CAPTURE_STEPS[samples.length].icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        Ảnh {samples.length + 1}/{REQUIRED_SAMPLES}: {CAPTURE_STEPS[samples.length].label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {faceDetected ? "Khuôn mặt đã zoom — nhấn Chụp" : "Đưa mặt vào khung hình"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    stopCamera();
                    onCancel();
                  }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={captureOne}
                  disabled={capturing}
                  className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-60 hover:bg-blue-700"
                >
                  {capturing ? "Đang xử lý..." : `📸 Chụp (${samples.length}/${REQUIRED_SAMPLES})`}
                </button>
              </div>
            </div>
          )}

          {/* DONE */}
          {step === "done" && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-gray-800 font-semibold mb-2">
                Đã chụp đủ {REQUIRED_SAMPLES} ảnh!
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
