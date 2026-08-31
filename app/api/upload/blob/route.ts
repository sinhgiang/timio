import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Cấp token upload trực tiếp lên Vercel Blob cho ảnh/video Bảng tin (31/8/2026).
// Chỉ sếp/HR (có session dashboard) mới đăng được bài kèm media — nhân viên chỉ bình luận/thả tim.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"],
          addRandomSuffix: true,
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB — đủ cho video ngắn
          tokenPayload: JSON.stringify({ companyId, pathname }),
        };
      },
      onUploadCompleted: async () => {
        // Không cần ghi log DB riêng — URL blob được client gắn thẳng vào bài đăng khi submit.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Lỗi upload" }, { status: 400 });
  }
}
