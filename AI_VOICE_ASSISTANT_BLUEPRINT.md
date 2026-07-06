# Blueprint: Trợ lý AI hội thoại bằng giọng nói (tiếng Việt) cho web SaaS

> **Mục đích tài liệu:** Ghi lại TOÀN BỘ cách xây dựng con trợ lý AI của Timio (hệ thống chấm công) — gồm kiến trúc, quyết định kỹ thuật, các bẫy đã gặp và cách xử lý — để một AI/lập trình viên ở **project khác** đọc là dựng lại được một trợ lý tương tự.
>
> **QUAN TRỌNG khi tái sử dụng:** ĐỪNG bê nguyên dữ liệu/tool/nghiệp vụ của Timio (chấm công) sang. Hãy đọc kỹ project đích: nó là web gì, người dùng là ai, dữ liệu gì, cần trợ lý làm gì — rồi thay phần "công cụ (tools)" + "system prompt nghiệp vụ" cho phù hợp. Phần **hạ tầng giọng nói (STT/TTS/trò chuyện/chen ngang)** thì gần như dùng lại được y nguyên.

---

## 0. Con trợ lý này làm được gì (tính năng cuối)

1. **Chatbot hỏi–đáp dữ liệu công ty** bằng Claude tool-use, **phân quyền theo vai trò** (chủ/quản lý/kế toán…), có thể **thực hiện hành động** (vd gửi email nhắc việc).
2. **Nhập bằng giọng nói**: bấm mic → nói → tự chuyển thành chữ → tự gửi.
3. **AI đọc to câu trả lời** (chỉ khi hỏi bằng giọng; gõ tay thì chỉ hiện chữ).
4. **Chế độ "trò chuyện liên tục"** (hands-free): nói → AI đáp + đọc → đọc xong tự mở mic → nói tiếp, như gọi điện. Có lựa chọn "Bấm từng lần" vs "Trò chuyện liên tục".
5. **Chen ngang (barge-in)**: AI đang đọc mà người dùng muốn nói → **nút "Chạm để nói chen"** (chắc chắn) + cảm biến âm lượng (rảnh tay, best-effort).
6. **Giọng điệu lễ phép, xưng hô đúng** anh/chị theo giới tính, xưng "em".
7. **Đọc số/ngày/giờ/tiền thành lời tự nhiên** và **bỏ ký tự đặc biệt**.
8. Chạy cả **web (Next.js)** và **mobile (Expo/React Native)**.

---

## 1. Stack & kiến trúc tổng thể

- **Web:** Next.js 14 (App Router), TypeScript, Tailwind. Hosting **Vercel**.
- **LLM:** Claude qua `@anthropic-ai/sdk` (model rẻ+nhanh như `claude-haiku-4-5`; nâng `claude-sonnet`/`opus` nếu cần bám prompt tốt hơn). Dùng **tool-use** (function calling) + **streaming SSE**.
- **STT (giọng→chữ):** **Web Speech API** của trình duyệt (`webkitSpeechRecognition`), miễn phí, `lang="vi-VN"`. Mobile: `expo-speech-recognition` (on-device).
- **TTS (chữ→giọng):** **Google Translate TTS** proxy qua API route của mình (xem mục 4 — vì sao KHÔNG dùng msedge-tts/SpeechSynthesis). Mobile: `expo-speech`.
- **DB:** Prisma + Postgres (Neon). Phân quyền theo bản ghi tài khoản.

Các file chính (Timio) — ánh xạ sang project khác tương ứng:
```
components/chat/ChatWidget.tsx     — TOÀN BỘ UI + logic giọng nói (STT, trò chuyện, chen ngang)
lib/speech.ts                      — hàng đợi TTS, làm sạch text, chuẩn hóa số/ngày
app/api/tts/route.ts               — proxy Google TTS (server-side)
lib/chatTools.ts                   — định nghĩa tools + system prompt + phân quyền
app/api/chat/route.ts              — vòng lặp Claude tool-use + streaming
lib/chatAuth.ts                    — xác thực người dùng chat (web + mobile) → context
```

---

## 2. Chatbot dữ liệu (Claude tool-use) — phần NGHIỆP VỤ, cần thay khi sang project khác

### 2.1. Vòng lặp tool-use + streaming (app/api/chat/route.ts)
- Nhận `message` + `sessionId`, xác thực người dùng → dựng `ChatContext` (companyId, role, branchId, tên, giới tính…).
- Lấy lịch sử gần nhất (vd 12 tin) làm ngữ cảnh.
- Gọi `anthropic.messages.stream({ model, system, tools, messages })`.
- Nếu Claude gọi tool → chạy tool (server) → trả kết quả → lặp (tối đa ~5 vòng).
- **Stream ra client** dạng SSE: các sự kiện `{type:"text"|"tool"|"session"|"error"}`.

