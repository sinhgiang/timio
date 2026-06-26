import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { calculateTax } from "@/lib/taxCalculator";

function fmt(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function fmtMonth(year: number, month: number) {
  return `Tháng ${month}/${year}`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { companyId?: string } | undefined;
  if (!user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, year, month } = await req.json();
  if (!employeeId || !year || !month) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  try {
    const [employee, company, summary] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true, name: true, code: true, email: true,
          department: true, position: true, baseSalary: true, dependents: true,
          branch: { select: { name: true } },
        },
      }),
      prisma.company.findUnique({
        where: { id: user.companyId },
        select: { name: true },
      }),
      prisma.monthlySummary.findFirst({
        where: { employeeId, year, month },
        select: {
          daysPresent: true, daysLate: true, daysAbsent: true,
          totalMinutesLate: true, totalPenalty: true, totalReward: true,
          totalOvertimeAmount: true, totalMinutesOvertime: true,
        },
      }),
    ]);

    if (!employee) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });
    if (!employee.email) return NextResponse.json({ error: "Nhân viên chưa có địa chỉ email" }, { status: 400 });

    const base = employee.baseSalary ?? 0;
    const penalty = summary?.totalPenalty ?? 0;
    const reward = summary?.totalReward ?? 0;
    const overtime = summary?.totalOvertimeAmount ?? 0;
    const grossIncome = base - penalty + reward + overtime;
    const tax = calculateTax({ baseSalary: base, grossIncome, dependents: employee.dependents ?? 0 });
    const net = tax.netTakeHome;

    const rows = [
      ["Lương cơ bản", fmt(base)],
      ["Ngày công", `${summary?.daysPresent ?? 0} ngày`],
      ["Số lần trễ", `${summary?.daysLate ?? 0} lần`],
      penalty > 0 ? ["Tiền phạt", `<span style="color:#dc2626">-${fmt(penalty)}</span>`] : null,
      reward > 0 ? ["Thưởng", `<span style="color:#16a34a">+${fmt(reward)}</span>`] : null,
      overtime > 0 ? ["Tăng ca", `<span style="color:#16a34a">+${fmt(overtime)}</span>`] : null,
      tax.bhxhEmployee > 0 ? ["BHXH (10.5%)", `<span style="color:#ea580c">-${fmt(tax.bhxhEmployee)}</span>`] : null,
      tax.tncn > 0 ? ["Thuế TNCN", `<span style="color:#7c3aed">-${fmt(tax.tncn)}</span>`] : null,
    ].filter(Boolean) as [string, string][];

    const tableRows = rows.map(([label, val]) => `
      <tr>
        <td style="padding:10px 16px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;">${label}</td>
        <td style="padding:10px 16px;font-size:14px;text-align:right;border-bottom:1px solid #f3f4f6;">${val}</td>
      </tr>
    `).join("");

    const html = `
      <h2 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">Phiếu lương ${fmtMonth(year, month)}</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${company?.name ?? ""}</p>

      <div style="background:#f8fafc;border-radius:12px;padding:16px 16px 8px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Nhân viên</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${employee.name}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${employee.code}${employee.department ? ` · ${employee.department}` : ""}${employee.branch ? ` · ${employee.branch.name}` : ""}</p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        ${tableRows}
      </table>

      <div style="background:#1e40af;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:13px;color:#bfdbfe;">Thực nhận</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">${fmt(net)}</p>
      </div>

      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        Phiếu lương được tạo tự động bởi hệ thống Timio.<br>
        Mọi thắc mắc vui lòng liên hệ bộ phận kế toán.
      </p>
    `;

    await sendEmail({
      to: employee.email,
      subject: `[Timio] Phiếu lương ${fmtMonth(year, month)} — ${employee.name}`,
      html,
    });

    return NextResponse.json({ ok: true, sentTo: employee.email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Lỗi gửi email", detail: msg }, { status: 500 });
  }
}
