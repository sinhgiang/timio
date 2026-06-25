function base(title: string, content: string) {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Logo header -->
        <tr>
          <td style="background:#1e40af;border-radius:16px 16px 0 0;padding:24px 32px;text-align:center;">
            <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">⏱ Timio</span>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="background:#ffffff;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Timio · <a href="https://timio.vn" style="color:#6b7280;text-decoration:none;">timio.vn</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function fmtVND(amount: number) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
}

// ─── Affiliate: thông báo có đơn mới ───────────────────────────────────────

export function affiliateSaleEmail(opts: {
  affiliateName: string;
  companyName: string;
  planLabel: string;
  planPrice: number;
  rate: number;
  commission: number;
  holdEndsAt: Date;
  payoutDate: Date;
  affiliateCode: string;
}) {
  const content = `
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#111827;">🎉 Bạn vừa có đơn hoa hồng mới!</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Xin chào <strong>${opts.affiliateName}</strong>, ai đó bạn giới thiệu vừa mua Timio.</p>

    <!-- Sale summary card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;">Công ty vừa mua</p>
        <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">${opts.companyName}</p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;">
              <span style="font-size:13px;color:#6b7280;">Gói mua</span>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;text-align:right;">
              <span style="font-size:14px;font-weight:600;color:#111827;">${opts.planLabel} — ${fmtVND(opts.planPrice)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;">
              <span style="font-size:13px;color:#6b7280;">Tỷ lệ hoa hồng</span>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid #dbeafe;text-align:right;">
              <span style="font-size:14px;font-weight:600;color:#111827;">${opts.rate}%</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0 0;">
              <span style="font-size:14px;font-weight:700;color:#111827;">Hoa hồng dự kiến</span>
            </td>
            <td style="padding:12px 0 0;text-align:right;">
              <span style="font-size:22px;font-weight:800;color:#16a34a;">${fmtVND(opts.commission)}</span>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- Timeline -->
    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Lộ trình thanh toán</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="28" valign="top" style="padding-top:3px;">
          <div style="width:20px;height:20px;background:#fbbf24;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#fff;font-weight:700;">1</div>
        </td>
        <td style="padding-bottom:14px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Đang giữ đơn 30 ngày</p>
          <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">Hết ngày giữ: <strong>${fmtDate(opts.holdEndsAt)}</strong></p>
        </td>
      </tr>
      <tr>
        <td width="28" valign="top" style="padding-top:3px;">
          <div style="width:20px;height:20px;background:#3b82f6;border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#fff;font-weight:700;">2</div>
        </td>
        <td>
          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Thanh toán vào ngày 15</p>
          <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">Dự kiến nhận: <strong style="color:#1d4ed8;">${fmtDate(opts.payoutDate)}</strong></p>
        </td>
      </tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#166534;">
        ✅ Hoa hồng sẽ được xác nhận và chuyển khoản vào <strong>${fmtDate(opts.payoutDate)}</strong> nếu không có yêu cầu hoàn tiền.
      </p>
    </div>

    <div style="text-align:center;">
      <a href="https://timio.vn/affiliate/${opts.affiliateCode}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
        Xem dashboard affiliate →
      </a>
    </div>
  `;
  return base(`Hoa hồng mới từ Timio — ${opts.companyName}`, content);
}

// ─── Admin Timio: thông báo có đơn mua mới ────────────────────────────────

