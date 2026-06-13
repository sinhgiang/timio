import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import HandoverKiosk from "@/components/leave/HandoverKiosk";

interface Props {
  params: { slug: string; requestId: string };
}

export default async function HandoverPage({ params }: Props) {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true },
  });
  if (!company) notFound();

  const request = await prisma.leaveRequest.findUnique({
    where: { id: params.requestId },
    include: {
      employee: {
        select: { id: true, name: true, code: true, department: true, position: true },
      },
    },
  });
  if (!request || request.companyId !== company.id) notFound();

  let handoverEmployee = null;
  if (request.handoverEmployeeId) {
    handoverEmployee = await prisma.employee.findUnique({
      where: { id: request.handoverEmployeeId },
      select: { id: true, name: true, code: true, faceDescriptors: true },
    });
  }

  const handoverFaceData = handoverEmployee
    ? {
        id: handoverEmployee.id,
        name: handoverEmployee.name,
        code: handoverEmployee.code,
        descriptors: handoverEmployee.faceDescriptors
          ? (JSON.parse(handoverEmployee.faceDescriptors) as number[][])
          : [],
      }
    : null;

  const leaveData = {
    id: request.id,
    employeeName: request.employee.name,
    employeeCode: request.employee.code,
    department: request.employee.department ?? "",
    position: request.employee.position ?? "",
    type: request.type,
    fromDate: request.fromDate,
    toDate: request.toDate,
    days: request.days,
    reason: request.reason ?? "",
    status: request.status,
    handoverConfirmedAt: request.handoverConfirmedAt?.toISOString() ?? null,
  };

  return (
    <HandoverKiosk
      company={company}
      leaveRequest={leaveData}
      handoverEmployee={handoverFaceData}
    />
  );
}
