import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Gift, BookOpen, Calculator, CheckCircle2, UserPlus, Monitor, ClipboardList, HelpCircle, Info, Lightbulb, Pencil, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default async function Th13GuidePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/dashboard/reports/13th-month"
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Quay lại"
        >
          ← Quay lại
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
            <Gift size={24} className="text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Lương tháng 13 là gì?</h1>
        </div>
        <p className="text-gray-500 text-base mt-1">
          Hướng dẫn đầy đủ — từ khái niệm đến cách phần mềm tính toán
        </p>
      </div>

      {/* Section 1 */}
      <Section title="1. Khái niệm cơ bản" Icon={BookOpen}>
        <p>
          <strong>Lương tháng 13</strong> (còn gọi là <strong>thưởng Tết</strong>) là khoản tiền thưởng cuối năm
          mà doanh nghiệp trả thêm cho nhân viên, thường trước dịp Tết Nguyên Đán.
        </p>
        <Callout type="info">
          <strong>Lưu ý pháp lý:</strong> Theo Bộ luật Lao động 2019 (Điều 104), lương tháng 13
          <strong> không bắt buộc</strong> theo pháp luật. Doanh nghiệp tự quyết định có thưởng hay không,
          thưởng bao nhiêu, và điều kiện để được nhận — thường ghi rõ trong hợp đồng lao động hoặc
          nội quy công ty.
        </Callout>
        <p>
          Tên gọi &quot;tháng 13&quot; xuất phát từ cách tính phổ biến nhất: nếu nhân viên làm đủ 12 tháng trong năm,
          họ nhận thêm <strong>1 tháng lương cơ bản</strong> — tức là thu nhập cả năm tương đương 13 tháng.
        </p>
      </Section>

      {/* Section 2 */}
      <Section title="2. Công thức tính" Icon={Calculator}>
        <FormulaBox>
          Lương T13 = <strong>Lương cơ bản</strong> × (<strong>Số tháng đủ điều kiện</strong> / 12)
        </FormulaBox>

        <p className="font-medium text-gray-700 mt-4 mb-2">Giải thích từng phần:</p>
        <div className="space-y-3">
          <TermCard term="Lương cơ bản" color="blue">
            Mức lương hàng tháng ghi trong hợp đồng lao động (không bao gồm phụ cấp, thưởng).
            Ví dụ: 10.000.000đ/tháng.
          </TermCard>
          <TermCard term="Tháng đủ điều kiện" color="green">
            Tháng mà nhân viên đi làm đủ số ngày tối thiểu (thường là <strong>≥ 15 ngày/tháng</strong>).
            Tháng nghỉ phép, thai sản, hay vắng nhiều có thể không đủ điều kiện.
          </TermCard>
          <TermCard term="Chia cho 12" color="orange">
            Vì 1 năm có 12 tháng. Nếu nhân viên làm đủ cả năm (12 tháng đủ điều kiện),
            họ nhận đúng 1 tháng lương. Nếu chỉ làm được 6 tháng đủ điều kiện, nhận 0,5 tháng lương.
          </TermCard>
        </div>

        <Callout type="example">
          <strong>Ví dụ thực tế:</strong><br />
          Chị Mai có lương cơ bản <strong>8.000.000đ/tháng</strong>.<br />
          Chị vào làm từ tháng 3/2025. Từ T3 đến T11 đều đi làm đủ (≥15 ngày), T12 nghỉ nhiều chỉ được 10 ngày.<br />
          → Số tháng đủ điều kiện: <strong>9 tháng</strong> (T3 đến T11)<br />
          → Lương T13 = 8.000.000 × 9/12 = <strong>6.000.000đ</strong>
        </Callout>
      </Section>

      {/* Section 3 */}
      <Section title="3. Điều kiện để được tính một tháng" Icon={CheckCircle2}>
        <p>Mỗi tháng trong năm sẽ được đánh dấu <GreenBadge>Đủ điều kiện</GreenBadge> hoặc <RedBadge>Không đủ</RedBadge> dựa trên số ngày nhân viên thực tế đi làm trong tháng đó.</p>

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Trường hợp</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Số ngày đi làm</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["Đi làm đủ, không nghỉ", "≥ 15 ngày", "✓ Đủ điều kiện", "green"],
                ["Nghỉ phép có lương (vài ngày)", "≥ 15 ngày", "✓ Đủ điều kiện", "green"],
                ["Nghỉ nhiều, ốm dài ngày", "< 15 ngày", "✗ Không đủ", "red"],
                ["Tháng vào làm (ngày vào làm muộn)", "Tùy", "Phụ thuộc số ngày thực tế", "gray"],
                ["Tháng trước khi vào làm", "0 ngày", "Không tính", "gray"],
              ].map(([label, days, result, color]) => (
                <tr key={label} className="bg-white">
                  <td className="px-4 py-3 text-gray-700">{label}</td>
                  <td className="px-4 py-3 text-gray-500">{days}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      color === "green" ? "bg-green-100 text-green-700" :
                      color === "red" ? "bg-red-100 text-red-600" :
                      "bg-gray-100 text-gray-500"
                    }`}>{result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Callout type="tip">
          <strong>Ngưỡng 15 ngày</strong> là mặc định phổ biến nhất tại Việt Nam, nhưng mỗi công ty có thể
          đặt ngưỡng khác nhau. Trong phần mềm này, bạn có thể thay đổi ngưỡng ở góc trên bên phải của
          trang Lương tháng 13.
        </Callout>
      </Section>

      {/* Section 4 */}
      <Section title="4. Nhân viên mới vào giữa năm" Icon={UserPlus}>
        <p>
          Nhân viên không cần làm đủ cả năm mới được nhận lương tháng 13.
          Phần mềm tự động bỏ qua các tháng <strong>trước ngày vào làm</strong> và chỉ tính
          từ tháng nhân viên bắt đầu làm việc.
        </p>

        <div className="mt-4 bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-600 mb-3">Ví dụ — Anh Tuấn vào làm ngày 15/7/2025:</p>
          <div className="grid grid-cols-12 gap-1 text-center text-xs">
            {["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"].map((m, i) => (
              <div key={m} className={`rounded-md py-2 font-medium ${
                i < 6 ? "bg-gray-200 text-gray-400" :
                i === 6 ? "bg-yellow-100 text-yellow-700 border border-yellow-300" :
                "bg-green-100 text-green-700"
              }`}>
                {m}
                <div className="text-xs mt-0.5">
                  {i < 6 ? "—" : i === 6 ? "1/2" : "✓"}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span><span className="inline-block w-3 h-3 rounded bg-gray-200 mr-1" />Chưa vào làm</span>
            <span><span className="inline-block w-3 h-3 rounded bg-yellow-100 border border-yellow-300 mr-1" />Tháng bắt đầu (tùy ngày đi làm)</span>
            <span><span className="inline-block w-3 h-3 rounded bg-green-100 mr-1" />Tháng đủ điều kiện</span>
          </div>
        </div>
      </Section>

      {/* Section 5 */}
      <Section title="5. Cách phần mềm Timio tính" Icon={Monitor}>
        <p>Timio tự động tổng hợp dữ liệu chấm công để tính lương tháng 13 — không cần nhập tay.</p>

        <div className="mt-4 space-y-3">
          {[
            {
              step: "1",
              title: "Ghi nhận ngày đi làm",
              desc: "Mỗi ngày nhân viên check-in qua kiosk, hệ thống tự ghi nhận. Cuối tháng có số ngày đi làm thực tế.",
              color: "blue",
            },
            {
              step: "2",
              title: "Đánh dấu tháng đủ điều kiện",
              desc: "Hệ thống so sánh số ngày đi làm với ngưỡng (mặc định 15). Nếu đạt, tháng đó được tính vào lương T13.",
              color: "green",
            },
            {
              step: "3",
              title: "Tính tiền",
              desc: "Lương T13 = Lương cơ bản × (số tháng đủ / 12). Kết quả làm tròn xuống đến nghìn đồng gần nhất.",
              color: "orange",
            },
            {
              step: "4",
              title: "Hiển thị và xuất báo cáo",
              desc: "Trang Lương tháng 13 hiện bảng toàn bộ nhân viên, tổng chi phí, và nút xuất file Excel để kế toán xử lý.",
              color: "purple",
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-sm ${
                s.color === "blue" ? "bg-blue-500" :
                s.color === "green" ? "bg-green-500" :
                s.color === "orange" ? "bg-orange-500" : "bg-purple-500"
              }`}>{s.step}</div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                <p className="text-gray-500 text-sm mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 6 */}
      <Section title="6. Những việc cần làm trước khi dùng" Icon={ClipboardList}>
        <p>Để phần mềm tính được lương tháng 13, cần điền đủ 2 thông tin cho mỗi nhân viên:</p>
        <div className="mt-3 space-y-2">
          <CheckItem>
            <strong>Lương cơ bản</strong> — vào mục <em>Nhân viên</em> → chỉnh sửa từng người → điền &quot;Lương cơ bản&quot;
          </CheckItem>
          <CheckItem>
            <strong>Ngày vào làm</strong> — điền chính xác để hệ thống biết không tính các tháng trước đó
          </CheckItem>
          <CheckItem>
            <strong>Dữ liệu chấm công</strong> — nhân viên phải đã chấm công qua kiosk trong năm cần tính
          </CheckItem>
        </div>
        <Callout type="warning">
          Nếu chưa điền lương cơ bản, hệ thống sẽ hiện &quot;Chưa có lương CB&quot; và không tính được số tiền.
          Vẫn có thể xem bảng tháng đủ/không đủ điều kiện.
        </Callout>
      </Section>

      {/* Section 7 */}
      <Section title="7. Câu hỏi thường gặp" Icon={HelpCircle}>
        <div className="space-y-4">
          {[
            {
              q: "Công ty tôi không trả lương tháng 13 thì sao?",
              a: "Hoàn toàn bình thường. Lương tháng 13 không bắt buộc. Tính năng này chỉ hỗ trợ nếu công ty muốn dùng — không dùng thì bỏ qua.",
            },
            {
              q: "Ngưỡng 15 ngày có thể thay đổi không?",
              a: "Có. Trên trang Lương tháng 13, góc trên bên phải có ô \"Ngưỡng ngày tối thiểu\" — nhập số khác (ví dụ 10 hoặc 20) rồi bảng tự cập nhật ngay.",
            },
            {
              q: "Nhân viên nghỉ thai sản có được tính không?",
              a: "Phụ thuộc số ngày có mặt thực tế được ghi nhận. Nếu tháng nghỉ thai sản không chấm công, số ngày = 0 → không đủ điều kiện tháng đó. Nhiều công ty có chính sách đặc biệt cho trường hợp này — có thể điều chỉnh ngưỡng hoặc xử lý thủ công.",
            },
            {
              q: "Lương tháng 13 có bị khấu trừ thuế TNCN không?",
              a: "Có. Lương tháng 13 được tính vào thu nhập chịu thuế TNCN trong tháng chi trả. Phần mềm chỉ tính số tiền thưởng — việc khấu trừ thuế do kế toán xử lý riêng theo quy định.",
            },
            {
              q: "Xuất Excel để làm gì?",
              a: "File Excel có danh sách đầy đủ tất cả nhân viên, số tháng đủ điều kiện và số tiền lương T13 — kế toán dùng để đối chiếu, trình sếp ký duyệt và làm chứng từ thanh toán.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="group border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer bg-white hover:bg-gray-50 font-medium text-gray-800 text-sm list-none">
                {q}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 border-t border-gray-100">
                {a}
              </div>
            </details>
          ))}
        </div>
      </Section>

      {/* Back button */}
      <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between items-center">
        <Link
          href="/dashboard/reports/13th-month"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          ← Về trang Lương tháng 13
        </Link>
        <p className="text-xs text-gray-400">Timio · Hướng dẫn tính năng</p>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, Icon, children }: { title: string; Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-blue-600" strokeWidth={2} />
        </div>
        {title}
      </h2>
      <div className="space-y-3 text-gray-600 leading-relaxed text-sm">{children}</div>
    </div>
  );
}

function FormulaBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl px-6 py-4 text-center text-base text-blue-800">
      {children}
    </div>
  );
}

function Callout({ type, children }: { type: "info" | "example" | "tip" | "warning"; children: React.ReactNode }) {
  const styles = {
    info:    { bg: "bg-blue-50 border-blue-200", text: "text-blue-800", Icon: Info, iconCls: "text-blue-500" },
    example: { bg: "bg-green-50 border-green-200", text: "text-green-800", Icon: Lightbulb, iconCls: "text-green-500" },
    tip:     { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", Icon: Pencil, iconCls: "text-amber-500" },
    warning: { bg: "bg-orange-50 border-orange-200", text: "text-orange-800", Icon: AlertTriangle, iconCls: "text-orange-500" },
  };
  const { bg, text, Icon, iconCls } = styles[type];
  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${bg}`}>
      <Icon size={16} className={`${iconCls} shrink-0 mt-0.5`} strokeWidth={2} />
      <div className={`text-sm ${text}`}>{children}</div>
    </div>
  );
}

function TermCard({ term, color, children }: { term: string; color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    blue:   "bg-blue-50 border-blue-200 text-blue-700",
    green:  "bg-green-50 border-green-200 text-green-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
  };
  return (
    <div className={`p-3 rounded-lg border ${colorMap[color] ?? colorMap.blue}`}>
      <span className="font-semibold text-sm">{term}:</span>
      <span className="text-sm ml-1">{children}</span>
    </div>
  );
}

function GreenBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium mx-0.5">{children}</span>;
}

function RedBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-600 text-xs font-medium mx-0.5">{children}</span>;
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start">
      <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" strokeWidth={2.5} />
      <span className="text-sm text-gray-700">{children}</span>
    </div>
  );
}
