"use client";

import { Printer } from "lucide-react";

interface PayslipData {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  position: string;
  branch: string;
  phone: string;
  joinDate: string;
  year: number;
  month: number;
  baseSalary: number;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  totalMinutesLate: number;
  totalPenalty: number;
  totalReward: number;
  totalOvertimeAmount: number;
  totalMinutesOvertime: number;
  grossIncome: number;
  bhxhEmployee: number;
  bhxhEmployer: number;
  taxableIncome: number;
  tncn: number;
  netTakeHome: number;
  dependents: number;
  companyName: string;
}

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}

export default function PayslipPrint({ data }: { data: PayslipData }) {
  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="print:hidden flex justify-center pt-6 pb-2 gap-3">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Printer size={16} />
          In phiếu lương
        </button>
        <button
          onClick={() => window.close()}
          className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          Đóng
        </button>
      </div>

      {/* A4 Payslip */}
      <div
        id="payslip"
        className="mx-auto bg-white print:shadow-none"
        style={{ width: "210mm", minHeight: "297mm", padding: "18mm 20mm", fontFamily: "Arial, sans-serif", fontSize: "13px" }}
      >
        {/* Header */}
        <div style={{ borderBottom: "2px solid #1e40af", paddingBottom: "12px", marginBottom: "16px" }}>
          <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "2px" }}>{data.companyName}</p>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>PHIẾU LƯƠNG</h1>
          <p style={{ fontSize: "13px", color: "#374151", marginTop: "4px" }}>
            Tháng {String(data.month).padStart(2, "0")} / {data.year}
          </p>
        </div>

        {/* Employee info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", marginBottom: "18px" }}>
          <InfoRow label="Họ và tên" value={data.employeeName} />
          <InfoRow label="Mã nhân viên" value={data.employeeCode} />
          <InfoRow label="Phòng ban" value={data.department || "—"} />
          <InfoRow label="Chức vụ" value={data.position || "—"} />
          <InfoRow label="Chi nhánh" value={data.branch} />
          <InfoRow label="Số điện thoại" value={data.phone || "—"} />
          {data.joinDate && <InfoRow label="Ngày vào làm" value={data.joinDate} />}
          <InfoRow label="Người phụ thuộc" value={`${data.dependents} người`} />
        </div>

        {/* I. Chấm công */}
        <SectionTitle>I. Chấm công tháng {data.month}/{data.year}</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th style={thStyle}>Chỉ tiêu</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Giá trị</th>
            </tr>
          </thead>
          <tbody>
            <TRow label="Số ngày công thực tế" value={`${data.daysPresent} ngày`} />
            <TRow label="Số ngày vắng" value={`${data.daysAbsent} ngày`} highlight={data.daysAbsent > 0 ? "red" : undefined} />
            <TRow label="Số lần đi trễ" value={`${data.daysLate} lần`} highlight={data.daysLate > 0 ? "orange" : undefined} />
            <TRow label="Tổng số phút trễ" value={`${data.totalMinutesLate} phút`} />
            {data.totalMinutesOvertime > 0 && (
              <TRow label="Số phút tăng ca" value={`${data.totalMinutesOvertime} phút`} />
            )}
          </tbody>
        </table>

        {/* II. Tính lương */}
        <SectionTitle>II. Tính lương & Các khoản khấu trừ</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th style={thStyle}>Khoản mục</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Số tiền (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {/* Thu nhập */}
            <tr style={{ backgroundColor: "#f0fdf4" }}>
              <td colSpan={2} style={{ ...tdStyle, fontSize: "11px", fontWeight: "600", color: "#166534", paddingTop: "6px", paddingBottom: "4px" }}>
                A. THU NHẬP
              </td>
            </tr>
            <TRow label="(+) Lương cơ bản" value={`${fmt(data.baseSalary)} đ`} />
            {data.totalReward > 0 && (
              <TRow label="(+) Thưởng chuyên cần" value={`${fmt(data.totalReward)} đ`} highlight="green" />
            )}
            {data.totalOvertimeAmount > 0 && (
              <TRow label="(+) Phụ cấp tăng ca" value={`${fmt(data.totalOvertimeAmount)} đ`} highlight="green" />
            )}
            {data.totalPenalty > 0 && (
              <TRow label="(-) Phạt vi phạm" value={`- ${fmt(data.totalPenalty)} đ`} highlight="red" />
            )}
            <tr style={{ backgroundColor: "#eff6ff" }}>
              <td style={{ ...tdStyle, fontWeight: "600" }}>= Thu nhập trước thuế</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600", color: "#1d4ed8" }}>{fmt(data.grossIncome)} đ</td>
            </tr>

            {/* Khấu trừ bắt buộc */}
            <tr style={{ backgroundColor: "#fff7ed" }}>
              <td colSpan={2} style={{ ...tdStyle, fontSize: "11px", fontWeight: "600", color: "#9a3412", paddingTop: "6px", paddingBottom: "4px" }}>
                B. KHẤU TRỪ BẮT BUỘC
              </td>
            </tr>
            <TRow label="(-) BHXH + BHYT + BHTN (10.5% lương CB)" value={`- ${fmt(data.bhxhEmployee)} đ`} highlight="red" />
            <tr>
              <td style={{ ...tdStyle, paddingLeft: "24px", fontSize: "11px", color: "#9ca3af" }}>
                Giảm trừ bản thân
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontSize: "11px", color: "#9ca3af" }}>- 11.000.000 đ</td>
            </tr>
            {data.dependents > 0 && (
              <tr>
                <td style={{ ...tdStyle, paddingLeft: "24px", fontSize: "11px", color: "#9ca3af" }}>
                  Giảm trừ {data.dependents} người phụ thuộc
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontSize: "11px", color: "#9ca3af" }}>
                  - {fmt(data.dependents * 4_400_000)} đ
                </td>
              </tr>
            )}
            <tr>
              <td style={{ ...tdStyle, paddingLeft: "24px", fontSize: "11px", color: "#6b7280" }}>
                Thu nhập tính thuế
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontSize: "11px", color: "#6b7280" }}>
                {fmt(data.taxableIncome)} đ
              </td>
            </tr>
            <TRow label="(-) Thuế TNCN" value={data.tncn > 0 ? `- ${fmt(data.tncn)} đ` : "0 đ (miễn thuế)"} highlight={data.tncn > 0 ? "red" : undefined} />
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: "#dbeafe" }}>
              <td style={{ ...tdStyle, fontWeight: "bold", color: "#1e40af", fontSize: "14px" }}>
                THỰC NHẬN (Sau BHXH + Thuế TNCN)
              </td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold", color: "#1e40af", fontSize: "15px" }}>
                {fmt(data.netTakeHome)} đ
              </td>
            </tr>
          </tfoot>
        </table>

        {/* III. BHXH công ty (tham khảo) */}
        {data.bhxhEmployer > 0 && (
          <>
            <SectionTitle>III. Công ty đóng thêm (tham khảo)</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
              <tbody>
                <TRow label="BHXH + BHYT + BHTN + BHTNNLĐ (22% lương CB)" value={`${fmt(data.bhxhEmployer)} đ`} />
              </tbody>
            </table>
          </>
        )}

        {/* Số tiền bằng chữ */}
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px 14px", marginBottom: "28px" }}>
          <span style={{ fontSize: "11px", color: "#6b7280" }}>Thực nhận bằng chữ: </span>
          <span style={{ fontSize: "12px", fontStyle: "italic", color: "#374151" }}>
            {numberToWords(data.netTakeHome)} đồng
          </span>
        </div>

        {/* Chữ ký */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "16px" }}>
          <SignBlock title="Nhân viên xác nhận" subtitle="(Ký, ghi rõ họ tên)" />
          <SignBlock title="Phụ trách lương" subtitle="(Ký, ghi rõ họ tên)" />
        </div>

        {/* Footer */}
        <div style={{ marginTop: "36px", borderTop: "1px solid #e5e7eb", paddingTop: "10px", textAlign: "center" }}>
          <p style={{ fontSize: "10px", color: "#9ca3af" }}>
            Phiếu lương tháng {data.month}/{data.year} · {data.companyName} · Được tạo bởi Timio
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; }
          #payslip { page-break-inside: avoid; }
        }
      `}</style>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <span style={{ color: "#6b7280", minWidth: "120px", fontSize: "12px" }}>{label}:</span>
      <span style={{ fontWeight: "600", color: "#111827", fontSize: "12px" }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontWeight: "bold", color: "#1e40af", marginBottom: "8px", fontSize: "13px", borderLeft: "3px solid #1e40af", paddingLeft: "8px" }}>
      {children}
    </p>
  );
}

const thStyle: React.CSSProperties = {
  padding: "7px 12px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: "600",
  color: "#374151",
  border: "1px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #e5e7eb",
  fontSize: "12px",
  color: "#374151",
};

function TRow({ label, value, highlight }: { label: string; value: string; highlight?: "red" | "green" | "orange" }) {
  const color = highlight === "red" ? "#dc2626" : highlight === "green" ? "#16a34a" : highlight === "orange" ? "#d97706" : "#374151";
  return (
    <tr>
      <td style={tdStyle}>{label}</td>
      <td style={{ ...tdStyle, textAlign: "right", color, fontWeight: highlight ? "600" : "400" }}>{value}</td>
    </tr>
  );
}

function SignBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontWeight: "600", fontSize: "12px", marginBottom: "2px" }}>{title}</p>
      <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "56px" }}>{subtitle}</p>
      <div style={{ borderTop: "1px solid #9ca3af", paddingTop: "4px" }}>
        <p style={{ fontSize: "11px", color: "#9ca3af" }}>Họ tên & chữ ký</p>
      </div>
    </div>
  );
}

function numberToWords(n: number): string {
  if (n <= 0) return "Không";
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const scales = ["", "nghìn", "triệu", "tỷ"];
  function readGroup(num: number): string {
    const h = Math.floor(num / 100), t = Math.floor((num % 100) / 10), u = num % 10;
    let r = "";
    if (h > 0) r += units[h] + " trăm ";
    if (t > 1) r += units[t] + " mươi ";
    else if (t === 1) r += "mười ";
    if (u > 0) {
      if (t >= 1 && u === 1) r += "mốt ";
      else if (t >= 2 && u === 5) r += "lăm ";
      else r += units[u] + " ";
    }
    return r.trim();
  }
  let result = ""; let i = 0;
  while (n > 0) {
    const group = n % 1000;
    if (group !== 0) {
      const w = readGroup(group);
      result = w + (scales[i] ? " " + scales[i] : "") + (result ? " " + result : "");
    }
    n = Math.floor(n / 1000); i++;
  }
  return result.charAt(0).toUpperCase() + result.slice(1);
}
