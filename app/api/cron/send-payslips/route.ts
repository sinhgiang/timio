import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { calculateTax } from "@/lib/taxCalculator";

function fmt(n: number) { return n.toLocaleString("vi-VN") + "đ"; }

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayDay = now.getDate();

  // Tháng cần gửi phiếu lương = tháng trước (ngày phát lương là đầu tháng sau)
  const targetMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const targetYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  let companies: { id: string; name: string; paydayOfMonth: number | null }[];
  try {
    companies = await prisma.company.findMany({
      select: { id: true, name: true, paydayOfMonth: true },
    });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const dueCompanies = companies.filter(
    (c) => (c.paydayOfMonth ?? 5) === todayDay
  );

  let sent = 0;
  let skipped = 0;

  for (const company of dueCompanies) {
    const employees = await prisma.employee.findMany({
      where: { companyId: company.id, status: "active", email: { not: null } },
      select: {
        id: true, name: true, code: true, email: true,
        department: true, baseSalary: true, dependents: true,
        branch: { select: { name: true } },
        summaries: {
          where: { year: targetYear, month: targetMonth },
          select: {
            daysPresent: true, daysLate: true,
            totalPenalty: true, totalReward: true, totalOvertimeAmount: true,
          },
        },
      },
    });

    for (const emp of employees) {
      if (!emp.email) { skipped++; continue; }
      const s = emp.summaries[0];
      const base    = emp.baseSalary ?? 0;
      const penalty = s?.totalPenalty ?? 0;
      const reward  = s?.totalReward ?? 0;
      const overtime = s?.totalOvertimeAmount ?? 0;
      const gross   = base - penalty + reward + overtime;
      const tax     = calculateTax({ baseSalary: base, grossIncome: gross, dependents: emp.dependents ?? 0 });

      const rows = [
        ["Lương cơ bản", fmt(base)],
        ["Ngày công", `${s?.daysPresent ?? 0} ngày`],
        ["Số lần trễ", `${s?.daysLate ?? 0} lần`],
        penalty > 0 ? ["Tiền phạt", `<span style="color:#dc2626">-${fmt(penalty)}</span>`] : null,
        reward > 0  ? ["Thưởng", `<span style="color:#16a34a">+${fmt(reward)}</span>`] : null,
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
        <h2 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">Phiếu lương Tháng ${targetMonth}/${targetYear}</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${company.name}</p>
        <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Nhân viên</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">${emp.name}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${emp.code}${emp.department ? ` · ${emp.department}` : ""}</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
          ${tableRows}
        </table>
        <div style="background:#1e40af;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:13px;color:#bfdbfe;">Thực nhận</p>
          <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">${fmt(tax.netTakeHome)}</p>
        </div>
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
          Phiếu lương được gửi tự động bởi hệ thống Timio.<br>
          Mọi thắc mắc vui lòng liên hệ bộ phận kế toán.
        </p>
      `;

      try {
        await sendEmail({
          to: emp.email,
          subject: `[Timio] Phiếu lương Tháng ${targetMonth}/${targetYear} — ${emp.name}`,
          html,
        });
        sent++;
      } catch {
        skipped++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    day: todayDay,
    companiesChecked: companies.length,
    companiesDue: dueCompanies.length,
    sent,
    skipped,
  });
}
