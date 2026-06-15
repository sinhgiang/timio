import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import UpsellChecker from "@/components/dashboard/UpsellChecker";
import CompanySetupModal from "@/components/dashboard/CompanySetupModal";
import ImpersonationBanner from "@/components/dashboard/ImpersonationBanner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: { template: "%s | Timio", default: "Dashboard | Timio" },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const user = session.user as { companyId?: string; impersonating?: boolean };
  const companyId = user?.companyId;
  const needsSetup = !companyId;
  const isImpersonating = user?.impersonating === true;

  const [pendingLeaveCount, company] = await Promise.all([
    companyId ? prisma.leaveRequest.count({ where: { companyId, status: "pending" } }) : Promise.resolve(0),
    isImpersonating && companyId ? prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }) : Promise.resolve(null),
  ]);

  return (
    <div className="flex h-screen bg-gray-50">
      <UpsellChecker />
      {isImpersonating && <ImpersonationBanner companyName={company?.name ?? "..."} companyId={companyId ?? ""} />}
      <Sidebar companyName={session.user?.name ?? "Công ty"} pendingLeaveCount={pendingLeaveCount} />
      <main className={`flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0 ${isImpersonating ? "md:pt-10" : ""}`}>{children}</main>
      <MobileBottomNav pendingLeaveCount={pendingLeaveCount} />
      <CompanySetupModal
        needsSetup={needsSetup}
        userEmail={session.user?.email ?? ""}
        userName={session.user?.name ?? ""}
      />
    </div>
  );
}
