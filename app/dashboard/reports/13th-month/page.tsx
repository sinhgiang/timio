import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Th13Client from "./Th13Client";
import PlanUpgradePage from "@/components/ui/PlanUpgradePage";

export default async function Th13Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const companyId = (session.user as { companyId?: string })?.companyId;
  if (companyId) {
    const planRow = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
    if (!planRow || planRow.plan === "starter") {
      return (
        <PlanUpgradePage
          requiredPlan="pro"
          feature="Tính lương tháng 13 tự động"
          description="Hệ thống tự tính lương tháng 13 cho toàn bộ nhân viên dựa trên số ngày công thực tế trong năm — không cần làm thủ công trên Excel."
          bullets={[
            "Tự tính theo số ngày công thực tế cả năm",
            "Điều chỉnh tỷ lệ thưởng tùy theo quy định công ty",
            "Xuất Excel danh sách thưởng tháng 13 toàn bộ nhân viên",
            "Phân biệt nhân viên đủ điều kiện và chưa đủ điều kiện",
          ]}
        />
      );
    }
  }

  const currentYear = new Date().getFullYear();
  return <Th13Client currentYear={currentYear} />;
}
