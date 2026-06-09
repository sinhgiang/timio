"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  code: string;
  department: string | null;
  branchId: string;
  branchName: string;
  checkInTime: string;
  gracePeriod: number;
}

interface Branch {
  id: string;
  name: string;
  checkInTime: string;
  checkOutTime: string;
  gracePeriod: number;
}

interface PenaltyRule {
  id: string;
  fromMinutes: number;
  toMinutes: number;
  amount: number;
}

interface Props {
  company: { id: string; name: string; slug: string };
  branches: Branch[];
  employees: Employee[];
  penaltyRules: PenaltyRule[];
}

type Step = "select" | "pin" | "action" | "result";

interface CheckInResult {
  status: "on_time" | "late" | "very_late" | "already_checked_in";
  minutesLate: number;
  penaltyAmount: number;
  message: string;
  action: "check_in" | "check_out";
}

export default function CheckInKiosk({
  company,
  employees,
  penaltyRules,
}: Props) {
  const [step, setStep] = useState<Step>("select");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoResetTimer, setAutoResetTimer] = useState<number>(5);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const resetToHome = useCallback(() => {
    setStep("select");
    setSearch("");
    setSelectedEmployee(null);
    setPin("");
    setPinError("");
    setResult(null);
  }, []);

  useEffect(() => {
    if (step === "result") {
      let count = 5;
      setAutoResetTimer(count);
      const timer = setInterval(() => {
        count--;
        setAutoResetTimer(count);
        if (count <= 0) {
          clearInterval(timer);
          resetToHome();
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, resetToHome]);

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setStep("pin");
    setPin("");
    setPinError("");
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => handlePinSubmit(newPin), 100);
      }
    }
  };

  const handlePinDelete = () => {
    setPin((p) => p.slice(0, -1));
    setPinError("");
  };

  const handlePinSubmit = async (pinValue: string) => {
    if (!selectedEmployee) return;
    setLoading(true);
    setPinError("");

    try {
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          pin: pinValue,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setPinError("PIN không đúng. Thử lại.");
          setPin("");
        } else {
          setPinError(data.error ?? "Có lỗi xảy ra.");
          setPin("");
        }
        setLoading(false);
        return;
      }

      setResult(data);
      setStep("result");
    } catch {
      setPinError("Lỗi kết nối. Thử lại.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const timeStr = currentTime.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const dateStr = currentTime.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="kiosk-mode min-h-screen bg-gradient-to-br from-blue-700 to-blue-900 flex flex-col">
      {/* Header */}
      <div className="text-center pt-6 pb-4 px-4">
        <h1 className="text-white text-2xl font-bold">{company.name}</h1>
        <div className="text-blue-100 text-4xl font-mono font-bold mt-1">
          {timeStr}
        </div>
        <div className="text-blue-200 text-sm mt-1 capitalize">{dateStr}</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center px-4 pb-6">
        <div className="w-full max-w-md">

          {/* STEP: Chọn nhân viên */}
          {step === "select" && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-4 bg-blue-50 border-b">
                <h2 className="text-lg font-semibold text-gray-700 text-center">
                  Chọn nhân viên
                </h2>
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mã..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mt-3 w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoComplete="off"
                />
              </div>
              <div className="max-h-96 overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">
                    Không tìm thấy nhân viên
                  </p>
                ) : (
                  filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      className="w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                    >
                      <div className="font-semibold text-gray-800 text-base">
                        {emp.name}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {emp.code}
                        {emp.department ? ` · ${emp.department}` : ""}
                        {" · "}{emp.branchName}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP: Nhập PIN */}
          {step === "pin" && selectedEmployee && (
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <button
                onClick={resetToHome}
                className="text-blue-600 text-sm mb-4 flex items-center gap-1"
              >
                ← Quay lại
              </button>
              <div className="text-center mb-6">
                <div className="text-2xl font-bold text-gray-800">
                  {selectedEmployee.name}
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  Ca: {selectedEmployee.checkInTime} · {selectedEmployee.branchName}
                </div>
              </div>

              <p className="text-center text-gray-600 mb-4 font-medium">
                Nhập PIN 4 số
              </p>

              {/* PIN dots */}
              <div className="flex justify-center gap-4 mb-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      i < pin.length
                        ? "bg-blue-600 border-blue-600"
                        : "border-gray-300"
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <p className="text-center text-red-500 text-sm mb-3">
                  {pinError}
                </p>
              )}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((key, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (key === "⌫") handlePinDelete();
                      else if (key !== "") handlePinDigit(String(key));
                    }}
                    disabled={loading || key === ""}
                    className={`h-16 rounded-xl text-2xl font-semibold transition-all
                      ${key === "" ? "invisible" : ""}
                      ${key === "⌫"
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                        : "bg-blue-50 text-blue-800 hover:bg-blue-100 active:bg-blue-200 border border-blue-100"
                      }
                      ${loading ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    {loading && key === 0 ? "..." : key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP: Kết quả */}
          {step === "result" && result && selectedEmployee && (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div
                className={`text-6xl mb-4 ${
                  result.status === "on_time"
                    ? "text-green-500"
                    : result.status === "late"
                    ? "text-yellow-500"
                    : result.status === "very_late"
                    ? "text-red-500"
                    : "text-blue-500"
                }`}
              >
                {result.status === "on_time"
                  ? "✅"
                  : result.status === "late"
                  ? "⚠️"
                  : result.status === "very_late"
                  ? "❌"
                  : "✅"}
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                {selectedEmployee.name}
              </h2>

              <div className="text-lg font-semibold mt-3">
                {result.action === "check_in" ? "VÀO CA" : "RA CA"} lúc{" "}
                <span className="text-blue-600 font-mono">
                  {new Date().toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </span>
              </div>

              <div
                className={`mt-3 text-base font-medium ${
                  result.status === "on_time"
                    ? "text-green-600"
                    : result.status === "late"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {result.message}
              </div>

              {result.penaltyAmount > 0 && (
                <div className="mt-2 text-red-500 font-bold text-lg">
                  Phạt: {formatCurrency(result.penaltyAmount)}
                </div>
              )}

              <div className="mt-6 text-gray-400 text-sm">
                Tự động đóng sau {autoResetTimer}s
              </div>

              <button
                onClick={resetToHome}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800"
              >
                Xong
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
