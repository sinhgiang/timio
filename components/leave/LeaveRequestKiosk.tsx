"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { unlockAudio } from "@/lib/speech";
import { Clock, UserCircle, ScanFace, CheckCircle2, AlertTriangle, Cpu, Copy, QrCode } from "lucide-react";

type Phase = "welcome" | "loading" | "camera" | "head_turn" | "form" | "submitting" | "handover_qr" | "success" | "error";

interface EmployeeData {
  id: string;
  name: string;
  code: string;
  department: string;
  position: string;
  dateOfBirth: string;
  annualLeaveBalance: number;
  descriptors: number[][];
}

interface Props {
  company: { id: string; name: string; slug: string };
  employees: EmployeeData[];
}

const LEAVE_TYPES = [
  { value: "annual", label: "Nghỉ phép năm" },
  { value: "sick", label: "Nghỉ ốm / Bệnh" },
  { value: "unpaid", label: "Nghỉ không lương" },
  { value: "maternity", label: "Nghỉ thai sản / chăm con" },
  { value: "other", label: "Lý do khác" },
] as const;

function todayStr() { return new Date().toISOString().slice(0, 10); }
function calcDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const d = (new Date(to).getTime() - new Date(from).getTime()) / 86400000 + 1;
  return d > 0 ? d : 0;
}
function formatDOB(s: string) {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export default function LeaveRequestKiosk({ company, employees }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectingRef = useRef(false);
  const matchCountRef = useRef(0);
  const lastMatchIdRef = useRef<string | null>(null);
  const autoCheckingRef = useRef(false);
  const headTurnDirRef = useRef<"left" | "right">("left");
  const headTurnTargetRef = useRef<EmployeeData | null>(null);
  const headTurnBaselineRef = useRef<number | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<Phase>("welcome");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [headTurnDir, setHeadTurnDir] = useState<"left" | "right">("left");
  const [headTurnCountdown, setHeadTurnCountdown] = useState(5);
  const [zoomStyle, setZoomStyle] = useState({ scale: 1, tx: 0, ty: 0 });

  const [matchedEmployee, setMatchedEmployee] = useState<EmployeeData | null>(null);
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [leaveType, setLeaveType] = useState<string>("annual");
  const [q1, setQ1] = useState("");
  const [handoverEmployeeId, setHandoverEmployeeId] = useState<string>("");
  const [q3, setQ3] = useState<"yes" | "no">("yes");
  const [q3Phone, setQ3Phone] = useState("");
  const [q4, setQ4] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [createdRequestId, setCreatedRequestId] = useState<string>("");
  const [handoverEmpName, setHandoverEmpName] = useState("");
  const [copied, setCopied] = useState(false);

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

  const resetToWelcome = useCallback(() => {
    stopCamera();
    setPhase("welcome");
    setMatchedEmployee(null);
    setErrorMsg("");
    setFaceDetected(false);
    setMatchCount(0);
    setZoomStyle({ scale: 1, tx: 0, ty: 0 });
    autoCheckingRef.current = false;
    matchCountRef.current = 0;
    lastMatchIdRef.current = null;
    headTurnTargetRef.current = null;
    headTurnBaselineRef.current = null;
    setFromDate(todayStr()); setToDate(todayStr());
    setLeaveType("annual");
    setQ1(""); setHandoverEmployeeId(""); setQ3("yes"); setQ3Phone(""); setQ4("");
    setCreatedRequestId(""); setHandoverEmpName(""); setCopied(false);
  }, [stopCamera]);

  useEffect(() => {
    if ((phase === "camera" || phase === "head_turn") && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  // Camera detection
  useEffect(() => {
    if (phase !== "camera") return;
    let alive = true;
    const run = async () => {
      if (autoCheckingRef.current || !alive || detectingRef.current) {
        if (alive && !autoCheckingRef.current) loopRef.current = setTimeout(run, 500);
        return;
      }
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        if (alive) loopRef.current = setTimeout(run, 300);
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
            const registered = employees.filter((e) => e.descriptors.length > 0);
            if (registered.length > 0 && !autoCheckingRef.current) {
              const frame = captureFrame(video);
              const descriptor = await extractDescriptor(frame);
              if (alive && !autoCheckingRef.current && descriptor) {
                const match = findBestMatch(descriptor, registered.map((e) => ({ id: e.id, name: e.name, descriptors: e.descriptors })));
                if (match) {
                  if (match.id === lastMatchIdRef.current) matchCountRef.current++;
                  else { matchCountRef.current = 1; lastMatchIdRef.current = match.id; }
                  setMatchCount(matchCountRef.current);
                  if (matchCountRef.current >= 2 && !autoCheckingRef.current) {
                    autoCheckingRef.current = true;
                    const emp = employees.find((e) => e.id === match.id) ?? null;
                    const dir = Math.random() < 0.5 ? "left" : "right";
                    headTurnDirRef.current = dir; headTurnTargetRef.current = emp; headTurnBaselineRef.current = null;
                    setHeadTurnDir(dir); setPhase("head_turn"); return;
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
        if (alive && !autoCheckingRef.current) loopRef.current = setTimeout(run, 600);
      }
    };
    loopRef.current = setTimeout(run, 300);
    return () => {
      alive = false;
      if (loopRef.current) clearTimeout(loopRef.current);
      detectingRef.current = false; autoCheckingRef.current = false;
      setZoomStyle({ scale: 1, tx: 0, ty: 0 }); setFaceDetected(false);
      matchCountRef.current = 0; lastMatchIdRef.current = null; setMatchCount(0);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Head turn
  useEffect(() => {
    if (phase !== "head_turn") return;
    let alive = true, cdVal = 5;
    setHeadTurnCountdown(cdVal);
    const cdInterval = setInterval(() => {
      cdVal--;
      setHeadTurnCountdown(cdVal);
      if (cdVal <= 0) {
        clearInterval(cdInterval);
        if (alive) { alive = false; if (loopRef.current) clearTimeout(loopRef.current); matchCountRef.current = 0; lastMatchIdRef.current = null; setMatchCount(0); setPhase("camera"); }
      }
    }, 1000);
    const run = async () => {
      if (!alive) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) { if (alive) loopRef.current = setTimeout(run, 200); return; }
      try {
        const { detectFaceBox } = await import("@/lib/faceApi");
        const box = await detectFaceBox(video);
        if (alive && box) {
          const vW = video.videoWidth || 640;
          const centerX = (box.x + box.width / 2) / vW;
          if (headTurnBaselineRef.current === null) headTurnBaselineRef.current = centerX;
          else {
            const disp = centerX - headTurnBaselineRef.current;
            const moved = headTurnDirRef.current === "left" ? disp > 0.15 : disp < -0.15;
            if (moved) {
              clearInterval(cdInterval); alive = false;
              const emp = headTurnTargetRef.current;
              stopCamera();
              if (emp) { setMatchedEmployee(emp); setPhase("form"); }
              else setPhase("camera");
              return;
            }
          }
        }
      } catch { /* ignore */ }
      if (alive) loopRef.current = setTimeout(run, 150);
    };
    loopRef.current = setTimeout(run, 700);
    return () => { alive = false; clearInterval(cdInterval); if (loopRef.current) clearTimeout(loopRef.current); };
  }, [phase, stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // QR code for handover link
  useEffect(() => {
    if (phase !== "handover_qr" || !createdRequestId || !qrCanvasRef.current) return;
    const url = `${window.location.origin}/leave/${company.slug}/handover/${createdRequestId}`;
    import("qrcode").then(({ toCanvas }) => {
      toCanvas(qrCanvasRef.current!, url, { width: 200, margin: 2, color: { dark: "#1e3a8a", light: "#ffffff" } }).catch(() => {});
    });
  }, [phase, createdRequestId, company.slug]);

  const startCamera = async () => {
    unlockAudio();
    if (!modelsReady) {
      setPhase("loading");
      try {
        const { ensureModels } = await import("@/lib/faceApi");
        await ensureModels(); setModelsReady(true);
      } catch (e) { setErrorMsg(`Không thể tải AI: ${e instanceof Error ? e.message : String(e)}`); setPhase("error"); return; }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream; setPhase("camera");
    } catch (e) { setErrorMsg(`Không mở được camera: ${e instanceof Error ? e.message : String(e)}`); setPhase("error"); }
  };

  const handleSubmit = async () => {
    if (!matchedEmployee) return;
    if (q1.trim().length < 10) { setErrorMsg("Vui lòng mô tả lý do nghỉ (tối thiểu 10 ký tự)"); return; }
    const days = calcDays(fromDate, toDate);
    if (days <= 0) { setErrorMsg("Ngày kết thúc phải sau ngày bắt đầu"); return; }

    const handoverEmp = employees.find((e) => e.id === handoverEmployeeId);
    const reason = [
      `[Lý do] ${q1.trim()}`,
      handoverEmp ? `[Bàn giao] Bàn giao cho ${handoverEmp.name} (${handoverEmp.code})` : "",
      `[Liên lạc] ${q3 === "yes" ? `Có - ${q3Phone || "chưa cung cấp SĐT"}` : "Không"}`,
      q4.trim() ? `[Ghi thêm] ${q4.trim()}` : "",
    ].filter(Boolean).join("\n");

    setErrorMsg(""); setPhase("submitting");
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: matchedEmployee.id, companyId: company.id,
          type: leaveType, fromDate, toDate, days, reason,
          handoverEmployeeId: handoverEmployeeId || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErrorMsg(d.error ?? "Gửi đơn thất bại"); setPhase("form"); return;
      }
      const data = await res.json();
      setCreatedRequestId(data.id);
      setHandoverEmpName(handoverEmp?.name ?? "");
      if (handoverEmployeeId && handoverEmp) setPhase("handover_qr");
      else { setPhase("success"); setTimeout(() => resetToWelcome(), 10000); }
    } catch (e) {
      setErrorMsg(`Lỗi: ${e instanceof Error ? e.message : String(e)}`); setPhase("form");
    }
  };

  const handoverUrl = createdRequestId ? `${typeof window !== "undefined" ? window.location.origin : ""}/leave/${company.slug}/handover/${createdRequestId}` : "";

  const copyLink = async () => {
    if (!handoverUrl) return;
    await navigator.clipboard.writeText(handoverUrl).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const timeStr = currentTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = currentTime.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const isVideoPhase = phase === "camera" || phase === "head_turn";
  const days = calcDays(fromDate, toDate);

  const colleagues = matchedEmployee
    ? employees.filter((e) => e.id !== matchedEmployee.id && e.department && e.department === matchedEmployee.department)
    : [];
  const otherEmployees = matchedEmployee
    ? employees.filter((e) => e.id !== matchedEmployee.id && (e.department !== matchedEmployee.department || !e.department || !matchedEmployee.department))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col select-none">
      {!isVideoPhase && phase !== "form" && (
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-blue-300 text-sm font-medium uppercase tracking-widest">
              <Clock size={14} /> Timio · Nghỉ phép
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

        {/* WELCOME */}
        {phase === "welcome" && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <UserCircle size={96} strokeWidth={1} className="text-blue-300/60" />
            </div>
            <h2 className="text-white text-3xl font-bold mb-2">Đơn xin nghỉ phép</h2>
            <p className="text-blue-200 text-lg mb-10">Quét khuôn mặt để bắt đầu</p>
            <button onClick={startCamera}
              className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-2xl shadow-2xl transition-all">
              <ScanFace size={26} /> Quét mặt để bắt đầu
            </button>
            <p className="text-blue-400 text-sm mt-4 flex items-center justify-center gap-1.5">
              {modelsReady
                ? <><CheckCircle2 size={14} className="text-blue-400" /> AI sẵn sàng — {employees.filter((e) => e.descriptors.length > 0).length} nhân viên đã đăng ký</>
                : "Đang tải AI nhận diện..."}
            </p>
          </div>
        )}

        {/* LOADING */}
        {phase === "loading" && (
          <div className="text-center">
            <Cpu size={72} strokeWidth={1} className="text-blue-300 animate-pulse mx-auto mb-6" />
            <p className="text-white text-xl font-semibold">Đang tải AI nhận diện...</p>
          </div>
        )}

        {/* CAMERA + HEAD TURN */}
        {isVideoPhase && (
          <div className="fixed inset-0 z-40 bg-black flex flex-col md:relative md:inset-auto md:z-auto md:bg-transparent md:w-[640px] md:max-w-[90vw]">
            <div className="px-6 pt-5 pb-3 text-center">
              <p className={`font-medium text-base transition-colors duration-300 ${
                phase === "head_turn" ? "text-orange-300" :
                matchCount > 0 ? "text-yellow-300" :
                faceDetected ? "text-blue-300" : "text-white/80"}`}>
                {phase === "head_turn" ? "Xác thực chống gian lận"
                  : faceDetected ? (matchCount > 0 ? `Đang xác nhận... (${matchCount}/2)` : "Đang xác nhận danh tính...")
                  : "Đưa mặt vào khung hình"}
              </p>
            </div>
            <div className="relative flex-1 overflow-hidden md:flex-none md:rounded-2xl md:shadow-2xl md:border-4 md:transition-colors"
              style={{ borderColor: phase === "head_turn" ? "#f97316" : faceDetected ? (matchCount > 0 ? "#facc15" : "#22c55e") : "#4ade80" }}>
              <video ref={videoRef}
                className="w-full h-full object-cover block md:h-auto md:aspect-[4/3]"
                style={{ transform: `translate(${zoomStyle.tx}%, ${zoomStyle.ty}%) scale(${zoomStyle.scale})`, transition: "transform 0.5s ease", transformOrigin: "50% 50%" }}
                muted playsInline autoPlay />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-44 h-56 border-4 rounded-full transition-all duration-300 ${
                  phase === "head_turn" ? "border-orange-400 opacity-90"
                  : matchCount > 0 ? "border-yellow-400 opacity-90"
                  : faceDetected ? "border-green-400 opacity-80" : "border-green-400 opacity-30"}`} />
              </div>
              {phase === "head_turn" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
                  <div className="text-center px-8 py-7">
                    <p className="text-orange-300 text-sm font-semibold uppercase tracking-widest mb-4">Xác thực bạn là người thật</p>
                    <p className="text-white font-black drop-shadow-lg" style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)", lineHeight: 1.1 }}>
                      {headTurnDir === "left" ? "← Nhìn TRÁI" : "Nhìn PHẢI →"}
                    </p>
                    <p className="text-white/50 text-lg mt-5">{headTurnCountdown}s...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-6 flex justify-center">
              <button onClick={resetToWelcome} className="px-10 py-3 border border-white/30 text-white/80 rounded-xl font-medium hover:bg-white/10 text-base transition-colors">Hủy</button>
            </div>
          </div>
        )}

        {/* FORM — A4 giấy tờ chính thức */}
        {phase === "form" && matchedEmployee && (
          <div className="w-full max-w-2xl mx-auto py-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <p className="text-blue-300 text-xs uppercase tracking-widest">Đơn xin nghỉ phép</p>
                <p className="text-white font-bold">{company.name}</p>
              </div>
              <div className="text-right">
                <div className="text-white text-xl font-mono">{timeStr}</div>
                <div className="text-blue-300 text-xs">{dateStr}</div>
              </div>
            </div>

            {/* A4 paper */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ fontFamily: "'Times New Roman', serif" }}>

              {/* Official header */}
              <div className="text-center pt-5 pb-3 border-b-2 border-gray-800 mx-6">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Cộng hoà Xã hội Chủ nghĩa Việt Nam</p>
                <p className="text-xs italic text-gray-500">Độc lập – Tự do – Hạnh phúc</p>
                <p className="text-xs text-gray-400 mt-1">— ★ ★ ★ —</p>
                <h1 className="text-xl font-black uppercase tracking-wider mt-2 text-gray-900">Đơn Xin Nghỉ Phép</h1>
              </div>

              <div className="px-6 py-4">
                {/* Kính gửi */}
                <p className="text-sm text-gray-700 mb-4 italic">
                  Kính gửi: <strong>Ban Giám đốc {company.name}</strong>
                </p>

                {/* Thông tin nhân viên */}
                <div className="border border-gray-300 rounded-lg mb-4 overflow-hidden text-sm">
                  <div className="bg-gray-50 px-4 py-2 font-bold text-gray-700 uppercase tracking-wider text-xs border-b border-gray-200">
                    Thông tin người làm đơn
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="divide-y divide-gray-200">
                      <div className="flex px-3 py-2 gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Họ và tên:</span>
                        <span className="font-bold text-gray-900">{matchedEmployee.name}</span>
                      </div>
                      <div className="flex px-3 py-2 gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Ngày sinh:</span>
                        <span className="font-semibold">{formatDOB(matchedEmployee.dateOfBirth) || "—"}</span>
                      </div>
                      <div className="flex px-3 py-2 gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Mã nhân viên:</span>
                        <span className="font-semibold font-mono">{matchedEmployee.code}</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      <div className="flex px-3 py-2 gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Phòng ban:</span>
                        <span className="font-semibold">{matchedEmployee.department || "—"}</span>
                      </div>
                      <div className="flex px-3 py-2 gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Chức vụ:</span>
                        <span className="font-semibold">{matchedEmployee.position || "—"}</span>
                      </div>
                      <div className="flex px-3 py-2 gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Phép còn lại:</span>
                        <span className="font-bold text-blue-700">{matchedEmployee.annualLeaveBalance} ngày</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thời gian nghỉ */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Từ ngày</label>
                    <input type="date" value={fromDate} min={todayStr()}
                      onChange={(e) => { setFromDate(e.target.value); if (e.target.value > toDate) setToDate(e.target.value); }}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Đến ngày</label>
                    <input type="date" value={toDate} min={fromDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Loại nghỉ</label>
                    <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none">
                      {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="text-center bg-blue-50 rounded-lg px-4 py-2 mb-4 border border-blue-100">
                  <span className="text-2xl font-black text-blue-700">{days}</span>
                  <span className="text-sm text-blue-500 ml-1">ngày nghỉ</span>
                </div>

                {/* 1. Lý do */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    1. Lý do xin nghỉ: <span className="text-red-500">*</span>
                  </label>
                  <textarea rows={3} value={q1} onChange={(e) => setQ1(e.target.value)}
                    placeholder="Nêu rõ lý do cụ thể bạn cần nghỉ phép..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none resize-none leading-relaxed" />
                  <p className="text-xs text-gray-400 mt-1 text-right">{q1.length} ký tự (tối thiểu 10)</p>
                </div>

                {/* 2. Bàn giao */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    2. Bàn giao công việc cho: <span className="text-red-500">*</span>
                  </label>
                  <select value={handoverEmployeeId} onChange={(e) => setHandoverEmployeeId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none bg-white">
                    <option value="">— Chọn người nhận việc —</option>
                    {colleagues.length > 0 && (
                      <optgroup label={`Cùng phòng: ${matchedEmployee.department}`}>
                        {colleagues.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.code}){c.position ? ` · ${c.position}` : ""}</option>
                        ))}
                      </optgroup>
                    )}
                    {otherEmployees.length > 0 && (
                      <optgroup label="Phòng ban khác">
                        {otherEmployees.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.code}){c.department ? ` · ${c.department}` : ""}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {handoverEmployeeId && (
                    <p className="text-xs text-blue-600 mt-1.5">Sau khi gửi đơn, người này cần quét mặt xác nhận nhận việc.</p>
                  )}
                  {!handoverEmployeeId && (
                    <p className="text-xs text-gray-400 mt-1">Để trống nếu chưa xác định người nhận việc.</p>
                  )}
                </div>

                {/* 3. Liên lạc */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    3. Có thể liên lạc qua điện thoại trong thời gian nghỉ không? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3 mb-2">
                    {(["yes", "no"] as const).map((v) => (
                      <button key={v} onClick={() => setQ3(v)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          q3 === v ? (v === "yes" ? "bg-blue-600 border-blue-600 text-white" : "bg-red-500 border-red-500 text-white")
                          : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {v === "yes" ? "✓ Có thể liên lạc" : "✗ Không liên lạc được"}
                      </button>
                    ))}
                  </div>
                  {q3 === "yes" && (
                    <input type="tel" value={q3Phone} onChange={(e) => setQ3Phone(e.target.value)}
                      placeholder="Số điện thoại liên lạc..."
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none" />
                  )}
                </div>

                {/* 4. Ghi chú */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    4. Thông tin khẩn cấp cần quản lý biết thêm: <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                  </label>
                  <textarea rows={2} value={q4} onChange={(e) => setQ4(e.target.value)}
                    placeholder="Để trống nếu không có..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none resize-none leading-relaxed" />
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2 mb-4">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {errorMsg}
                  </div>
                )}

                <div className="flex gap-3 pb-2">
                  <button onClick={resetToWelcome} className="px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50">Hủy</button>
                  <button onClick={handleSubmit}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base transition-colors">
                    Gửi đơn xin nghỉ phép
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBMITTING */}
        {phase === "submitting" && (
          <div className="text-center">
            <ScanFace size={80} strokeWidth={1} className="text-blue-300 animate-pulse mx-auto mb-6" />
            <p className="text-white text-xl font-semibold">Đang gửi đơn...</p>
          </div>
        )}

        {/* HANDOVER QR */}
        {phase === "handover_qr" && (
          <div className="w-full max-w-sm text-center">
            <CheckCircle2 size={56} strokeWidth={1} className="text-green-400 mx-auto mb-3" />
            <h2 className="text-white text-xl font-bold mb-1">Đơn đã gửi thành công!</h2>
            <p className="text-blue-200 text-sm mb-5">
              Nhờ <strong className="text-white">{handoverEmpName}</strong> quét mã bên dưới<br />để xác nhận nhận bàn giao công việc.
            </p>

            <div className="bg-white rounded-2xl p-5 shadow-2xl mb-4 inline-block">
              <canvas ref={qrCanvasRef} style={{ width: 200, height: 200 }} />
              <p className="text-xs text-gray-400 mt-2">Quét để xác nhận bàn giao</p>
            </div>

            <div className="flex gap-2 justify-center mb-4">
              <button onClick={copyLink}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20">
                <Copy size={14} /> {copied ? "Đã copy!" : "Copy link"}
              </button>
              <a href={handoverUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm border border-white/20">
                <QrCode size={14} /> Mở link
              </a>
            </div>

            <button onClick={() => { setPhase("success"); setTimeout(() => resetToWelcome(), 8000); }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors">
              Hoàn thành (không cần đợi)
            </button>
          </div>
        )}

        {/* SUCCESS */}
        {phase === "success" && (
          <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-center border border-white/20">
            <CheckCircle2 size={72} strokeWidth={1} className="text-blue-400 mx-auto mb-4" />
            <h2 className="text-white text-2xl font-bold mb-2">{matchedEmployee?.name}</h2>
            <p className="text-blue-200 text-lg mb-1">Đơn đã được gửi thành công!</p>
            <p className="text-blue-300 text-sm mb-4">Quản lý sẽ xem xét và phản hồi sớm.</p>
            <p className="text-white/50 text-sm">Tự động đóng sau 10 giây...</p>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <div className="text-center">
            <AlertTriangle size={72} strokeWidth={1} className="text-red-400/80 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Có lỗi xảy ra</h2>
            <p className="text-red-300 mb-6 text-sm font-mono break-words max-w-xs">{errorMsg}</p>
            <button onClick={resetToWelcome} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium">Thử lại</button>
          </div>
        )}
      </div>

      {!isVideoPhase && phase !== "form" && (
        <div className="text-center pb-4">
          <a href="/login" className="text-blue-600/40 hover:text-blue-400 text-xs transition-colors">Đăng nhập quản lý</a>
        </div>
      )}
    </div>
  );
}
