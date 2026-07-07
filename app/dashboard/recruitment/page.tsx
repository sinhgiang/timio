import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEPARTMENT_PRESETS, POSITION_PRESETS } from "@/lib/presets";
import RecruitmentClient from "./RecruitmentClient";

export default async function RecruitmentPage() {
  const session = await getServerSession(authOptions);
  const u = session?.user as { companyId?: string; role?: string; branchId?: string | null } | undefined;
  const companyId = u?.companyId;
  if (!companyId) return null;

  const [company, branches, jobs, empDepts] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { slug: true, customOptions: true, plan: true } }),
    prisma.branch.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.jobPosting.findMany({ where: { companyId }, select: { department: true, title: true, location: true } }),
    prisma.employee.findMany({ where: { companyId }, select: { department: true, position: true } }),
  ]);

  const savedOpts = company?.customOptions
    ? (JSON.parse(company.customOptions) as { departments?: string[]; positions?: string[] })
    : {};

  const usedDepts = [
    ...jobs.map((j) => j.department),
    ...empDepts.map((e) => e.department),
  ].filter((d): d is string => !!d);
  const usedPositions = [
    ...jobs.map((j) => j.title),
    ...empDepts.map((e) => e.position),
  ].filter((p): p is string => !!p);
  const usedLocations = jobs.map((j) => j.location).filter((l): l is string => !!l);

  const allDepartments = Array.from(new Set([...(savedOpts.departments ?? []), ...DEPARTMENT_PRESETS, ...usedDepts]));
  const allPositions = Array.from(new Set([...(savedOpts.positions ?? []), ...POSITION_PRESETS, ...usedPositions]));
  const branchNames = branches.map((b) => b.name);
  const allLocations = Array.from(new Set([...branchNames, ...usedLocations]));

  return (
    <RecruitmentClient
      companySlug={company?.slug ?? ""}
      plan={company?.plan ?? "starter"}
      role={u?.role ?? "owner"}
      branches={branches}
      allDepartments={allDepartments}
      customDepartments={savedOpts.departments ?? []}
      allPositions={allPositions}
      customPositions={savedOpts.positions ?? []}
      allLocations={allLocations}
    />
  );
}
