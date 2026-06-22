import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import FaceScanKiosk from "@/components/checkin/FaceScanKiosk";
import type { EmployeeFaceData } from "@/lib/faceApi";

interface PageProps {
  params: { slug: string };
  searchParams?: { b?: string };
}

export default async function CheckInPage({ params, searchParams }: PageProps) {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
  });

  if (!company) notFound();

  const employees = await prisma.employee.findMany({
    where: { companyId: company.id, status: "active" },
    select: { id: true, name: true, faceDescriptors: true },
    orderBy: { name: "asc" },
  });

  const employeeFaceData: EmployeeFaceData[] = employees.map((e) => ({
    id: e.id,
    name: e.name,
    descriptors: e.faceDescriptors
      ? (JSON.parse(e.faceDescriptors) as number[][])
      : [],
  }));

  // Load branch name if ?b= is provided
  let branchName: string | undefined;
  if (searchParams?.b) {
    const branch = await prisma.branch.findFirst({
      where: { id: searchParams.b, companyId: company.id },
      select: { name: true },
    });
    branchName = branch?.name;
  }

  // Parse custom kiosk messages nếu có
  const messages = company.kioskMessages
    ? (JSON.parse(company.kioskMessages) as {
        welcome?: string;
        checkinOntime?: string;
        checkinLate?: string;
        checkout?: string;
      })
    : undefined;

  return (
    <FaceScanKiosk
      company={{ name: company.name, slug: company.slug }}
      employees={employeeFaceData}
      messages={messages}
      branchName={branchName}
    />
  );
}
