import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EmployeesClient from "./EmployeesClient";
import { DEPARTMENT_PRESETS, POSITION_PRESETS } from "@/lib/presets";

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const [employees, branches, company, penaltyRules, rewardRules] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
    prisma.company.findUnique({ where: { id: companyId }, select: { customOptions: true } }),
    prisma.penaltyRule.findMany({ where: { companyId }, orderBy: { fromMinutes: "asc" } }),
    prisma.rewardRule.findMany({ where: { companyId } }),
  ]);

  const savedOpts = company?.customOptions
    ? (JSON.parse(company.customOptions) as { departments?: string[]; positions?: string[]; shifts?: string[] })
    : {};

  // Merge: saved custom options → presets → values used by existing employees
  const usedDepts = employees.map((e) => e.department).filter((d): d is string => !!d);
  const usedPositions = employees.map((e) => e.position).filter((p): p is string => !!p);
  const allDepartments = Array.from(new Set([...(savedOpts.departments ?? []), ...DEPARTMENT_PRESETS, ...usedDepts]));
  const allPositions = Array.from(new Set([...(savedOpts.positions ?? []), ...POSITION_PRESETS, ...usedPositions]));
  const savedShifts = savedOpts.shifts ?? [];

  return (
    <EmployeesClient
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code,
        department: e.department,
        position: e.position,
        status: e.status,
        branchId: e.branchId,
        branchName: e.branch.name,
        shiftOverride: e.shiftOverride,
        hasFace: !!e.faceDescriptors,
        createdAt: e.createdAt.toISOString(),
        baseSalary: e.baseSalary ?? null,
        joinDate: e.joinDate ? e.joinDate.toISOString() : null,
        dateOfBirth: e.dateOfBirth ?? null,
        phone: e.phone ?? null,
        cccd: e.cccd ?? null,
      }))}
      branches={branches.map((b) => ({
        id: b.id,
        name: b.name,
        checkInTime: b.checkInTime,
        checkOutTime: b.checkOutTime,
        workDays: b.workDays,
        gracePeriod: b.gracePeriod,
      }))}
      allDepartments={allDepartments}
      allPositions={allPositions}
      savedShifts={savedShifts}
      companyId={companyId}
      penaltyRules={penaltyRules.map((r) => ({ fromMinutes: r.fromMinutes, toMinutes: r.toMinutes, amount: r.amount, type: r.type }))}
      rewardRules={rewardRules.map((r) => ({ id: r.id, condition: r.condition, amount: r.amount, label: r.label }))}
    />
  );
}
