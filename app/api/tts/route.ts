// TTS tiếng Việt qua Google Translate TTS (HTTP thường — chạy được trên Vercel).
// KHÔNG dùng msedge-tts (mở WebSocket tới Microsoft → treo trên serverless).

export const dynamic = "force-dynamic";

// Google TTS giới hạn ~200 ký tự/lần → cắt theo từ cho an toàn
function chunkText(text: string, max = 180): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max) {
      if (cur) chunks.push(cur);
      cur = w.length > max ? w.slice(0, max) : w;
    } else {
      cur = next;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function fetchGoogleTts(text: string): Promise<Buffer | null> {
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=vi&q=" +
    encodeURIComponent(text);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  if (!res.ok) return null;
  const ab = await res.arrayBuffer();
  return ab.byteLength ? Buffer.from(ab) : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("q")?.trim() ?? "";
  if (!text) return new Response("Missing text", { status: 400 });

  try {
    const chunks = chunkText(text.slice(0, 800)); // an toàn: tối đa ~800 ký tự/câu
    const buffers: Buffer[] = [];
    for (const c of chunks) {
      const b = await fetchGoogleTts(c);
      if (b) buffers.push(b);
    }
    if (buffers.length === 0) return new Response("TTS unavailable", { status: 502 });

    return new Response(Buffer.concat(buffers), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[TTS]", err);
    return new Response("TTS error", { status: 500 });
  }
}
