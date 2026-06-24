"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Copy, CheckCircle, Eye, EyeOff, Plus } from "lucide-react";
import Link from "next/link";

function toSlug(str: string) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

interface CreatedAccount {
  companyName: string; adminEmail: string; password: string;
  loginUrl: string; checkinUrl: string;
}

export default function NewCompanyPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: "", slug: "", adminEmail: "", adminName: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedAccount | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "companyName") next.slug = toSlug(v);
      return next;
    });
  };

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = () => {
    if (!created) return;
    const msg = `Xin chào!\n\nThông tin đăng nhập phần mềm Timio:\n\n🌐 Đăng nhập: ${created.loginUrl}\n📧 Email: ${created.adminEmail}\n🔑 Mật khẩu: ${created.password}\n\n📱 Màn hình chấm công nhân viên: ${created.checkinUrl}\n\nVui lòng đổi mật khẩu sau khi đăng nhập lần đầu.\n\nHỗ trợ: Liên hệ Timio khi cần giúp đỡ.`;
    navigator.clipboard.writeText(msg);
    setCopiedField("all");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/super-admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Lỗi tạo tài khoản"); return; }
      setCreated(data);
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-green-800">Tạo tài khoản thành công!</h2>
          </div>
          <p className="text-green-700 text-sm">Copy thông tin dưới đây và gửi cho khách hàng.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          {[
            { label: "Tên công ty", value: created.companyName },
            { label: "Email đăng nhập", value: created.adminEmail },
            { label: "Mật khẩu tạm", value: created.password },
            { label: "Link đăng nhập", value: created.loginUrl },
            { label: "Kiosk chấm công", value: created.checkinUrl },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                <p className="text-sm text-gray-900 font-mono">{item.value}</p>
              </div>
              <button onClick={() => copy(item.label, item.value)} className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors">
                {copiedField === item.label ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={copyAll}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {copiedField === "all" ? <><CheckCircle className="w-4 h-4" /> Đã copy!</> : <><Copy className="w-4 h-4" /> Copy toàn bộ để gửi khách</>}
        </button>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setCreated(null); setForm({ companyName: "", slug: "", adminEmail: "", adminName: "", password: "" }); }}
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Tạo tài khoản khác
          </button>
          <Link href="/admin/companies" className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Về danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Link href="/admin/companies" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tạo tài khoản mới</h1>
          <p className="text-gray-500 text-sm">Tạo công ty + admin cho khách hàng</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên công ty *</label>
          <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)}
            placeholder="VD: Công ty TNHH ABC" required
            className="w-full border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Slug (URL kiosk) *
            <span className="text-gray-400 font-normal ml-1">— timio.vn/checkin/<strong className="text-blue-600">{form.slug || "..."}</strong></span>
          </label>
          <input value={form.slug} onChange={(e) => set("slug", e.target.value)}
            placeholder="vd: cong-ty-abc" required pattern="[a-z0-9-]+"
            title="Chỉ dùng chữ thường, số, và dấu gạch ngang"
            className="w-full border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên người quản lý</label>
          <input value={form.adminName} onChange={(e) => set("adminName", e.target.value)}
            placeholder="VD: Nguyễn Văn A"
            className="w-full border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email đăng nhập *</label>
          <input type="email" value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)}
            placeholder="admin@congtyabc.com" required
            className="w-full border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu tạm *</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)}
              placeholder="Tối thiểu 6 ký tự" required minLength={6}
              className="w-full border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-gray-400 text-xs mt-1">Khách sẽ đổi mật khẩu này sau lần đầu đăng nhập.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          {loading ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
      </form>
    </div>
  );
}
