import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MapPin, Clock, Users, Briefcase } from "lucide-react";
import type { Metadata } from "next";
import CareerIntroEditor from "@/components/recruitment/CareerIntroEditor";

export const dynamic = "force-dynamic";

function fmtSalary(min: number | null, max: number | null): string | null {
  const f = (n: number) => {
    if (n >= 1_000_000) {
      const m = n / 1_000_000;
      return `${Number.isInteger(m) ? m : m.toFixed(1)} triệu`;
    }
    return n.toLocaleString("vi-VN");
  };
  if (min && max) return `${f(min)} – ${f(max)}`;
  if (min) return `Từ ${f(min)}`;
  if (max) return `Đến ${f(max)}`;
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    select: { name: true },
  });
  if (!company) return { title: "Không tìm thấy trang tuyển dụng" };
  return {
    title: `Tuyển dụng — ${company.name}`,
    description: `Các vị trí đang tuyển tại ${company.name}. Ứng tuyển ngay, công ty sẽ liên hệ sớm.`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `Tuyển dụng — ${company.name}`,
      description: `${company.name} đang tuyển dụng. Xem vị trí và ứng tuyển ngay.`,
      type: "website",
    },
  };
}

export default async function PublicCareersPage({
  params,
}: {
  params: { slug: string };
}) {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true, logoUrl: true, careerIntro: true },
  });
  if (!company) notFound();

  const session = await getServerSession(authOptions);
  const viewer = session?.user as { companyId?: string; role?: string } | undefined;
  const isOwner = viewer?.companyId === company.id && viewer?.role === "owner";

  const jobs = await prisma.jobPosting.findMany({
    where: { companyId: company.id, status: "open", isPublic: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      department: true,
      location: true,
      workTime: true,
      quantity: true,
      salaryMin: true,
      salaryMax: true,
      branchId: true,
    },
  });

  // Map branch names for jobs that target a branch
  const branchIds = Array.from(
    new Set(jobs.map((j) => j.branchId).filter((b): b is string => !!b))
  );
  const branches = branchIds.length
    ? await prisma.branch.findMany({
        where: { id: { in: branchIds }, companyId: company.id },
        select: { id: true, name: true },
      })
    : [];
  const branchName = new Map(branches.map((b) => [b.id, b.name]));

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt={company.name}
              className="w-11 h-11 rounded-xl object-cover border border-gray-100"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
              <Briefcase size={22} className="text-blue-600" strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-blue-600 font-medium">Tuyển dụng</p>
            <h1 className="text-lg font-bold text-gray-800 truncate">{company.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Giới thiệu công ty — owner sửa được inline, ứng viên chỉ xem */}
        {isOwner ? (
          <CareerIntroEditor initial={company.careerIntro ?? ""} />
        ) : company.careerIntro ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex items-start gap-2.5">
            <Briefcase size={18} className="text-blue-600 shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{company.careerIntro}</p>
          </div>
        ) : null}

        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-800">
            {jobs.length > 0 ? `${jobs.length} vị trí đang tuyển` : "Cơ hội việc làm"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Chọn vị trí phù hợp và ứng tuyển ngay. Công ty sẽ liên hệ với bạn qua số điện thoại.
          </p>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Briefcase size={40} className="text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-gray-500">Hiện chưa có vị trí nào đang tuyển.</p>
            <p className="text-sm text-gray-400 mt-1">Vui lòng quay lại sau nhé!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const salary = fmtSalary(job.salaryMin, job.salaryMax);
              const place =
                (job.branchId && branchName.get(job.branchId)) || job.location || null;
              return (
                <Link
                  key={job.id}
                  href={`/tuyendung/${company.slug}/${job.id}`}
                  className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-800 text-base">{job.title}</h3>
                      {job.department && (
                        <p className="text-xs text-gray-500 mt-0.5">{job.department}</p>
                      )}
                    </div>
                    {salary && (
                      <span className="shrink-0 text-sm font-semibold text-green-600 whitespace-nowrap">
                        {salary} ₫
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-3 text-xs text-gray-500">
                    {place && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} strokeWidth={1.5} /> {place}
                      </span>
                    )}
                    {job.workTime && (
                      <span className="flex items-center gap-1">
                        <Clock size={13} strokeWidth={1.5} /> {job.workTime}
                      </span>
                    )}
                    {job.quantity ? (
                      <span className="flex items-center gap-1">
                        <Users size={13} strokeWidth={1.5} /> {job.quantity} người
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-blue-600 font-medium">Xem chi tiết & ứng tuyển →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <footer className="mt-10 text-center">
          <p className="text-xs text-gray-400">
            Trang tuyển dụng vận hành bởi <span className="font-medium text-gray-500">Timio</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
