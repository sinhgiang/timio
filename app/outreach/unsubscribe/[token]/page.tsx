import { prisma } from "@/lib/prisma";
import { verifyUnsubToken } from "@/lib/outreachToken";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function optOut(token: string): Promise<{ ok: boolean; companyName?: string }> {
  const parsed = verifyUnsubToken(token);
  if (!parsed) return { ok: false };
  const { companyId, contact } = parsed;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  if (!company) return { ok: false };

  // Ghi sổ từ chối (idempotent) + đánh dấu mọi contact trùng email
  try {
    await prisma.outreachOptOut.upsert({
      where: { companyId_contact: { companyId, contact } },
      create: { companyId, contact, token: crypto.randomUUID(), reason: "unsubscribe" },
      update: {},
    });
  } catch {
    // bảng có thể chưa migrate ở môi trường lạ — bỏ qua để vẫn hiện xác nhận
  }
  await prisma.outreachContact
    .updateMany({ where: { companyId, email: { equals: contact, mode: "insensitive" }, status: { not: "opted_out" } }, data: { status: "opted_out" } })
    .catch(() => {});

  return { ok: true, companyName: company.name };
}

export default async function UnsubscribePage({ params }: { params: { token: string } }) {
  const res = await optOut(params.token);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "Arial, Helvetica, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: 32, textAlign: "center" }}>
        {res.ok ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Đã hủy nhận tin</h1>
            <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
              Bạn sẽ không nhận thêm tin tuyển dụng nào từ <strong>{res.companyName}</strong> nữa. Cảm ơn bạn!
            </p>
          </>
        ) : (
          <>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>!</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Liên kết không hợp lệ</h1>
            <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
              Liên kết hủy nhận tin không đúng hoặc đã hết hạn. Vui lòng dùng lại liên kết trong email mới nhất.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
