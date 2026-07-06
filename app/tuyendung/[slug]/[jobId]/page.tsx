import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Clock, Users, Wallet, ArrowLeft, Briefcase, Gift, ListChecks, FileText } from "lucide-react";
import type { Metadata } from "next";
import ApplyForm from "@/components/recruitment/ApplyForm";

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
  params: { slug: string; jobId: string };
}): Promise<Metadata> {
  const job = await prisma.jobPosting.findUnique({
    where: { id: params.jobId },
    select: { title: true, company: { select: { name: true, slug: true } } },
  });
  if (!job || job.company.slug !== params.slug) return { title: "Không tìm thấy vị trí" };
  return {
    title: `${job.title} — ${job.company.name}`,
    description: `${job.company.name} tuyển ${job.title}. Ứng tuyển ngay.`,
    robots: { index: true, follow: true },
  };
}

// Render text với xuống dòng thành các đoạn
function TextBlock({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return (
    <div className="space-y-1.5 text-sm text-gray-600 leading-relaxed">
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}

export default async function JobDetailPage({
  params,
}: {
  params: { slug: string; jobId: string };
}) {
  const company = await prisma.company.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true, logoUrl: true },
  });
  if (!company) notFound();

  const job = await prisma.jobPosting.findFirst({
    where: { id: params.jobId, companyId: company.id },
    select: {
      id: true,
      title: true,
      department: true,
      location: true,
      description: true,
      requirements: true,
      benefits: true,
      workTime: true,
      quantity: true,
      salaryMin: true,
      salaryMax: true,
      status: true,
      isPublic: true,
      branchId: true,
    },
  });
  if (!job) notFound();

  const isOpen = job.status === "open" && job.isPublic;

  let place = job.location;
  if (job.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: job.branchId, companyId: company.id },
      select: { name: true },
    });
    if (branch) place = branch.name;
  }

  const salary = fmtSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href={`/tuyendung/${company.slug}`}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt={company.name}
              className="w-10 h-10 rounded-xl object-cover border border-gray-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Briefcase size={20} className="text-blue-600" strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs text-blue-600 font-medium">Tuyển dụng</p>
            <h1 className="text-base font-bold text-gray-800 truncate">{company.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Job header card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-xl font-bold text-gray-800">{job.title}</h2>
          {job.department && <p className="text-sm text-gray-500 mt-0.5">{job.department}</p>}

          <div className="flex flex-wrap gap-2 mt-4">
            {salary && (
              <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-sm font-medium px-3 py-1.5 rounded-lg">
                <Wallet size={14} strokeWidth={1.5} /> {salary} ₫
              </span>
            )}
            {place && (
              <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 text-sm px-3 py-1.5 rounded-lg">
                <MapPin size={14} strokeWidth={1.5} /> {place}
              </span>
            )}
            {job.workTime && (
              <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 text-sm px-3 py-1.5 rounded-lg">
                <Clock size={14} strokeWidth={1.5} /> {job.workTime}
              </span>
            )}
            {job.quantity ? (
              <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 text-sm px-3 py-1.5 rounded-lg">
                <Users size={14} strokeWidth={1.5} /> Cần {job.quantity} người
              </span>
            ) : null}
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <FileText size={16} className="text-blue-600" strokeWidth={1.5} /> Mô tả công việc
            </h3>
            <TextBlock text={job.description} />
          </section>
        )}

        {/* Requirements */}
        {job.requirements && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <ListChecks size={16} className="text-blue-600" strokeWidth={1.5} /> Yêu cầu
            </h3>
            <TextBlock text={job.requirements} />
          </section>
        )}

        {/* Benefits */}
        {job.benefits && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-3">
              <Gift size={16} className="text-blue-600" strokeWidth={1.5} /> Quyền lợi
            </h3>
            <TextBlock text={job.benefits} />
          </section>
        )}

        {/* Apply form or closed notice */}
        {isOpen ? (
          <ApplyForm slug={company.slug} jobId={job.id} jobTitle={job.title} />
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <p className="text-amber-800 font-medium">Vị trí này đã ngừng nhận hồ sơ.</p>
            <Link
              href={`/tuyendung/${company.slug}`}
              className="inline-block mt-3 text-sm text-blue-600 font-medium"
            >
              ← Xem các vị trí khác đang tuyển
            </Link>
          </div>
        )}

        <footer className="pt-4 text-center">
          <p className="text-xs text-gray-400">
            Trang tuyển dụng vận hành bởi <span className="font-medium text-gray-500">Timio</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
