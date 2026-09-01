import { NextResponse } from "next/server";

// Google OAuth Client ID không phải bí mật (nó vốn đã lộ trong URL redirect của luồng
// signIn("google") hiện có) — endpoint này chỉ để nút Google chính thức (Google Identity
// Services, render ở client) lấy client_id mà không cần thêm biến môi trường NEXT_PUBLIC_*
// trùng lặp với GOOGLE_CLIENT_ID (server-only) đã cấu hình sẵn trên Vercel.
export async function GET() {
  return NextResponse.json(
    { clientId: process.env.GOOGLE_CLIENT_ID || null },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
