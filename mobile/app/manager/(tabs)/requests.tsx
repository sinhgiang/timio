import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  RefreshControl, TouchableOpacity, Alert, TextInput, Modal, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { getManager } from "@/lib/storage";
import { getRequests, actionRequest, type RequestItem, type RequestType } from "@/lib/api";

const TYPES: { key: RequestType; label: string }[] = [
  { key: "overtime",    label: "Tăng ca" },
  { key: "early_leave", label: "Về sớm" },
  { key: "correction",  label: "Sửa công" },
  { key: "shift_swap",  label: "Đổi ca" },
];

const STATUS_FILTERS = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "all",     label: "Tất cả" },
];

export default function ManagerRequests() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState<RequestType>("overtime");
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState("");
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(async (t: RequestType, st: string) => {
    const mgr = await getManager();
    if (!mgr) { router.replace("/"); return; }
    try {
      const data = await getRequests(t, st);
      setItems(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(type, status).finally(() => setLoading(false));
  }, [load, type, status]);

  async function onRefresh() {
    setRefreshing(true);
    await load(type, status);
    setRefreshing(false);
  }

  async function handleApprove(item: RequestItem) {
    Alert.alert(
      "Duyệt đơn",
      `Duyệt đơn của ${item.employeeName}?`,
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Duyệt",
          onPress: async () => {
            setProcessing(item.id);
            try {
              await actionRequest(type, item.id, "approve");
              await load(type, status);
            } catch (e) {
              Alert.alert("Lỗi", e instanceof Error ? e.message : "Không duyệt được");
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  }

  async function handleReject() {
    if (!rejectModal) return;
    setProcessing(rejectModal.id);
    try {
      await actionRequest(type, rejectModal.id, "reject", rejectNote.trim() || undefined);
      setRejectModal(null);
      setRejectNote("");
      await load(type, status);
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không từ chối được");
    } finally {
      setProcessing(null);
    }
  }

  const typeLabel = TYPES.find((t) => t.key === type)?.label ?? "";

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Duyệt đơn</Text>
        <Text style={s.subtitle}>
          {status === "pending" ? `${items.length} đơn ${typeLabel.toLowerCase()} chờ duyệt` : `${items.length} đơn ${typeLabel.toLowerCase()}`}
        </Text>
      </View>

      {/* Type pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.typeScroll}
        contentContainerStyle={s.typeRow}
      >
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.typeBtn, type === t.key && s.typeActive]}
            onPress={() => setType(t.key)}
          >
            <Text style={[s.typeText, type === t.key && s.typeTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status filter */}
      <View style={s.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterBtn, status === f.key && s.filterActive]}
            onPress={() => setStatus(f.key)}
          >
            <Text style={[s.filterText, status === f.key && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🗂️</Text>
              <Text style={s.emptyText}>Không có đơn nào</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.empName}>{item.employeeName}</Text>
                <View style={[s.statusBadge, item.status === "approved" ? s.badgeGreen : item.status === "rejected" ? s.badgeRed : s.badgeYellow]}>
                  <Text style={[s.statusText, item.status === "approved" ? s.textGreen : item.status === "rejected" ? s.textRed : s.textYellow]}>
                    {item.status === "approved" ? "Đã duyệt" : item.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                  </Text>
                </View>
              </View>

              <View style={s.cardMid}>
                <Text style={s.detail}>{item.detail}</Text>
                {item.reason ? <Text style={s.reason} numberOfLines={3}>Lý do: {item.reason}</Text> : null}
              </View>

              {item.status === "pending" && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.rejectBtn, processing === item.id && s.btnOff]}
                    onPress={() => { setRejectModal({ id: item.id, name: item.employeeName }); setRejectNote(""); }}
                    disabled={!!processing}
                  >
                    <Text style={s.rejectText}>Từ chối</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.approveBtn, processing === item.id && s.btnOff]}
                    onPress={() => handleApprove(item)}
                    disabled={!!processing}
                  >
                    {processing === item.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={s.approveText}>✓ Duyệt</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Reject modal */}
      <Modal visible={!!rejectModal} animationType="slide" transparent onRequestClose={() => setRejectModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Từ chối đơn của {rejectModal?.name}</Text>
            <Text style={s.modalSub}>Ghi chú lý do từ chối (không bắt buộc)</Text>
            <TextInput
              style={s.modalInput}
              placeholder="vd: Không phù hợp với lịch làm việc..."
              placeholderTextColor="#9ca3af"
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
              numberOfLines={3}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setRejectModal(null)}>
                <Text style={s.cancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmRejectBtn, processing && s.btnOff]}
                onPress={handleReject}
                disabled={!!processing}
              >
                {processing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmRejectText}>Xác nhận từ chối</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },

  header: { backgroundColor: "#1d4ed8", paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 13, color: "#bfdbfe", marginTop: 4 },

  typeScroll: { backgroundColor: "#fff", maxHeight: 52 },
  typeRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#f3f4f6" },
  typeActive: { backgroundColor: "#1d4ed8" },
  typeText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  typeTextActive: { color: "#fff" },

  filterRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f3f4f6" },
  filterActive: { backgroundColor: "#0f766e" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  filterTextActive: { color: "#fff" },

  errorBox: { margin: 16, backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: "#dc2626" },
  errorText: { color: "#dc2626", fontSize: 14 },

  list: { padding: 12, paddingBottom: 32 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  empName: { fontSize: 16, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeRed: { backgroundColor: "#fee2e2" },
  badgeYellow: { backgroundColor: "#fef9c3" },
  statusText: { fontSize: 11, fontWeight: "700" },
  textGreen: { color: "#16a34a" },
  textRed: { color: "#dc2626" },
  textYellow: { color: "#92400e" },
  cardMid: { marginBottom: 12 },
  detail: { fontSize: 14, color: "#374151", fontWeight: "600" },
  reason: { fontSize: 13, color: "#6b7280", marginTop: 6 },

  actions: { flexDirection: "row", gap: 10 },
  btnOff: { opacity: 0.5 },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectText: { color: "#dc2626", fontSize: 14, fontWeight: "700" },
  approveBtn: {
    flex: 1,
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  approveText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  empty: { paddingTop: 60, alignItems: "center" },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: "#9ca3af", fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  modalSub: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  modalInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#111827",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: { color: "#6b7280", fontSize: 15, fontWeight: "600" },
  confirmRejectBtn: {
    flex: 2,
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmRejectText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
