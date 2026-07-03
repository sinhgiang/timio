import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { getManager } from "@/lib/storage";
import { getAttendanceToday, type AttendanceRecord } from "@/lib/api";

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  on_time:  { label: "Đúng giờ", bg: "#dcfce7", color: "#16a34a" },
  late:     { label: "Đi trễ",   bg: "#fef9c3", color: "#92400e" },
  absent:   { label: "Vắng",     bg: "#fee2e2", color: "#dc2626" },
  leave:    { label: "Nghỉ phép",bg: "#ede9fe", color: "#6d28d9" },
};

const FILTERS = [
  { key: "all",     label: "Tất cả" },
  { key: "absent",  label: "Chưa vào" },
  { key: "on_time", label: "Đúng giờ" },
  { key: "late",    label: "Trễ" },
];

export default function ManagerAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const mgr = await getManager();
    if (!mgr) { router.replace("/"); return; }
    try {
      const data = await getAttendanceToday(mgr.token);
      setRecords(data);
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

  const filtered = filter === "all" ? records : records.filter((r) => r.status === filter);
  const counts = {
    all: records.length,
    on_time: records.filter((r) => r.status === "on_time").length,
    late: records.filter((r) => r.minutesLate > 0).length,
    absent: records.filter((r) => r.status === "absent").length,
  };

  const today = new Date().toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Chấm công hôm nay</Text>
        <Text style={s.date}>{today}</Text>
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterBtn, filter === f.key && s.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label} ({counts[f.key as keyof typeof counts] ?? filtered.length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.employeeId}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Không có dữ liệu</Text>
          </View>
        }
        renderItem={({ item }) => {
          const st = STATUS_LABELS[item.status] ?? STATUS_LABELS.absent;
          return (
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Text style={s.empName}>{item.employeeName}</Text>
                <Text style={s.empDept}>{item.department || item.position || "—"}</Text>
              </View>
              <View style={s.rowRight}>
                <View style={s.timeRow}>
                  <Text style={s.timeLabel}>Vào </Text>
                  <Text style={[s.timeVal, !item.checkInTime && s.timeEmpty]}>
                    {item.checkInTime ?? "--:--"}
                  </Text>
                  <Text style={s.timeLabel}>  Ra </Text>
                  <Text style={[s.timeVal, !item.checkOutTime && s.timeEmpty]}>
                    {item.checkOutTime ?? "--:--"}
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: st.bg }]}>
                  <Text style={[s.badgeText, { color: st.color }]}>
                    {item.minutesLate > 0 ? `Trễ ${item.minutesLate}p` : st.label}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },

  header: { backgroundColor: "#1d4ed8", paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: "800", color: "#fff" },
  date: { fontSize: 13, color: "#bfdbfe", marginTop: 4 },

  filterRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  filterActive: { backgroundColor: "#1d4ed8" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  filterTextActive: { color: "#fff" },

  errorBox: {
    margin: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
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
  rowLeft: { flex: 1 },
  rowRight: { alignItems: "flex-end" },
  empName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  empDept: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  timeRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  timeLabel: { fontSize: 11, color: "#9ca3af" },
  timeVal: { fontSize: 13, fontWeight: "700", color: "#111827" },
  timeEmpty: { color: "#d1d5db" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontSize: 15 },
});
