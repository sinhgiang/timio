import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "admin@sinhgiang.com";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== SUPER_ADMIN_EMAIL) {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Super Admin</span>
        <span className="text-gray-400 text-sm">Timio Platform</span>
      </div>
      {children}
    </div>
  );
}
