# Timio — Project Rules for Claude

## Project context
Timio là hệ thống chấm công SaaS (máy chấm công) cho doanh nghiệp Việt Nam.
- **Kiosk PWA:** `/checkin/[slug]` — nhân viên quét mặt để check-in, đặt trên điện thoại văn phòng
- **Dashboard:** `/dashboard` — sếp/kế toán xem báo cáo, quản lý nhân viên
- **Dev login:** admin@demo.com / admin123 | Check-in: /checkin/demo

## Stack
- Next.js 14 App Router, TypeScript strict, Tailwind CSS
- Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- NextAuth.js v4 (email/password)
- @vladmandic/face-api (TF.js face recognition, models tại /public/models/)
- msedge-tts (Vietnamese TTS, vi-VN-HoaiMyNeural)
- xlsx (SheetJS) for Excel export

## Coding rules

### TypeScript
- Luôn chạy `npx tsc --noEmit` sau khi sửa code để check lỗi
- Không dùng `any` trừ khi bắt buộc
- Tất cả API routes phải có error handling

### Components
- Kiosk components: `"use client"` bắt buộc, không import server-side packages
- Face API chỉ import dynamic (`await import("@/lib/faceApi")`) — không static import vì TF.js không chạy server-side
- Camera pattern: KHÔNG mount `<video>` conditionally rồi gán srcObject ngay — phải dùng useEffect sau phase change

### Critical bugs đã fix (ĐỪNG revert)
1. **Canvas capture before phase change:** `captureFrame(videoRef.current)` PHẢI được gọi TRƯỚC `setPhase("scanning")`, không phải sau
2. **TF.js warmup:** `ensureModels()` chạy một lần detection trên canvas trắng để warmup WebGL
3. **RA CA display:** Màn hình check-out KHÔNG hiện penalty/tiền phạt

### Audio/TTS
- `speakVi()` phải được gọi trong user click handler (không từ useEffect trên load)
- Browser block audio autoplay — dùng Blob URL approach
- `/api/tts?q=TEXT` → msedge-tts → vi-VN-HoaiMyNeural MP3

### Database
- Luôn dùng `prisma/seed.ts` để reset demo data
- Employee có field `faceDescriptors` (JSON string array của number[][])
- Prisma client singleton tại `lib/prisma.ts`

### UI/UX principles (theo yêu cầu của user)
- Vietnamese-first: labels, messages, currency (VND) đều tiếng Việt
- Kiosk screen: PHẢI simple, large text, touch-friendly
- Admin link trên kiosk: PHẢI nhỏ, subtle (không làm nhân viên nhầm)
- Success/error messages: PHẢI rõ ràng, không generic
- Khi có lỗi: PHẢI hiện thông tin lỗi cụ thể (không "Lỗi xảy ra")

## File structure quan trọng
```
lib/faceApi.ts              — face recognition (ensureModels, captureFrame, extractDescriptor, findBestMatch)
lib/speech.ts               — TTS (speakVi, unlockAudio)
lib/attendance.ts           — business logic
lib/auth.ts                 — NextAuth
lib/prisma.ts               — Prisma singleton
components/checkin/
  FaceScanKiosk.tsx         — kiosk UI chính
components/admin/
  FaceCapture.tsx           — đăng ký khuôn mặt
app/api/tts/route.ts        — TTS endpoint
app/api/attendance/
  checkin-face/route.ts     — check-in API
  checkin/route.ts          — legacy PIN check-in
app/api/employees/
  [id]/face/route.ts        — save/delete face descriptors
public/models/              — face-api model files (.bin + manifest)
prisma/schema.prisma        — database schema
prisma/seed.ts              — demo data seed
```
