// Gửi thông báo đẩy tới app mobile qua Expo Push API.
// Token là Expo push token (ExponentPushToken[...]) lưu ở Employee.pushToken.

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
}

/**
 * Gửi push tới nhiều token. Bỏ qua token rỗng/không hợp lệ. Không throw — lỗi là non-fatal.
 * Trả về số tin gửi thành công (ước lượng theo số ticket không lỗi).
 */
export async function sendExpoPush(
  tokens: (string | null | undefined)[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<number> {
  const valid = Array.from(new Set(tokens.filter((t): t is string => !!t && t.startsWith("ExponentPushToken"))));
  if (valid.length === 0) return 0;

  const messages: PushMessage[] = valid.map((to) => ({ to, title, body, data, sound: "default" }));
  let ok = 0;

  // Expo giới hạn 100 tin/lần
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
      const json = (await res.json()) as { data?: { status?: string }[] };
      if (Array.isArray(json.data)) {
        ok += json.data.filter((d) => d.status === "ok").length;
      } else if (res.ok) {
        ok += batch.length;
      }
    } catch {
      /* non-fatal */
    }
  }
  return ok;
}
