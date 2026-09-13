import Link from "next/link";
import { BookOpen, Sparkles, ExternalLink } from "lucide-react";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <BookOpen className="h-4 w-4" strokeWidth={1.5} />
          </span>
          <span>
            Timio <span className="font-normal text-gray-400">Docs</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/huong-dan"
            className="rounded-lg px-3 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Hướng dẫn
          </Link>
          <Link
            href="/cap-nhat"
            className="flex items-center gap-1 rounded-lg px-3 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
            Cập nhật mới
          </Link>
          <a
            href="https://timio.vn"
            className="ml-1 flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 font-medium text-white transition-colors hover:bg-brand-700"
          >
            Vào Timio
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
        </nav>
      </div>
    </header>
  );
}
