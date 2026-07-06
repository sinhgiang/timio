import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { authenticateChatUser } from "@/lib/chatAuth";
import { checkChatAccess } from "@/lib/chatLimits";
import {
  getToolsForRole,
  executeChatTool,
  buildSystemPrompt,
  type ChatContext,
} from "@/lib/chatTools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHAT_MODEL = process.env.CHAT_MODEL ?? "claude-haiku-4-5";
const MAX_TOOL_ROUNDS = 5;
const HISTORY_LIMIT = 12;

function sse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateChatUser(req);
    if (!user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = (await req.json()) as { message?: string; sessionId?: string };
    const message = (body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Thiếu nội dung tin nhắn" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "Tin nhắn quá dài (tối đa 2000 ký tự)" }, { status: 400 });
    }

    // Kiểm tra plan + rate limit
    const access = await checkChatAccess(user.companyId, user.adminId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.message, reason: access.reason },
        { status: access.reason === "plan" ? 403 : 429 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Trợ lý AI chưa được cấu hình (thiếu API key). Vui lòng liên hệ Timio." },
        { status: 503 }
      );
    }

    // Tìm hoặc tạo session chat
    let chatSession = body.sessionId
      ? await prisma.chatSession.findFirst({
          where: { id: body.sessionId, userId: user.adminId, companyId: user.companyId },
        })
      : null;
    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          companyId: user.companyId,
          userId: user.adminId,
          userRole: user.role,
          userName: user.name,
          userEmail: user.email,
        },
      });
    }
    const sessionId = chatSession.id;

    // Load lịch sử gần nhất làm context
    const history = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: { role: true, content: true },
    });
    history.reverse();

    // Lưu tin nhắn user
    await prisma.chatMessage.create({
      data: { sessionId, role: "user", content: message },
    });
    await prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });

    const ctx: ChatContext = {
      companyId: user.companyId,
      role: user.role,
      branchId: (user.role === "manager" || user.role === "accountant") ? user.branchId : null,
      companyName: user.companyName,
      userName: user.name,
    };
    const tools = getToolsForRole(user.role);
    const system = buildSystemPrompt({
      companyName: user.companyName,
      userName: user.name,
      role: user.role,
      branchName: user.role === "manager" ? user.branchName : null,
      gender: user.gender,
    });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user" as const, content: message },
    ];

    const stream = new ReadableStream({
      async start(controller) {
        const toolsUsed: string[] = [];
        let fullText = "";
        try {
          controller.enqueue(sse({ type: "session", sessionId, remaining: access.remaining }));

          for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const msgStream = anthropic.messages.stream({
              model: CHAT_MODEL,
              max_tokens: 2048,
              system,
              tools,
              messages,
            });

            msgStream.on("text", (delta) => {
              fullText += delta;
              controller.enqueue(sse({ type: "text", text: delta }));
            });

            const response = await msgStream.finalMessage();

            if (response.stop_reason === "tool_use") {
              const toolUses = response.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
              );
              messages.push({ role: "assistant", content: response.content });

              const results: Anthropic.ToolResultBlockParam[] = [];
              for (const tu of toolUses) {
                toolsUsed.push(tu.name);
                controller.enqueue(sse({ type: "tool", name: tu.name }));
                const result = await executeChatTool(
                  tu.name,
                  (tu.input ?? {}) as Record<string, unknown>,
                  ctx
                );
                results.push({
                  type: "tool_result",
                  tool_use_id: tu.id,
                  content: JSON.stringify(result),
                });
              }
              messages.push({ role: "user", content: results });
              continue;
            }
            break;
          }

          // Lưu câu trả lời của AI
          if (fullText.trim()) {
            await prisma.chatMessage.create({
              data: {
                sessionId,
                role: "assistant",
                content: fullText,
                toolsUsed: toolsUsed.length ? JSON.stringify(toolsUsed) : null,
              },
            });
          }

          controller.enqueue(sse({ type: "done", sessionId }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Lỗi không xác định";
          controller.enqueue(sse({ type: "error", error: `Lỗi AI: ${msg}` }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
