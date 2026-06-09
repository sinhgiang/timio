import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Th13Client from "./Th13Client";

export default async function Th13Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const currentYear = new Date().getFullYear();

  return <Th13Client currentYear={currentYear} />;
}
