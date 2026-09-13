import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Không tìm thấy trang</h1>
      <p className="mt-2 text-gray-500">Trang bạn tìm không tồn tại hoặc đã được chuyển.</p>
      <Link href="/" className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
        Về trang chủ
      </Link>
    </div>
  );
}
