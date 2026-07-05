import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { getEmployee, type StoredEmployee } from "@/lib/storage";
import { getPayslip, type Payslip } from "@/lib/api";

const VN_MONTHS = ["", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

function formatVnd(n: number): string {
  const v = Math.round(n || 0);
  return `${v.toLocaleString("vi-VN")} ₫`;
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default function PayslipScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [employee, setEmployee] = useState<StoredEmployee | null>(null);
  const [data, setData] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (y: number, m: number) => {
    const emp = await getEmployee();
    if (!emp) { router.replace("/"); return; }
    setEmployee(emp);
    try {
      const res = await getPayslip(emp.id, emp.pin, monthKey(y, m));
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

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={s.title}>Phiếu lương</Text>
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

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? (
            <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>
          ) : data ? (
            <>
              {/* Attendance mini summary */}
              <View style={s.summaryRow}>
                <View style={[s.sumCard, s.sumBlue]}>
                  <Text style={s.sumNum}>{data.daysPresent}</Text>
                  <Text style={s.sumLabel}>Ngày công</Text>
                </View>
                <View style={[s.sumCard, s.sumYellow]}>
                  <Text style={s.sumNum}>{data.daysLate}</Text>
                  <Text style={s.sumLabel}>Đi trễ</Text>
                </View>
                <View style={[s.sumCard, s.sumRed]}>
                  <Text style={s.sumNum}>{data.daysAbsent}</Text>
                  <Text style={s.sumLabel}>Vắng</Text>
                </View>
              </View>

              {/* Breakdown */}
              <View style={s.card}>
                <Row label="Lương cơ bản" value={formatVnd(data.baseSalary)} />
                <Row label="Lương theo công" value={formatVnd(data.earnedBase)} />
                <Row label="Phụ cấp" value={formatVnd(data.allowances)} />
                <Row label="Thưởng" value={formatVnd(data.reward)} positive={data.reward > 0} />
                <Row label="Tăng ca" value={formatVnd(data.overtime)} positive={data.overtime > 0} />
                <Row label="Phạt" value={data.penalty > 0 ? `- ${formatVnd(data.penalty)}` : formatVnd(0)} negative={data.penalty > 0} />
                <View style={s.sep} />
                <Row label="Thu nhập trước thuế" value={formatVnd(data.grossIncome)} bold />
                <Row label="BHXH (NV đóng)" value={data.bhxhEmployee > 0 ? `- ${formatVnd(data.bhxhEmployee)}` : formatVnd(0)} negative={data.bhxhEmployee > 0} />
                <Row label="Thuế TNCN" value={data.tncn > 0 ? `- ${formatVnd(data.tncn)}` : formatVnd(0)} negative={data.tncn > 0} />
              </View>

              {/* Net take-home highlighted */}
              <View style={s.netCard}>
                <Text style={s.netLabel}>THỰC NHẬN</Text>
                <Text style={s.netValue}>{formatVnd(data.netTakeHome)}</Text>
              </View>

              <Text style={s.footNote}>Nhân viên: {employee?.name}</Text>
            </>
          ) : (
            <View style={s.empty}><Text style={s.emptyText}>Chưa có phiếu lương tháng này</Text></View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Row({ label, value, bold, positive, negative }: {
  label: string; value: string; bold?: boolean; positive?: boolean; negative?: boolean;
}) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, bold && s.rowLabelBold]}>{label}</Text>
      <Text style={[
        s.rowValue,
        bold && s.rowValueBold,
        positive && s.rowPositive,
        negative && s.rowNegative,
      ]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },

  header: { backgroundColor: "#1d4ed8", paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  back: { marginBottom: 8 },
  backText: { color: "#bfdbfe", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 12 },
  monthPicker: { flexDirection: "row", alignItems: "center", gap: 16 },
  monthBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10 },
  monthBtnText: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 26 },
  monthLabel: { fontSize: 16, fontWeight: "700", color: "#fff", flex: 1, textAlign: "center" },

  scroll: { padding: 16, paddingBottom: 40 },

  errorBox: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: "#dc2626" },
  errorText: { color: "#dc2626", fontSize: 14 },

  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  sumCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center" },
  sumBlue: { backgroundColor: "#dbeafe" },
  sumYellow: { backgroundColor: "#fef9c3" },
  sumRed: { backgroundColor: "#fee2e2" },
  sumNum: { fontSize: 24, fontWeight: "800", color: "#111827" },
  sumLabel: { fontSize: 11, color: "#6b7280", marginTop: 4, fontWeight: "600" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  rowLabel: { fontSize: 14, color: "#6b7280" },
  rowLabelBold: { fontWeight: "700", color: "#111827" },
  rowValue: { fontSize: 15, fontWeight: "600", color: "#111827" },
  rowValueBold: { fontWeight: "800", fontSize: 16 },
  rowPositive: { color: "#16a34a" },
  rowNegative: { color: "#dc2626" },
  sep: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 6 },

  netCard: {
    backgroundColor: "#16a34a",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  netLabel: { fontSize: 13, fontWeight: "700", color: "#dcfce7", letterSpacing: 1 },
  netValue: { fontSize: 34, fontWeight: "800", color: "#fff", marginTop: 6 },

  footNote: { textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 16 },

  empty: { paddingTop: 60, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontSize: 15 },
});