export function adminPaymentNotifyEmail(opts: {
  companyName: string;
  companySlug: string;
  planLabel: string;
  planPrice: number;
  months: number;
  affiliateCode: string | null;
  affiliateName: string | null;
  newExpiry: Date;
}) {
  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">💰 Đơn thanh toán mới!</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Một khách hàng vừa thanh toán thành công trên Timio.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        ${[
          ["Công ty", `${opts.companyName} (${opts.companySlug})`],
          ["Gói mua", `${opts.planLabel} — ${fmtVND(opts.planPrice)}/tháng`],
          ["Thời hạn", `${opts.months} tháng`],
          ["Hết hạn mới", fmtDate(opts.newExpiry)],
          ["Affiliate", opts.affiliateCode ? `${opts.affiliateName ?? ""} (@${opts.affiliateCode})` : "Không có"],
        ].map(([label, val], i, arr) => `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;${i < arr.length - 1 ? "border-bottom:1px solid #d1fae5;" : ""}">
                <span style="font-size:13px;color:#6b7280;">${label}</span>
              </td>
              <td style="padding:8px 0;text-align:right;${i < arr.length - 1 ? "border-bottom:1px solid #d1fae5;" : ""}">
                <span style="font-size:14px;font-weight:600;color:#111827;">${val}</span>
              </td>
            </tr>
          </table>
        `).join("")}
      </td></tr>
    </table>

    <div style="text-align:center;">
      <a href="https://timio.vn/admin" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
        Xem trang Admin →
      </a>
    </div>
  `;
  return base(`Đơn mua mới: ${opts.companyName} — ${opts.planLabel}`, content);
}

// ─── Khách hàng: xác nhận mua hàng thành công ─────────────────────────────

export function customerPaymentConfirmEmail(opts: {
  adminName: string;
  companyName: string;
  planLabel: string;
  planPrice: number;
  months: number;
  newExpiry: Date;
}) {
  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">✅ Thanh toán thành công!</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Xin chào <strong>${opts.adminName}</strong>, gói dịch vụ Timio của <strong>${opts.companyName}</strong> đã được kích hoạt.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        ${[
          ["Gói dịch vụ", opts.planLabel],
          ["Số tiền", fmtVND(opts.planPrice * opts.months)],
          ["Thời hạn", `${opts.months} tháng`],
          ["Ngày hết hạn", fmtDate(opts.newExpiry)],
        ].map(([label, val], i, arr) => `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;${i < arr.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""}">
                <span style="font-size:13px;color:#6b7280;">${label}</span>
              </td>
              <td style="padding:8px 0;text-align:right;${i < arr.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""}">
                <span style="font-size:14px;font-weight:600;color:#111827;">${val}</span>
              </td>
            </tr>
          </table>
        `).join("")}
      </td></tr>
    </table>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#1e40af;">
        🎉 Cảm ơn bạn đã tin tưởng Timio! Nếu cần hỗ trợ, liên hệ chúng tôi qua <a href="mailto:support@timio.vn" style="color:#1d4ed8;">support@timio.vn</a>
      </p>
    </div>

    <div style="text-align:center;">
      <a href="https://timio.vn/dashboard" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
        Vào Dashboard →
      </a>
    </div>
  `;
  return base(`Thanh toán thành công — Gói ${opts.planLabel} Timio`, content);
}

// ─── Khách hàng: chào mừng đăng ký miễn phí ──────────────────────────────

export function welcomeEmail(opts: { adminName: string; companyName: string; slug: string }) {
  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">Chào mừng bạn đến với Timio!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Xin chào <strong>${opts.adminName}</strong>, tài khoản <strong>${opts.companyName}</strong> đã được tạo thành công.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;">Bắt đầu với 3 bước đơn giản:</p>
        ${[
          ["1", "Thêm nhân viên", "Vào Nhân viên → Thêm mới, điền thông tin và PIN"],
          ["2", "Cài máy kiosk", `Mở trình duyệt, vào timio.vn/checkin/${opts.slug}`],
          ["3", "Xem báo cáo", "Nhân viên check-in xong, xem ngay tại Báo cáo"],
        ].map(([num, title, desc]) => `
          <div style="display:flex;gap:12px;margin-bottom:12px;align-items:flex-start;">
            <div style="min-width:28px;height:28px;background:#1d4ed8;border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:13px;font-weight:700;line-height:28px;display:block;text-align:center;">${num}</span>
            </div>
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${title}</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${desc}</p>
            </div>
          </div>
        `).join("")}
      </td></tr>
    </table>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#1e40af;">
        Gói miễn phí cho phép tối đa <strong>5 nhân viên</strong> và lưu dữ liệu <strong>90 ngày</strong>.
        Nâng cấp lên Pro khi bạn cần thêm.
      </p>
    </div>

    <div style="text-align:center;">
      <a href="https://timio.vn/dashboard" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
        Vào Dashboard ngay →
      </a>
    </div>
  `;
  return base(`Chào mừng ${opts.companyName} đến với Timio!`, content);
}

// ─── Admin Timio: thông báo có tài khoản mới đăng ký ─────────────────────

export function adminNewSignupEmail(opts: {
  companyName: string;
  companySlug: string;
  email: string;
  referralCode: string | null;
  affiliateCode: string | null;
}) {
  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">🆕 Khách hàng mới đăng ký!</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Có một công ty vừa tạo tài khoản Timio (gói Miễn phí).</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        ${[
          ["Công ty", `${opts.companyName}`],
          ["Slug", `${opts.companySlug}`],
          ["Email", opts.email],
          ["Giới thiệu", opts.referralCode ?? "Không"],
          ["Affiliate", opts.affiliateCode ?? "Không"],
        ].map(([label, val], i, arr) => `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;${i < arr.length - 1 ? "border-bottom:1px solid #d1fae5;" : ""}">
                <span style="font-size:13px;color:#6b7280;">${label}</span>
              </td>
              <td style="padding:8px 0;text-align:right;${i < arr.length - 1 ? "border-bottom:1px solid #d1fae5;" : ""}">
                <span style="font-size:14px;font-weight:600;color:#111827;">${val}</span>
              </td>
            </tr>
          </table>
        `).join("")}
      </td></tr>
    </table>
  `;
  return base(`Đăng ký mới: ${opts.companyName}`, content);
}

