import { prisma } from "@/lib/prisma";
import { normPhone, makeActivationToken } from "@/lib/workerAuth";
import { generateUniqueHandle } from "@/lib/handle";

// Tạo hoặc nối tài khoản nhân viên (theo SĐT) rồi gắn vào Employee. Trả về workerAccountId (null nếu không có SĐT).
export async function ensureWorkerAccount(employeeId: string, name: string, phone: string | null, email: string | null): Promise<string | null> {
  const ph = normPhone(phone);
  if (!ph) return null;
  let wa = await prisma.workerAccount.findUnique({ where: { phone: ph }, select: { id: true } });
  if (!wa) {
    const handle = await generateUniqueHandle(name);
    wa = await prisma.workerAccount.create({
      data: { phone: ph, name, email: email || null, activationToken: makeActivationToken(), handle },
      select: { id: true },
    });
  }
  await prisma.employee.update({ where: { id: employeeId }, data: { workerAccountId: wa.id } }).catch(() => {});
  return wa.id;
}
