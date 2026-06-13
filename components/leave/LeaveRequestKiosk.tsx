"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { EmployeeFaceData } from "@/lib/faceApi";
import { unlockAudio } from "@/lib/speech";
import { Clock, UserCircle, ScanFace, CheckCircle2, AlertTriangle, Cpu } from "lucide-react";

type Phase = "welcome" | "loading" | "camera" | "head_turn" | "form" | "submitting" | "success" | "error";

interface Employee extends EmployeeFaceData {
  code: string;
  annualLeaveBalance: number;
}

interface Props {
  company: { id: string; name: string; slug: string };
  employees: Employee[];
}

const LEAVE_TYPES = [
  { value: "annual", label: "Nghỉ phép năm" },
  { value: "sick", label: "Nghỉ ốm / Bệnh" },
  { value: "unpaid", label: "Nghỉ không lương" },
  { value: "maternity", label: "Nghỉ thai sản / chăm con" },
  { value: "other", label: "Lý do khác" },
] as const;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function calcDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const d = (new Date(to).getTime() - new Date(from).getTime()) / 86400000 + 1;
  return d > 0 ? d : 0;
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
  const headTurnTargetRef = useRef<Employee | null>(null);
  const headTurnBaselineRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("welcome");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [headTurnDir, setHeadTurnDir] = useState<"left" | "right">("left");
  const [headTurnCountdown, setHeadTurnCountdown] = useState(5);
  const [zoomStyle, setZoomStyle] = useState({ scale: 1, tx: 0, ty: 0 });

  // Form state
  const [matchedEmployee, setMatchedEmployee] = useState<Employee | null>(null);
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [leaveType, setLeaveType] = useState<string>("annual");
  const [q1, setQ1] = useState(""); // lý do
  const [q2, setQ2] = useState(""); // bàn giao
  const [q3, setQ3] = useState<"yes" | "no">("yes"); // liên lạc được không
  const [q3Phone, setQ3Phone] = useState(""); // số điện thoại
  const [q4, setQ4] = useState(""); // khẩn cấp
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
    setFromDate(todayStr());
    setToDate(todayStr());
    setLeaveType("annual");
    setQ1(""); setQ2(""); setQ3("yes"); setQ3Phone(""); setQ4("");
  }, [stopCamera]);

  // Gán stream vào video
  useEffect(() => {
    if ((phase === "camera" || phase === "head_turn") && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [phase]);

  // Camera detection loop
  useEffect(() => {
    if (phase !== "camera") return;
    let alive = true;

    const run = async () => {
      if (autoCheckingRef.current) return;
      if (!alive || detectingRef.current) {
        if (alive) loopRef.current = setTimeout(run, 500);
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
            const vW = video.videoWidth || 640;
            const vH = video.videoHeight || 480;
            const fcX = box.x + box.width / 2;
            const fcY = box.y + box.height / 2;
            const scale = Math.max(1, Math.min(3.0, (vH * 0.55) / box.height));
            setZoomStyle({
              scale,
              tx: (0.5 - fcX / vW) * scale * 100,
              ty: (0.5 - fcY / vH) * scale * 100,
            });
            setFaceDetected(true);

            const registered = employees.filter((e) => e.descriptors.length > 0);
            if (registered.length > 0 && !autoCheckingRef.current) {
              const frame = captureFrame(video);
              const descriptor = await extractDescriptor(frame);
              if (alive && !autoCheckingRef.current && descriptor) {
                const match = findBestMatch(descriptor, registered);
                if (match) {
                  if (match.id === lastMatchIdRef.current) {
                    matchCountRef.current++;
                  } else {
                    matchCountRef.current = 1;
                    lastMatchIdRef.current = match.id;
                  }
                  setMatchCount(matchCountRef.current);
                  if (matchCountRef.current >= 2 && !autoCheckingRef.current) {
                    autoCheckingRef.current = true;
                    const emp = employees.find((e) => e.id === match.id) ?? null;
                    const dir = Math.random() < 0.5 ? "left" : "right";
                    headTurnDirRef.current = dir;
                    headTurnTargetRef.current = emp;
                    headTurnBaselineRef.current = null;
                    setHeadTurnDir(dir);
                    setPhase("head_turn");
                    return;
                  }
                } else {
                  matchCountRef.current = 0;
                  lastMatchIdRef.current = null;
                  setMatchCount(0);
                }
              }
            }
          } else {
            setZoomStyle({ scale: 1, tx: 0, ty: 0 });
            setFaceDetected(false);
            matchCountRef.current = 0;
            lastMatchIdRef.current = null;
            setMatchCount(0);
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
      detectingRef.current = false;
      setZoomStyle({ scale: 1, tx: 0, ty: 0 });
      setFaceDetected(false);
      matchCountRef.current = 0;
      lastMatchIdRef.current = null;
      autoCheckingRef.current = false;
      setMatchCount(0);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Head turn detection
  useEffect(() => {
    if (phase !== "head_turn") return;
    let alive = true;
    let cdVal = 5;
    setHeadTurnCountdown(cdVal);

    const cdInterval = setInterval(() => {
      cdVal--;
      setHeadTurnCountdown(cdVal);
      if (cdVal <= 0) {
        clearInterval(cdInterval);
        if (alive) {
          alive = false;
          if (loopRef.current) clearTimeout(loopRef.current);
          headTurnBaselineRef.current = null;
          headTurnTargetRef.current = null;
          matchCountRef.current = 0;
          lastMatchIdRef.current = null;
          setMatchCount(0);
          setPhase("camera");
        }
      }
    }, 1000);

    const run = async () => {
      if (!alive) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        if (alive) loopRef.current = setTimeout(run, 200);
        return;
      }
      try {
        const { detectFaceBox } = await import("@/lib/faceApi");
        const box = await detectFaceBox(video);
        if (alive && box) {
          const vW = video.videoWidth || 640;
          const centerX = (box.x + box.width / 2) / vW;
          if (headTurnBaselineRef.current === null) {
            headTurnBaselineRef.current = centerX;
          } else {
            const displacement = centerX - headTurnBaselineRef.current;
            const dir = headTurnDirRef.current;
            const moved = dir === "left" ? displacement > 0.15 : displacement < -0.15;
            if (moved) {
              clearInterval(cdInterval);
              alive = false;
              const emp = headTurnTargetRef.current;
              stopCamera();
              if (emp) {
                setMatchedEmployee(emp);
                setPhase("form");
              } else {
                setPhase("camera");
              }
              return;
            }
          }
        }
      } catch { /* ignore */ }
      if (alive) loopRef.current = setTimeout(run, 150);
    };

    loopRef.current = setTimeout(run, 700);
    return () => {
      alive = false;
      clearInterval(cdInterval);
      if (loopRef.current) clearTimeout(loopRef.current);
    };
  }, [phase, stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCamera = async () => {
    unlockAudio();
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

  const handleSubmit = async () => {
    if (!matchedEmployee) return;
    if (q1.trim().length < 10) { setErrorMsg("Vui lòng mô tả lý do nghỉ (tối thiểu 10 ký tự)"); return; }
    if (q2.trim().length < 5) { setErrorMsg("Vui lòng điền thông tin bàn giao công việc"); return; }
    const days = calcDays(fromDate, toDate);
    if (days <= 0) { setErrorMsg("Ngày kết thúc phải sau ngày bắt đầu"); return; }

    setErrorMsg("");
    setPhase("submitting");

    const reason = [
      `[Lý do] ${q1.trim()}`,
      `[Bàn giao] ${q2.trim()}`,
      `[Liên lạc] ${q3 === "yes" ? `Có - ${q3Phone || "chưa cung cấp SĐT"}` : "Không"}`,
      q4.trim() ? `[Ghi thêm] ${q4.trim()}` : "",
    ].filter(Boolean).join("\n");

    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: matchedEmployee.id,
          companyId: company.id,
          type: leaveType,
          fromDate,
          toDate,
          days,
          reason,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErrorMsg(d.error ?? "Gửi đơn thất bại");
        setPhase("form");
        return;
      }
      setPhase("success");
      setTimeout(() => resetToWelcome(), 10000);
    } catch (e) {
      setErrorMsg(`Lỗi: ${e instanceof Error ? e.message : String(e)}`);
      setPhase("form");
    }
  };

  const timeStr = currentTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = currentTime.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const isVideoPhase = phase === "camera" || phase === "head_turn";
  const days = calcDays(fromDate, toDate);

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
            <h2 className="text-white text-3xl font-bold mb-2">Xin nghỉ phép</h2>
            <p className="text-blue-200 text-lg mb-10">Quét mặt để xác nhận danh tính</p>
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white text-xl font-bold rounded-2xl shadow-2xl transition-all"
            >
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
                faceDetected ? "text-blue-300" : "text-white/80"
              }`}>
                {phase === "head_turn" ? "Xác thực chống gian lận"
                  : faceDetected ? (matchCount > 0 ? `Đang xác nhận... (${matchCount}/2)` : "Đang xác nhận danh tính...")
                  : "Đưa mặt vào khung hình"}
              </p>
            </div>

            <div
              className="relative flex-1 overflow-hidden md:flex-none md:rounded-2xl md:shadow-2xl md:border-4 md:transition-colors"
              style={{ borderColor: phase === "head_turn" ? "#f97316" : faceDetected ? (matchCount > 0 ? "#facc15" : "#22c55e") : "#4ade80" }}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-cover block md:h-auto md:aspect-[4/3]"
                style={{ transform: `translate(${zoomStyle.tx}%, ${zoomStyle.ty}%) scale(${zoomStyle.scale})`, transition: "transform 0.5s ease", transformOrigin: "50% 50%" }}
                muted playsInline autoPlay
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-44 h-56 border-4 rounded-full transition-all duration-300 ${
                  phase === "head_turn" ? "border-orange-400 opacity-90"
                  : matchCount > 0 ? "border-yellow-400 opacity-90"
                  : faceDetected ? "border-green-400 opacity-80" : "border-green-400 opacity-30"
                }`} />
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
              <button onClick={resetToWelcome} className="px-10 py-3 border border-white/30 text-white/80 rounded-xl font-medium hover:bg-white/10 text-base transition-colors">
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* FORM — giống tờ giấy A4 */}
        {phase === "form" && matchedEmployee && (
          <div className="w-full max-w-2xl mx-auto">
            {/* Header kiosk nhỏ */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div>
                <p className="text-blue-300 text-xs uppercase tracking-widest">Đơn xin nghỉ phép</p>
                <p className="text-white font-bold text-lg">{company.name}</p>
              </div>
              <div className="text-right">
                <div className="text-white text-xl font-mono">{timeStr}</div>
                <div className="text-blue-300 text-xs">{dateStr}</div>
              </div>
            </div>

            {/* Tờ giấy trắng */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Tiêu đề */}
              <div className="bg-blue-700 px-8 py-5 text-center">
                <h2 className="text-white font-bold text-xl tracking-widest">ĐƠN XIN NGHỈ PHÉP</h2>
                <p className="text-blue-200 text-sm mt-1">Vui lòng điền đầy đủ và trung thực</p>
              </div>

              {/* Thông tin nhân viên */}
              <div className="bg-blue-50 border-b border-blue-100 px-8 py-4 flex flex-wrap gap-6 text-sm">
                <div><span className="text-gray-500">Họ tên:</span> <span className="font-bold text-gray-800">{matchedEmployee.name}</span></div>
                <div><span className="text-gray-500">Mã NV:</span> <span className="font-semibold">{matchedEmployee.code}</span></div>
                {leaveType === "annual" && (
                  <div><span className="text-gray-500">Phép còn lại:</span> <span className="font-bold text-blue-700">{matchedEmployee.annualLeaveBalance} ngày</span></div>
                )}
              </div>

              <div className="px-8 py-6 space-y-6">
                {/* Ngày + loại nghỉ */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Từ ngày</label>
                    <input type="date" value={fromDate} min={todayStr()}
                      onChange={(e) => { setFromDate(e.target.value); if (e.target.value > toDate) setToDate(e.target.value); }}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Đến ngày</label>
                    <input type="date" value={toDate} min={fromDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Loại nghỉ</label>
                    <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-base focus:border-blue-500 focus:outline-none"
                    >
                      {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="text-center pt-5">
                    <div className="text-3xl font-bold text-blue-700">{days}</div>
                    <div className="text-xs text-gray-500">ngày</div>
                  </div>
                </div>

                {/* Câu hỏi 1 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    1. Lý do bạn xin nghỉ là gì? <span className="text-red-500">*</span>
                  </label>
                  <textarea rows={3} value={q1} onChange={(e) => setQ1(e.target.value)}
                    placeholder="Mô tả cụ thể lý do bạn cần nghỉ..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{q1.length} ký tự (tối thiểu 10)</p>
                </div>

                {/* Câu hỏi 2 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    2. Trong thời gian nghỉ, công việc của bạn sẽ được ai xử lý? <span className="text-red-500">*</span>
                  </label>
                  <textarea rows={2} value={q2} onChange={(e) => setQ2(e.target.value)}
                    placeholder="VD: Anh/chị Nguyễn Văn A sẽ thay thế, hoặc công việc sẽ tạm hoãn..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Câu hỏi 3 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    3. Bạn có thể liên lạc được qua điện thoại trong thời gian nghỉ không? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 mb-3">
                    {(["yes", "no"] as const).map((v) => (
                      <button key={v} onClick={() => setQ3(v)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          q3 === v ? (v === "yes" ? "bg-blue-600 border-blue-600 text-white" : "bg-red-500 border-red-500 text-white")
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {v === "yes" ? "✓ Có thể liên lạc" : "✗ Không liên lạc được"}
                      </button>
                    ))}
                  </div>
                  {q3 === "yes" && (
                    <input type="tel" value={q3Phone} onChange={(e) => setQ3Phone(e.target.value)}
                      placeholder="Số điện thoại liên lạc..."
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-base focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>

                {/* Câu hỏi 4 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    4. Có tình huống khẩn cấp nào cần quản lý biết thêm không? <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                  </label>
                  <textarea rows={2} value={q4} onChange={(e) => setQ4(e.target.value)}
                    placeholder="Để trống nếu không có..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {errorMsg}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button onClick={resetToWelcome} className="px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-base hover:bg-gray-50">
                    Hủy
                  </button>
                  <button onClick={handleSubmit}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base transition-colors"
                  >
                    Gửi đơn xin nghỉ
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

        {/* SUCCESS */}
        {phase === "success" && matchedEmployee && (
          <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-center border border-white/20">
            <CheckCircle2 size={72} strokeWidth={1} className="text-blue-400 mx-auto mb-4" />
            <h2 className="text-white text-2xl font-bold mb-2">{matchedEmployee.name}</h2>
            <p className="text-blue-200 text-lg mb-1">Đơn đã được gửi thành công!</p>
            <p className="text-blue-300 text-sm mb-4">
              Nghỉ từ {fromDate} → {toDate} ({days} ngày)
            </p>
            <p className="text-white/50 text-sm">Quản lý sẽ xem xét và thông báo cho bạn.</p>
            <p className="text-blue-400 text-xs mt-6">Tự động đóng sau 10 giây...</p>
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
