import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GUIDES, getGuide } from "@/lib/guides";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const guide = getGuide(params.slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.summary };
}

function renderBody(body: string[]) {
  // Dòng bắt đầu bằng "- " được gom thành 1 danh sách <ul>, còn lại là đoạn văn <p>.
  const blocks: { type: "p" | "ul"; lines: string[] }[] = [];
  for (const line of body) {
    const isListItem = line.startsWith("- ");
    const last = blocks[blocks.length - 1];
    if (isListItem && last?.type === "ul") {
      last.lines.push(line.slice(2));
    } else if (isListItem) {
      blocks.push({ type: "ul", lines: [line.slice(2)] });
    } else {
      blocks.push({ type: "p", lines: [line] });
    }
  }
  return blocks.map((block, i) =>
    block.type === "ul" ? (
      <ul key={i} className="ml-1 list-disc space-y-1.5 pl-4 text-gray-600">
        {block.lines.map((l, j) => (
          <li key={j}>{l}</li>
        ))}
      </ul>
    ) : (
      <p key={i} className="text-gray-600">
        {block.lines[0]}
      </p>
    )
  );
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const idx = GUIDES.findIndex((g) => g.slug === params.slug);
  const prev = idx > 0 ? GUIDES[idx - 1] : null;
  const next = idx < GUIDES.length - 1 ? GUIDES[idx + 1] : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/huong-dan" className="text-sm text-gray-400 transition-colors hover:text-gray-600">
        ← Tất cả hướng dẫn
      </Link>

      <p className="mt-4 text-sm font-medium text-brand-600">{guide.category}</p>
      <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{guide.title}</h1>
      <p className="mt-2 text-gray-500">{guide.summary}</p>

      <div className="mt-8 space-y-8">
        {guide.sections.map((section, i) => (
          <section key={i}>
            <h2 className="mb-2 text-lg font-semibold text-gray-900">{section.heading}</h2>
            <div className="space-y-2.5 leading-relaxed">{renderBody(section.body)}</div>
          </section>
        ))}
      </div>

      <div className="mt-12 grid gap-3 border-t border-gray-100 pt-6 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/huong-dan/${prev.slug}`}
            className="flex items-center gap-2 rounded-lg border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 shrink-0 text-gray-300" strokeWidth={1.5} />
            <span className="text-sm">
              <span className="block text-gray-400">Trước</span>
              <span className="font-medium text-gray-800">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <div />
        )}
        {next && (
          <Link
            href={`/huong-dan/${next.slug}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-4 py-3 text-right transition-colors hover:bg-gray-50 sm:justify-end"
          >
            <span className="text-sm">
              <span className="block text-gray-400">Tiếp theo</span>
              <span className="font-medium text-gray-800">{next.title}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" strokeWidth={1.5} />
          </Link>
        )}
      </div>
    </div>
  );
}
