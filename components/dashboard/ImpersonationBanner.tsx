"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Eye, X, ArrowLeft } from "lucide-react";

export default function ImpersonationBanner({ companyName, companyId }: { companyName: string; companyId: string }) {
  const { update } = useSession();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const handleExit = async () => {
    setLeaving(true);
    await fetch("/api/admin/impersonate-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, action: "exit" }),
    });
    await update({ impersonateCompanyId: null });
    router.push("/admin/companies");
  };

  return (
    <div className="fixed top-0 left-0 md:left-56 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Eye className="w-4 h-4" />
        Đang xem với tư cách: <span className="font-extrabold">{companyName}</span>
      </div>
      <button
        onClick={handleExit}
        disabled={leaving}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {leaving ? "Đang thoát..." : "Thoát · Về Admin"}
      </button>
    </div>
  );
}
