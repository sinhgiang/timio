import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import UpsellChecker from "@/components/dashboard/UpsellChecker";
import CompanySetupModal from "@/components/dashboard/CompanySetupModal";
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
  const companyId = (session.user as { companyId?: string })?.companyId;
  const needsSetup = !companyId;

  const pendingLeaveCount = companyId
    ? await prisma.leaveRequest.count({ where: { companyId, status: "pending" } })
    : 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <UpsellChecker />
      <Sidebar companyName={session.user?.name ?? "Công ty"} pendingLeaveCount={pendingLeaveCount} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
      <CompanySetupModal
        needsSetup={needsSetup}
        userEmail={session.user?.email ?? ""}
        userName={session.user?.name ?? ""}
      />
    </div>
  );
}
