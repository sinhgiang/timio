export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
      <p>© {new Date().getFullYear()} Timio — Hệ thống chấm công cho doanh nghiệp Việt Nam.</p>
      <p className="mt-1">
        Cần hỗ trợ thêm?{" "}
        <a href="https://timio.vn" className="text-brand-600 hover:underline">
          Quay lại Timio
        </a>
      </p>
    </footer>
  );
}