### 2.2. Định nghĩa tool + PHÂN QUYỀN (lib/chatTools.ts)
Mỗi tool có: `name`, `description`, `input_schema` (JSON Schema), và **danh sách `roles` được phép**. Khi build danh sách tool cho request, **lọc theo vai trò người dùng**. Ví dụ mẫu (thay bằng nghiệp vụ của project đích):
```ts
const TOOL_DEFS = [
  { name: "get_attendance_today", roles: ["owner","manager","accountant"], description: "...", input_schema: {...} },
  { name: "get_employee_salary",  roles: ["owner","accountant"], /* quản lý KHÔNG xem lương */ },
  { name: "send_email_reminder",  roles: ["owner","manager"], /* kế toán KHÔNG gửi */ },
];
export function getToolsForRole(role) {
  return TOOL_DEFS.filter(t => t.roles.includes(role)).map(({roles, ...t}) => t);
}
```
- **Lọc theo phạm vi dữ liệu** trong chính hàm chạy tool (vd quản lý chi nhánh chỉ query `where: { branchId }`). ĐỪNG tin client — luôn ép scope ở server.
- Tool có 2 loại: **đọc dữ liệu** (query DB rồi trả JSON) và **hành động** (gửi email/notify…). Với hành động, trả về cờ rõ ràng (vd `sentOk`) để bot báo đúng sự thật.

> **Khi sang project khác:** giữ nguyên khung này, chỉ **thay danh sách tool** = các thao tác dữ liệu của trang đó (vd e-commerce: get_orders, get_revenue, get_stock; CRM: get_leads, get_deals…), và **quy tắc phân quyền** theo vai trò của trang đó.

### 2.3. BÀI HỌC: bot phải TRUNG THỰC
- Bug hay gặp: tool gửi/hành động thất bại nhưng bot vẫn nói "đã làm xong". Nguyên nhân: (a) chọn nhầm tool có cơ chế dedup/bỏ qua; (b) trả về text mập mờ khiến LLM tưởng thành công.
- Cách chống: mỗi tool hành động trả `sentOk`/`error` rõ ràng; **prompt bắt buộc đọc kết quả** trước khi trả lời — chỉ nói "đã làm" khi thật sự thành công, kèm CON SỐ cụ thể (đã gửi mấy cái, cho ai).

### 2.4. BÀI HỌC: tìm theo tên phải THÔNG MINH
- Người dùng gõ tên sai dấu/chính tả → ĐỪNG báo cụt "không tìm thấy".
- Làm: so tên **bỏ dấu** (NFD + xóa dấu + đ→d) rồi `includes`; nếu vẫn 0 → **gợi ý người gần giống** (Levenshtein, cân theo độ dài chữ, bắt buộc 1 chữ "tên riêng" khớp mạnh để không gợi ý bừa) → bot **hỏi lại xác nhận** rồi mới hành động.

---

## 3. System prompt & GIỌNG ĐIỆU (persona)

Trong `buildSystemPrompt()`, ngoài phần nghiệp vụ, có phần **giọng điệu** (rất quan trọng cho trải nghiệm tiếng Việt):
- **Luôn xưng "em"** (TUYỆT ĐỐI cấm "tôi/mình", kể cả câu chào).
- **Gọi người dùng theo giới tính**: nam→"anh", nữ→"chị", nhất quán trong cả hội thoại; cho phép người dùng bảo đổi.
- Mở đầu "Dạ/Vâng ạ", thêm "ạ" cuối câu (1 lần/câu), giọng **mềm mỏng, khiêm tốn, ngọt ngào**, vẫn **ngắn gọn**, không nịnh sáo.
- **LƯU Ý:** giọng "em/dạ" chỉ khi TRÒ CHUYỆN với người dùng. Nội dung soạn để GỬI người khác (email) thì trang trọng, KHÔNG xưng "em/dạ".

**Giới tính lấy từ đâu:** thêm field `gender` ("male"/"female") vào bảng tài khoản, cho chọn Nam/Nữ khi tạo user; truyền vào prompt. Chưa có thì **đoán theo tên** (vd tiếng Việt: có "Thị"→nữ, "Văn"→nam, mặc định nam).

> **Khi sang project khác:** đổi persona cho hợp thương hiệu (có nơi muốn xưng "mình/bạn", có nơi trang trọng "chúng tôi/quý khách"). Giữ nguyên tắc: nhất quán + đọc lên nghe tự nhiên.

---

