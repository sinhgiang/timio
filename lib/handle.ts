import { prisma } from "@/lib/prisma";

// Bỏ dấu tiếng Việt + chuyển thành slug URL an toàn
export function slugifyVi(input: string): string {
  return (input || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // bỏ dấu
    .replace(/đ/g, "d").replace(/Đ/g, "D")            // đ không tách được bằng NFD
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Sinh handle duy nhất từ tên (thêm -2, -3... nếu trùng). excludeId để bỏ qua chính bản ghi đang cập nhật.
export async function generateUniqueHandle(name: string, excludeId?: string): Promise<string> {
  const base = slugifyVi(name) || "nhan-vien";
  let candidate = base;
  let n = 1;
  // Tối đa vài chục lần thử là quá đủ
  while (n < 500) {
    const existing = await prisma.workerAccount.findUnique({ where: { handle: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}
