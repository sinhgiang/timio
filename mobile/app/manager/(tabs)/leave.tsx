import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  RefreshControl, TouchableOpacity, Alert, TextInput, Modal,
} from "react-native";
import { router } from "expo-router";
import { getManager } from "@/lib/storage";
import { getLeaveRequests, updateLeaveRequest, type LeaveRequestItem } from "@/lib/api";

const LEAVE_TYPES: Record<string, string> = {
  annual:    "Nghỉ phép năm",
  sick:      "Nghỉ ốm",
  unpaid:    "Nghỉ không lương",
  maternity: "Nghỉ thai sản",
  other:     "Khác",
};

const FILTERS = [
  { key: "pending",  label: "Chờ duyệt" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
  { key: "all",      label: "Tất cả" },
];

export default function ManagerLeave() {
  const [items, setItems] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    const mgr = await getManager();
    if (!mgr) { router.replace("/"); return; }
    setToken(mgr.token);
    try {
      const data = await getLeaveRequests(mgr.token, status);
      setItems(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(filter).finally(() => setLoading(false));
  }, [load, filter]);

  async function onRefresh() {
    setRefreshing(true);
    await load(filter);
    setRefreshing(false);
  }

  async function handleApprove(item: LeaveRequestItem) {
    Alert.alert(
      "Duyệt đơn nghỉ phép",
      `Duyệt đơn của ${item.employeeName} từ ${item.fromDate} đến ${item.toDate}?`,
      [
        { text: "Huỷ", style: "cancel" },
        {
          text: "Duyệt",
          onPress: async () => {
            setProcessing(item.id);
            try {
              await updateLeaveRequest(token, item.id, "approved");
              await load(filter);
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
      await updateLeaveRequest(token, rejectModal.id, "rejected", rejectNote.trim() || undefined);
      setRejectModal(null);
      setRejectNote("");
      await load(filter);
    } catch (e) {
      Alert.alert("Lỗi", e instanceof Error ? e.message : "Không từ chối được");
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>;
  }

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Đơn nghỉ phép</Text>
        <Text style={s.subtitle}>
          {filter === "pending" ? `${items.length} đơn chờ duyệt` : `${items.length} đơn`}
        </Text>
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterBtn, filter === f.key && s.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyText}>
              {filter === "pending" ? "Không có đơn nào chờ duyệt" : "Không có đơn nào"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View>
                <Text style={s.empName}>{item.employeeName}</Text>
                <Text style={s.empDept}>{item.department || "—"}</Text>
              </View>
              <View style={[s.statusBadge, item.status === "approved" ? s.badgeGreen : item.status === "rejected" ? s.badgeRed : s.badgeYellow]}>
                <Text style={[s.statusText, item.status === "approved" ? s.textGreen : item.status === "rejected" ? s.textRed : s.textYellow]}>
                  {item.status === "approved" ? "Đã duyệt" : item.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                </Text>
              </View>
            </View>

            <View style={s.cardMid}>
              <Text style={s.leaveType}>{LEAVE_TYPES[item.type] ?? item.type}</Text>
              <Text style={s.dates}>{item.fromDate} → {item.toDate} ({item.days} ngày)</Text>
              {item.reason ? <Text style={s.reason} numberOfLines={2}>{item.reason}</Text> : null}
              {item.note ? <Text style={s.note}>Ghi chú: {item.note}</Text> : null}
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

      {/* Reject modal */}
      <Modal visible={!!rejectModal} animationType="slide" transparent onRequestClose={() => setRejectModal(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Từ chối đơn của {rejectModal?.name}</Text>
            <Text style={s.modalSub}>Ghi chú lý do từ chối (không bắt buộc)</Text>
            <TextInput
              style={s.modalInput}
              placeholder="vd: Không đủ người trong thời gian này..."
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

  filterRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f3f4f6" },
  filterActive: { backgroundColor: "#1d4ed8" },
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
  empName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  empDept: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeGreen: { backgroundColor: "#dcfce7" },
  badgeRed: { backgroundColor: "#fee2e2" },
  badgeYellow: { backgroundColor: "#fef9c3" },
  statusText: { fontSize: 11, fontWeight: "700" },
  textGreen: { color: "#16a34a" },
  textRed: { color: "#dc2626" },
  textYellow: { color: "#92400e" },
  cardMid: { marginBottom: 12 },
  leaveType: { fontSize: 14, fontWeight: "700", color: "#1d4ed8", marginBottom: 4 },
  dates: { fontSize: 14, color: "#374151", fontWeight: "600" },
  reason: { fontSize: 13, color: "#6b7280", marginTop: 6 },
  note: { fontSize: 12, color: "#9ca3af", marginTop: 4, fontStyle: "italic" },

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
