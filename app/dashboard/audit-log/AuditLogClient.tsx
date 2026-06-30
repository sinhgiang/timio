"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

interface AuditRow {
  id: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  createdAt: string;
}

interface Props {
  rows: AuditRow[];
  actionTypes: string[];
  currentAction: string;
}

function formatDetail(detail: string): string {
  if (!detail) return "—";
  try {
    const obj = JSON.parse(detail) as Record<string, unknown>;
    return Object.entries(obj)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(", ");
  } catch {
    return detail.slice(0, 80);
  }
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditLogClient({ rows, actionTypes, currentAction }: Props) {
  const router = useRouter();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={24} className="text-blue-600" strokeWidth={1.5} />
            Nhật ký hoạt động
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">100 hoạt động gần nhất — hành động quản trị viên</p>
        </div>
        <select
          value={currentAction}
          onChange={(e) => {
            const val = e.target.value;
            router.push(val ? `/dashboard/audit-log?action=${val}` : "/dashboard/audit-log");
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả hành động</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>{formatAction(a)}</option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <ShieldCheck size={40} className="text-gray-200 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-gray-400 text-sm">Chưa có nhật ký nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Thời gian</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Admin</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Hành động</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Đối tượng</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                    i % 2 === 0 ? "" : "bg-gray-50/20"
                  }`}
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(row.createdAt).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    {row.adminEmail || <span className="text-gray-400 italic">system</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {formatAction(row.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {row.entityType && (
                      <span>
                        <span className="font-medium">{row.entityType}</span>
                        {row.entityId && <span className="text-gray-400"> #{row.entityId.slice(0, 8)}</span>}
                      </span>
                    )}
                    {!row.entityType && <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {formatDetail(row.detail)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
