import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AnnouncementsClient from "./AnnouncementsClient";

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;
  return <AnnouncementsClient />;
}