// ─── Admin: cảnh báo hợp đồng sắp hết hạn ────────────────────────────────

export function contractExpiryEmail(opts: {
  companyName: string;
  contracts: { name: string; code: string; endDate: string; daysLeft: number }[];
}) {
  const rows = opts.contracts.map((c) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #fee2e2;font-size:14px;color:#111827;">${c.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #fee2e2;font-size:13px;color:#6b7280;">${c.code}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #fee2e2;font-size:13px;color:#111827;">${c.endDate}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #fee2e2;text-align:center;">
        <span style="background:${c.daysLeft <= 7 ? "#fee2e2" : "#fef3c7"};color:${c.daysLeft <= 7 ? "#991b1b" : "#92400e"};font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;">
          Còn ${c.daysLeft} ngày
        </span>
      </td>
    </tr>
  `).join("");

  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">⚠️ Hợp đồng sắp hết hạn</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Các nhân viên sau của <strong>${opts.companyName}</strong> có hợp đồng hết hạn trong <strong>30 ngày tới</strong>.
      Vui lòng liên hệ để ký gia hạn kịp thời.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <thead>
        <tr style="background:#fef2f2;">
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">Nhân viên</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">Mã</th>
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;font-weight:600;">Ngày hết hạn</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;color:#6b7280;font-weight:600;">Còn lại</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        Vào <strong>Nhân viên → Hồ sơ → Hợp đồng</strong> để gia hạn hoặc tạo hợp đồng mới.
      </p>
    </div>

    <div style="text-align:center;">
      <a href="https://timio.vn/dashboard/employees" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
        Xem danh sách nhân viên →
      </a>
    </div>
  `;
  return base(`⚠️ ${opts.contracts.length} hợp đồng sắp hết hạn — ${opts.companyName}`, content);
}

// ─── Admin: nhân viên gửi đơn xin nghỉ ────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  annual: "Nghỉ phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Nghỉ không lương",
  maternity: "Thai sản",
  other: "Khác",
};

export function leaveRequestEmail(opts: {
  adminName: string;
  employeeName: string;
  department: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  dashboardUrl: string;
}) {
  const typeLabel = TYPE_LABELS[opts.type] ?? opts.type;

  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">📋 Đơn xin nghỉ mới</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Xin chào <strong>${opts.adminName}</strong>, <strong>${opts.employeeName}</strong> vừa gửi đơn xin nghỉ cần duyệt.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        ${[
          ["Nhân viên", `${opts.employeeName}${opts.department ? ` · ${opts.department}` : ""}`],
          ["Loại nghỉ", typeLabel],
          ["Từ ngày", opts.fromDate.split("-").reverse().join("/")],
          ["Đến ngày", opts.toDate.split("-").reverse().join("/")],
          ["Số ngày", `${opts.days} ngày`],
        ].map(([label, val], i, arr) => `
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:9px 0;${i < arr.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""}">
                <span style="font-size:13px;color:#6b7280;">${label}</span>
              </td>
              <td style="padding:9px 0;text-align:right;${i < arr.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""}">
                <span style="font-size:14px;font-weight:600;color:#111827;">${val}</span>
              </td>
            </tr>
          </table>
        `).join("")}
        ${opts.reason ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;">
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Lý do</p>
            <p style="margin:0;font-size:14px;color:#374151;white-space:pre-line;">${opts.reason}</p>
          </div>
        ` : ""}
      </td></tr>
    </table>

    <div style="text-align:center;">
      <a href="${opts.dashboardUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">
        Duyệt hoặc từ chối →
      </a>
    </div>
  `;
  return base("Đơn xin nghỉ mới cần duyệt", content);
}
