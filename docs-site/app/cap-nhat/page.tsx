import type { Metadata } from "next";
import { Sparkles, Wrench, Bug, type LucideIcon } from "lucide-react";
import { CHANGELOG } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Cập nhật mới",
  description: "Nhật ký các tính năng mới và cải tiến của Timio.",
};

const TAG_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  "Tính năng mới": { icon: Sparkles, className: "bg-brand-50 text-brand-700" },
  "Cải tiến": { icon: Wrench, className: "bg-amber-50 text-amber-700" },
  "Sửa lỗi": { icon: Bug, className: "bg-emerald-50 text-emerald-700" },
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Cập nhật mới</h1>
      <p className="mt-2 text-gray-500">Mọi tính năng mới và cải tiến của Timio, cập nhật liên tục.</p>

      <div className="mt-10 space-y-10 border-l border-gray-100 pl-6">
        {CHANGELOG.map((entry, i) => {
          const tag = TAG_STYLE[entry.tag];
          const Icon = tag.icon;
          return (
            <div key={i} className="relative">
              <span className="absolute -left-[29px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-600 ring-4 ring-white" />
              <p className="text-sm text-gray-400">{formatDate(entry.date)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{entry.title}</h2>
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tag.className}`}>
                  <Icon className="h-3 w-3" strokeWidth={1.5} />
                  {entry.tag}
                </span>
              </div>
              <div className="mt-2 space-y-1.5 text-gray-600">
                {entry.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
