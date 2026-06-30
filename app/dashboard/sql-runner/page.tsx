"use client";

import { useState } from "react";
import { Database, Play, CheckCircle2, XCircle, Copy } from "lucide-react";

export default function SqlRunnerPage() {
  const [sql, setSql] = useState("");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<{ ok?: boolean; rowsAffected?: number; rows?: unknown[]; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"execute" | "query">("execute");
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!sql.trim() || !token.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      if (mode === "execute") {
        const res = await fetch("/api/admin/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sql }),
        });
        setResult(await res.json() as { ok?: boolean; rowsAffected?: number; error?: string });
      } else {
        const res = await fetch(`/api/admin/migrate?sql=${encodeURIComponent(sql)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResult(await res.json() as { ok?: boolean; rows?: unknown[]; error?: string });
      }
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const curlCommand = `curl -X POST https://timio.vn/api/admin/migrate \\\n  -H "Authorization: Bearer ${token || "<TOKEN>"}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"sql":"${(sql || "ALTER TABLE ...").replace(/\n/g, "\\n").replace(/'/g, "'\\''")}"}'`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
          <Database size={20} className="text-red-600" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">SQL Runner</h1>
          <p className="text-sm text-gray-500">Chạy SQL trực tiếp lên Neon production — chỉ dành cho owner</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        <strong>Cảnh báo:</strong> Endpoint này chạy SQL trực tiếp lên database production. Chỉ dùng để chạy migration (ALTER TABLE, CREATE TABLE, CREATE INDEX).
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SUPABASE_ACCESS_TOKEN</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="sbp_..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setMode("execute")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "execute" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              Execute (DDL / DML)
            </button>
            <button
              onClick={() => setMode("query")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "query" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              Query (SELECT)
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">SQL</label>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={10}
          placeholder={'ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS ...'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>

      <button
        onClick={run}
        disabled={loading || !sql.trim() || !token.trim()}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
      >
        <Play size={15} />
        {loading ? "Running..." : "Run SQL"}
      </button>

      {result && (
        <div className={`rounded-xl border p-4 mb-6 ${result.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.ok
              ? <CheckCircle2 size={16} className="text-green-600" />
              : <XCircle size={16} className="text-red-600" />}
            <span className={`font-semibold text-sm ${result.ok ? "text-green-700" : "text-red-700"}`}>
              {result.ok
                ? `Thành công — ${result.rowsAffected ?? 0} rows affected`
                : `Lỗi: ${result.error}`}
            </span>
          </div>
          {result.rows && Array.isArray(result.rows) && result.rows.length > 0 && (
            <pre className="text-xs font-mono overflow-auto max-h-64 bg-white rounded p-2 border border-green-200">
              {JSON.stringify(result.rows, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="bg-gray-900 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Curl command (Claude dùng để tự chạy)</span>
          <button onClick={() => copy(curlCommand)} className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-xs">
            <Copy size={13} />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">{curlCommand}</pre>
      </div>
    </div>
  );
}