## 4. TTS — AI đọc trả lời (nhiều BẪY nhất)

### 4.1. Chọn nhà cung cấp TTS — các bẫy đã gặp (ĐỪNG lặp lại)
| Cách | Kết quả thực tế |
|---|---|
| `msedge-tts` (giọng Microsoft đẹp) | **TREO trên Vercel serverless** (>90s timeout) vì mở WebSocket tới Microsoft. Chỉ chạy local. ĐỪNG dùng cho production serverless. |
| Web `SpeechSynthesis` (giọng trình duyệt) | **Đọc bằng tiếng Anh** nếu máy người dùng THIẾU giọng tiếng Việt (desktop hay thiếu). Không tin cậy. |
| **Google Translate TTS proxy** ✅ | HTTP thường (không WebSocket) → **chạy được trên Vercel**, ~2s, giọng nữ tiếng Việt, chắc chắn có kể cả máy không cài giọng. Không chính thức nhưng miễn phí, ổn định trong thực tế. |

**API route (server-side):**
```ts
// GET /api/tts?q=...  -> trả audio/mpeg
// Google giới hạn ~200 ký tự/lần -> cắt theo TỪ (~180) rồi nối buffer.
const url = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=" + encodeURIComponent(chunk);
const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ..." } }); // cần User-Agent
```

### 4.2. Đọc theo CÂU + hàng đợi (tức thời khi stream)
- Khi câu trả lời stream về, cắt thành **từng câu** (`extractSentences`: chỉ cắt ở xuống dòng, hoặc `.!?` theo sau là dấu cách — TRÁNH cắt nhầm "15.000").
- Mỗi câu xong → `enqueueSpeak(câu)`: **tải MP3 ngay** (đẩy promise vào hàng đợi) + phát **tuần tự** qua AudioContext → nghe liền mạch, gần như tức thời.
- `resetSpeech()` = dừng đọc + xóa hàng đợi (dùng khi chen ngang / gửi tin mới / đóng chat).
- Có `setSpeakingListener(cb)` để UI biết khi nào đang đọc (hiện nút Dừng / mở mic).
- **Tốc độ đọc:** phát AudioContext với `source.playbackRate.value = 1.2` (chỉnh 1.0–1.5 tùy gu). Mobile `expo-speech` có `rate`.

### 4.3. Làm SẠCH text trước khi đọc (`cleanForSpeech`)
- Bỏ khối code ```` ``` ````, link (đừng đọc URL dài), markdown `**đậm**`, gạch đầu dòng.
- Bỏ **chuỗi ký hiệu** `--- *** === ___ //` và ký tự lẻ `* _ # | & < > [ ] { } → ← • ~ ^ =` (nếu không, TTS đọc "gạch ngang gạch ngang…" rất khó chịu).
- **GIỮ** `. , ! ? : ; ( )` để máy ngắt nghỉ tự nhiên.

### 4.4. Đọc SỐ/NGÀY/GIỜ thành lời (`normalizeForSpeech`) — chạy trước cleanForSpeech
```
16/07/2026     -> "ngày 16 tháng 7 năm 2026"   (guard: tháng 1–12, ngày 1–31; tránh lặp "ngày ngày")
07:30          -> "7 giờ 30";  22:00 -> "22 giờ"
07:30-17:30    -> "7 giờ 30 đến 17 giờ 30"
15.000.000đ    -> "15000000 đồng"  (bỏ dấu chấm phân cách nghìn; VND/VNĐ -> đồng)
10%            -> "10 phần trăm"
BHXH/BHYT/TNCN -> đọc thành chữ đầy đủ  (bảng viết tắt riêng theo nghiệp vụ)
```
- **Bảo vệ:** dùng lookahead để "12 đơn" KHÔNG bị nhầm thành "12 đồng". `\b` của JS không nhận ký tự "đ" (Unicode) → dùng lookahead `(?=[\s.,;:!?)]|$)` thay `\b`.

---

## 5. Chế độ trò chuyện & TURN-TAKING (thời gian chờ)

### 5.1. Máy nhận giọng nói (Web Speech API)
```
rec.lang = "vi-VN"; rec.interimResults = true; rec.continuous = true;
```
- **QUAN TRỌNG dùng `continuous=true`** + đồng hồ im lặng tự quản, KHÔNG để mặc định `continuous=false` (nó tự chốt lời khi im ~1s → cắt lời người dùng lúc nghỉ nghĩ).
- Đọc transcript **tích lũy**: mỗi `onresult` gộp `full = Σ results[i][0].transcript`. `onend` → gửi `full`.

