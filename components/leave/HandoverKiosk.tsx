"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { unlockAudio } from "@/lib/speech";
import { Clock, ScanFace, CheckCircle2, AlertTriangle, UserCircle, FileText } from "lucide-react";

type Phase = "info" | "loading" | "camera" | "confirming" | "done" | "already_done" | "error";

interface EmployeeFace {
  id: string;
  name: string;
  code: string;
  descriptors: number[][];
}

interface LeaveRequest {
  id: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  position: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: string;
  handoverConfirmedAt: string | null;
}

interface Props {
  company: { id: string; name: string; slug: string };
  leaveRequest: LeaveRequest;
  handoverEmployee: EmployeeFace | null;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Nghỉ phép năm",
  sick: "Nghỉ ốm / Bệnh",
  unpaid: "Nghỉ không lương",
  maternity: "Nghỉ thai sản / chăm con",
  other: "Lý do khác",
  wedding: "Nghỉ cưới",
  funeral: "Nghỉ tang",
  paternity: "Nghỉ con sinh",
};

function fmtDate(s: string) {
  if (!s) return s;
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export default function HandoverKiosk({ company, leaveRequest, handoverEmployee }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectingRef = useRef(false);
  const autoCheckingRef = useRef(false);
  const matchCountRef = useRef(0);
  const lastMatchIdRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>(
    leaveRequest.handoverConfirmedAt ? "already_done" : "info"
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ scale: 1, tx: 0, ty: 0 });
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    import("@/lib/faceApi").then(({ ensureModels }) => {
      ensureModels().then(() => setModelsReady(true)).catch(() => {});
    });
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (phase === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  // Camera detection
  useEffect(() => {
    if (phase !== "camera") return;
    if (!handoverEmployee || handoverEmployee.descriptors.length === 0) return;

    let alive = true;
    const run = async () => {
      if (autoCheckingRef.current || !alive || detectingRef.current) {
        if (alive && !autoCheckingRef.current) loopRef.current = setTimeout(run, 250);
        return;
      }
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        if (alive) loopRef.current = setTimeout(run, 200);
        return;
      }
      detectingRef.current = true;
      try {
        const { detectFaceBox, captureFrame, extractDescriptor, findBestMatch } = await import("@/lib/faceApi");
        const box = await detectFaceBox(video);
        if (alive) {
          if (box) {
            const vW = video.videoWidth || 640, vH = video.videoHeight || 480;
            const fcX = box.x + box.width / 2, fcY = box.y + box.height / 2;
            const scale = Math.max(1, Math.min(3.0, (vH * 0.55) / box.height));
            setZoomStyle({ scale, tx: (0.5 - fcX / vW) * scale * 100, ty: (0.5 - fcY / vH) * scale * 100 });
            setFaceDetected(true);
            if (!autoCheckingRef.current) {
              const frame = captureFrame(video);
              const descriptor = await extractDescriptor(frame);
              if (alive && !autoCheckingRef.current && descriptor) {
                const match = findBestMatch(descriptor, [handoverEmployee]);
                if (match) {
                  if (match.id === lastMatchIdRef.current) matchCountRef.current++;
                  else { matchCountRef.current = 1; lastMatchIdRef.current = match.id; }
                  setMatchCount(matchCountRef.current);
                  if (matchCountRef.current >= 2 && !autoCheckingRef.current) {
                    autoCheckingRef.current = true;
                    stopCamera();
                    confirmHandover();
                    return;
                  }
                } else {
                  matchCountRef.current = 0; lastMatchIdRef.current = null; setMatchCount(0);
                }
              }
            }
          } else {
            setZoomStyle({ scale: 1, tx: 0, ty: 0 }); setFaceDetected(false);
            matchCountRef.current = 0; lastMatchIdRef.current = null; setMatchCount(0);
          }
        }
      } catch { /* ignore */ } finally {
        detectingRef.current = false;
        if (alive && !autoCheckingRef.current) loopRef.current = setTimeout(run, 250);
      }
    };
    loopRef.current = setTimeout(run, 150);
    return () => {
      alive = false;
      if (loopRef.current) clearTimeout(loopRef.current);
      detectingRef.current = false; autoCheckingRef.current = false;
      setZoomStyle({ scale: 1, tx: 0, ty: 0 }); setFaceDetected(false);
      matchCountRef.current = 0; lastMatchIdRef.current = null; setMatchCount(0);
    };
  }, [phase, handoverEmployee, stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmHandover = async () => {
    setPhase("confirming");
    try {
      const res = await fetch(`/api/leave-requests/${leaveRequest.id}/confirm-handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmedByEmployeeId: handoverEmployee?.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErrorMsg(d.error ?? "Xác nhận thất bại"); setPhase("error");
        return;
      }
      setPhase("done");
    } catch (e) {
      setErrorMsg(`Lỗi mạng: ${e instanceof Error ? e.message : String(e)}`);
      setPhase("error");
    }
  };

  const startCamera = async () => {
    unlockAudio();
    if (!modelsReady) {
      setPhase("loading");
      try {
        const { ensureModels } = await import("@/lib/faceApi");
        await ensureModels(); setModelsReady(true);
      } catch (e) {
        setErrorMsg(`Không tải được AI: ${e instanceof Error ? e.message : String(e)}`);
        setPhase("error"); return;
      }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream; setPhase("camera");
    } catch (e) {
      setErrorMsg(`Không mở camera: ${e instanceof Error ? e.message : String(e)}`);
      setPhase("error");
    }
  };

  const timeStr = currentTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = currentTime.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const isVideoPhase = phase === "camera";

  const reasonLines = leaveRequest.reason
    ? leaveRequest.reason.split("\n").filter(Boolean)
    : [];
  const extractSection = (tag: string) => {
    const line = reasonLines.find((l) => l.startsWith(tag));
    return line ? line.replace(tag, "").trim() : "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col select-none">
      {!isVideoPhase && (
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-blue-300 text-sm font-medium uppercase tracking-widest">
              <Clock size={14} /> Timio · Bàn giao
            </div>
            <div className="text-white text-lg font-bold mt-0.5">{company.name}</div>
          </div>
          <div className="text-right">
            <div className="text-white text-3xl font-mono font-bold">{timeStr}</div>
            <div className="text-blue-300 text-sm capitalize">{dateStr}</div>
          </div>
        </div>
      )}

      <div className={`flex-1 flex flex-col items-center justify-center px-4 pb-8 ${isVideoPhase ? "p-0" : ""}`}>

        {/* INFO */}
        {phase === "info" && (
          <div className="w-full max-w-lg">
            <h2 className="text-white text-2xl font-bold text-center mb-2">Xác nhận bàn giao công việc</h2>
            <p className="text-blue-200 text-center text-sm mb-5">
              {handoverEmployee
                ? <><strong className="text-white">{handoverEmployee.name}</strong> ({handoverEmployee.code}) cần quét mặt để xác nhận nhận việc từ người dưới đây.</>
                : "Không có người nhận việc được chỉ định."}
            </p>

            {/* Leave summary card */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-5" style={{ fontFamily: "'Times New Roman', serif" }}>
              <div className="text-center pt-4 pb-2 border-b border-gray-200 mx-5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Đơn Xin Nghỉ Phép</p>
                <p className="text-base font-bold text-gray-800">{LEAVE_TYPE_LABELS[leaveRequest.type] ?? leaveRequest.type}</p>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                  <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Nhân viên:</span><strong className="text-gray-900">{leaveRequest.employeeName}</strong></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Mã NV:</span><span className="font-mono">{leaveRequest.employeeCode}</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Phòng ban:</span><span>{leaveRequest.department || "—"}</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Chức vụ:</span><span>{leaveRequest.position || "—"}</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Từ ngày:</span><span className="font-semibold">{fmtDate(leaveRequest.fromDate)}</span></div>
                  <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Đến ngày:</span><span className="font-semibold">{fmtDate(leaveRequest.toDate)}</span></div>
                </div>
                <div className="flex justify-center py-1 mb-3">
                  <span className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-1 rounded-full text-sm font-bold">{leaveRequest.days} ngày nghỉ</span>
                </div>
                {extractSection("[Lý do]") && (
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 border border-gray-100">
                    <p className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-1">Lý do</p>
                    <p>{extractSection("[Lý do]")}</p>
                  </div>
                )}
              </div>
              <div className="bg-amber-50 border-t border-amber-100 px-5 py-3 flex items-center gap-3">
                <FileText size={16} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  <strong>{handoverEmployee?.name ?? "Bạn"}</strong> cần quét mặt để xác nhận nhận bàn giao công việc trong thời gian này.
                </p>
              </div>
            </div>

            {handoverEmployee && handoverEmployee.descriptors.length > 0 ? (
              <button onClick={startCamera}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-2xl transition-all flex items-center justify-center gap-3">
                <ScanFace size={24} />
                {handoverEmployee.name} — Quét mặt xác nhận
              </button>
            ) : (
              <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
                <AlertTriangle size={24} className="text-yellow-400 mx-auto mb-2" />
                <p className="text-yellow-300 text-sm">
                  {handoverEmployee
                    ? `${handoverEmployee.name} chưa đăng ký khuôn mặt — không thể xác minh danh tính.`
                    : "Không có thông tin người nhận việc."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* LOADING */}
        {phase === "loading" && (
          <div className="text-center">
            <ScanFace size={72} strokeWidth={1} className="text-blue-300 animate-pulse mx-auto mb-6" />
            <p className="text-white text-xl font-semibold">Đang tải AI nhận diện...</p>
          </div>
        )}

        {/* CAMERA */}
        {isVideoPhase && (
          <div className="fixed inset-0 z-40 bg-black flex flex-col md:relative md:inset-auto md:z-auto md:bg-transparent md:w-[640px] md:max-w-[90vw]">
            <div className="px-6 pt-5 pb-3 text-center">
              <p className="text-blue-200 text-sm font-semibold mb-1">{handoverEmployee?.name} — Xác nhận bàn giao</p>
              <p className={`font-medium text-base transition-colors duration-300 ${
                matchCount > 0 ? "text-yellow-300"
                : faceDetected ? "text-blue-300" : "text-white/80"}`}>
                {faceDetected ? (matchCount > 0 ? `Đang xác nhận... (${matchCount}/2)` : "Đang nhận diện khuôn mặt...") : "Đưa mặt vào khung hình"}
              </p>
            </div>
            <div className="relative flex-1 overflow-hidden md:flex-none md:rounded-2xl md:shadow-2xl md:border-4 md:transition-colors"
              style={{ borderColor: faceDetected ? (matchCount > 0 ? "#facc15" : "#22c55e") : "#4ade80" }}>
              <video ref={videoRef}
                className="w-full h-full object-cover block md:h-auto md:aspect-[4/3]"
                style={{ transform: `scaleX(-1) translate(${-zoomStyle.tx}%, ${zoomStyle.ty}%) scale(${zoomStyle.scale})`, transition: "transform 0.5s ease", transformOrigin: "50% 50%" }}
                muted playsInline autoPlay />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-44 h-56 border-4 rounded-full transition-all duration-300 ${
                  matchCount > 0 ? "border-yellow-400 opacity-90"
                  : faceDetected ? "border-green-400 opacity-80" : "border-green-400 opacity-30"}`} />
              </div>
            </div>
            <div className="px-6 py-6 flex justify-center">
              <button onClick={() => { stopCamera(); setPhase("info"); autoCheckingRef.current = false; matchCountRef.current = 0; lastMatchIdRef.current = null; setMatchCount(0); }}
                className="px-10 py-3 border border-white/30 text-white/80 rounded-xl font-medium hover:bg-white/10 text-base transition-colors">Hủy</button>
            </div>
          </div>
        )}

        {/* CONFIRMING */}
        {phase === "confirming" && (
          <div className="text-center">
            <ScanFace size={80} strokeWidth={1} className="text-blue-300 animate-pulse mx-auto mb-6" />
            <p className="text-white text-xl font-semibold">Đang xác nhận...</p>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && (
          <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-center border border-white/20">
            <CheckCircle2 size={72} strokeWidth={1} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-white text-2xl font-bold mb-2">{handoverEmployee?.name}</h2>
            <p className="text-green-300 text-lg mb-2">Đã xác nhận bàn giao thành công!</p>
            <p className="text-blue-200 text-sm mb-6">Bạn đã nhận bàn giao công việc từ <strong className="text-white">{leaveRequest.employeeName}</strong> trong thời gian nghỉ phép.</p>
            <a href="/login" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm">Về trang chính</a>
          </div>
        )}

        {/* ALREADY DONE */}
        {phase === "already_done" && (
          <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-center border border-white/20">
            <CheckCircle2 size={72} strokeWidth={1} className="text-blue-400 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Đã xác nhận rồi</h2>
            <p className="text-blue-200 text-sm mb-4">
              Bàn giao công việc đã được xác nhận.
            </p>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-sm text-blue-200">
              <p>Nhân viên nghỉ: <strong className="text-white">{leaveRequest.employeeName}</strong></p>
              <p className="mt-1">Từ {fmtDate(leaveRequest.fromDate)} đến {fmtDate(leaveRequest.toDate)} ({leaveRequest.days} ngày)</p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <div className="text-center">
            <AlertTriangle size={72} strokeWidth={1} className="text-red-400/80 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Có lỗi xảy ra</h2>
            <p className="text-red-300 mb-6 text-sm font-mono break-words max-w-xs">{errorMsg}</p>
            <button onClick={() => { setPhase("info"); setErrorMsg(""); }}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium">Thử lại</button>
          </div>
        )}
      </div>

      {!isVideoPhase && (
        <div className="text-center pb-4">
          <a href="/login" className="text-blue-600/40 hover:text-blue-400 text-xs transition-colors">Đăng nhập quản lý</a>
        </div>
      )}
    </div>
  );
}
