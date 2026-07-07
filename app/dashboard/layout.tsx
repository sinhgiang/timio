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
import TrialBanner from "@/components/dashboard/TrialBanner";
import { PlanProvider } from "@/context/PlanContext";
import ChatWidget from "@/components/chat/ChatWidget";
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
  const user = session.user as { companyId?: string; impersonating?: boolean; role?: string; branchId?: string | null };
  const companyId = user?.companyId;
  const userRole = user?.role ?? "owner";
  const userBranchId = (userRole === "manager" || userRole === "accountant") && user?.branchId ? user.branchId : null;
  const needsSetup = !companyId;
  const isImpersonating = user?.impersonating === true;

  // Super admin không impersonating → về thẳng admin panel
  if (userRole === "super_admin" && !isImpersonating) {
    redirect("/admin");
  }

  const canRecruit = userRole === "owner" || userRole === "manager";
  const [pendingLeaveCount, pendingCorrectionCount, pendingCandidateCount, company, companyPlan] = await Promise.all([
    companyId ? prisma.leaveRequest.count({ where: { companyId, status: "pending" } }) : Promise.resolve(0),
    companyId
      ? prisma.correctionRequest.count({ where: { employee: { companyId }, status: "pending" } }).catch(() => 0)
      : Promise.resolve(0),
    companyId && canRecruit
      ? prisma.candidate.count({
          where: {
            companyId,
            status: "new",
            ...(userBranchId ? { job: { OR: [{ branchId: userBranchId }, { branchId: null }] } } : {}),
          },
        }).catch(() => 0)
      : Promise.resolve(0),
    companyId ? prisma.company.findUnique({ where: { id: companyId }, select: { name: true, slug: true } }) : Promise.resolve(null),
    companyId ? prisma.company.findUnique({ where: { id: companyId }, select: { plan: true, planExpires: true, trialEndsAt: true } }) : Promise.resolve(null),
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

  const currentPlan = companyPlan?.plan ?? "starter";
  const planExpires = companyPlan?.planExpires?.toISOString() ?? null;
  const trialEndsAt = companyPlan?.trialEndsAt?.toISOString() ?? null;

  // Tính xem có hiện trial banner không (để thêm padding cho main)
  const showTrialBanner = (() => {
    if (!trialEndsAt || currentPlan !== "starter") return false;
    const daysLeftTrial = Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86400000);
    return daysLeftTrial >= -3;
  })();

  return (
    <PlanProvider plan={currentPlan} planExpires={planExpires}>
      <div className="flex h-screen bg-gray-50">
        <UpsellChecker plan={currentPlan} role={userRole} />
        {isImpersonating && <ImpersonationBanner companyName={company?.name ?? "..."} companyId={companyId ?? ""} />}
        {showExpiryBanner && <PlanExpiryBanner daysLeft={daysLeft!} plan={companyPlan!.plan} />}
        <TrialBanner trialEndsAt={trialEndsAt} plan={currentPlan} />
        <Sidebar companyName={company?.name ?? "Công ty"} companySlug={company?.slug} pendingLeaveCount={pendingLeaveCount} pendingCorrectionCount={pendingCorrectionCount} pendingCandidateCount={pendingCandidateCount} role={userRole} plan={currentPlan} planExpires={planExpires} />
        <main className={`flex-1 overflow-auto pt-14 pb-16 md:pt-0 md:pb-0 ${isImpersonating ? "md:pt-10" : ""} ${showExpiryBanner || showTrialBanner ? "md:pt-10" : ""}`}>{children}</main>
        <MobileBottomNav pendingLeaveCount={pendingLeaveCount} role={userRole} />
        {!needsSetup && <ChatWidget role={userRole} plan={currentPlan} />}
        <CompanySetupModal
          needsSetup={needsSetup}
          userEmail={session.user?.email ?? ""}
          userName={session.user?.name ?? ""}
        />
      </div>
    </PlanProvider>
  );
}
