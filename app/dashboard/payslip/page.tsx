import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PayslipListClient from "./PayslipListClient";
import { calculateTax } from "@/lib/taxCalculator";
import PlanUpgradePage from "@/components/ui/PlanUpgradePage";
import { canViewData, retentionLabel } from "@/lib/retention";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: { month?: string };
}

export default async function PayslipPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) redirect("/login");

  const planRow = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true, planExpires: true } });
  if (!planRow || planRow.plan === "starter") {
    return (
      <PlanUpgradePage
        requiredPlan="pro"
        feature="Phiếu lương chi tiết"
        description="Xem phiếu lương đầy đủ từng nhân viên — ngày công, phạt/thưởng, tăng ca, BHXH. Nhân viên cũng tự xem được qua cổng thông tin cá nhân."
        bullets={[
          "Phiếu lương chi tiết từng nhân viên mỗi tháng",
          "Tính tự động: ngày công, phạt trễ, thưởng KPI, tăng ca",
          "Nhân viên tự tra cứu phiếu lương qua cổng thông tin",
          "Xuất Excel tổng hợp toàn bộ nhân viên 1 click",
        ]}
      />
    );
  }

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStr = searchParams?.month ?? defaultMonth;
  const [yearStr, monStr] = monthStr.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monStr);

  // Block if outside retention window
  const requestedMonthStart = new Date(year, month - 1, 1);
  if (!canViewData(planRow.plan, planRow.planExpires, requestedMonthStart)) {
    const planExpired = planRow.planExpires && planRow.planExpires < now;
    return (
      <PlanUpgradePage
        requiredPlan="pro"
        feature={planExpired ? `Gói ${planRow.plan === "pro" ? "Pro" : "Business"} đã hết hạn` : `Phiếu lương tháng ${month}/${year} đã hết hạn lưu trữ`}
        description={
          planExpired
            ? "Gói của bạn đã hết hạn. Dữ liệu phiếu lương vẫn đang được giữ trong giai đoạn bảo lưu. Gia hạn để truy cập lại."
            : `Gói Starter chỉ lưu dữ liệu trong ${retentionLabel(planRow.plan)} gần nhất. Nâng cấp để xem lại phiếu lương lịch sử.`
        }
        bullets={planExpired
          ? ["Gia hạn ngay để phục hồi toàn bộ phiếu lương", "Dữ liệu đang được bảo lưu trong giai đoạn chờ"]
          : ["Gói Pro lưu tất cả dữ liệu khi còn trả phí", "Phục hồi phiếu lương lịch sử khi nâng cấp"]
        }
      />
    );
  }

  const [employees, company, payments] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: "active" },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, code: true, department: true, position: true,
        baseSalary: true, joinDate: true, dependents: true, email: true,
        summaries: {
          where: { year, month },
          select: {
            daysPresent: true, daysLate: true, daysAbsent: true,
            totalMinutesLate: true, totalPenalty: true, totalReward: true,
            totalOvertimeAmount: true, totalMinutesOvertime: true,
          },
        },
      },
    }),
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
    prisma.salaryPayment.findMany({
      where: { companyId, year, month },
      select: { employeeId: true, status: true, paidAt: true },
    }),
  ]);

  const rows = employees.map((e) => {
    const s = e.summaries[0];
    const base = e.baseSalary ?? 0;
    const penalty = s?.totalPenalty ?? 0;
    const reward = s?.totalReward ?? 0;
    const overtime = s?.totalOvertimeAmount ?? 0;
    const grossIncome = base - penalty + reward + overtime;
    const tax = calculateTax({ baseSalary: base, grossIncome, dependents: e.dependents ?? 0 });
    return {
      id: e.id,
      name: e.name,
      code: e.code,
      department: e.department ?? "",
      position: e.position ?? "",
      baseSalary: base,
      daysPresent: s?.daysPresent ?? 0,
      daysLate: s?.daysLate ?? 0,
      daysAbsent: s?.daysAbsent ?? 0,
      totalMinutesLate: s?.totalMinutesLate ?? 0,
      totalPenalty: penalty,
      totalOvertimeAmount: overtime,
      totalMinutesOvertime: s?.totalMinutesOvertime ?? 0,
      bhxhEmployee: tax.bhxhEmployee,
      tncn: tax.tncn,
      netSalary: tax.netTakeHome,
      email: e.email ?? null,
    };
  });

  const paymentMap = Object.fromEntries(
    payments.map((p) => [p.employeeId, { status: p.status, paidAt: p.paidAt?.toISOString() ?? null }])
  );

  return (
    <PayslipListClient
      rows={rows}
      companyName={company?.name ?? ""}
      currentMonth={monthStr}
      paymentMap={paymentMap}
    />
  );
}
