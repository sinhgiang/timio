"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { unlockAudio, speakVi } from "@/lib/speech";
import {
  Clock, ScanFace, CheckCircle2, AlertTriangle, ClipboardCheck,
  CheckSquare, Square, UserPlus, UserMinus, PartyPopper,
} from "lucide-react";

type Phase = "info" | "loading" | "camera" | "list" | "submitting" | "done" | "empty" | "error";

interface EmployeeFace {
  id: string;
  name: string;
  code: string;
  descriptors: number[][];
}

interface Task { title: string; done: boolean; doneAt: string | null }

interface KioskChecklist {
  id: string;
  type: string;            // "onboarding" | "offboarding"
  templateName: string;
  tasks: Task[];
  status: string;
  confirmedAt: string | null;
}

interface Props {
  company: { id: string; name: string; slug: string };
  employees: EmployeeFace[];
}

export default function ChecklistKiosk({ company, employees }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectingRef = useRef(false);
  const doneScanRef = useRef(false);
  const matchCountRef = useRef(0);
  const lastMatchIdRef = useRef<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>("info");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const [matched, setMatched] = useState<EmployeeFace | null>(null);
  const [checklists, setChecklists] = useState<KioskChecklist[]>([]);
  const [allDone, setAllDone] = useState(false);

  const withFace = employees.filter((e) => e.descriptors.length > 0);

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

  const resetAll = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    stopCamera();
    doneScanRef.current = false;
    matchCountRef.current = 0;
    lastMatchIdRef.current = null;
    setMatchCount(0);
    setMatched(null);
    setChecklists([]);
    setAllDone(false);
    setErrorMsg("");
    setPhase("info");
  }, [stopCamera]);

  const loadChecklists = useCallback(async (emp: EmployeeFace) => {
    setPhase("submitting"); // reuse spinner while fetching
    try {
      const res = await fetch(`/api/kiosk/checklists?slug=${company.slug}&employeeId=${emp.id}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d.error ?? "Không tải được danh sách bàn giao");
        setPhase("error");
        return;
      }
      const data = await res.json() as { checklists: Array<Omit<KioskChecklist, "tasks"> & { tasks: string }> };
      const parsed: KioskChecklist[] = data.checklists.map((c) => {
        let tasks: Task[] = [];
        try { tasks = JSON.parse(c.tasks); } catch { tasks = []; }
        return { ...c, tasks };
      });
      setChecklists(parsed);
      if (parsed.length === 0) {
        speakVi(`Xin chào ${emp.name}. Bạn chưa có danh sách bàn giao nào.`);
        setPhase("empty");
      } else {
        speakVi(`Xin chào ${emp.name}. Vui lòng tích các mục bạn đã nhận, rồi bấm xác nhận.`);
        setPhase("list");
      }
    } catch (e) {
      setErrorMsg(`Lỗi mạng: ${e instanceof Error ? e.message : String(e)}`);
      setPhase("error");
    }
  }, [company.slug]);

  // Camera detection — nhận diện nhân viên trong công ty
  useEffect(() => {
    if (phase !== "camera") return;
    if (withFace.length === 0) return;

    let alive = true;
    const run = async () => {
      if (doneScanRef.current || !alive || detectingRef.current) {
        if (alive && !doneScanRef.current) loopRef.current = setTimeout(run, 250);
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
            setFaceDetected(true);
            if (!doneScanRef.current) {
              const frame = captureFrame(video);
              const descriptor = await extractDescriptor(frame);
              if (alive && !doneScanRef.current && descriptor) {
                const match = findBestMatch(descriptor, withFace);
                if (match && !doneScanRef.current) {
                  // Nhận diện đúng người → xác nhận NGAY (một phát là xong)
                  setMatchCount(1);
                  doneScanRef.current = true;
                  const emp = withFace.find((e) => e.id === match.id) ?? null;
                  stopCamera();
                  if (emp) { setMatched(emp); loadChecklists(emp); }
                  return;
                } else if (!match) {
                  setMatchCount(0);
                }
              }
            }
          } else {
            setFaceDetected(false);
            setMatchCount(0);
          }
        }
      } catch { /* ignore */ } finally {
        detectingRef.current = false;
        if (alive && !doneScanRef.current) loopRef.current = setTimeout(run, 250);
      }
    };
    loopRef.current = setTimeout(run, 150);
    return () => {
      alive = false;
      if (loopRef.current) clearTimeout(loopRef.current);
      detectingRef.current = false;
      setFaceDetected(false);
    };
  }, [phase, withFace, stopCamera, loadChecklists]);

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
    doneScanRef.current = false;
    matchCountRef.current = 0;
    lastMatchIdRef.current = null;
    setMatchCount(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream; setPhase("camera");
    } catch (e) {
      setErrorMsg(`Không mở camera: ${e instanceof Error ? e.message : String(e)}`);
      setPhase("error");
    }
  };

  const toggleTask = (clIdx: number, taskIdx: number) => {
    setChecklists((prev) => prev.map((cl, i) => {
      if (i !== clIdx) return cl;
      const tasks = cl.tasks.map((t, j) => j === taskIdx ? { ...t, done: !t.done } : t);
      return { ...cl, tasks };
    }));
  };

  const confirmAll = async () => {
    if (!matched) return;
    setPhase("submitting");
    try {
      const results = await Promise.all(
        checklists.map((cl) =>
          fetch(`/api/kiosk/checklists/${cl.id}/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: company.slug, employeeId: matched.id, tasks: cl.tasks }),
          }).then((r) => r.json().catch(() => ({ ok: false })))
        )
      );
      const everyDone = checklists.every((cl) => cl.tasks.length > 0 && cl.tasks.every((t) => t.done));
      const failed = results.some((r) => !r.ok);
      if (failed) {
        setErrorMsg("Một số mục lưu chưa thành công. Vui lòng thử lại.");
        setPhase("error");
        return;
      }
      setAllDone(everyDone);
      speakVi(everyDone
        ? `Cảm ơn ${matched.name}. Bạn đã xác nhận hoàn tất bàn giao.`
        : `Đã lưu. Cảm ơn ${matched.name}.`);
      setPhase("done");
      resetTimerRef.current = setTimeout(resetAll, 12000);
    } catch (e) {
      setErrorMsg(`Lỗi mạng: ${e instanceof Error ? e.message : String(e)}`);
      setPhase("error");
    }
  };

  const timeStr = currentTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = currentTime.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const isVideoPhase = phase === "camera";

  const totalTasks = checklists.reduce((s, c) => s + c.tasks.length, 0);
  const doneTasks = checklists.reduce((s, c) => s + c.tasks.filter((t) => t.done).length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-teal-900 flex flex-col select-none">
      {!isVideoPhase && (
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <div className="flex items-center gap-1.5 text-teal-300 text-sm font-medium uppercase tracking-widest">
              <ClipboardCheck size={14} /> Timio · Nhận bàn giao
            </div>
            <div className="text-white text-lg font-bold mt-0.5">{company.name}</div>
          </div>
          <div className="text-right">
            <div className="text-white text-3xl font-mono font-bold">{timeStr}</div>
            <div className="text-teal-300 text-sm capitalize">{dateStr}</div>
          </div>
        </div>
      )}

      <div className={`flex-1 flex flex-col items-center justify-center px-4 pb-8 ${isVideoPhase ? "p-0" : ""}`}>

        {/* INFO */}
        {phase === "info" && (
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 rounded-3xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center mx-auto mb-5">
              <ClipboardCheck size={40} strokeWidth={1.5} className="text-teal-300" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Xác nhận nhận bàn giao</h2>
            <p className="text-teal-100 text-sm mb-6 leading-relaxed">
              Quét khuôn mặt để xem danh sách bàn giao dành cho bạn, tích từng mục bạn đã nhận,
              rồi bấm <strong className="text-white">Xác nhận</strong>.
            </p>

            {withFace.length > 0 ? (
              <button onClick={startCamera}
                className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-white rounded-2xl font-bold text-lg shadow-2xl transition-all flex items-center justify-center gap-3">
                <ScanFace size={24} /> Quét mặt để bắt đầu
              </button>
            ) : (
              <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
                <AlertTriangle size={24} className="text-yellow-400 mx-auto mb-2" />
                <p className="text-yellow-200 text-sm">
                  Chưa có nhân viên nào đăng ký khuôn mặt. Vào Dashboard → Nhân viên để đăng ký trước.
                </p>
              </div>
            )}
          </div>
        )}

        {/* LOADING */}
        {phase === "loading" && (
          <div className="text-center">
            <ScanFace size={72} strokeWidth={1} className="text-teal-300 animate-pulse mx-auto mb-6" />
            <p className="text-white text-xl font-semibold">Đang tải AI nhận diện...</p>
          </div>
        )}

        {/* CAMERA */}
        {isVideoPhase && (
          <div className="fixed inset-0 z-40 bg-black flex flex-col md:relative md:inset-auto md:z-auto md:bg-transparent md:w-[640px] md:max-w-[90vw]">
            <div className="px-6 pt-5 pb-3 text-center">
              <p className="text-teal-200 text-sm font-semibold mb-1">Nhận bàn giao</p>
              <p className={`font-medium text-base transition-colors duration-300 ${
                matchCount > 0 ? "text-yellow-300"
                : faceDetected ? "text-teal-300" : "text-white/80"}`}>
                {faceDetected ? "Đang nhận diện..." : "Đưa mặt vào khung hình"}
              </p>
            </div>
            <div className="relative flex-1 overflow-hidden md:flex-none md:rounded-2xl md:shadow-2xl md:border-4 md:transition-colors"
              style={{ borderColor: faceDetected ? (matchCount > 0 ? "#facc15" : "#14b8a6") : "#2dd4bf" }}>
              <video ref={videoRef}
                className="w-full h-full object-cover block md:h-auto md:aspect-[4/3]"
                style={{ transform: "scaleX(-1)", transformOrigin: "50% 50%" }}
                muted playsInline autoPlay />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-44 h-56 border-4 rounded-full transition-all duration-300 ${
                  matchCount > 0 ? "border-yellow-400 opacity-90"
                  : faceDetected ? "border-teal-400 opacity-80" : "border-teal-400 opacity-30"}`} />
              </div>
            </div>
            <div className="px-6 py-6 flex justify-center">
              <button onClick={resetAll}
                className="px-10 py-3 border border-white/30 text-white/80 rounded-xl font-medium hover:bg-white/10 text-base transition-colors">Hủy</button>
            </div>
          </div>
        )}

        {/* LIST — tick từng mục */}
        {phase === "list" && matched && (
          <div className="w-full max-w-lg">
            <div className="text-center mb-4">
              <p className="text-teal-200 text-sm">Xin chào</p>
              <h2 className="text-white text-2xl font-bold">{matched.name}</h2>
              <p className="text-teal-300 text-xs mt-0.5">{matched.code}</p>
            </div>

            <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
              {checklists.map((cl, clIdx) => {
                const clDone = cl.tasks.filter((t) => t.done).length;
                return (
                  <div key={cl.id} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                      {cl.type === "onboarding"
                        ? <UserPlus size={18} className="text-teal-600" />
                        : <UserMinus size={18} className="text-orange-500" />}
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm">
                          {cl.type === "onboarding" ? "Nhận việc / Nhận tài sản" : "Nghỉ việc / Trả tài sản"}
                        </p>
                        <p className="text-xs text-gray-400">{cl.templateName}</p>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 shrink-0">{clDone}/{cl.tasks.length}</span>
                    </div>
                    <div className="px-3 py-2 divide-y divide-gray-50">
                      {cl.tasks.map((task, taskIdx) => (
                        <button key={taskIdx} onClick={() => toggleTask(clIdx, taskIdx)}
                          className="flex items-center gap-3 w-full text-left py-3 px-2 group active:bg-gray-50 rounded-lg transition-colors">
                          {task.done
                            ? <CheckSquare size={24} className="text-teal-500 shrink-0" />
                            : <Square size={24} className="text-gray-300 shrink-0 group-hover:text-gray-400" />}
                          <span className={`text-base ${task.done ? "line-through text-gray-400" : "text-gray-800"}`}>{task.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={resetAll}
                className="px-5 py-3.5 border border-white/30 text-white/80 rounded-xl font-medium hover:bg-white/10 transition-colors">Hủy</button>
              <button onClick={confirmAll}
                className="flex-1 py-3.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold text-base shadow-xl transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={20} />
                Xác nhận đã nhận ({doneTasks}/{totalTasks})
              </button>
            </div>
          </div>
        )}

        {/* SUBMITTING */}
        {phase === "submitting" && (
          <div className="text-center">
            <ScanFace size={80} strokeWidth={1} className="text-teal-300 animate-pulse mx-auto mb-6" />
            <p className="text-white text-xl font-semibold">Đang xử lý...</p>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && matched && (
          <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-center border border-white/20">
            {allDone
              ? <PartyPopper size={72} strokeWidth={1} className="text-green-400 mx-auto mb-4" />
              : <CheckCircle2 size={72} strokeWidth={1} className="text-teal-300 mx-auto mb-4" />}
            <h2 className="text-white text-2xl font-bold mb-2">{matched.name}</h2>
            <p className="text-green-300 text-lg mb-2">
              {allDone ? "Đã xác nhận hoàn tất bàn giao!" : "Đã lưu xác nhận của bạn"}
            </p>
            <p className="text-teal-100 text-sm mb-6">
              {allDone
                ? "Tất cả các mục đã được tích. Quản lý sẽ thấy bạn đã hoàn thành."
                : "Các mục bạn đã tích được lưu lại. Bạn có thể quay lại tích tiếp bất cứ lúc nào."}
            </p>
            <button onClick={resetAll}
              className="inline-block px-6 py-3 bg-teal-500 text-white rounded-xl font-medium text-sm">Xong</button>
          </div>
        )}

        {/* EMPTY */}
        {phase === "empty" && matched && (
          <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-3xl p-8 text-center border border-white/20">
            <ClipboardCheck size={64} strokeWidth={1} className="text-teal-300 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">{matched.name}</h2>
            <p className="text-teal-100 text-sm mb-6">
              Bạn chưa có danh sách bàn giao nào. Vui lòng liên hệ quản lý.
            </p>
            <button onClick={resetAll}
              className="inline-block px-6 py-3 bg-teal-500 text-white rounded-xl font-medium text-sm">Xong</button>
          </div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <div className="text-center">
            <AlertTriangle size={72} strokeWidth={1} className="text-red-400/80 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Có lỗi xảy ra</h2>
            <p className="text-red-300 mb-6 text-sm font-mono break-words max-w-xs">{errorMsg}</p>
            <button onClick={resetAll}
              className="px-8 py-3 bg-teal-500 text-white rounded-xl font-medium">Thử lại</button>
          </div>
        )}
      </div>

      {!isVideoPhase && (
        <div className="text-center pb-4">
          <a href="/login" className="text-teal-600/40 hover:text-teal-400 text-xs transition-colors">Đăng nhập quản lý</a>
        </div>
      )}
    </div>
  );
}
