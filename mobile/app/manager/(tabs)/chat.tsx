import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Alert, Linking,
} from "react-native";
import { router } from "expo-router";
import { getManager, type StoredManager } from "@/lib/storage";
import {
  getChatHistory, sendChatMessage, submitSupportTicket, type ChatAccess,
} from "@/lib/api";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUPPORT_EMAIL = "admin@sinhgiang.com";

// Biến URL thành Text bấm mở được
function linkifyRN(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const urlRe = /(https?:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const url = m[1];
    nodes.push(
      <Text
        key={`${keyPrefix}-a${idx++}`}
        style={{ color: "#2563eb", textDecorationLine: "underline" }}
        onPress={() => Linking.openURL(url)}
      >
        {url}
      </Text>
    );
    last = urlRe.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// Parse **đậm** + link trong 1 dòng thành các đoạn Text
function renderInlineRN(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(...linkifyRN(text.slice(last, m.index), `${keyPrefix}-t${idx}`));
    nodes.push(
      <Text key={`${keyPrefix}-b${idx++}`} style={{ fontWeight: "700" }}>
        {m[1]}
      </Text>
    );
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(...linkifyRN(text.slice(last), `${keyPrefix}-tend`));
  return nodes;
}

// Hiển thị câu trả lời AI: đậm, tiêu đề, gạch đầu dòng (không in ký hiệu thô)
function AIText({ text, style }: { text: string; style: object }) {
  const lines = text.split("\n");
  return (
    <View>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (line.trim() === "") return <View key={i} style={{ height: 6 }} />;
        const bullet = line.match(/^\s*[-*•]\s+(.*)/);
        const heading = line.match(/^#{1,6}\s+(.*)/);
        const body = bullet ? bullet[1] : heading ? heading[1] : line;
        const inline = renderInlineRN(body, `l${i}`);
        if (bullet) {
          return (
            <View key={i} style={{ flexDirection: "row", marginBottom: 2 }}>
              <Text style={[style, { color: "#2563eb" }]}>{"•  "}</Text>
              <Text style={[style, { flex: 1 }]}>{inline}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={[style, heading ? { fontWeight: "700" } : null, { marginBottom: 2 }]}>
            {inline}
          </Text>
        );
      })}
    </View>
  );
}

function suggestionsForRole(role: string): string[] {
  if (role === "manager") {
    return [
      "Hôm nay có bao nhiêu người đi làm?",
      "Còn đơn nghỉ phép nào chưa duyệt?",
      "Ai đi trễ nhiều nhất tháng này?",
    ];
  }
  if (role === "accountant") {
    return [
      "Tổng quỹ lương tháng này là bao nhiêu?",
      "Ai bị phạt đi trễ tháng này?",
      "Hôm nay có bao nhiêu người đi làm?",
    ];
  }
  return [
    "Hôm nay có bao nhiêu người đi làm?",
    "Có việc gì đang chờ tôi duyệt không?",
    "Tổng quỹ lương tháng này là bao nhiêu?",
  ];
}

export default function ManagerChat() {
  const [mgr, setMgr] = useState<StoredManager | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [access, setAccess] = useState<ChatAccess | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [supportVisible, setSupportVisible] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketSending, setTicketSending] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    (async () => {
      const m = await getManager();
      if (!m) { router.replace("/"); return; }
      setMgr(m);
      try {
        const h = await getChatHistory(m.token);
        setSessionId(h.sessionId);
        setMessages(h.messages.map((x) => ({ id: x.id, role: x.role, content: x.content })));
        setAccess(h.access);
        if (typeof h.access.remaining === "number") setRemaining(h.access.remaining);
      } catch {
        setAccess({ allowed: true });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending || !mgr) return;
    setInput("");
    setSending(true);
    const userMsg: Msg = { id: `u${Date.now()}`, role: "user", content: message };
    const placeholder: Msg = { id: `a${Date.now()}`, role: "assistant", content: "…" };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    scrollToEnd();

    try {
      const reply = await sendChatMessage(mgr.token, message, sessionId);
      setSessionId(reply.sessionId);
      if (reply.remaining !== null) setRemaining(reply.remaining);
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholder.id ? { ...m, content: reply.text } : m))
      );
    } catch (e) {
      const err = e instanceof Error ? e.message : "Lỗi kết nối";
      setMessages((prev) =>
        prev.map((m) => (m.id === placeholder.id ? { ...m, content: `⚠️ ${err}` } : m))
      );
    } finally {
      setSending(false);
      scrollToEnd();
    }
  }

  async function sendTicket() {
    if (!mgr) return;
    setTicketSending(true);
    try {
      const msg = await submitSupportTicket(mgr.token, ticketTitle, ticketDesc, "normal");
      setSupportVisible(false);
      setTicketTitle("");
      setTicketDesc("");
      Alert.alert("Đã gửi!", msg);
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không gửi được ticket");
    } finally {
      setTicketSending(false);
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>;
  }

  // Gói không có chatbot
  if (access && !access.allowed && access.reason === "plan") {
    return (
      <View style={s.center}>
        <Text style={s.lockIcon}>🔒</Text>
        <Text style={s.lockTitle}>Tính năng gói Pro</Text>
        <Text style={s.lockDesc}>{access.message}</Text>
        <Text style={s.lockHint}>Nâng cấp gói tại Dashboard trên web: timio.vn</Text>
      </View>
    );
  }

  const quotaBlocked = access?.reason === "limit" && !access.allowed;

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Trợ lý AI</Text>
            <Text style={s.subtitle}>
              {remaining !== null ? `Còn ${remaining} tin hôm nay` : "Hỏi gì về công ty cũng được"}
            </Text>
          </View>
          <TouchableOpacity style={s.supportBtn} onPress={() => setSupportVisible(true)}>
            <Text style={s.supportBtnText}>Hỗ trợ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.list}
        onContentSizeChange={scrollToEnd}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>👋 Chào bạn!</Text>
            <Text style={s.emptyDesc}>
              Tôi có thể tra cứu chấm công, nhân viên, nghỉ phép{mgr?.role !== "manager" ? ", lương" : ""} giúp bạn. Thử hỏi:
            </Text>
            {mgr && suggestionsForRole(mgr.role).map((sg) => (
              <TouchableOpacity key={sg} style={s.suggestion} onPress={() => send(sg)} disabled={sending}>
                <Text style={s.suggestionText}>{sg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[s.bubbleRow, item.role === "user" ? s.rowRight : s.rowLeft]}>
            <View style={[s.bubble, item.role === "user" ? s.bubbleUser : s.bubbleAI]}>
              {item.content === "…" ? (
                <ActivityIndicator size="small" color="#6b7280" />
              ) : item.role === "user" ? (
                <Text style={s.textUser}>{item.content}</Text>
              ) : (
                <AIText text={item.content} style={s.textAI} />
              )}
            </View>
          </View>
        )}
      />

      {/* Quota banner */}
      {quotaBlocked && (
        <View style={s.quotaBanner}>
          <Text style={s.quotaText}>{access?.message}</Text>
        </View>
      )}

      {/* Input */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder={quotaBlocked ? "Đã hết quota hôm nay" : "Nhập câu hỏi..."}
          placeholderTextColor="#9ca3af"
          value={input}
          onChangeText={setInput}
          editable={!sending && !quotaBlocked}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[s.sendBtn, (sending || !input.trim() || quotaBlocked) && s.sendBtnOff]}
          onPress={() => send(input)}
          disabled={sending || !input.trim() || !!quotaBlocked}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.sendBtnText}>➤</Text>}
        </TouchableOpacity>
      </View>

      {/* Support modal */}
      <Modal visible={supportVisible} animationType="slide" transparent onRequestClose={() => setSupportVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Hỗ trợ từ Timio</Text>
            <Text style={s.modalSub}>AI không giải quyết được? Liên hệ team Timio trực tiếp:</Text>

            <TouchableOpacity
              style={s.contactRow}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("[Timio] Cần hỗ trợ")}`)}
            >
              <Text style={s.contactIcon}>✉️</Text>
              <View>
                <Text style={s.contactTitle}>Email</Text>
                <Text style={s.contactDesc}>{SUPPORT_EMAIL}</Text>
              </View>
            </TouchableOpacity>

            <Text style={s.ticketLabel}>Hoặc tạo ticket (phản hồi qua email):</Text>
            <TextInput
              style={s.ticketInput}
              placeholder="Tiêu đề (vd: Lỗi xuất báo cáo)"
              placeholderTextColor="#9ca3af"
              value={ticketTitle}
              onChangeText={setTicketTitle}
            />
            <TextInput
              style={[s.ticketInput, s.ticketArea]}
              placeholder="Mô tả chi tiết vấn đề..."
              placeholderTextColor="#9ca3af"
              value={ticketDesc}
              onChangeText={setTicketDesc}
              multiline
              numberOfLines={3}
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setSupportVisible(false)}>
                <Text style={s.cancelText}>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.ticketBtn, (ticketSending || ticketTitle.trim().length < 5 || ticketDesc.trim().length < 10) && s.sendBtnOff]}
                onPress={sendTicket}
                disabled={ticketSending || ticketTitle.trim().length < 5 || ticketDesc.trim().length < 10}
              >
                {ticketSending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.ticketBtnText}>Gửi ticket</Text>}
              </TouchableOpacity>
            </View>
            <Text style={s.hours}>Giờ hỗ trợ: 8h–18h, Thứ 2 – Thứ 7</Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9", padding: 32 },

  header: { backgroundColor: "#1d4ed8", paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 12, color: "#bfdbfe", marginTop: 2 },
  supportBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  supportBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  list: { padding: 14, paddingBottom: 20, flexGrow: 1 },

  emptyWrap: { paddingTop: 30 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", textAlign: "center", marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 20, paddingHorizontal: 10 },
  suggestion: {
    backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
    marginBottom: 8, borderWidth: 1, borderColor: "#e5e7eb",
  },
  suggestionText: { fontSize: 14, color: "#374151" },

  bubbleRow: { marginBottom: 10, flexDirection: "row" },
  rowRight: { justifyContent: "flex-end" },
  rowLeft: { justifyContent: "flex-start" },
  bubble: { maxWidth: "85%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: "#1d4ed8", borderBottomRightRadius: 6 },
  bubbleAI: { backgroundColor: "#fff", borderBottomLeftRadius: 6, borderWidth: 1, borderColor: "#f3f4f6" },
  textUser: { color: "#fff", fontSize: 14, lineHeight: 21 },
  textAI: { color: "#1f2937", fontSize: 14, lineHeight: 21 },

  quotaBanner: { backgroundColor: "#fffbeb", borderTopWidth: 1, borderTopColor: "#fde68a", padding: 10 },
  quotaText: { fontSize: 12, color: "#92400e", textAlign: "center" },

  inputBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb",
    paddingHorizontal: 12, paddingVertical: 10,
  },
  input: {
    flex: 1, backgroundColor: "#f3f4f6", borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 14, color: "#111827",
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: "#1d4ed8",
    justifyContent: "center", alignItems: "center",
  },
  sendBtnOff: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  lockIcon: { fontSize: 44, marginBottom: 12 },
  lockTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 8 },
  lockDesc: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 12 },
  lockHint: { fontSize: 13, color: "#9ca3af", textAlign: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 6 },
  modalSub: { fontSize: 13, color: "#6b7280", marginBottom: 14 },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 16, padding: 14, marginBottom: 16,
  },
  contactIcon: { fontSize: 22 },
  contactTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  contactDesc: { fontSize: 12, color: "#6b7280" },
  ticketLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  ticketInput: {
    backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: "#111827", marginBottom: 8,
  },
  ticketArea: { minHeight: 70, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12,
    paddingVertical: 13, alignItems: "center",
  },
  cancelText: { color: "#6b7280", fontSize: 14, fontWeight: "600" },
  ticketBtn: {
    flex: 2, backgroundColor: "#1d4ed8", borderRadius: 12,
    paddingVertical: 13, alignItems: "center",
  },
  ticketBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  hours: { fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 12 },
});
