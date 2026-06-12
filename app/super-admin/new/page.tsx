"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Copy, CheckCircle, Eye, EyeOff } from "lucide-react";
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
  companyName: string;
  adminEmail: string;
  password: string;
  loginUrl: string;
  checkinUrl: string;
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
    setError("");
    setLoading(true);
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
      <div className="max-w-lg mx-auto">
        <div className="bg-green-900/30 border border-green-700 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <h2 className="text-lg font-bold text-green-300">Tạo tài khoản thành công!</h2>
          </div>
          <p className="text-green-400/80 text-sm">Copy thông tin dưới đây và gửi cho khách hàng.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
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
                <p className="text-sm text-white font-mono">{item.value}</p>
              </div>
              <button
                onClick={() => copy(item.label, item.value)}
                className="shrink-0 text-gray-400 hover:text-purple-400 transition-colors"
              >
                {copiedField === item.label ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={copyAll}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {copiedField === "all" ? <><CheckCircle className="w-4 h-4" /> Đã copy!</> : <><Copy className="w-4 h-4" /> Copy toàn bộ để gửi khách</>}
        </button>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setCreated(null); setForm({ companyName: "", slug: "", adminEmail: "", adminName: "", password: "" }); }}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Tạo tài khoản khác
          </button>
          <Link href="/super-admin" className="flex-1 text-center bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
            Về danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/super-admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-purple-900 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Tạo tài khoản mới</h1>
          <p className="text-gray-400 text-sm">Tạo công ty + admin cho khách hàng</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Tên công ty *</label>
          <input
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="VD: Công ty TNHH ABC"
            required
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Slug (URL kiosk) *
            <span className="text-gray-500 font-normal ml-1">— timio.vn/checkin/<strong className="text-purple-400">{form.slug || "..."}</strong></span>
          </label>
          <input
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="vd: cong-ty-abc"
            required
            pattern="[a-z0-9-]+"
            title="Chỉ dùng chữ thường, số, và dấu gạch ngang"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-purple-500 placeholder-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Tên người quản lý</label>
          <input
            value={form.adminName}
            onChange={(e) => set("adminName", e.target.value)}
            placeholder="VD: Nguyễn Văn A"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Email đăng nhập *</label>
          <input
            type="email"
            value={form.adminEmail}
            onChange={(e) => set("adminEmail", e.target.value)}
            placeholder="admin@congtyabc.com"
            required
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Mật khẩu tạm *</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              required
              minLength={6}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-1">Khách sẽ đổi mật khẩu này sau lần đầu đăng nhập.</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
      </form>
    </div>
  );
}
