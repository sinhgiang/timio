import bcrypt from "bcryptjs";

/**
 * Kiểm tra PIN nhân viên — chịu được CẢ 2 kiểu lưu:
 *  - plaintext 4 số (kiểu cũ, check-in web đặt trực tiếp)
 *  - bcrypt hash (một số nhân viên được đặt PIN đã băm)
 */
export async function checkPin(stored: string | null | undefined, pin: string | null | undefined): Promise<boolean> {
  if (!stored || !pin) return false;
  if (stored === pin) return true;
  if (stored.startsWith("$2")) {
    try { return await bcrypt.compare(pin, stored); } catch { return false; }
  }
  return false;
}
