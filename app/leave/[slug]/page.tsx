import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import LeaveRequestKiosk from "@/components/leave/LeaveRequestKiosk";

export default async function LeaveKioskPage({ params }: { params: { slug: string } }) {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true },
  });
  if (!company) notFound();

  const employees = await prisma.employee.findMany({
    where: { companyId: company.id, status: "active" },
    select: { id: true, name: true, code: true, faceDescriptors: true, annualLeaveBalance: true },
  });

  const faceData = employees.map((e) => ({
    id: e.id,
    name: e.name,
    code: e.code,
    annualLeaveBalance: e.annualLeaveBalance,
    descriptors: e.faceDescriptors
      ? (JSON.parse(e.faceDescriptors) as number[][])
      : [],
  }));

  return <LeaveRequestKiosk company={company} employees={faceData} />;
}
