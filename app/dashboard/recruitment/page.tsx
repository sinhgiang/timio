import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import RecruitmentClient from "./RecruitmentClient";

export default async function RecruitmentPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  return <RecruitmentClient />;
}
