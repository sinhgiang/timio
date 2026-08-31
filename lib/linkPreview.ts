// Xem trước link dán vào Bảng tin (31/8/2026) — "dán link → tự hiện video/ảnh" giống Facebook.
// YouTube/TikTok: dùng oEmbed công khai (không cần API key) để lấy embed thật, phát được trong bài.
// Link khác: đọc thẻ Open Graph (og:title/og:image/og:description) → hiện thẻ preview như Facebook,
// KHÔNG chèn iframe lạ (nhiều site chặn iframe hoặc yêu cầu đăng nhập — an toàn hơn là link-card).
export interface LinkPreview {
  title: string;
  description: string;
  image: string | null;
  embedUrl: string | null; // có giá trị = nhúng được iframe (YouTube/TikTok)
  provider: string;
  url: string;
}

// Chặn SSRF: link do người dùng dán vào, fetch ở server — không cho trỏ vào mạng nội bộ/localhost.
function isSafeUrl(u: URL): boolean {
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return false;
  // IPv4 private/loopback/link-local ranges + IPv6 loopback/unique-local.
  if (/^127\.|^10\.|^192\.168\.|^169\.254\.|^0\.0\.0\.0$/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return false;
  return true;
}

function youtubeId(u: URL): string | null {
  if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
  if (u.hostname.includes("youtube.com")) {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
  }
  return null;
}

async function fetchJson(url: string, timeoutMs = 6000): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; TimioBot/1.0)" } });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function metaTag(html: string, prop: string): string | null {
  // Chấp nhận cả thứ tự property/content đảo ngược, dấu ' hoặc ".
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i");
  const m = html.match(re1) || html.match(re2);
  return m ? m[1] : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (!isSafeUrl(u)) return null;

  // YouTube — oEmbed công khai, nhúng phát được ngay trong bài.
  const ytId = youtubeId(u);
  if (ytId) {
    const data = (await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(u.toString())}&format=json`)) as
      | { title?: string; thumbnail_url?: string; author_name?: string }
      | null;
    return {
      title: data?.title || "Video YouTube",
      description: data?.author_name ? `Kênh: ${data.author_name}` : "",
      image: data?.thumbnail_url || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${ytId}`,
      provider: "youtube",
      url: u.toString(),
    };
  }

  // TikTok — oEmbed công khai.
  if (u.hostname.includes("tiktok.com")) {
    const data = (await fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(u.toString())}`)) as
      | { title?: string; author_name?: string; thumbnail_url?: string; html?: string }
      | null;
    if (data) {
      return {
        title: data.title || "Video TikTok",
        description: data.author_name ? `@${data.author_name}` : "",
        image: data.thumbnail_url || null,
        embedUrl: null, // TikTok oEmbed trả về <blockquote> script riêng, không phải iframe URL đơn giản — hiện thẻ preview, bấm mở link gốc.
        provider: "tiktok",
        url: u.toString(),
      };
    }
  }

  // Link chung — đọc Open Graph tags (best-effort; nhiều site như Facebook chặn scrape/yêu cầu
  // đăng nhập nên có thể không lấy được gì, khi đó trả về thẻ preview tối giản với domain).
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(u.toString(), {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TimioBot/1.0; +https://timio.vn)" },
      redirect: "follow",
    });
    clearTimeout(t);
    const html = res.ok ? (await res.text()).slice(0, 200_000) : "";
    const title = metaTag(html, "og:title") || html.match(/<title>([^<]*)<\/title>/i)?.[1] || u.hostname;
    const description = metaTag(html, "og:description") || "";
    let image = metaTag(html, "og:image");
    if (image && !/^https?:\/\//.test(image)) {
      try { image = new URL(image, u.toString()).toString(); } catch { image = null; }
    }
    const ogVideo = metaTag(html, "og:video") || metaTag(html, "og:video:url");
    return {
      title: decodeEntities(title).trim().slice(0, 200),
      description: decodeEntities(description).trim().slice(0, 300),
      image,
      embedUrl: ogVideo && /^https?:\/\//.test(ogVideo) ? ogVideo : null,
      provider: u.hostname.replace(/^www\./, ""),
      url: u.toString(),
    };
  } catch {
    return { title: u.hostname, description: "", image: null, embedUrl: null, provider: u.hostname.replace(/^www\./, ""), url: u.toString() };
  }
}
