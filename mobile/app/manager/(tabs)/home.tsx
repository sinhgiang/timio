import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, RefreshControl, Alert,
} from "react-native";
import { router } from "expo-router";
import { getManager, clearManager, type StoredManager } from "@/lib/storage";
import { getManagerStats, type DailyStats } from "@/lib/api";

function getTodayLabel() {
  return new Date().toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ManagerHome() {
  const [mgr, setMgr] = useState<StoredManager | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStats = useCallback(async (manager: StoredManager) => {
    try {
      const s = await getManagerStats(manager.token);
      setStats(s);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    const manager = await getManager();
    if (!manager) { router.replace("/"); return; }
    setMgr(manager);
    await loadStats(manager);
    setLoading(false);
  }, [loadStats]);

  useEffect(() => { init(); }, [init]);

  async function onRefresh() {
    if (!mgr) return;
    setRefreshing(true);
    await loadStats(mgr);
    setRefreshing(false);
  }

  function handleLogout() {
    Alert.alert("Đăng xuất", "Bạn muốn đăng xuất?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Đăng xuất", style: "destructive",
        onPress: async () => { await clearManager(); router.replace("/"); },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  const presentPct = stats && stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <ScrollView
      style={s.flex}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={s.topBar}>
        <View>
          <Text style={s.appName}>⏱ Timio</Text>
          <Text style={s.companyName}>{mgr?.companyName}</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <View style={s.greetBox}>
        <Text style={s.greetName}>Xin chào, {mgr?.adminName}!</Text>
        <Text style={s.greetDate}>{getTodayLabel()}</Text>
        <Text style={s.roleTag}>{mgr?.role === "accountant" ? "Kế toán" : mgr?.role === "manager" ? "Quản lý" : "Chủ công ty"}</Text>
      </View>

      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Stats */}
      {stats && (
        <>
          <Text style={s.sectionTitle}>Hôm nay</Text>
          <View style={s.statsRow}>
            <View style={[s.statCard, s.statBlue]}>
              <Text style={s.statNum}>{stats.present}</Text>
              <Text style={s.statLabel}>Đã vào</Text>
            </View>
            <View style={[s.statCard, s.statRed]}>
              <Text style={s.statNum}>{stats.absent}</Text>
              <Text style={s.statLabel}>Chưa vào</Text>
            </View>
            <View style={[s.statCard, s.statYellow]}>
              <Text style={s.statNum}>{stats.late}</Text>
              <Text style={s.statLabel}>Đi trễ</Text>
            </View>
          </View>

          {/* Attendance bar */}
          <View style={s.progressCard}>
            <View style={s.progressHeader}>
              <Text style={s.progressLabel}>Tỉ lệ có mặt hôm nay</Text>
              <Text style={s.progressPct}>{presentPct}%</Text>
            </View>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${presentPct}%` as any }]} />
            </View>
            <Text style={s.progressSub}>{stats.present}/{stats.total} nhân viên</Text>
          </View>

          {/* Pending leave */}
          {stats.pendingLeave > 0 && (
            <TouchableOpacity style={s.leaveAlert} onPress={() => router.push("/manager/leave")} activeOpacity={0.85}>
              <View style={s.leaveAlertLeft}>
                <Text style={s.leaveAlertIcon}>📅</Text>
                <View>
                  <Text style={s.leaveAlertTitle}>{stats.pendingLeave} đơn nghỉ phép chờ duyệt</Text>
                  <Text style={s.leaveAlertSub}>Nhấn để xem và duyệt</Text>
                </View>
              </View>
              <Text style={s.leaveAlertArrow}>›</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Quick actions */}
      <Text style={s.sectionTitle}>Truy cập nhanh</Text>
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickCard} onPress={() => router.push("/manager/attendance")} activeOpacity={0.85}>
          <Text style={s.quickIcon}>📋</Text>
          <Text style={s.quickLabel}>Chấm công hôm nay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickCard} onPress={() => router.push("/manager/employees")} activeOpacity={0.85}>
          <Text style={s.quickIcon}>👥</Text>
          <Text style={s.quickLabel}>Danh sách nhân viên</Text>
        </TouchableOpacity>
      </View>
      <View style={s.quickRow}>
        <TouchableOpacity style={s.quickCard} onPress={() => router.push("/manager/leave")} activeOpacity={0.85}>
          <Text style={s.quickIcon}>📅</Text>
          <Text style={s.quickLabel}>Đơn nghỉ phép</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickCard} onPress={() => router.push("/manager/report")} activeOpacity={0.85}>
          <Text style={s.quickIcon}>📊</Text>
          <Text style={s.quickLabel}>Báo cáo tháng</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.pullHint}>Kéo xuống để cập nhật</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 40 },

  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  appName: { fontSize: 20, fontWeight: "800", color: "#1d4ed8" },
  companyName: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f3f4f6", borderRadius: 8 },
  logoutText: { color: "#6b7280", fontSize: 13 },

  greetBox: { marginBottom: 24 },
  greetName: { fontSize: 22, fontWeight: "700", color: "#111827" },
  greetDate: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  roleTag: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
  },
  errorText: { color: "#dc2626", fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 12, marginTop: 8 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: "center" },
  statBlue: { backgroundColor: "#dbeafe" },
  statRed: { backgroundColor: "#fee2e2" },
  statYellow: { backgroundColor: "#fef9c3" },
  statNum: { fontSize: 32, fontWeight: "800", color: "#111827" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 4, fontWeight: "600" },

  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  progressLabel: { fontSize: 14, color: "#374151", fontWeight: "600" },
  progressPct: { fontSize: 14, fontWeight: "700", color: "#1d4ed8" },
  progressBg: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: "#1d4ed8", borderRadius: 4 },
  progressSub: { fontSize: 12, color: "#9ca3af", marginTop: 8 },

  leaveAlert: {
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#fcd34d",
  },
  leaveAlertLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  leaveAlertIcon: { fontSize: 28, marginRight: 12 },
  leaveAlertTitle: { fontSize: 14, fontWeight: "700", color: "#92400e" },
  leaveAlertSub: { fontSize: 12, color: "#b45309", marginTop: 2 },
  leaveAlertArrow: { fontSize: 24, color: "#b45309" },

  quickRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  quickCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quickIcon: { fontSize: 28, marginBottom: 8 },
  quickLabel: { fontSize: 12, fontWeight: "600", color: "#374151", textAlign: "center" },

  pullHint: { textAlign: "center", color: "#d1d5db", fontSize: 12, marginTop: 16 },
});