### 5.2. Đồng hồ im lặng 2 mức (cực quan trọng cho trải nghiệm)
- **Trước khi nói câu đầu:** chờ lâu (`INITIAL_SILENCE_MS ≈ 6000`) → cho người dùng thời gian suy nghĩ, không cắt sớm khi vừa bấm mic.
- **Sau khi đã nói:** im `SILENCE_MS ≈ 1300–1700` là chốt → cân bằng giữa "đừng cắt lời khi nghỉ nghĩ" (số lớn) và "phản hồi nhanh" (số nhỏ). ĐÂY LÀ SỐ HAY PHẢI CHỈNH theo phản hồi người dùng.
- Trần an toàn `MAX_LISTEN_MS ≈ 25000` (1 lượt).
- `onresult` reset đồng hồ về `SILENCE_MS` mỗi khi có tiếng.

### 5.3. Vòng đời trò chuyện liên tục
- Trạng thái: `convoActive` (đang trong phiên), `voiceMode` ("ptt" | "conversation", lưu localStorage), `listening`, `speaking`, `sending`.
- Luồng: nói → `onend` gửi → AI stream + đọc → **đọc XONG (speaking=false) tự mở lại mic** (effect debounce ~200–300ms, guard `!sending && !speaking && !listening` để KHÔNG mở sớm giữa các câu đang đọc).
- **Im lặng 2 lượt liên tiếp → tự tạm dừng** (đếm `emptyTurnsRef`), có nút "Kết thúc". Đừng nghe vô tận.
- Dùng **refs song song** (`sendingRef`, `speakingRef`, `listeningRef`, `convoActiveRef`) để các callback trễ (setTimeout/onend) đọc giá trị mới nhất, tránh closure cũ.
- **Gõ tay giữa lúc trò chuyện:** khi người dùng gõ → `abort()` recognition (không gửi nhầm tiếng), đánh dấu `userTyping`; lúc gửi vẫn ĐỌC trả lời (vì đang trong phiên thoại).

### 5.4. Lựa chọn chế độ (UX)
- Lần đầu bấm mic → hiện bảng chọn "Trò chuyện liên tục" vs "Bấm từng lần" (lưu localStorage, đổi lại được). Nút đang chọn **sáng nổi bật**.

---

## 6. CHEN NGANG (barge-in) — phần KHÓ NHẤT, kết luận: nút bấm là chính

**Vấn đề cốt lõi:** muốn AI đang đọc mà người dùng nói thì AI dừng. Nhưng trên trình duyệt + loa ngoài, mic **thu luôn tiếng AI** → nếu ghi âm chữ trong lúc AI đọc, AI "tự nghe tự gửi" (loop). Rất khó cân bằng.

**Đã thử & kết luận:**
1. ❌ Ghi âm chữ (SpeechRecognition) trong lúc AI đọc + lọc trùng text → với loa vẫn bị AI tự nghe (giọng đọc ra chữ không khớp 100% văn bản → lọt).
2. ⚠️ **VAD (cảm biến âm lượng) có khử vọng âm** — cách "đúng" hơn: KHÔNG ghi âm chữ khi AI đọc; dùng `getUserMedia({echoCancellation, noiseSuppression, autoGainControl:false})` + AnalyserNode đo RMS. Tiếng AI (phát qua AudioContext) bị echoCancellation khử → không kích; chỉ giọng thật kích. Dùng **onset-detection**: `baseline` (EMA chậm) học cả tiếng AI lọt vào, chỉ cắt khi `fast` (EMA nhanh) vượt hẳn `baseline*FACTOR` + WARMUP để nền kịp học. NHƯNG: **cực khó cân** (nhạy quá→AI tự cắt; ít quá→không chen được), phụ thuộc mic/loa từng máy.
3. ✅ **NÚT "Chạm để nói chen"** — kết luận cuối, người dùng hài lòng: khi AI đang đọc, hiện nút to; **chạm = `resetSpeech()` (cắt AI) + mở mic nghe ngay**. CHẮC CHẮN chạy mọi máy, không phụ thuộc cảm biến. VAD chỉ để làm thêm (bonus rảnh tay khi thuận lợi).

**Khuyến nghị cho project khác:** làm **nút bấm chen ngang trước** (đơn giản, tin cậy). VAD là tùy chọn nâng cao; nếu làm, để tham số dễ chỉnh và khuyến cáo người dùng **đeo tai nghe** cho chuẩn.

---

## 7. Mobile (Expo/React Native)

