import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Điều khoản dịch vụ | Timio",
  description: "Điều khoản và điều kiện sử dụng dịch vụ Timio — phần mềm chấm công thông minh cho doanh nghiệp Việt Nam.",
};

const LAST_UPDATED = "15/06/2026";

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="mb-10">
    <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h2>
    <div className="space-y-3 text-gray-600 text-[15px] leading-relaxed">{children}</div>
  </section>
);

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold text-blue-600 tracking-tight">Timio</Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800">Đăng nhập →</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Điều khoản dịch vụ</h1>
          <p className="text-gray-500 text-sm">Cập nhật lần cuối: {LAST_UPDATED}</p>
        </div>

        {/* Intro */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-10 text-sm text-blue-800">
          Bằng cách đăng ký và sử dụng Timio, bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ trước khi sử dụng dịch vụ.
        </div>

        <Section id="1" title="1. Giới thiệu dịch vụ">
          <p>
            Timio là phần mềm chấm công thông minh dạng SaaS (Software-as-a-Service) được cung cấp bởi
            Timio Platform. Dịch vụ bao gồm: hệ thống chấm công nhận diện khuôn mặt, quản lý nhân viên,
            báo cáo tự động và tính lương.
          </p>
          <p>
            Người dùng ("Khách hàng") là doanh nghiệp hoặc cá nhân đăng ký và sử dụng Timio để quản lý
            nhân sự của tổ chức mình.
          </p>
        </Section>

        <Section id="2" title="2. Điều kiện sử dụng">
          <p>Để sử dụng Timio, bạn phải:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Là tổ chức, doanh nghiệp hoặc cá nhân có đủ năng lực pháp lý theo quy định của pháp luật Việt Nam</li>
            <li>Cung cấp thông tin đăng ký chính xác và đầy đủ</li>
            <li>Chịu trách nhiệm về mọi hoạt động phát sinh từ tài khoản của mình</li>
            <li>Không sử dụng dịch vụ cho bất kỳ mục đích bất hợp pháp nào</li>
          </ul>
        </Section>

        <Section id="3" title="3. Tài khoản và bảo mật">
          <p>
            Bạn chịu trách nhiệm bảo mật thông tin đăng nhập. Timio không chịu trách nhiệm về thiệt hại
            phát sinh do bạn để lộ mật khẩu hoặc cho phép bên thứ ba truy cập tài khoản.
          </p>
          <p>
            Timio sử dụng mã hóa bcrypt cho mật khẩu và HTTPS cho toàn bộ kết nối. Dữ liệu nhận diện
            khuôn mặt (face embeddings) được lưu dưới dạng vector số học, không phải ảnh gốc.
          </p>
        </Section>

        <Section id="4" title="4. Bảo mật và quyền riêng tư dữ liệu">
          <p>
            Timio cam kết bảo vệ dữ liệu cá nhân theo quy định tại{" "}
            <strong>Nghị định 13/2023/NĐ-CP</strong> về Bảo vệ dữ liệu cá nhân.
          </p>
          <p>Dữ liệu nhân viên (họ tên, khuôn mặt, chấm công) thuộc sở hữu của Khách hàng. Timio chỉ
            lưu trữ và xử lý dữ liệu này nhằm cung cấp dịch vụ theo hợp đồng.</p>
          <p>Timio <strong>không chia sẻ</strong> dữ liệu cá nhân của nhân viên cho bên thứ ba vì mục đích thương mại.</p>
        </Section>

        <Section id="5" title="5. Quyền truy cập hỗ trợ của Timio (Superadmin Access)">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-[14px]">
            <p className="font-bold mb-2">⚠️ Điều khoản quan trọng — vui lòng đọc kỹ</p>
            <p>
              Nhằm cung cấp dịch vụ hỗ trợ kỹ thuật, bảo trì hệ thống và giải quyết sự cố, đội ngũ vận
              hành Timio có quyền truy cập vào tài khoản và dữ liệu của Khách hàng trong các trường hợp sau:
            </p>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 mt-3">
            <li>Hỗ trợ kỹ thuật theo yêu cầu của Khách hàng</li>
            <li>Điều tra và khắc phục lỗi hệ thống ảnh hưởng đến tài khoản</li>
            <li>Bảo trì, nâng cấp định kỳ theo kế hoạch</li>
            <li>Tuân thủ yêu cầu pháp lý hoặc lệnh của cơ quan có thẩm quyền</li>
          </ul>
          <p className="mt-3">
            Mỗi lần truy cập đều được <strong>ghi nhật ký (audit log)</strong> bao gồm: danh tính quản trị viên,
            thời gian vào, thời gian thoát. Timio cam kết không sửa đổi dữ liệu của Khách hàng khi
            không có sự đồng ý rõ ràng, trừ trường hợp khắc phục sự cố kỹ thuật theo yêu cầu.
          </p>
          <p>
            Khách hàng có quyền yêu cầu Timio cung cấp nhật ký truy cập liên quan đến tài khoản của mình
            bằng cách gửi email đến{" "}
            <a href="mailto:support@timio.vn" className="text-blue-600 underline">support@timio.vn</a>.
          </p>
        </Section>

        <Section id="6" title="6. Gói dịch vụ và thanh toán">
          <p>
            Timio cung cấp gói <strong>Starter</strong> (miễn phí, giới hạn tính năng) và gói{" "}
            <strong>Pro</strong> (trả phí, đầy đủ tính năng). Giá và điều kiện từng gói được hiển thị
            tại trang thanh toán trong hệ thống.
          </p>
          <p>
            Thanh toán được xử lý qua hệ thống thanh toán điện tử an toàn. Timio không hoàn tiền
            sau khi gói Pro đã được kích hoạt, trừ trường hợp lỗi kỹ thuật nghiêm trọng từ phía Timio.
          </p>
        </Section>

        <Section id="7" title="7. Chương trình Referral và Affiliate">
          <p>
            Timio cung cấp chương trình giới thiệu (referral) cho Khách hàng hiện tại và chương trình
            affiliate cho đối tác bên ngoài. Hoa hồng và phần thưởng được tính theo điều kiện đăng
            ký tại thời điểm tham gia.
          </p>
          <p>
            Timio có quyền thay đổi tỷ lệ hoa hồng và điều kiện chương trình sau khi thông báo trước
            30 ngày qua email.
          </p>
        </Section>

        <Section id="8" title="8. Giới hạn trách nhiệm">
          <p>
            Timio cung cấp dịch vụ theo trạng thái "nguyên trạng" (as-is). Timio không đảm bảo dịch vụ
            hoạt động liên tục 100% thời gian, nhưng cam kết duy trì uptime tối thiểu 99% mỗi tháng.
          </p>
          <p>
            Trong mọi trường hợp, trách nhiệm tối đa của Timio không vượt quá số tiền Khách hàng đã
            thanh toán trong vòng 3 tháng gần nhất.
          </p>
        </Section>

        <Section id="9" title="9. Chấm dứt dịch vụ">
          <p>
            Khách hàng có thể dừng sử dụng bất kỳ lúc nào. Dữ liệu sẽ được lưu trong 30 ngày sau
            khi chấm dứt trước khi bị xóa vĩnh viễn, trừ khi Khách hàng yêu cầu xóa sớm hơn.
          </p>
          <p>
            Timio có quyền tạm đình chỉ hoặc chấm dứt tài khoản vi phạm điều khoản, với thông báo
            trước 24 giờ (trừ trường hợp vi phạm nghiêm trọng).
          </p>
        </Section>

        <Section id="10" title="10. Luật áp dụng và giải quyết tranh chấp">
          <p>
            Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp phát sinh sẽ
            được giải quyết trước tiên bằng thương lượng. Nếu không đạt được thỏa thuận, tranh chấp
            sẽ được đưa ra Tòa án nhân dân có thẩm quyền tại Việt Nam.
          </p>
        </Section>

        <Section id="11" title="11. Liên hệ">
          <p>Nếu có thắc mắc về điều khoản dịch vụ, vui lòng liên hệ:</p>
          <ul className="list-none space-y-1 mt-2">
            <li>📧 Email: <a href="mailto:support@timio.vn" className="text-blue-600 underline">support@timio.vn</a></li>
            <li>🌐 Website: <a href="https://timio.vn" className="text-blue-600 underline">timio.vn</a></li>
          </ul>
        </Section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-100 text-center text-sm text-gray-400">
          <p>Timio Platform · Cập nhật: {LAST_UPDATED}</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Link href="/" className="hover:text-gray-600">Trang chủ</Link>
            <Link href="/login" className="hover:text-gray-600">Đăng nhập</Link>
            <Link href="/affiliate" className="hover:text-gray-600">Affiliate</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
