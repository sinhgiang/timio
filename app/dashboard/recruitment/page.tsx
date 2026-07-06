import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEPARTMENT_PRESETS } from "@/lib/presets";
import RecruitmentClient from "./RecruitmentClient";

export default async function RecruitmentPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const [company, branches, jobDepts, empDepts] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { slug: true, customOptions: true } }),
    prisma.branch.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.jobPosting.findMany({ where: { companyId }, select: { department: true } }),
    prisma.employee.findMany({ where: { companyId }, select: { department: true } }),
  ]);

  const savedOpts = company?.customOptions
    ? (JSON.parse(company.customOptions) as { departments?: string[] })
    : {};
  const usedDepts = [
    ...jobDepts.map((j) => j.department),
    ...empDepts.map((e) => e.department),
  ].filter((d): d is string => !!d);
  const allDepartments = Array.from(new Set([...(savedOpts.departments ?? []), ...DEPARTMENT_PRESETS, ...usedDepts]));
  const customDepts = savedOpts.departments ?? [];

  return (
    <RecruitmentClient
      companySlug={company?.slug ?? ""}
      branches={branches}
      allDepartments={allDepartments}
      customDepartments={customDepts}
    />
  );
}
