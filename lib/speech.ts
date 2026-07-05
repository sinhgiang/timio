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

// Phát ArrayBuffer qua AudioContext, await đến khi âm thanh kết thúc
async function playBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
  stopAudio();
  const ctx = getCtx();
  if (ctx.state === "suspended") await ctx.resume();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
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

// ── Hàng đợi đọc theo CÂU (cho chatbot trả lời bằng giọng nói tức thời) ──
// Mỗi câu vừa stream xong được nạp vào hàng đợi + tải MP3 ngay (song song),
// rồi phát tuần tự để không đè lên nhau → nghe liền mạch, gần như tức thời.
let speakQueue: Promise<ArrayBuffer | null>[] = [];
let draining = false;
let speakToken = 0; // tăng lên để hủy phiên đọc cũ (barge-in)

async function fetchTts(text: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch("/api/tts?q=" + encodeURIComponent(text));
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return buf.byteLength ? buf : null;
  } catch { return null; }
}

// Bỏ ký hiệu markdown / link / emoji để đọc cho tự nhiên
export function cleanForSpeech(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ")            // khối code
    .replace(/https?:\/\/[^\s]+/g, " ")          // link
    .replace(/\*\*(.+?)\*\*/g, "$1")             // **đậm**
    .replace(/[#*`>_~|]/g, " ")                   // ký hiệu md
    .replace(/^[\s]*[-•]\s+/gm, " ")              // gạch đầu dòng
    .replace(/\s+/g, " ")
    .trim();
}

// Dừng đọc + xóa hàng đợi (gọi khi bắt đầu tin nhắn mới)
export function resetSpeech(): void {
  speakToken++;
  speakQueue = [];
  draining = false;
  stopAudio();
}

// Nạp một câu vào hàng đợi để đọc (bắt đầu tải MP3 ngay lập tức)
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
  while (speakQueue.length && myToken === speakToken) {
    const buf = await speakQueue.shift()!;
    if (myToken !== speakToken) break; // đã bị reset
    if (buf) { try { await playBuffer(buf); } catch { /* ignore */ } }
  }
  if (myToken === speakToken) draining = false;
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
