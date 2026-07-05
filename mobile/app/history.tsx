import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { getEmployee } from "@/lib/storage";
import { getHistory, type HistoryResult, type HistoryDay } from "@/lib/api";

const VN_MONTHS = ["", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function statusLabel(status: string | null): string {
  switch (status) {
    case "on_time": return "Đúng giờ";
    case "late": return "Đi trễ";
    case "absent": return "Vắng";
    case "leave": return "Nghỉ phép";
    case "early": return "Về sớm";
    default: return status ? status : "—";
  }
}

export default function HistoryScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<HistoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (y: number, m: number) => {
    const emp = await getEmployee();
    if (!emp) { router.replace("/"); return; }
    try {
      const res = await getHistory(emp.id, emp.pin, monthKey(y, m));
      setData(res);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      setData(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(year, month).finally(() => setLoading(false));
  }, [load, year, month]);

  async function onRefresh() {
    setRefreshing(true);
    await load(year, month);
    setRefreshing(false);
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    if (ny > now.getFullYear() || (ny === now.getFullYear() && nm > now.getMonth() + 1)) return;
    setYear(ny); setMonth(nm);
  }

  const summary = data?.summary;

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={s.title}>Lịch sử chấm công</Text>
        <View style={s.monthPicker}>
          <TouchableOpacity onPress={prevMonth} style={s.monthBtn}>
            <Text style={s.monthBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{VN_MONTHS[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={s.monthBtn}>
            <Text style={s.monthBtnText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

      {/* Summary */}
      {summary && (
        <View style={s.summaryRow}>
          <View style={[s.sumCard, s.sumBlue]}>
            <Text style={s.sumNum}>{summary.present}</Text>
            <Text style={s.sumLabel}>Có mặt</Text>
          </View>
          <View style={[s.sumCard, s.sumYellow]}>
            <Text style={s.sumNum}>{summary.late}</Text>
            <Text style={s.sumLabel}>Đi trễ</Text>
          </View>
          <View style={[s.sumCard, s.sumRed]}>
            <Text style={s.sumNum}>{summary.absent}</Text>
            <Text style={s.sumLabel}>Vắng</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      ) : (
        <FlatList
          data={data?.days ?? []}
          keyExtractor={(d) => d.date}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            !error ? <View style={s.empty}><Text style={s.emptyText}>Chưa có dữ liệu tháng này</Text></View> : null
          }
          renderItem={({ item }: { item: HistoryDay }) => {
            const isLate = item.minutesLate > 0;
            return (
              <View style={s.dayRow}>
                <View style={s.dayDateCol}>
                  <Text style={s.dayDate}>{item.date}</Text>
                  <Text style={[s.dayStatus, isLate && s.dayStatusLate]}>{statusLabel(item.status)}</Text>
                </View>
                <View style={s.dayTimeCol}>
                  <Text style={s.dayTimeLabel}>Vào</Text>
                  <Text style={s.dayTime}>{item.checkInTime ?? "--:--"}</Text>
                </View>
                <View style={s.dayTimeCol}>
                  <Text style={s.dayTimeLabel}>Ra</Text>
                  <Text style={s.dayTime}>{item.checkOutTime ?? "--:--"}</Text>
                </View>
                <View style={s.dayLateCol}>
                  {isLate ? (
                    <Text style={s.dayLate}>Trễ {item.minutesLate}′</Text>
                  ) : (
                    <Text style={s.dayOnTime}>✓</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9", paddingTop: 40 },

  header: { backgroundColor: "#1d4ed8", paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  back: { marginBottom: 8 },
  backText: { color: "#bfdbfe", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 12 },
  monthPicker: { flexDirection: "row", alignItems: "center", gap: 16 },
  monthBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10 },
  monthBtnText: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 26 },
  monthLabel: { fontSize: 16, fontWeight: "700", color: "#fff", flex: 1, textAlign: "center" },

  errorBox: { margin: 16, backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: "#dc2626" },
  errorText: { color: "#dc2626", fontSize: 14 },

  summaryRow: { flexDirection: "row", padding: 12, gap: 8 },
  sumCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center" },
  sumBlue: { backgroundColor: "#dbeafe" },
  sumYellow: { backgroundColor: "#fef9c3" },
  sumRed: { backgroundColor: "#fee2e2" },
  sumNum: { fontSize: 24, fontWeight: "800", color: "#111827" },
  sumLabel: { fontSize: 11, color: "#6b7280", marginTop: 4, fontWeight: "600" },

  list: { paddingHorizontal: 12, paddingBottom: 32 },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dayDateCol: { flex: 1.2 },
  dayDate: { fontSize: 14, fontWeight: "700", color: "#111827" },
  dayStatus: { fontSize: 11, color: "#9ca3af", marginTop: 2, fontWeight: "600" },
  dayStatusLate: { color: "#dc2626" },
  dayTimeCol: { width: 54, alignItems: "center" },
  dayTimeLabel: { fontSize: 10, color: "#9ca3af", fontWeight: "600" },
  dayTime: { fontSize: 14, fontWeight: "700", color: "#111827", marginTop: 2 },
  dayLateCol: { width: 60, alignItems: "flex-end" },
  dayLate: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
  dayOnTime: { fontSize: 16, fontWeight: "800", color: "#16a34a" },

  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontSize: 15 },
});
