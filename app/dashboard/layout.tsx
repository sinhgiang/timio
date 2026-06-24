import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import UpsellChecker from "@/components/dashboard/UpsellChecker";
import CompanySetupModal from "@/components/dashboard/CompanySetupModal";
import ImpersonationBanner from "@/components/dashboard/ImpersonationBanner";
import PlanExpiryBanner from "@/components/dashboard/PlanExpiryBanner";
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
  const user = session.user as { companyId?: string; impersonating?: boolean; role?: string };
  const companyId = user?.companyId;
  const userRole = user?.role ?? "owner";
  const needsSetup = !companyId;
  const isImpersonating = user?.impersonating === true;

  // Super admin không impersonating → về thẳng admin panel
  if (userRole === "super_admin" && !isImpersonating) {
    redirect("/admin");
  }

  const [pendingLeaveCount, pendingCorrectionCount, company, companyPlan] = await Promise.all([
    companyId ? prisma.leaveRequest.count({ where: { companyId, status: "pending" } }) : Promise.resolve(0),
    companyId
      ? prisma.correctionRequest.count({ where: { employee: { companyId }, status: "pending" } }).catch(() => 0)
      : Promise.resolve(0),
    isImpersonating && companyId ? prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }) : Promise.resolve(null),
    companyId ? prisma.company.findUnique({ where: { id: companyId }, select: { plan: true, planExpires: true } }) : Promise.resolve(null),
  ]);

  // Tính số ngày còn lại của gói trả tiền
  const now = new Date();
  const expiryMs = companyPlan?.planExpires ? companyPlan.planExpires.getTime() - now.getTime() : null;
  const daysLeft = expiryMs !== null ? Math.ceil(expiryMs / 86400000) : null;
  const showExpiryBanner =
    companyPlan?.plan &&
    companyPlan.plan !== "starter" &&
    daysLeft !== null &&
    daysLeft <= 14 &&
    daysLeft > 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <UpsellChecker />
      {isImpersonating && <ImpersonationBanner companyName={company?.name ?? "..."} companyId={companyId ?? ""} />}
      {showExpiryBanner && <PlanExpiryBanner daysLeft={daysLeft!} plan={companyPlan!.plan} />}
      <Sidebar companyName={session.user?.name ?? "Công ty"} pendingLeaveCount={pendingLeaveCount} pendingCorrectionCount={pendingCorrectionCount} role={userRole} />
      <main className={`flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0 ${isImpersonating ? "md:pt-10" : ""} ${showExpiryBanner ? "md:pt-10" : ""}`}>{children}</main>
      <MobileBottomNav pendingLeaveCount={pendingLeaveCount} role={userRole} />
      <CompanySetupModal
        needsSetup={needsSetup}
        userEmail={session.user?.email ?? ""}
        userName={session.user?.name ?? ""}
      />
    </div>
  );
}
