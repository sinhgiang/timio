import { prisma } from "@/lib/prisma";

// Chatbot chỉ có ở gói Pro (100 tin/ngày/user) và Business (không giới hạn)
export const CHAT_DAILY_LIMIT_PRO = 100;

export interface ChatAccessResult {
  allowed: boolean;
  reason?: "plan" | "limit";
  message?: string;
  remaining?: number | null; // null = không giới hạn
}

/** Đầu ngày hôm nay theo giờ Việt Nam (UTC+7) */
function startOfTodayVN(): Date {
  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const dayStartVN = Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate());
  return new Date(dayStartVN - 7 * 3600 * 1000);
}

export async function checkChatAccess(companyId: string, userId: string): Promise<ChatAccessResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, planExpires: true },
  });
  if (!company) return { allowed: false, reason: "plan", message: "Không tìm thấy công ty." };

  const planActive = !company.planExpires || company.planExpires > new Date();
  const plan = planActive ? company.plan : "starter";

  if (plan !== "pro" && plan !== "business") {
    return {
      allowed: false,
      reason: "plan",
      message: "Trợ lý AI chỉ có ở gói Pro và Business. Nâng cấp để sử dụng nhé!",
    };
  }

  if (plan === "business") {
    return { allowed: true, remaining: null };
  }

  // Pro: đếm số tin user đã gửi hôm nay
  const usedToday = await prisma.chatMessage.count({
    where: {
      role: "user",
      createdAt: { gte: startOfTodayVN() },
      session: { userId },
    },
  });

  if (usedToday >= CHAT_DAILY_LIMIT_PRO) {
    return {
      allowed: false,
      reason: "limit",
      message: `Bạn đã dùng hết ${CHAT_DAILY_LIMIT_PRO} tin nhắn hôm nay. Quota sẽ reset lúc 00:00. Nâng cấp Business để chat không giới hạn.`,
      remaining: 0,
    };
  }

  return { allowed: true, remaining: CHAT_DAILY_LIMIT_PRO - usedToday };
}
