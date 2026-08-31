import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchLinkPreview } from "@/lib/linkPreview";

// Lấy xem trước cho link dán vào ô soạn bài (Bảng tin, 31/8/2026). Chỉ sếp/HR gọi được —
// đây là fetch URL tuỳ ý do người dùng nhập, giới hạn cho session đăng nhập để tránh bị lạm dụng làm proxy.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (typeof url !== "string" || !url.trim()) return NextResponse.json({ error: "Thiếu link" }, { status: 400 });

  const preview = await fetchLinkPreview(url);
  if (!preview) return NextResponse.json({ error: "Không đọc được link này" }, { status: 422 });
  return NextResponse.json(preview);
}
