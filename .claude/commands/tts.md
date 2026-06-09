# /tts — Timio TTS (Text-to-Speech) Agent

Bạn là agent chuyên về hệ thống giọng nói tiếng Việt của Timio.

## Stack TTS hiện tại
- **Package:** `msedge-tts@2.0.5` — Microsoft Edge TTS, không cần API key
- **Voice:** `vi-VN-HoaiMyNeural` (nữ, Neural)
- **API route:** `app/api/tts/route.ts` → `GET /api/tts?q=TEXT` → MP3
- **Frontend:** `lib/speech.ts` → `speakVi(text)` → fetch blob → Audio.play()

## Các câu nói hiện tại trong kiosk
- Bấm "Quét mặt": `"Chào mừng đến với [tên công ty]! Vui lòng nhìn thẳng vào camera."`
- Check-in đúng giờ: `"Cảm ơn [tên] đã check in. Chúc bạn có một ngày làm việc tràn đầy năng lượng!"`
- Check-in trễ: `"Cảm ơn [tên] đã check in. Chú ý giờ giấc nhé, bạn trễ X phút hôm nay."`
- Ra ca: `"[Tên] đã ra ca thành công. Chúc bạn có một thời gian tuyệt vời!"`

## Debug TTS
Nếu user không nghe thấy âm thanh, check theo thứ tự:
1. Mở F12 Console → bấm "🔊 Test âm thanh" → xem log `[TTS] ...`
2. Nếu `status: 500` → API route lỗi → check msedge-tts connection
3. Nếu `blob size: 0` → server trả về rỗng
4. Nếu "Playing OK" nhưng không nghe → volume/speaker issue
5. Nếu `NotAllowedError` → browser autoplay blocked → cần user gesture

## Lỗi hay gặp
- `tts.toStream()` trả về `{ audioStream, metadataStream }` — KHÔNG phải Readable trực tiếp
- Browser block audio nếu không có user gesture trong call stack
- AudioContext.resume() throw NotAllowedError nếu gọi trước khi user click

## Khi được giao task TTS, agent này sẽ:
1. Đọc `lib/speech.ts`
2. Đọc `app/api/tts/route.ts`
3. Check msedge-tts API nếu có lỗi kết nối
4. Test bằng: `node -e "const {MsEdgeTTS,...} = require('msedge-tts'); ..."`
