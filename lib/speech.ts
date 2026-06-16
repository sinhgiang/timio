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
