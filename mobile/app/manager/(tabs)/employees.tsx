import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  RefreshControl, TextInput, TouchableOpacity, Modal, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { getManager } from "@/lib/storage";
import { getEmployeeList, type EmployeeItem } from "@/lib/api";

function fmtSalary(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export default function ManagerEmployees() {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmployeeItem | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const mgr = await getManager();
    if (!mgr) { router.replace("/"); return; }
    try {
      const data = await getEmployeeList(mgr.token);
      setEmployees(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.code.toLowerCase().includes(search.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>;
  }

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Nhân viên</Text>
        <Text style={s.subtitle}>{employees.length} nhân viên đang làm</Text>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.search}
          placeholder="Tìm theo tên, mã NV, phòng ban..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {error ? (
        <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={s.empty}><Text style={s.emptyText}>Không tìm thấy nhân viên</Text></View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => setSelected(item)} activeOpacity={0.85}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={s.info}>
              <Text style={s.empName}>{item.name}</Text>
              <Text style={s.empCode}>{item.code} · {item.department || item.position || item.branchName}</Text>
            </View>
            <View style={s.leave}>
              <Text style={s.leaveNum}>{item.annualLeaveBalance}</Text>
              <Text style={s.leaveLabel}>ngày phép</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Detail modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={s.modalAvatar}>
                <Text style={s.modalAvatarText}>{selected?.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)}>
                <Text style={s.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={s.modalName}>{selected?.name}</Text>
              <Text style={s.modalCode}>{selected?.code}</Text>

              <View style={s.detailTable}>
                {[
                  ["Phòng ban", selected?.department || "—"],
                  ["Chức vụ", selected?.position || "—"],
                  ["Chi nhánh", selected?.branchName || "—"],
                  ["Email", selected?.email || "—"],
                  ["Số điện thoại", selected?.phone || "—"],
                  ["Ngày vào làm", selected?.joinDate ?? "—"],
                  ["Lương cơ bản", fmtSalary(selected?.baseSalary ?? 0)],
                  ["Ngày phép còn lại", `${selected?.annualLeaveBalance} ngày`],
                ].map(([label, value]) => (
                  <View style={s.detailRow} key={label}>
                    <Text style={s.detailLabel}>{label}</Text>
                    <Text style={s.detailValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
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

  searchRow: { backgroundColor: "#fff", padding: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  search: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },

  errorBox: { margin: 16, backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: "#dc2626" },
  errorText: { color: "#dc2626", fontSize: 14 },

  list: { padding: 12, paddingBottom: 32 },

  row: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#1d4ed8" },
  info: { flex: 1 },
  empName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  empCode: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  leave: { alignItems: "center" },
  leaveNum: { fontSize: 18, fontWeight: "800", color: "#16a34a" },
  leaveLabel: { fontSize: 10, color: "#9ca3af", marginTop: 1 },

  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  modalAvatarText: { fontSize: 24, fontWeight: "700", color: "#1d4ed8" },
  closeBtn: { padding: 8 },
  closeText: { fontSize: 20, color: "#9ca3af" },
  modalName: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  modalCode: { fontSize: 13, color: "#6b7280", marginBottom: 20 },

  detailTable: { backgroundColor: "#f9fafb", borderRadius: 16, overflow: "hidden" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  detailLabel: { fontSize: 13, color: "#6b7280", flex: 1 },
  detailValue: { fontSize: 13, fontWeight: "600", color: "#111827", flex: 1, textAlign: "right" },
});
