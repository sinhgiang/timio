import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { guidesByCategory } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Hướng dẫn",
};

export default function GuideIndexPage() {
  const groups = guidesByCategory();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Tất cả hướng dẫn</h1>
      <p className="mt-2 text-gray-500">Chọn chủ đề bên dưới để xem hướng dẫn chi tiết.</p>

      <div className="mt-8 space-y-10">
        {groups.map(({ category, guides }) => (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">{category}</h2>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {guides.map((g) => (
                <Link
                  key={g.slug}
                  href={`/huong-dan/${g.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-gray-50"
                >
                  <span>
                    <span className="block font-medium text-gray-900">{g.title}</span>
                    <span className="mt-0.5 block text-sm text-gray-500">{g.summary}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
