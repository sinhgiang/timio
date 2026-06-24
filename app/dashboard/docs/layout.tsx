import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DocsNav from "./DocsNav";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex gap-0 min-h-screen">
      <DocsNav />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
