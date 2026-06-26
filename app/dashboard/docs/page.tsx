import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ARTICLES } from "./docsData";

export default function DocsIndexPage() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0">
          <BookOpen size={24} className="text-white" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hướng dẫn sử dụng</h1>
          <p className="text-sm text-gray-400 mt-0.5">Chọn bài hướng dẫn bên dưới hoặc từ menu trái</p>
        </div>
      </div>

      {/* Article cards */}
      <div className="grid grid-cols-2 gap-3">
        {ARTICLES.map(({ slug, label, Icon, badge }) => (
          <Link
            key={slug}
            href={`/dashboard/docs/${slug}`}
            className="group flex items-start gap-3 bg-white border border-gray-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              badge === "Business" ? "bg-purple-50 group-hover:bg-purple-100" :
              badge === "Mới" ? "bg-green-50 group-hover:bg-green-100" :
              "bg-blue-50 group-hover:bg-blue-100"
            }`}>
              <Icon size={18} className={`${
                badge === "Business" ? "text-purple-600" :
                badge === "Mới" ? "text-green-600" :
                "text-blue-600"
              }`} strokeWidth={1.8} />
            </div>
            <div className="mt-0.5 flex-1">
              <div className="flex items-start gap-2">
                <p className="font-semibold text-gray-800 text-sm group-hover:text-blue-700 transition-colors leading-tight">{label}</p>
                {badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                    badge === "Mới" ? "bg-green-100 text-green-700" :
                    badge === "Business" ? "bg-purple-100 text-purple-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>{badge}</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center">
        Timio · 16 bài hướng dẫn
      </p>
    </div>
  );
}
