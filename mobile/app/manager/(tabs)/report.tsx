import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { getManager } from "@/lib/storage";
import { getMonthlyReport, type MonthlyReport, type ReportRecord } from "@/lib/api";

const VN_MONTHS = ["", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

export default function ManagerReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  const load = useCallback(async (y: number, m: number) => {
    const mgr = await getManager();
    if (!mgr) { router.replace("/"); return; }
    setToken(mgr.token);
    try {
      const data = await getMonthlyReport(mgr.token, y, m);
      setReport(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
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

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>;
  }

  const records = report?.records ?? [];
  const totals = report?.totals;

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Báo cáo tháng</Text>
        {/* Month picker */}
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

      {/* Summary totals */}
      {totals && (
        <View style={s.totalsRow}>
          <View style={[s.totalCard, s.totalBlue]}>
            <Text style={s.totalNum}>{totals.daysPresent}</Text>
            <Text style={s.totalLabel}>Ngày có mặt</Text>
          </View>
          <View style={[s.totalCard, s.totalYellow]}>
            <Text style={s.totalNum}>{totals.daysLate}</Text>
            <Text style={s.totalLabel}>Lần đi trễ</Text>
          </View>
          <View style={[s.totalCard, s.totalRed]}>
            <Text style={s.totalNum}>{totals.daysAbsent}</Text>
            <Text style={s.totalLabel}>Ngày vắng</Text>
          </View>
        </View>
      )}

      {/* Per-employee list */}
      <FlatList
        data={records}
        keyExtractor={(r) => r.employeeId}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={s.tableHeader}>
            <Text style={[s.col, s.colName]}>Nhân viên</Text>
            <Text style={[s.col, s.colNum, { color: "#1d4ed8" }]}>Có mặt</Text>
            <Text style={[s.col, s.colNum, { color: "#92400e" }]}>Trễ</Text>
            <Text style={[s.col, s.colNum, { color: "#dc2626" }]}>Vắng</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}><Text style={s.emptyText}>Chưa có dữ liệu tháng này</Text></View>
        }
        renderItem={({ item }: { item: ReportRecord }) => (
          <View style={s.row}>
            <View style={[s.col, s.colName]}>
              <Text style={s.empName}>{item.employeeName}</Text>
              <Text style={s.empDept}>{item.department || "—"}</Text>
            </View>
            <Text style={[s.col, s.colNum, s.numBlue]}>{item.daysPresent}</Text>
            <Text style={[s.col, s.colNum, s.numYellow]}>{item.daysLate}</Text>
            <Text style={[s.col, s.colNum, s.numRed]}>{item.daysAbsent}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },

  header: { backgroundColor: "#1d4ed8", paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 12 },
  monthPicker: { flexDirection: "row", alignItems: "center", gap: 16 },
  monthBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10 },
  monthBtnText: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 26 },
  monthLabel: { fontSize: 16, fontWeight: "700", color: "#fff", flex: 1, textAlign: "center" },

  errorBox: { margin: 16, backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: "#dc2626" },
  errorText: { color: "#dc2626", fontSize: 14 },

  totalsRow: { flexDirection: "row", padding: 12, gap: 8 },
  totalCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center" },
  totalBlue: { backgroundColor: "#dbeafe" },
  totalYellow: { backgroundColor: "#fef9c3" },
  totalRed: { backgroundColor: "#fee2e2" },
  totalNum: { fontSize: 26, fontWeight: "800", color: "#111827" },
  totalLabel: { fontSize: 11, color: "#6b7280", marginTop: 4, fontWeight: "600", textAlign: "center" },

  list: { paddingHorizontal: 12, paddingBottom: 32 },

  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 6,
  },
  col: { },
  colName: { flex: 1 },
  colNum: { width: 52, textAlign: "center", fontSize: 12, fontWeight: "700" },

  row: {
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
  empName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  empDept: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  numBlue: { color: "#1d4ed8", fontSize: 15, fontWeight: "800" },
  numYellow: { color: "#92400e", fontSize: 15, fontWeight: "800" },
  numRed: { color: "#dc2626", fontSize: 15, fontWeight: "800" },

  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontSize: 15 },
});
