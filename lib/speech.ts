// Vietnamese TTS — vi-VN-HoaiMyNeural via /api/tts
// AudioContext approach: unlock once on first user gesture → play freely at any time

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

export function stopAudio(): void {
  if (currentSource) {
    try { currentSource.stop(); } catch { /* already ended */ }
    currentSource = null;
  }
}

// Phát ArrayBuffer qua AudioContext, await đến khi âm thanh kết thúc.
// rate > 1 = đọc nhanh hơn (dùng cho giọng chatbot; kiosk giữ mặc định 1).
async function playBuffer(arrayBuffer: ArrayBuffer, rate = 1): Promise<void> {
  stopAudio();
  const ctx = getCtx();
  if (ctx.state === "suspended") await ctx.resume();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = rate;
  source.connect(ctx.destination);
  currentSource = source;
  await new Promise<void>((resolve) => {
    source.onended = () => { currentSource = null; resolve(); };
    source.start(0);
  });
}

// Gọi trong click handler đầu tiên để unlock AudioContext cho cả session
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  const ctx = getCtx();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}

// Phát TTS động (có tên nhân viên, tên công ty)
export async function speakVi(text: string): Promise<void> {
  if (typeof window === "undefined" || !text.trim()) return;
  try {
    const res = await fetch("/api/tts?q=" + encodeURIComponent(text));
    if (!res.ok) return;
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) return;
    await playBuffer(buf);
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "NotAllowedError") return;
    console.warn("[TTS]", e);
  }
}

// ── Đọc câu trả lời chatbot bằng giọng tiếng Việt qua /api/tts (Google TTS) ──
// Dùng /api/tts (nay là Google TTS qua HTTP, không treo) để CHẮC CHẮN có giọng
// tiếng Việt kể cả khi máy không cài giọng Việt. Đọc theo câu, xếp hàng tuần tự.
let speakQueue: Promise<ArrayBuffer | null>[] = [];
let draining = false;
let speakToken = 0; // tăng lên để hủy phiên đọc cũ (dừng / barge-in)
let speakingListener: ((speaking: boolean) => void) | null = null;
const SPEAK_RATE = 1.5; // tốc độ đọc câu trả lời chatbot (1 = bình thường)

// Component đăng ký để biết khi nào đang đọc (hiện/ẩn nút Dừng)
export function setSpeakingListener(fn: ((speaking: boolean) => void) | null): void {
  speakingListener = fn;
}

async function fetchTts(text: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch("/api/tts?q=" + encodeURIComponent(text));
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return buf.byteLength ? buf : null;
  } catch { return null; }
}

// Bỏ ký hiệu markdown / ký tự đặc biệt để đọc cho tự nhiên.
// GIỮ LẠI . , ! ? : ; ( ) % để máy đọc ngắt nghỉ đúng chỗ (không đọc thành "chấm").
export function cleanForSpeech(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ")             // khối code
    .replace(/`[^`]*`/g, " ")                     // code inline
    .replace(/https?:\/\/[^\s]+/g, " ")           // link
    .replace(/\*\*(.+?)\*\*/g, "$1")              // **đậm** → chữ thường
    .replace(/^\s*[-*•]\s+/gm, " ")               // dấu gạch đầu dòng
    .replace(/(^|[\s(])[-–—+*=_#>~|^`](?=[\s)]|$)/g, "$1 ") // ký hiệu đứng riêng
    .replace(/[*_#`>~|^=]/g, " ")                  // ký hiệu md còn sót
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Dừng đọc + xóa hàng đợi (nút Dừng / bắt đầu tin nhắn mới / đóng chat)
export function resetSpeech(): void {
  speakToken++;
  speakQueue = [];
  draining = false;
  stopAudio();
  if (speakingListener) speakingListener(false);
}

// Nạp một câu vào hàng đợi để đọc (tải MP3 ngay để phát gần như tức thời)
export function enqueueSpeak(text: string): void {
  if (typeof window === "undefined") return;
  const t = cleanForSpeech(text);
  if (!t) return;
  speakQueue.push(fetchTts(t));
  if (!draining) drainSpeak();
}

async function drainSpeak(): Promise<void> {
  const myToken = speakToken;
  draining = true;
  if (speakingListener) speakingListener(true);
  while (speakQueue.length && myToken === speakToken) {
    const buf = await speakQueue.shift()!;
    if (myToken !== speakToken) break; // đã bị dừng
    if (buf) { try { await playBuffer(buf, SPEAK_RATE); } catch { /* ignore */ } }
  }
  if (myToken === speakToken) {
    draining = false;
    if (speakingListener) speakingListener(false);
  }
}

// Phát file MP3 tĩnh — trả về true nếu phát được, false nếu file không tồn tại
export async function playStatic(url: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) return false;
    await playBuffer(buf);
    return true;
  } catch (e) {
    console.warn("[Audio]", e);
    return false;
  }
}

// Thử phát file theo slug công ty trước, nếu không có thì dùng file chung, cuối cùng fallback TTS
export async function playCompanyAudio(slug: string, filename: string, fallbackText?: string): Promise<void> {
  const played = await playStatic(`/audio/${slug}/${filename}`);
  if (!played) {
    const playedGeneric = await playStatic(`/audio/${filename}`);
    if (!playedGeneric && fallbackText) {
      await speakVi(fallbackText);
    }
  }
}
