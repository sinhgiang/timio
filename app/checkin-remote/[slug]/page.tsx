import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import RemoteCheckinClient from "./RemoteCheckinClient";

export default async function RemoteCheckinPage({ params }: { params: { slug: string } }) {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      name: true,
      slug: true,
      branches: {
        select: {
          id: true,
          name: true,
          lat: true,
          lng: true,
          gpsRadius: true,
          checkInTime: true,
          checkOutTime: true,
          gracePeriod: true,
        },
      },
    },
  });

  if (!company) return notFound();

  return (
    <RemoteCheckinClient
      companyId={company.id}
      companyName={company.name}
      slug={company.slug}
      branches={company.branches}
    />
  );
}
