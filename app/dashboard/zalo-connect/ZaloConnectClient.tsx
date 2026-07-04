"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageSquare, RefreshCw, Check, Link2, AlertCircle } from "lucide-react";

interface EmployeeLite {
  id: string;
  name: string;
  code: string;
  zaloUserId: string | null;
}

interface Follower {
  userId: string;
  displayName: string;
  avatar: string | null;
  mappedEmployee: { id: string; name: string } | null;
}

export default function ZaloConnectClient({
  connected,
  plan,
  oaId,
  employees,
}: {
  connected: boolean;
  plan: string;
  oaId: string | null;
  employees: EmployeeLite[];
}) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  // employeeId hiện đang gán cho từng userId (để hiển thị dropdown)
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const loadFollowers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/company/zalo/followers");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Không tải được danh sách.");
        setFollowers([]);
      } else {
        setFollowers(data.followers ?? []);
        const init: Record<string, string> = {};
        for (const f of data.followers as Follower[]) {
          if (f.mappedEmployee) init[f.userId] = f.mappedEmployee.id;
        }
        setAssignments(init);
      }
    } catch {
      setError("Lỗi kết nối.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (connected && plan !== "starter") loadFollowers();
  }, [connected, plan, loadFollowers]);

  const assign = async (userId: string, employeeId: string) => {
    setSavingId(userId);
    setAssignments((prev) => ({ ...prev, [userId]: employeeId }));
    try {
      await fetch("/api/company/zalo/followers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, employeeId: employeeId || null }),
      });
    } catch { /* ignore */ }
    setSavingId(null);
  };

  const mappedCount = Object.values(assignments).filter(Boolean).length;

  if (plan === "starter") {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
          <MessageSquare className="w-10 h-10 text-amber-500 mx-auto mb-3" strokeWidth={1.5} />
          <h1 className="font-bold text-gray-900 mb-1">Kết nối Zalo — gói Pro trở lên</h1>
          <p className="text-sm text-gray-500 mb-4">Tính năng gửi thông báo Zalo tự động có ở gói Pro và Business.</p>
          <Link href="/dashboard/billing" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">Nâng cấp</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-6 h-6 text-blue-500" strokeWidth={1.5} />
        <h1 className="text-xl font-bold text-gray-900">Kết nối Zalo nhân viên</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Gán mỗi người đã follow Zalo OA với một nhân viên. Sau khi gán, trợ lý AI và hệ thống sẽ gửi Zalo tự động cho họ.
      </p>

      {!connected && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" strokeWidth={1.5} />
          <div className="text-sm text-amber-800">
            Chưa kết nối Zalo OA. Vào{" "}
            <Link href="/dashboard/settings" className="font-semibold underline">Cài đặt → Thông báo Zalo</Link>{" "}
            để nhập Access Token trước.
          </div>
        </div>
      )}

      {/* Hướng dẫn nhân viên follow */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
        <p className="text-sm font-semibold text-blue-800 mb-1.5 flex items-center gap-1.5">
          <Link2 className="w-4 h-4" strokeWidth={1.5} /> Cho nhân viên follow OA
        </p>
        <p className="text-xs text-blue-600 mb-2">
          Gửi nhân viên link này (hoặc mã QR OA của bạn) để họ bấm <strong>Quan tâm</strong>. Sau đó bấm “Tải lại danh sách” và gán tên.
        </p>
        {oaId ? (
          <a
            href={`https://zalo.me/${oaId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-700 underline break-all"
          >
            https://zalo.me/{oaId}
          </a>
        ) : (
          <p className="text-xs text-blue-500">Nhập OA ID trong Cài đặt để hiện link follow tại đây.</p>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">
          {loading ? "Đang tải..." : `${followers.length} người follow · ${mappedCount} đã gán`}
        </p>
        <button
          onClick={loadFollowers}
          disabled={loading || !connected}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} /> Tải lại danh sách
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-2">
        {followers.map((f) => (
          <div key={f.userId} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3">
            {f.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-400 font-semibold">
                {f.displayName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{f.displayName}</p>
              <p className="text-xs text-gray-400">Zalo follower</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={assignments[f.userId] ?? ""}
                onChange={(e) => assign(f.userId, e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 max-w-[180px]"
              >
                <option value="">— Chưa gán —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                ))}
              </select>
              {savingId === f.userId ? (
                <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
              ) : assignments[f.userId] ? (
                <Check className="w-4 h-4 text-green-500" strokeWidth={2} />
              ) : (
                <span className="w-4" />
              )}
            </div>
          </div>
        ))}
        {!loading && connected && followers.length === 0 && !error && (
          <div className="text-center text-sm text-gray-400 py-8">
            Chưa có ai follow OA. Gửi link/QR ở trên cho nhân viên, rồi bấm “Tải lại danh sách”.
          </div>
        )}
      </div>
    </div>
  );
}
