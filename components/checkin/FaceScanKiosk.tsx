"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import type { EmployeeFaceData } from "@/lib/faceApi";
import { speakVi, playStatic, playCompanyAudio, unlockAudio } from "@/lib/speech";
import { Clock, UserCircle, Cpu, Camera, ScanFace, CheckCircle2, AlertTriangle, UserX, HelpCircle, LogOut } from "lucide-react";

type Phase =
  | "welcome"
  | "loading"
  | "camera"
  | "scanning"
  | "success"
  | "no_face"
  | "no_match"
  | "error";

interface CheckInResult {
  action: "check_in" | "check_out";
  status: string;
  minutesLate: number;
  penaltyAmount: number;
  message: string;
  employeeName: string;
}

interface KioskMessages {
  welcome?: string;
  checkinOntime?: string; // placeholder: {name}
  checkinLate?: string;   // placeholder: {name}, {minutes}
  checkout?: string;      // placeholder: {name}
}

interface Props {
  company: { name: string; slug: string };
  employees: EmployeeFaceData[];
  messages?: KioskMessages;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function FaceScanKiosk({ company, employees, messages }: Props) {
  // Resolve messages — dùng custom nếu có, fallback về default
  const msg = {
    welcome:
      messages?.welcome ??
      `Chào mừng đến với ${company.name}! Vui lòng quét khuôn mặt để điểm danh.`,
    checkinOntime:
      messages?.checkinOntime ??
      `Cảm ơn {name}! Chúc bạn có một ngày làm việc tràn đầy năng lượng!`,
    checkinLate:
      messages?.checkinLate ??
      `Cảm ơn {name}. Bạn trễ {minutes} phút hôm nay, chú ý giờ giấc nhé!`,
    checkout:
      messages?.checkout ?? `Hẹn gặp lại {name}! Chúc bạn một buổi nghỉ thật vui!`,
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const detectingRef = useRef(false);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>("welcome");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [modelsReady, setModelsReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ scale: 1, tx: 0, ty: 0 });

  // Cancel speech khi unmount
  useEffect(() => () => { speakVi(""); window.speechSynthesis?.cancel(); }, []);

  // Đồng hồ realtime
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load + warmup models AI ngầm khi trang load
  useEffect(() => {
    import("@/lib/faceApi").then(({ ensureModels }) => {
      ensureModels().then(() => setModelsReady(true)).catch(() => {});
    });
  }, []);

  // Phát welcome khi load (kiosk mode) — trình duyệt thường chặn, bat file thì OK
  useEffect(() => {
    const t = setTimeout(() => {
      playCompanyAudio(company.slug, "welcome.mp3");
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Giọng nói khi check-in/out thành công ───────────────────────────────
  // AudioContext đã được unlock từ lần click trước → play hoạt động dù sau async 5 giây
  useEffect(() => {
    if (phase === "success" && result) {
      const fill = (tpl: string) =>
        tpl
          .replace("{name}", result.employeeName)
          .replace("{minutes}", String(result.minutesLate));

      if (result.action === "check_in") {
        if (result.status === "on_time") {
          // Phát file theo công ty (có lời chúc riêng), sau đó đọc tên nhân viên
          playCompanyAudio(company.slug, "checkin_ontime.mp3").then(() =>
            speakVi(`Cảm ơn ${result.employeeName}!`)
          );
        } else {
          playCompanyAudio(company.slug, "checkin_late.mp3").then(() =>
            speakVi(`Cảm ơn ${result.employeeName}. Bạn trễ ${result.minutesLate} phút hôm nay.`)
          );
        }
      } else {
        playCompanyAudio(company.slug, "checkout.mp3").then(() =>
          speakVi(`Hẹn gặp lại ${result.employeeName}!`)
        );
      }
    }
  }, [phase, result]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown tự reset về welcome
  useEffect(() => {
    if (!["success", "no_face", "no_match", "error"].includes(phase)) return;
    let c = 5;
    setCountdown(c);
    const t = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) { clearInterval(t); resetToWelcome(); }
    }, 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Gán stream vào video element SAU KHI phase = "camera" (video đã mount)
  useEffect(() => {
    if (phase === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  // Auto-zoom: detect mặt liên tục khi camera đang chạy
  useEffect(() => {
    if (phase !== "camera") return;

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
            const scale = Math.max(1, Math.min(3.0, (vH * 0.55) / box.height));
            const tx = (0.5 - fcX / vW) * scale * 100;
            const ty = (0.5 - fcY / vH) * scale * 100;
            setZoomStyle({ scale, tx, ty });
            setFaceDetected(true);
          } else {
            setZoomStyle({ scale: 1, tx: 0, ty: 0 });
            setFaceDetected(false);
          }
        }
      } catch { /* ignore */ } finally {
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
  }, [phase]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const resetToWelcome = useCallback(() => {
    stopCamera();
    setPhase("welcome");
    setResult(null);
    setErrorMsg("");
  }, [stopCamera]);

  const startCamera = async () => {
    // Unlock AudioContext ngay trong user click handler (1 lần duy nhất)
    unlockAudio();
    // Phát welcome theo công ty: thử /audio/{slug}/welcome.mp3 trước, fallback về chung
    playCompanyAudio(company.slug, "welcome.mp3");

    if (!modelsReady) {
      setPhase("loading");
      try {
        const { ensureModels } = await import("@/lib/faceApi");
        await ensureModels();
        setModelsReady(true);
      } catch (e) {
        setErrorMsg(`Không thể tải AI: ${e instanceof Error ? e.message : String(e)}`);
        setPhase("error");
        return;
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      setPhase("camera");
    } catch (e) {
      setErrorMsg(`Không mở được camera: ${e instanceof Error ? e.message : String(e)}`);
      setPhase("error");
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || phase !== "camera") return;

    // Capture frame VÀO canvas TRƯỚC KHI đổi phase (video unmounts sau setPhase)
    const { captureFrame } = await import("@/lib/faceApi");
    const frame = captureFrame(videoRef.current);

    stopCamera();
    setPhase("scanning");

    try {
      const { extractDescriptor, findBestMatch } = await import("@/lib/faceApi");
      const descriptor = await extractDescriptor(frame);

      if (!descriptor) {
        playStatic("/audio/no_face.mp3");
        setPhase("no_face");
        return;
      }

      const registeredEmployees = employees.filter((e) => e.descriptors.length > 0);
      if (registeredEmployees.length === 0) {
        setErrorMsg("Chưa có nhân viên nào đăng ký khuôn mặt.");
        setPhase("error");
        return;
      }

      const match = findBestMatch(descriptor, registeredEmployees);
      if (!match) {
        playStatic("/audio/no_match.mp3");
        setPhase("no_match");
        return;
      }

      const res = await fetch("/api/attendance/checkin-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: match.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Lỗi check-in");
        setPhase("error");
        return;
      }

      setResult({ ...data, employeeName: match.name });
      setPhase("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(`Lỗi nhận diện: ${msg}`);
      setPhase("error");
    }
  };

  const timeStr = currentTime.toLocaleTimeString("vi-VN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const dateStr = currentTime.toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <div className="kiosk-mode min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-blue-300 text-sm font-medium uppercase tracking-widest">
            <Clock size={14} /> Timio
          </div>
          <div className="text-white text-lg font-bold mt-0.5">{company.name}</div>
        </div>
        <div className="text-right">
          <div className="text-white text-3xl font-mono font-bold">{timeStr}</div>
          <div className="text-blue-300 text-sm capitalize">{dateStr}</div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">

        {/* WELCOME */}
        {phase === "welcome" && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <UserCircle size={96} strokeWidth={1} className="text-blue-300/60" />
            </div>
            <h2 className="text-white text-3xl font-bold mb-2">Chào mừng!</h2>
            <p className="text-blue-200 text-lg mb-10">Bấm nút bên dưới để quét mặt check in</p>
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-3 px-10 py-5 bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white text-xl font-bold rounded-2xl shadow-2xl transition-all transform hover:scale-105 active:scale-95"
            >
              <Camera size={24} /> Quét mặt để check in
            </button>
            <p className="text-blue-400 text-sm mt-4 flex items-center justify-center gap-1.5">
              {modelsReady
                ? <><CheckCircle2 size={14} className="text-green-400" /> AI sẵn sàng — {employees.filter((e) => e.descriptors.length > 0).length} nhân viên đã đăng ký</>
                : "Đang tải AI nhận diện..."}
            </p>
          </div>
        )}

        {/* LOADING MODELS */}
        {phase === "loading" && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Cpu size={72} strokeWidth={1} className="text-blue-300 animate-pulse" />
            </div>
            <p className="text-white text-xl font-semibold">Đang tải AI nhận diện...</p>
            <p className="text-blue-300 mt-2 text-sm">Lần đầu mất ~10 giây, sau đó rất nhanh</p>
          </div>
        )}

        {/* CAMERA */}
        {phase === "camera" && (
          <div className="w-full max-w-sm">
            <p className="text-blue-200 text-center mb-4 font-medium">
              {faceDetected ? "Khuôn mặt đã zoom — bấm Chụp khi sẵn sàng" : "Đưa mặt vào khung hình"}
            </p>
            <div
              className="relative rounded-2xl overflow-hidden shadow-2xl bg-black border-4 transition-colors duration-300"
              style={{ borderColor: faceDetected ? "#22c55e" : "#60a5fa" }}
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
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-40 h-52 border-4 rounded-full transition-colors duration-300 ${
                  faceDetected ? "border-green-400 opacity-80" : "border-blue-400 opacity-50"
                }`} />
              </div>
              {/* Badge */}
              <div className="absolute top-2 right-2 pointer-events-none">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  faceDetected ? "bg-green-500 text-white" : "bg-black/50 text-white"
                }`}>
                  {faceDetected ? "✓ Đã nhận diện mặt" : "Đang tìm mặt..."}
                </span>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={resetToWelcome}
                className="flex-1 py-4 border border-white/20 text-white rounded-xl font-medium hover:bg-white/10 text-base"
              >
                Hủy
              </button>
              <button
                onClick={handleCapture}
                className="flex-[2] py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
              >
                <Camera size={20} /> Chụp & Check In
              </button>
            </div>
          </div>
        )}

        {/* SCANNING */}
        {phase === "scanning" && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <ScanFace size={80} strokeWidth={1} className="text-blue-300 animate-pulse" />
            </div>
            <p className="text-white text-xl font-semibold">Đang nhận diện khuôn mặt...</p>
            <p className="text-blue-300 mt-2">Vui lòng chờ</p>
          </div>
        )}

        {/* SUCCESS */}
        {phase === "success" && result && (
          <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-center border border-white/20">
            <div className="flex justify-center mb-4">
              {result.action === "check_out"
                ? <LogOut size={72} strokeWidth={1} className="text-blue-300" />
                : result.status === "on_time"
                ? <CheckCircle2 size={72} strokeWidth={1} className="text-green-400" />
                : <AlertTriangle size={72} strokeWidth={1} className="text-yellow-400" />}
            </div>
            <h2 className="text-white text-2xl font-bold mb-1">{result.employeeName}</h2>
            <div className="text-blue-200 text-base mb-4">
              {result.action === "check_in" ? "VÀO CA" : "RA CA"} lúc{" "}
              <span className="text-white font-mono font-bold">
                {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
            </div>

            {/* Trạng thái check-in */}
            {result.action === "check_in" && result.status === "on_time" && (
              <div className="bg-green-500/20 text-green-300 rounded-xl px-4 py-3 font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 size={18} /> Đúng giờ — Tốt lắm!
              </div>
            )}
            {result.action === "check_in" && (result.status === "late" || result.status === "very_late") && (
              <div className="bg-red-500/20 rounded-xl px-4 py-3">
                <div className="text-yellow-300 font-semibold flex items-center justify-center gap-1.5"><AlertTriangle size={16} /> Trễ {result.minutesLate} phút</div>
                {result.penaltyAmount > 0 && (
                  <div className="text-red-300 font-bold mt-1 text-lg">
                    Trừ {formatCurrency(result.penaltyAmount)}
                  </div>
                )}
              </div>
            )}

            {/* Trạng thái check-out — chỉ chúc, không hiện phạt */}
            {result.action === "check_out" && (
              <div className="bg-blue-500/20 text-blue-200 rounded-xl px-4 py-3 font-semibold">
                Chúc bạn có một thời gian tuyệt vời!
              </div>
            )}

            <p className="text-blue-400 text-sm mt-5">Tự động đóng sau {countdown}s</p>
          </div>
        )}

        {/* NO FACE */}
        {phase === "no_face" && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <UserX size={72} strokeWidth={1} className="text-blue-300/60" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Không thấy khuôn mặt</h2>
            <p className="text-blue-200 mb-6">Vui lòng nhìn thẳng vào camera, đủ ánh sáng</p>
            <p className="text-blue-400 text-sm">Thử lại sau {countdown}s...</p>
          </div>
        )}

        {/* NO MATCH */}
        {phase === "no_match" && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <HelpCircle size={72} strokeWidth={1} className="text-blue-300/60" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Không nhận ra</h2>
            <p className="text-blue-200 mb-2">Khuôn mặt không khớp với bất kỳ nhân viên nào</p>
            <p className="text-blue-300 text-sm mb-6">Liên hệ quản trị viên nếu cần hỗ trợ</p>
            <p className="text-blue-400 text-sm">Thử lại sau {countdown}s...</p>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle size={72} strokeWidth={1} className="text-red-400/80" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Có lỗi xảy ra</h2>
            <p className="text-red-300 mb-6 text-sm font-mono break-words max-w-xs">{errorMsg}</p>
            <button
              onClick={resetToWelcome}
              className="px-8 py-3 bg-blue-500 text-white rounded-xl font-medium"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>

      {/* Footer: link nhỏ cho admin */}
      <div className="text-center pb-4">
        <a href="/login" className="text-blue-600/50 hover:text-blue-400 text-xs transition-colors">
          Đăng nhập quản lý
        </a>
      </div>
    </div>
  );
}
