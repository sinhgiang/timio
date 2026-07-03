import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Metadata } from "next";
import ChatLogsClient from "./ChatLogsClient";

export const metadata: Metadata = { title: "Lịch sử chat AI" };

export default async function ChatLogsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "owner" && role !== "super_admin") redirect("/dashboard");
  return <ChatLogsClient />;
}
