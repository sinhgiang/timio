import Link from "next/link";
import { ArrowRight, Sparkles, ScanFace, Users, CalendarDays, BarChart3, Settings, type LucideIcon } from "lucide-react";
import { guidesByCategory } from "@/lib/guides";
import { CHANGELOG } from "@/lib/changelog";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Bắt đầu": Sparkles,
  "Chấm công": ScanFace,
  "Nhân viên & Lương": Users,
  "Nghỉ phép & Đơn từ": CalendarDays,
  "Báo cáo": BarChart3,
  "Cài đặt công ty": Settings,
};

export default function HomePage() {
  const groups = guidesByCategory();
  const latest = CHANGELOG[0];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero */}
      <div className="mb-12 text-center sm:mb-16">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Trung tâm hướng dẫn Timio
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-gray-500 sm:text-lg">
          Hướng dẫn sử dụng đầy đủ, dễ hiểu — từ thiết lập kiosk chấm công khuôn mặt đến quản lý lương, nghỉ phép và báo cáo.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/huong-dan"
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Xem hướng dẫn
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <Link
            href="/cap-nhat"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Xem cập nhật mới
          </Link>
        </div>
      </div>

      {/* Latest update callout */}
      {latest && (
        <Link
          href="/cap-nhat"
          className="mb-12 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm transition-colors hover:bg-brand-100 sm:mb-16"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span className="text-gray-700">
            <span className="font-medium text-brand-700">Mới cập nhật:</span> {latest.title}
          </span>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-brand-600" strokeWidth={1.5} />
        </Link>
      )}

      {/* Guide categories */}
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map(({ category, guides }) => {
          const Icon = CATEGORY_ICONS[category] ?? Sparkles;
          return (
            <div key={category} className="rounded-xl border border-gray-100 p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <h2 className="font-semibold text-gray-900">{category}</h2>
              </div>
              <ul className="space-y-1.5">
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`/huong-dan/${g.slug}`}
                      className="text-sm text-gray-600 transition-colors hover:text-brand-600 hover:underline"
                    >
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
