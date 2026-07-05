import { registerPushToken } from "@/lib/api";

/**
 * Đăng ký nhận thông báo đẩy (push) cho nhân viên.
 * `expo-notifications` được cài khi build app (EAS). Dùng require có bảo vệ để
 * không lỗi typecheck khi máy dev chưa cài, và không crash lúc chạy nếu thiếu.
 * Luôn nên gọi trong try/catch ở nơi sử dụng.
 */
export async function registerForPush(employeeId: string, pin: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // @ts-ignore — module được cài lúc build; bỏ qua nếu chưa có
    const Notifications = require("expo-notifications") as {
      getPermissionsAsync: () => Promise<{ granted: boolean }>;
      requestPermissionsAsync: () => Promise<{ granted: boolean }>;
      getExpoPushTokenAsync: () => Promise<{ data?: string }>;
    };

    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return;

    const tokenResp = await Notifications.getExpoPushTokenAsync();
    const token = tokenResp?.data;
    if (token) await registerPushToken(employeeId, pin, token);
  } catch {
    /* module chưa cài / user từ chối / lỗi mạng — bỏ qua, không chặn login */
  }
}
