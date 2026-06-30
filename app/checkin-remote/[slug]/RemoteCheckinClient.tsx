"use client";

import { useState } from "react";
import { MapPin, LogIn, Clock, CheckCircle2, XCircle, Loader2, Smartphone } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  gpsRadius: number;
  checkInTime: string;
  checkOutTime: string;
  gracePeriod: number;
}

interface Props {
  companyId: string;
  companyName: string;
  slug: string;
  branches: Branch[];
}

type Phase = "login" | "gps" | "submitting" | "success" | "error";

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function RemoteCheckinClient({ companyId, companyName, slug, branches }: Props) {
  const [phase, setPhase] = useState<Phase>("login");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [action, setAction] = useState<"checkin" | "checkout">("checkin");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ name: string; status: string; time: string } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !pin.trim()) { setError("Vui lòng nhập mã NV và PIN"); return; }
    setError("");
    setPhase("gps");
    setGpsStatus("Đang lấy vị trí GPS...");

    if (!navigator.geolocation) {
      setError("Thiết bị của bạn không hỗ trợ GPS");
      setPhase("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsStatus(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)}m)`);

        // Check if employee's branch has GPS configured
        // We'll pass lat/lng to the API and let it validate
        setPhase("submitting");
        try {
          const res = await fetch("/api/attendance/checkin-remote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug,
              code: code.toUpperCase().trim(),
              pin: pin.trim(),
              action,
              latitude,
              longitude,
              accuracy,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Lỗi không xác định");
            setPhase("error");
          } else {
            setResult(data);
            setPhase("success");
            setTimeout(() => {
              setPhase("login");
              setCode("");
              setPin("");
              setResult(null);
              setError("");
            }, 6000);
          }
        } catch {
          setError("Lỗi kết nối. Vui lòng thử lại.");
          setPhase("error");
        }
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: "Bạn đã từ chối chia sẻ vị trí. Vui lòng cấp quyền GPS và thử lại.",
          2: "Không thể lấy vị trí GPS. Vui lòng thử ngoài trời.",
          3: "Hết thời gian lấy GPS. Vui lòng thử lại.",
        };
        setError(msgs[err.code] ?? "Lỗi GPS không xác định");
        setPhase("error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  const branchesWithGps = branches.filter((b) => b.lat !== null && b.lng !== null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-blue-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
            <Smartphone size={28} className="text-white" />
          </div>
          <h1 className="text-white text-xl font-bold">{companyName}</h1>
          <p className="text-blue-300 text-sm mt-1">Chấm công từ xa</p>
        </div>

        {/* Login phase */}
        {phase === "login" && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-white font-semibold text-center mb-5">Đăng nhập để chấm công</h2>
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 mb-4 text-red-300 text-sm text-center">
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-blue-200 text-xs font-medium block mb-1.5">Mã nhân viên</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="VD: NV001"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-400 font-mono text-lg tracking-widest"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-medium block mb-1.5">Mã PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-400 font-mono text-lg tracking-widest"
                  autoComplete="off"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-medium block mb-1.5">Hành động</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["checkin", "checkout"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAction(a)}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                        action === a
                          ? "bg-blue-500 text-white shadow-lg"
                          : "bg-white/10 text-white/60 border border-white/10"
                      }`}
                    >
                      {a === "checkin" ? "Check-in" : "Check-out"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <MapPin size={18} />
                Lấy GPS & Chấm công
              </button>
            </form>
            {branchesWithGps.length === 0 && (
              <p className="text-yellow-400/80 text-xs text-center mt-4">
                ⚠️ Công ty chưa cấu hình tọa độ GPS cho chi nhánh. Vui lòng liên hệ admin.
              </p>
            )}
          </div>
        )}

        {/* GPS Getting phase */}
        {phase === "gps" && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
            <div className="w-16 h-16 bg-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <MapPin size={28} className="text-blue-400" />
            </div>
            <p className="text-white font-semibold mb-2">Đang lấy vị trí GPS...</p>
            <p className="text-blue-300 text-sm">{gpsStatus || "Vui lòng không di chuyển"}</p>
            <p className="text-white/40 text-xs mt-3">Nếu trình duyệt hỏi quyền vị trí, hãy nhấn "Cho phép"</p>
          </div>
        )}

        {/* Submitting */}
        {phase === "submitting" && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
            <Loader2 size={32} className="text-blue-400 mx-auto mb-4 animate-spin" />
            <p className="text-white font-semibold">Đang xác nhận chấm công...</p>
            <p className="text-blue-300 text-sm mt-1">{gpsStatus}</p>
          </div>
        )}

        {/* Success */}
        {phase === "success" && result && (
          <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-8 border border-green-400/30 text-center">
            <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
            <p className="text-white text-lg font-bold mb-1">{result.name}</p>
            <p className="text-green-300 font-semibold text-xl mb-1">{result.status}</p>
            <p className="text-white/60 text-sm">{result.time}</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <MapPin size={14} className="text-green-400" />
              <span className="text-green-300 text-xs">GPS xác nhận thành công</span>
            </div>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="bg-red-500/20 backdrop-blur-sm rounded-2xl p-8 border border-red-400/30 text-center">
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-white font-semibold mb-2">Chấm công thất bại</p>
            <p className="text-red-300 text-sm mb-6">{error}</p>
            <button
              onClick={() => { setPhase("login"); setError(""); }}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl transition-colors text-sm font-medium"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Info footer */}
        <div className="mt-6 text-center text-white/30 text-xs flex items-center justify-center gap-2">
          <Clock size={11} />
          <span>Yêu cầu GPS · Timio Remote Check-in</span>
        </div>
      </div>
    </div>
  );
}
