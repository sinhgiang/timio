import Link from "next/link";
import { Clock } from "lucide-react";

// Header/menu dùng CHUNG cho mọi trang công khai (việc làm / việc làm hấp dẫn / ứng viên...)
export default function PublicHeader({ active }: { active?: "viec-lam" | "hap-dan" | "ung-vien" }) {
  const item = (href: string, label: string, key: string, hoverColor = "hover:text-blue-600") =>
    active === key
      ? <span className={`text-sm font-semibold px-3 py-1.5 ${key === "hap-dan" ? "text-orange-600" : "text-blue-600"}`}>{label}</span>
      : <Link href={href} className={`text-sm text-gray-600 ${hoverColor} px-3 py-1.5`}>{label}</Link>;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/viec-lam" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Clock size={17} className="text-white" /></div>
          <span className="font-extrabold text-gray-800 text-lg">Timio <span className="text-blue-600 font-semibold text-sm">Việc làm</span></span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <span className="hidden md:inline">{item("/viec-lam-hap-dan", "Việc làm hấp dẫn", "hap-dan", "hover:text-orange-600")}</span>
          <span className="hidden md:inline">{item("/ung-vien", "Ứng viên", "ung-vien")}</span>
          <Link href="/viec-lam#nha-tuyen-dung" className="hidden sm:inline text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5">Nhà tuyển dụng</Link>
          <Link href="/gia" className="hidden lg:inline text-sm text-gray-600 hover:text-blue-600 px-3 py-1.5">Bảng giá</Link>
          <Link href="/login" className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3.5 py-1.5 hover:bg-blue-50 ml-1">Đăng nhập</Link>
        </div>
      </div>
    </header>
  );
}
