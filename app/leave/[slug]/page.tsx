import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import LeaveRequestKiosk from "@/components/leave/LeaveRequestKiosk";

export default async function LeaveKioskPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { b?: string };
}) {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true },
  });
  if (!company) notFound();

  // Load branch name if ?b= is provided
  let branchName: string | undefined;
  if (searchParams?.b) {
    const branch = await prisma.branch.findFirst({
      where: { id: searchParams.b, companyId: company.id },
      select: { name: true },
    });
    branchName = branch?.name;
  }

  const employees = await prisma.employee.findMany({
    where: { companyId: company.id, status: "active" },
    select: { id: true, name: true, code: true, department: true, position: true, dateOfBirth: true, phone: true, faceDescriptors: true, annualLeaveBalance: true },
  });

  const faceData = employees.map((e) => ({
    id: e.id,
    name: e.name,
    code: e.code,
    department: e.department ?? "",
    position: e.position ?? "",
    dateOfBirth: e.dateOfBirth ?? "",
    phone: e.phone ?? "",
    annualLeaveBalance: e.annualLeaveBalance,
    descriptors: e.faceDescriptors ? (JSON.parse(e.faceDescriptors) as number[][]) : [],
  }));

  return <LeaveRequestKiosk company={company} employees={faceData} branchName={branchName} />;
}