- STT: `expo-speech-recognition` (on-device, `lang:"vi-VN"`, xin quyền micro).
- TTS: `expo-speech` (`Speech.speak(text, {language:"vi-VN", rate:1.2, onDone})`) — dùng giọng của điện thoại (đa số có sẵn tiếng Việt).
- Clipboard: `expo-clipboard`. Link Zalo/FB → `Linking.openURL`.
- Mỗi lần thêm **native module** phải **build lại app** (EAS build). `cleanForSpeech`/`normalizeForSpeech` copy y hệt sang mobile.
- Chế độ trò chuyện/chen ngang trên mobile: dùng `Speech.speak(...).onDone` để biết đọc xong → mở lại mic; barge-in tương tự (nút bấm là chính).

---

## 8. Các BẪY & bài học tổng hợp (đọc kỹ trước khi làm)

1. **TTS trên serverless:** đừng dùng thư viện mở WebSocket (msedge-tts) trên Vercel → treo. Dùng HTTP proxy (Google TTS) hoặc nhà cung cấp có REST.
2. **SpeechSynthesis đọc tiếng Anh** nếu máy thiếu giọng vi → không tin cậy cho tiếng Việt. Dùng TTS server.
3. **`continuous=false` cắt lời** khi người dùng nghỉ nghĩ → dùng `continuous=true` + đồng hồ im lặng tự quản, 2 mức (đầu dài, sau ngắn).
4. **Đọc số/ngày/ký tự đặc biệt** phải chuẩn hóa/lọc, nếu không nghe rất khó chịu.
5. **Barge-in bằng giọng cực khó ổn định** trên browser/loa → ưu tiên nút bấm.
6. **Closure cũ trong callback trễ** → luôn mirror state ra `useRef`.
7. **Bot nói dối "đã làm"** → tool trả cờ rõ ràng + prompt bắt đọc kết quả.
8. **Phân quyền phải ép ở SERVER** (tool filter theo role + scope query theo branch), không tin client.
9. **Autoplay audio bị chặn** → phải `unlockAudio()`/khởi tạo AudioContext trong 1 cử chỉ bấm của người dùng (vd lúc bấm mic).
10. **Commit tiếng Việt** hay lỗi shell → ghi message ra file rồi `git commit -F file`.

---

## 9. Cách ÁP DỤNG cho một website/project KHÁC (checklist)

1. **Hiểu project đích trước:** web gì? người dùng/vai trò nào? dữ liệu gì (bảng nào)? trợ lý cần trả lời & làm được gì? → ĐỪNG bê tool của Timio.
2. **Giữ nguyên hạ tầng giọng nói:** copy `ChatWidget.tsx` (STT + trò chuyện + chen ngang + nút Chạm), `lib/speech.ts` (TTS queue + cleanForSpeech + normalizeForSpeech), `app/api/tts/route.ts` (Google TTS proxy). Chỉnh nhẹ: bảng viết tắt trong `normalizeForSpeech`, tốc độ đọc, các số thời gian chờ.
3. **Viết lại phần nghiệp vụ:** danh sách `tools` (đọc/hành động) theo dữ liệu trang đó + JSON schema; hàm chạy tool query DB của trang đó; **phân quyền theo role** của trang đó (ép ở server).
4. **Viết lại system prompt:** persona (giọng điệu/xưng hô hợp thương hiệu) + mô tả nghiệp vụ + quy tắc trung thực + hướng dẫn dùng tool.
5. **Xác thực & context:** map người dùng đăng nhập của trang đó → `ChatContext` (id, role, scope, tên, giới tính…).
6. **Test lần lượt:** gõ hỏi → giọng hỏi → AI đọc → trò chuyện liên tục → nút chen ngang. Chỉnh số thời gian chờ theo cảm nhận.
7. **Mobile (nếu có):** thêm expo-speech-recognition/expo-speech, copy cleanForSpeech/normalizeForSpeech, build EAS.

---

## 10. Tinh thần thiết kế (để AI khác hiểu "gu")
- **Tiếng Việt-first**, câu chữ tự nhiên, lễ phép, ngắn gọn.
- **Trung thực tuyệt đối** (không báo láo "đã làm").
- **Đơn giản & chắc chắn hơn là hoa mỹ mà hên xui** (vd: chọn nút bấm chen ngang thay vì cố ép VAD hoàn hảo).
- **Miễn phí / chi phí thấp** khi có thể (Web Speech API, Google TTS, on-device mobile), chỉ nâng cấp (model mạnh hơn, TTS trả phí) khi thật cần.
- **Luôn cho người dùng lối thoát** (nút Kết thúc, nút Dừng đọc, đổi chế độ).

---
*Tài liệu này mô tả pattern + bài học; khi tái dựng hãy đọc code thực tế trong các file đã liệt kê ở mục 1 để lấy chi tiết implementation.*
