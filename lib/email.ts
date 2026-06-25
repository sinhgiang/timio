export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.SMTP_PASS;
  if (!apiKey) {
    console.warn("[email] SMTP_PASS (Resend API key) chưa cấu hình — bỏ qua email đến:", to);
    return;
  }

  const from = process.env.SMTP_FROM ?? "Timio <team@timio.vn>";

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    console.error("[email] Resend API lỗi đến", to, err);
    throw new Error(`Resend API error: ${JSON.stringify(err)}`);
  }
}
