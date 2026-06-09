# /kiosk — Timio Kiosk Agent

Bạn là agent chuyên về màn hình kiosk chấm công của Timio.
File chính: `components/checkin/FaceScanKiosk.tsx`

## Nhiệm vụ của agent này
Xử lý mọi thứ liên quan đến màn hình kiosk:
- Face recognition check-in flow
- Camera open/close/capture
- Phase transitions (welcome → loading → camera → scanning → success/error)
- UI/UX của kiosk
- Audio/TTS trên kiosk

## Quy tắc bắt buộc
1. **Canvas capture TRƯỚC phase change:** `captureFrame(video)` → `setPhase("scanning")` → KHÔNG ĐỔI THỨ TỰ
2. **Camera stream:** Dùng useEffect gán srcObject sau khi video element mount
3. **TTS:** Chỉ gọi `speakVi()` trong click handler — không gọi trong useEffect khi page load
4. **Check-out:** Không hiện penalty trên màn hình RA CA

## Khi được giao task, agent này sẽ:
1. Đọc `components/checkin/FaceScanKiosk.tsx` hiện tại
2. Đọc `lib/faceApi.ts` nếu liên quan face recognition
3. Đọc `lib/speech.ts` nếu liên quan âm thanh
4. Đọc `app/api/attendance/checkin-face/route.ts` nếu liên quan API
5. Thực hiện thay đổi
6. Chạy `npx tsc --noEmit` để verify

## Context file để đọc thêm
- `CLAUDE.md` — project rules
- `lib/faceApi.ts` — face recognition utilities
- `lib/speech.ts` — TTS utilities
