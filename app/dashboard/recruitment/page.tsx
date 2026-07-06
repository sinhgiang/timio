import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RecruitmentClient from "./RecruitmentClient";

export default async function RecruitmentPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { slug: true },
  });
  const branches = await prisma.branch.findMany({
    where: { companyId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <RecruitmentClient companySlug={company?.slug ?? ""} branches={branches} />;
}
