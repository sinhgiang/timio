"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { unlockAudio } from "@/lib/speech";
import { Clock, UserCircle, ScanFace, CheckCircle2, AlertTriangle, Cpu, Copy, QrCode } from "lucide-react";

type Phase = "welcome" | "loading" | "camera" | "form" | "submitting" | "handover_qr" | "success" | "error";

interface EmployeeData {
  id: string;
  name: string;
  code: string;
  department: string;
  position: string;
  dateOfBirth: string;
  phone: string;
  annualLeaveBalance: number;
  descriptors: number[][];
}

interface Props {
  company: { id: string; name: string; slug: string };
  employees: EmployeeData[];
  branchName?: string;
}

const LEAVE_TYPES = [
  { value: "annual", label: "Nghỉ phép năm" },
  { value: "sick", label: "Nghỉ ốm / Bệnh" },
  { value: "unpaid", label: "Nghỉ không lương" },
  { value: "maternity", label: "Nghỉ thai sản / chăm con" },
  { value: "wedding", label: "Nghỉ cưới" },
  { value: "funeral", label: "Nghỉ tang" },
  { value: "paternity", label: "Nghỉ con sinh" },
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

export default function LeaveRequestKiosk({ company, employees, branchName }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectingRef = useRef(false);
  const matchCountRef = useRef(0);
  const lastMatchIdRef = useRef<string | null>(null);
  const autoCheckingRef = useRef(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const getSigPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };
  const startSig = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = sigCanvasRef.current; if (!canvas) return;
    isDrawingRef.current = true;
    lastPosRef.current = getSigPos(e, canvas);
  };
  const drawSig = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current || !sigCanvasRef.current || !lastPosRef.current) return;
    const canvas = sigCanvasRef.current;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pos = getSigPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1e3a8a";
    ctx.stroke();
    lastPosRef.current = pos;
  };
  const stopSig = () => { isDrawingRef.current = false; lastPosRef.current = null; };
  const clearSig = () => {
    const canvas = sigCanvasRef.current; if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const [phase, setPhase] = useState<Phase>("welcome");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [zoomStyle, setZoomStyle] = useState({ scale: 1, tx: 0, ty: 0 });

  const [matchedEmployee, setMatchedEmployee] = useState<EmployeeData | null>(null);
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [leaveType, setLeaveType] = useState<string>("annual");
  const [q1, setQ1] = useState("");
  const [handoverEmployeeId, setHandoverEmployeeId] = useState<string>("");
  const [q3UseDefault, setQ3UseDefault] = useState(true);
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
    setFromDate(todayStr()); setToDate(todayStr());
    setLeaveType("annual");
    setQ1(""); setHandoverEmployeeId(""); setQ3UseDefault(true); setQ3Phone(""); setQ4("");
    setCreatedRequestId(""); setHandoverEmpName(""); setCopied(false);
  }, [stopCamera]);

  useEffect(() => {
    if (phase === "camera" && videoRef.current && streamRef.current) {
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
                    stopCamera();
                    setMatchedEmployee(emp);
                    setPhase("form");
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
      `[Liên lạc] ${q3UseDefault ? (matchedEmployee?.phone || "SĐT đã đăng ký") : (q3Phone || "chưa cung cấp SĐT")}`,
      q4.trim() ? `[Ghi thêm] ${q4.trim()}` : "",
    ].filter(Boolean).join("\n");

    // Capture signature if canvas has content
    let employeeSignature: string | null = null;
    if (sigCanvasRef.current) {
      const ctx = sigCanvasRef.current.getContext("2d");
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
        const hasContent = imgData.data.some((v, i) => i % 4 === 3 && v > 10);
        if (hasContent) employeeSignature = sigCanvasRef.current.toDataURL("image/png");
      }
    }

    setErrorMsg(""); setPhase("submitting");
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: matchedEmployee.id, companyId: company.id,
          type: leaveType, fromDate, toDate, days, reason,
          handoverEmployeeId: handoverEmployeeId || null,
          employeeSignature,
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
  const isVideoPhase = phase === "camera";
  const days = calcDays(fromDate, toDate);

  const colleagues = matchedEmployee
    ? employees.filter((e) => e.id !== matchedEmployee.id && e.department && e.department === matchedEmployee.department)
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
            {branchName && (
              <div className="text-blue-300 text-sm mt-0.5">{branchName}</div>
            )}
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

        {/* CAMERA */}
        {isVideoPhase && (
          <div className="fixed inset-0 z-40 bg-black flex flex-col md:relative md:inset-auto md:z-auto md:bg-transparent md:w-[640px] md:max-w-[90vw]">
            <div className="px-6 pt-5 pb-3 text-center">
              <p className={`font-medium text-base transition-colors duration-300 ${
                matchCount > 0 ? "text-yellow-300" :
                faceDetected ? "text-blue-300" : "text-white/80"}`}>
                {faceDetected ? (matchCount > 0 ? `Đang xác nhận... (${matchCount}/2)` : "Đang xác nhận danh tính...") : "Đưa mặt vào khung hình"}
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
              <button onClick={resetToWelcome} className="px-10 py-3 border border-white/30 text-white/80 rounded-xl font-medium hover:bg-white/10 text-base transition-colors">Hủy</button>
            </div>
          </div>
        )}

        {/* FORM — Mẫu đơn hành chính chính thức */}
        {phase === "form" && matchedEmployee && (
          <div className="w-full max-w-2xl mx-auto py-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-blue-300 text-xs uppercase tracking-widest">Đơn xin nghỉ phép · {company.name}</p>
              <div className="text-white text-lg font-mono">{timeStr}</div>
            </div>

            {/* A4 paper */}
            <div className="bg-white rounded-2xl shadow-2xl" style={{ fontFamily: "'Times New Roman', serif" }}>

              {/* Header */}
              <div className="text-center pt-6 pb-3 border-b-2 border-gray-800 mx-6">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700">Cộng hoà Xã hội Chủ nghĩa Việt Nam</p>
                <p className="text-sm font-bold underline italic text-gray-700 mt-0.5">Độc lập – Tự do – Hạnh phúc</p>
                <p className="text-xs text-gray-400 mt-1">————★————</p>
                <h1 className="text-lg font-black uppercase tracking-widest mt-3 mb-1 text-gray-900">Đơn Xin Nghỉ Phép</h1>
                <p className="text-xs italic text-gray-400">
                  (<select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
                    className="border-0 bg-transparent text-xs italic text-gray-500 focus:outline-none cursor-pointer">
                    {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>)
                </p>
              </div>

              {/* Body */}
              <div className="px-7 pt-5 pb-4 text-sm leading-7 text-gray-800">

                {/* Kính gửi */}
                <p className="mb-3">
                  <span className="font-bold">Kính gửi:</span> Ban Giám đốc Công ty <span className="font-bold">{company.name}</span>
                </p>

                {/* Thông tin cá nhân — inline document style */}
                <p className="mb-1">
                  <span className="font-bold">Tôi tên là: </span>
                  <span className="font-bold text-blue-900 underline decoration-dotted">{matchedEmployee.name}</span>
                  <span className="mx-4 text-gray-400">·</span>
                  <span className="font-bold">Mã NV: </span>
                  <span className="font-mono">{matchedEmployee.code}</span>
                </p>
                <p className="mb-1">
                  <span className="font-bold">Ngày/ Tháng/ Năm sinh: </span>
                  <span>{formatDOB(matchedEmployee.dateOfBirth) || "............"}</span>
                  <span className="mx-4 text-gray-400">·</span>
                  <span className="font-bold">Chức vụ: </span>
                  <span>{matchedEmployee.position || "............"}</span>
                </p>
                <p className="mb-1">
                  <span className="font-bold">Phòng/ Ban: </span>
                  <span>{matchedEmployee.department || "............"}</span>
                </p>
                <p className="mb-3">
                  <span className="font-bold">Điện thoại liên lạc: </span>
                  <span>{matchedEmployee.phone || "............"}</span>
                  <span className="mx-4 text-gray-400">·</span>
                  <span className="text-blue-700 text-xs">Phép còn lại: {matchedEmployee.annualLeaveBalance} ngày</span>
                </p>

                {/* Xin phép */}
                <p className="mb-1 leading-8">
                  Nay tôi làm đơn này xin phép{" "}
                  <span className="font-bold text-blue-800 text-base">{days} ngày</span>,
                  được nghỉ phép từ ngày{" "}
                  <input type="date" value={fromDate} min={todayStr()}
                    onChange={(e) => { setFromDate(e.target.value); if (e.target.value > toDate) setToDate(e.target.value); }}
                    className="border-0 border-b-2 border-blue-300 bg-transparent text-sm px-1 text-center focus:outline-none focus:border-blue-600 w-36" />
                  {" "}đến ngày{" "}
                  <input type="date" value={toDate} min={fromDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border-0 border-b-2 border-blue-300 bg-transparent text-sm px-1 text-center focus:outline-none focus:border-blue-600 w-36" />.
                </p>

                {/* Lý do */}
                <p className="font-bold mt-3 mb-1">Lý do xin nghỉ: <span className="text-red-500 font-normal text-xs">(bắt buộc)</span></p>
                <textarea rows={3} value={q1} onChange={(e) => setQ1(e.target.value)}
                  placeholder="Nêu rõ lý do cụ thể bạn cần nghỉ phép..."
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:border-blue-400 resize-none leading-relaxed rounded" />
                {q1.length < 10 && q1.length > 0 && <p className="text-xs text-red-500 mt-0.5">Tối thiểu 10 ký tự ({q1.length}/10)</p>}

                {/* Bàn giao */}
                <p className="mt-3 mb-1 leading-8">
                  Trong thời gian xin nghỉ, tôi xin bàn giao công việc lại cho:{" "}
                  {colleagues.length > 0 ? (
                    <select value={handoverEmployeeId} onChange={(e) => setHandoverEmployeeId(e.target.value)}
                      className="border-0 border-b-2 border-blue-300 bg-transparent text-sm focus:outline-none focus:border-blue-600 max-w-xs">
                      <option value="">— chọn —</option>
                      {colleagues.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-400 italic text-xs">Không có đồng nghiệp cùng phòng</span>
                  )}
                </p>
                {handoverEmployeeId && (
                  <p className="text-xs text-blue-600 mb-1">→ Người này sẽ nhận QR để quét mặt xác nhận sau khi gửi đơn.</p>
                )}

                {/* Liên lạc */}
                <p className="mt-2 leading-8">
                  <span className="font-bold">Điện thoại liên lạc khi nghỉ: </span>
                  <button onClick={() => setQ3UseDefault(true)}
                    className={`text-sm px-2 py-0.5 rounded border mx-1 transition-all ${q3UseDefault ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 text-gray-600"}`}>
                    {matchedEmployee.phone ? matchedEmployee.phone : "SĐT đã đăng ký"}
                  </button>
                  <button onClick={() => setQ3UseDefault(false)}
                    className={`text-sm px-2 py-0.5 rounded border mx-1 transition-all ${!q3UseDefault ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 text-gray-600"}`}>
                    Số khác
                  </button>
                </p>
                {!q3UseDefault && (
                  <input type="tel" value={q3Phone} onChange={(e) => setQ3Phone(e.target.value)}
                    placeholder="Nhập số điện thoại..."
                    className="border-0 border-b-2 border-blue-300 bg-transparent text-sm px-1 focus:outline-none focus:border-blue-600 w-48 mt-1" />
                )}
                {!matchedEmployee.phone && q3UseDefault && (
                  <p className="text-xs text-amber-600">Chưa có SĐT đăng ký — vui lòng chọn "Số khác".</p>
                )}

                {/* Ghi thêm */}
                <div className="mt-3 mb-1">
                  <p className="text-gray-500 text-xs italic mb-1">Thông tin thêm cần quản lý biết (không bắt buộc):</p>
                  <textarea rows={2} value={q4} onChange={(e) => setQ4(e.target.value)}
                    placeholder="Để trống nếu không có..."
                    className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-blue-400 resize-none rounded" />
                </div>

                {/* Cam kết */}
                <p className="mt-4 text-gray-700 leading-7">
                  Tôi xin hứa sẽ cập nhật tình hình công việc thường xuyên trong thời gian nghỉ và cam kết trở lại làm việc đúng thời hạn quy định.
                </p>
                <p className="text-gray-700 leading-7">
                  Kính mong <span className="italic">Ban Giám đốc {company.name}</span> giải quyết cho tôi nghỉ phép theo nguyện vọng trên.
                </p>
                <p className="text-gray-700 font-semibold mt-1">Xin trân trọng cảm ơn!</p>

                {/* Ký tên footer */}
                <div className="flex justify-between items-start mt-6 mb-2">
                  {/* Trái: Xác nhận trưởng phòng */}
                  <div className="text-center text-sm w-44">
                    <p className="font-bold text-[11px] uppercase tracking-wide text-gray-700">Xác nhận của Trưởng phòng</p>
                    <p className="text-[10px] italic text-gray-400">(Ký, ghi rõ họ tên)</p>
                    <div className="h-20 border border-dashed border-gray-200 rounded mt-2"></div>
                  </div>

                  {/* Phải: Người làm đơn + Signature pad */}
                  <div className="text-center text-sm w-56">
                    <p className="italic text-gray-500 text-xs mb-1">
                      {(() => { const d = new Date(); return `......, ngày ${d.getDate()} tháng ${d.getMonth()+1} năm ${d.getFullYear()}`; })()}
                    </p>
                    <p className="font-bold text-[11px] uppercase tracking-wide text-gray-700">Người làm đơn</p>
                    <p className="text-[10px] italic text-gray-400 mb-1">(Ký và ghi rõ họ tên)</p>

                    {/* Signature canvas */}
                    <div className="relative border border-gray-300 rounded bg-blue-50/30" style={{ height: 90 }}>
                      <canvas ref={sigCanvasRef} width={224} height={90}
                        className="w-full h-full cursor-crosshair touch-none rounded"
                        onMouseDown={startSig} onMouseMove={drawSig} onMouseUp={stopSig} onMouseLeave={stopSig}
                        onTouchStart={startSig} onTouchMove={drawSig} onTouchEnd={stopSig} />
                      <p className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs pointer-events-none select-none">Ký tên tại đây</p>
                      <button onClick={clearSig}
                        className="absolute top-1 right-1 text-[10px] text-gray-400 hover:text-red-500 bg-white rounded px-1 border border-gray-200 leading-4">Xóa</button>
                    </div>

                    <p className="font-semibold text-gray-800 border-t border-gray-400 mt-2 pt-1 text-sm">{matchedEmployee.name}</p>
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2 mt-3">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {errorMsg}
                  </div>
                )}

                <div className="flex gap-3 mt-4 pb-2">
                  <button onClick={resetToWelcome} className="px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50">Hủy</button>
                  <button onClick={handleSubmit}
                    className="flex-1 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-base transition-colors">
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
