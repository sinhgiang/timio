import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import MigrationWizard from "@/components/migration/MigrationWizard";

export default async function MigratePage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return null;

  const [branches, company] = await Promise.all([
    prisma.branch.findMany({ where: { companyId }, select: { id: true, name: true } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-blue-600" strokeWidth={1.5} />
            <h1 className="text-xl font-bold text-gray-800">Chuyển dữ liệu sang Timio</h1>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Import nhân viên & lịch sử chấm công từ phần mềm cũ — miễn phí, không giới hạn
          </p>
        </div>
      </div>

      <MigrationWizard branches={branches} companyId={company?.id ?? companyId} />
    </div>
  );
}
