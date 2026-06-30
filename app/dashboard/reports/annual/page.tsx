import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AnnualReportClient from "./AnnualReportClient";

export default async function AnnualReportPage() {
  const session = await getServerSession(authOptions);
  const u = session?.user as { companyId?: string } | undefined;
  if (!u?.companyId) return null;

  return <AnnualReportClient />;
}
