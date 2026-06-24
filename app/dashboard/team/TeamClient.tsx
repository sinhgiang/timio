"use client";

import { useState, useEffect } from "react";
import { UserPlus, Trash2, Mail, MessageCircle, Crown, Shield, Calculator, Send, X, Eye, EyeOff, Zap, Users, Check } from "lucide-react";
import Link from "next/link";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  branch: { name: string } | null;
  receiveLeaveEmail: boolean;
  receiveTelegram: boolean;
  telegramChatId: string | null;
  receiveZalo: boolean;
  zaloUserId: string | null;
  createdAt: string | Date;
}

interface Props {
  initialMembers: TeamMember[];
  currentUserEmail: string;
  currentRole: string;
  plan: string;
  subUserLimit: number;
  zaloConfigured: boolean;
  branches: { id: string; name: string }[];
}

const ROLE_LABELS: Record<string, string> = { owner: "Chủ tài khoản", manager: "Quản lý", accountant: "Kế toán" };
const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="w-3.5 h-3.5" />,
  manager: <Shield className="w-3.5 h-3.5" />,
  accountant: <Calculator className="w-3.5 h-3.5" />,
};
const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700",
  manager: "bg-blue-100 text-blue-700",
  accountant: "bg-green-100 text-green-700",
};

export default function TeamClient({ initialMembers, currentUserEmail, currentRole, plan, subUserLimit, zaloConfigured, branches }: Props) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "manager", branchId: "" });

  // Zalo OA inline setup
  const [zaloReady, setZaloReady] = useState(zaloConfigured);
  const [zaloTokenInput, setZaloTokenInput] = useState("");
  const [zaloSetupSaving, setZaloSetupSaving] = useState(false);
  const [zaloSetupMsg, setZaloSetupMsg] = useState("");
  const [showZaloSetup, setShowZaloSetup] = useState(false);

  const saveZaloOaToken = async () => {
    if (!zaloTokenInput.trim()) { setZaloSetupMsg("Vui lòng nhập token"); return; }
    setZaloSetupSaving(true);
    setZaloSetupMsg("");
    const res = await fetch("/api/company/zalo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zaloOaToken: zaloTokenInput.trim() }),
    });
    setZaloSetupSaving(false);
    if (res.ok) {
      setZaloReady(true);
      setShowZaloSetup(false);
      setZaloTokenInput("");
    } else {
      setZaloSetupMsg("Lưu thất bại, thử lại");
    }
  };

  const isOwner = currentRole === "owner";
  const subUsersCount = members.filter((m) => m.role !== "owner").length;
  const isStarterPlan = plan === "starter";
  const isBusinessPlan = plan === "business";
  const canAddMore = isOwner && !isStarterPlan && (isBusinessPlan || subUsersCount < subUserLimit);

  const addMember = async () => {
    setAddError("");
    if (!form.name || !form.email || !form.password) { setAddError("Vui lòng điền đầy đủ thông tin"); return; }
    setAdding(true);
    const res = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { setAddError(data.error ?? "Lỗi thêm thành viên"); return; }
    setMembers((prev) => [...prev, data]);
    setForm({ name: "", email: "", password: "", role: "manager", branchId: "" });
    setShowAdd(false);
  };

  const togglePref = async (id: string, field: "receiveLeaveEmail" | "receiveTelegram" | "receiveZalo", value: boolean) => {
    const res = await fetch(`/api/team/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    if (res.ok) {
      const updated = await res.json();
      setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
    }
  };

  const saveTelegram = async (id: string, chatId: string) => {
    const res = await fetch(`/api/team/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramChatId: chatId }) });
    if (res.ok) {
      const updated = await res.json();
      setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
    }
  };

  const saveZalo = async (id: string, userId: string) => {
    const res = await fetch(`/api/team/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ zaloUserId: userId }) });
    if (res.ok) {
      const updated = await res.json();
      setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm("Xóa thành viên này?")) return;
    const res = await fetch(`/api/team/${id}`, { method: "DELETE" });
    if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Thành viên nhóm</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isBusinessPlan
              ? `Gói Business — không giới hạn thành viên`
              : isStarterPlan
              ? "Gói Starter — 1 người dùng"
              : `Gói Pro — ${subUsersCount}/${subUserLimit} thành viên phụ`}
          </p>
        </div>
        {isOwner && canAddMore && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Thêm thành viên
          </button>
        )}
        {(isStarterPlan || (!isBusinessPlan && subUsersCount >= subUserLimit)) && (
          <Link
            href={isStarterPlan ? "/dashboard/billing" : "/dashboard/billing?plan=business"}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
          >
            <Zap className="w-4 h-4" />
            {isStarterPlan ? "Nâng cấp để thêm" : "Nâng cấp Business"}
          </Link>
        )}
      </div>

      {/* Upgrade callout — Starter plan */}
      {isStarterPlan && (
        <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-0.5">Thêm kế toán và quản lý vào nhóm</p>
              <p className="text-sm text-gray-500 mb-4">Gói Pro cho phép thêm tối đa 2 thành viên — họ có thể duyệt nghỉ phép, xem báo cáo mà không cần dùng chung tài khoản chủ.</p>
              <div className="flex flex-wrap gap-3 mb-4">
                {[
                  "Thêm Kế toán — chỉ xem báo cáo + xuất Excel",
                  "Thêm Quản lý — duyệt nghỉ phép, quản lý NV",
                  "Nhận thông báo Telegram / Email riêng từng người",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-500" /> {f}
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Zap className="w-4 h-4" /> Nâng cấp lên Pro — 299.000đ/tháng
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade callout — Pro hit limit */}
      {!isStarterPlan && !isBusinessPlan && subUsersCount >= subUserLimit && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-800 text-sm">Đã dùng hết {subUserLimit} thành viên phụ của gói Pro</p>
            <p className="text-xs text-amber-600 mt-0.5">Nâng cấp lên Business để thêm không giới hạn người dùng quản lý.</p>
          </div>
          <Link
            href="/dashboard/billing?plan=business"
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors whitespace-nowrap"
          >
            <Zap className="w-4 h-4" /> Lên Business
          </Link>
        </div>
      )}

      {/* Zalo OA setup banner — hiện khi chưa cấu hình và là owner */}
      {!zaloReady && isOwner && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-800">Kết nối Zalo OA để bật thông báo Zalo</p>
                <p className="text-xs text-blue-500 mt-0.5">Nhập Access Token từ Zalo Developer Console để bật thông báo qua Zalo cho từng thành viên.</p>
              </div>
            </div>
            {!showZaloSetup && (
              <button onClick={() => setShowZaloSetup(true)}
                className="shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                Cấu hình
              </button>
            )}
          </div>

          {showZaloSetup && (
            <div className="mt-4 space-y-3">
              <div className="bg-white border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Cách lấy Zalo OA Access Token:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                  <li>Vào <strong>developers.zalo.me</strong> → Đăng nhập → Tạo ứng dụng</li>
                  <li>Liên kết với Zalo Official Account của bạn tại <strong>oa.zalo.me</strong></li>
                  <li>Vào tab <strong>Official Account API</strong> → Tạo Access Token</li>
                  <li>Dán token vào ô dưới và bấm Lưu</li>
                </ol>
                <p className="text-blue-400 pt-1">Nhân viên/thành viên phải <strong>follow OA</strong> mới nhận được tin nhắn.</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={zaloTokenInput}
                  onChange={(e) => setZaloTokenInput(e.target.value)}
                  placeholder="Dán Zalo OA Access Token vào đây..."
                  className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button onClick={saveZaloOaToken} disabled={zaloSetupSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
                  {zaloSetupSaving ? "Đang lưu..." : "Lưu & kích hoạt"}
                </button>
                <button onClick={() => setShowZaloSetup(false)}
                  className="p-2 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {zaloSetupMsg && <p className="text-xs text-red-500 font-medium">{zaloSetupMsg}</p>}
            </div>
          )}
        </div>
      )}

      {/* Member list */}
      <div className="space-y-3">
        {members.map((m) => {
          const isSelf = m.email === currentUserEmail;
          const canEdit = isOwner || isSelf;
          return (
            <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">{m.name}</p>
                      {isSelf && <span className="text-xs text-gray-400">(bạn)</span>}
                      {m.branch && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                          {m.branch.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[m.role]}`}>
                    {ROLE_ICONS[m.role]} {ROLE_LABELS[m.role]}
                  </span>
                  {isOwner && m.role !== "owner" && (
                    <button onClick={() => deleteMember(m.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Notification prefs */}
              <div className="border-t border-gray-50 pt-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nhận thông báo khi nhân viên xin nghỉ</p>
                <div className="flex flex-wrap gap-3">
                  {/* Email toggle */}
                  <button
                    onClick={() => canEdit && togglePref(m.id, "receiveLeaveEmail", !m.receiveLeaveEmail)}
                    disabled={!canEdit}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      m.receiveLeaveEmail ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-400"
                    } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email {m.receiveLeaveEmail ? "BẬT" : "TẮT"}
                  </button>

                  {/* Telegram toggle */}
                  <button
                    onClick={() => canEdit && togglePref(m.id, "receiveTelegram", !m.receiveTelegram)}
                    disabled={!canEdit}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      m.receiveTelegram ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-gray-50 border-gray-200 text-gray-400"
                    } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Telegram {m.receiveTelegram ? "BẬT" : "TẮT"}
                  </button>

                  {/* Zalo toggle */}
                  {zaloReady ? (
                    <button
                      onClick={() => canEdit && togglePref(m.id, "receiveZalo", !m.receiveZalo)}
                      disabled={!canEdit}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        m.receiveZalo ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-400"
                      } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Zalo {m.receiveZalo ? "BẬT" : "TẮT"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-gray-200 text-gray-300 cursor-not-allowed">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Zalo
                      <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Chưa cấu hình OA</span>
                    </div>
                  )}
                </div>

                {/* Telegram Chat ID input */}
                {m.receiveTelegram && canEdit && (
                  <TelegramInput
                    value={m.telegramChatId ?? ""}
                    onSave={(val) => saveTelegram(m.id, val)}
                  />
                )}

                {/* Zalo User ID input */}
                {m.receiveZalo && zaloReady && canEdit && (
                  <ZaloInput
                    value={m.zaloUserId ?? ""}
                    onSave={(val) => saveZalo(m.id, val)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add member modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Thêm thành viên</h2>
              <button onClick={() => { setShowAdd(false); setAddError(""); }} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Họ tên</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Email đăng nhập</label>
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  type="email" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ketoan@cty.com" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    type={showPass ? "text" : "password"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10" placeholder="Tối thiểu 6 ký tự" />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1.5">Vai trò</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["manager", "accountant"] as const).map((r) => (
                    <button key={r} onClick={() => setForm((f) => ({ ...f, role: r }))}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                        form.role === r ? `border-blue-500 ${ROLE_COLORS[r]}` : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}>
                      {ROLE_ICONS[r]} {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {form.role === "manager"
                    ? "Có thể duyệt nghỉ phép, quản lý nhân viên, xem báo cáo"
                    : "Chỉ xem báo cáo và xuất Excel, không duyệt nghỉ phép"}
                </p>
              </div>

              {/* Branch scope — chỉ hiện khi role = manager */}
              {form.role === "manager" && branches.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1.5">Phạm vi chi nhánh</label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Toàn công ty (xem tất cả chi nhánh)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} (chỉ chi nhánh này)</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Giới hạn chi nhánh → quản lý chỉ thấy dữ liệu chi nhánh được giao</p>
                </div>
              )}
            </div>

            {addError && <p className="mt-3 text-sm text-red-500 font-medium">{addError}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); setAddError(""); }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={addMember} disabled={adding}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {adding ? "Đang thêm..." : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TelegramInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  return (
    <div className="flex gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Telegram Chat ID (ví dụ: -100123456)"
        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
      />
      <button onClick={() => onSave(val)}
        className="flex items-center gap-1 px-3 py-1.5 bg-sky-500 text-white rounded-lg text-xs font-semibold hover:bg-sky-600">
        <MessageCircle className="w-3.5 h-3.5" /> Lưu
      </button>
    </div>
  );
}

function ZaloInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(value);
  useEffect(() => { setVal(value); }, [value]);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Zalo User ID (lấy từ Zalo OA dashboard)"
          className="flex-1 border border-blue-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button onClick={() => onSave(val)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600">
          <MessageCircle className="w-3.5 h-3.5" /> Lưu
        </button>
      </div>
      <p className="text-[10px] text-gray-400">
        Người dùng phải follow Zalo OA của bạn trước. ID lấy tại: Zalo OA → Người quan tâm → chọn người → xem User ID.
      </p>
    </div>
  );
}
