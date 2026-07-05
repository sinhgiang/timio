import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  AppState,
  AppStateStatus,
} from "react-native";
import { router } from "expo-router";
import * as Network from "expo-network";
import { getEmployee, clearEmployee, type StoredEmployee } from "@/lib/storage";
import { getTodayStatus, doCheckIn, type AttendanceStatus } from "@/lib/api";
import { addToQueue, getPendingCount, syncAll } from "@/lib/queue";

const VN_DAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

function getTodayLabel() {
  const now = new Date();
  const d = now.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    weekday: "long",
  });
  return d;
}

function getNowTime() {
  return new Date().toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HomeScreen() {
  const [employee, setEmployee] = useState<StoredEmployee | null>(null);
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [nowTime, setNowTime] = useState(getNowTime());

  // Cập nhật đồng hồ mỗi giây
  useEffect(() => {
    const t = setInterval(() => setNowTime(getNowTime()), 1000);
    return () => clearInterval(t);
  }, []);

  const checkNetwork = useCallback(async () => {
    const state = await Network.getNetworkStateAsync();
    setIsOnline(!!state.isConnected && !!state.isInternetReachable);
    return !!state.isConnected && !!state.isInternetReachable;
  }, []);

  const loadStatus = useCallback(async (emp: StoredEmployee) => {
    try {
      const s = await getTodayStatus(emp.id, emp.pin);
      setStatus(s);
    } catch {
      // offline hoặc lỗi — giữ status cũ
    }
  }, []);

  const syncPending = useCallback(async (emp: StoredEmployee) => {
    const synced = await syncAll(async (employeeId, pin, timestamp) => {
      await doCheckIn(employeeId, pin, timestamp);
    });
    if (synced > 0) {
      showToast(`Đã sync ${synced} bản ghi offline`, true);
      await loadStatus(emp);
    }
    setPendingCount(await getPendingCount());
  }, [loadStatus]);

  const init = useCallback(async () => {
    setLoading(true);
    const emp = await getEmployee();
    if (!emp) { router.replace("/"); return; }
    setEmployee(emp);
    const online = await checkNetwork();
    setPendingCount(await getPendingCount());
    if (online) {
      await syncPending(emp);
      await loadStatus(emp);
    }
    setLoading(false);
  }, [checkNetwork, syncPending, loadStatus]);

  useEffect(() => { init(); }, [init]);

  // Sync khi app trở lại foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && employee) {
        checkNetwork().then((online) => {
          if (online) syncPending(employee).then(() => loadStatus(employee));
        });
      }
    });
    return () => sub.remove();
  }, [employee, checkNetwork, syncPending, loadStatus]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCheckIn() {
    if (!employee) return;
    if (checking) return;
    setChecking(true);
    try {
      const online = await checkNetwork();
      if (online) {
        const result = await doCheckIn(employee.id, employee.pin);
        showToast(result.message, true);
        await loadStatus(employee);
      } else {
        await addToQueue(employee.id, employee.pin);
        setPendingCount(await getPendingCount());
        showToast("Đã lưu offline — sẽ sync khi có mạng", true);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Lỗi chấm công", false);
    } finally {
      setChecking(false);
    }
  }

  function handleLogout() {
    Alert.alert("Đăng xuất", "Bạn muốn đăng xuất khỏi thiết bị này?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Đăng xuất", style: "destructive",
        onPress: async () => { await clearEmployee(); router.replace("/"); },
      },
    ]);
  }

  async function onRefresh() {
    if (!employee) return;
    setRefreshing(true);
    const online = await checkNetwork();
    if (online) {
      await syncPending(employee);
      await loadStatus(employee);
    }
    setPendingCount(await getPendingCount());
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  const checkedIn = !!status?.checkInAt;
  const checkedOut = !!status?.checkOutAt;
  const allDone = checkedIn && checkedOut;

  // Nút cần hiển thị
  let btnLabel = "CHẤM CÔNG VÀO";
  let btnColor = "#1d4ed8";
  if (checkedIn && !checkedOut) {
    btnLabel = "CHẤM CÔNG RA";
    btnColor = "#16a34a";
  }

  return (
    <View style={styles.flex}>
      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.ok ? styles.toastOk : styles.toastErr]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topAppName}>⏱ Timio</Text>
            <Text style={styles.topCompany}>{employee?.companyName}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetName}>Xin chào, {employee?.name}!</Text>
          <Text style={styles.greetDate}>{getTodayLabel()}</Text>
          <Text style={styles.clock}>{nowTime}</Text>
        </View>

        {/* Network / pending badge */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              Không có mạng — chấm công sẽ lưu offline
            </Text>
          </View>
        )}
        {pendingCount > 0 && isOnline && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>
              Đang sync {pendingCount} bản ghi offline...
            </Text>
          </View>
        )}
        {pendingCount > 0 && !isOnline && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>
              {pendingCount} bản ghi chờ sync khi có mạng
            </Text>
          </View>
        )}

        {/* Status card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusCol}>
              <Text style={styles.statusLabel}>Vào ca</Text>
              <Text style={[styles.statusTime, !checkedIn && styles.statusEmpty]}>
                {status?.checkInTime ?? "--:--"}
              </Text>
              {checkedIn && status?.status && (
                <Text style={[
                  styles.statusBadge,
                  status.status === "on_time" ? styles.badgeGreen : styles.badgeRed,
                ]}>
                  {status.status === "on_time"
                    ? "Đúng giờ"
                    : status.minutesLate > 0
                    ? `Trễ ${status.minutesLate} phút`
                    : "Sớm"}
                </Text>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.statusCol}>
              <Text style={styles.statusLabel}>Ra ca</Text>
              <Text style={[styles.statusTime, !checkedOut && styles.statusEmpty]}>
                {status?.checkOutTime ?? "--:--"}
              </Text>
              {checkedOut && (
                <Text style={[styles.statusBadge, styles.badgeGreen]}>Đã ra</Text>
              )}
            </View>
          </View>
        </View>

        {/* Main button */}
        {!allDone ? (
          <TouchableOpacity
            style={[styles.checkBtn, { backgroundColor: btnColor }, checking && styles.checkBtnDisabled]}
            onPress={handleCheckIn}
            disabled={checking}
            activeOpacity={0.85}
          >
            {checking ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.checkBtnText}>{btnLabel}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.doneBox}>
            <Text style={styles.doneIcon}>✅</Text>
            <Text style={styles.doneText}>Đã hoàn thành hôm nay!</Text>
            <Text style={styles.doneSubText}>Vào {status?.checkInTime} — Ra {status?.checkOutTime}</Text>
          </View>
        )}

        {/* Self-service grid */}
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push("/payslip")} activeOpacity={0.85}>
            <Text style={styles.gridIcon}>💰</Text>
            <Text style={styles.gridLabel}>Phiếu lương</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push("/history")} activeOpacity={0.85}>
            <Text style={styles.gridIcon}>📅</Text>
            <Text style={styles.gridLabel}>Lịch sử</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push("/leave-request")} activeOpacity={0.85}>
            <Text style={styles.gridIcon}>📝</Text>
            <Text style={styles.gridLabel}>Xin nghỉ phép</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => router.push("/feed")} activeOpacity={0.85}>
            <Text style={styles.gridIcon}>📢</Text>
            <Text style={styles.gridLabel}>Bảng tin</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pullHint}>Kéo xuống để cập nhật</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },
  loadingText: { marginTop: 12, color: "#6b7280", fontSize: 15 },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 40 },

  toast: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  toastOk: { backgroundColor: "#16a34a" },
  toastErr: { backgroundColor: "#dc2626" },
  toastText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  topAppName: { fontSize: 20, fontWeight: "800", color: "#1d4ed8" },
  topCompany: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f3f4f6", borderRadius: 8 },
  logoutText: { color: "#6b7280", fontSize: 13 },

  greeting: { marginBottom: 20 },
  greetName: { fontSize: 24, fontWeight: "700", color: "#111827" },
  greetDate: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  clock: { fontSize: 40, fontWeight: "800", color: "#1d4ed8", marginTop: 8, letterSpacing: 2 },

  offlineBanner: {
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  offlineText: { color: "#92400e", fontSize: 13, fontWeight: "600" },

  pendingBanner: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  pendingText: { color: "#1e40af", fontSize: 13, fontWeight: "600" },

  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusCol: { flex: 1, alignItems: "center" },
  divider: { width: 1, height: 60, backgroundColor: "#e5e7eb" },
  statusLabel: { fontSize: 12, color: "#9ca3af", fontWeight: "600", marginBottom: 6 },
  statusTime: { fontSize: 28, fontWeight: "700", color: "#111827" },
  statusEmpty: { color: "#d1d5db" },
  statusBadge: { marginTop: 6, fontSize: 12, fontWeight: "600", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeGreen: { backgroundColor: "#dcfce7", color: "#16a34a" },
  badgeRed: { backgroundColor: "#fef2f2", color: "#dc2626" },

  checkBtn: {
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  checkBtnDisabled: { opacity: 0.7 },
  checkBtnText: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: 1 },

  doneBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#bbf7d0",
    marginBottom: 16,
  },
  doneIcon: { fontSize: 48, marginBottom: 8 },
  doneText: { fontSize: 20, fontWeight: "700", color: "#16a34a" },
  doneSubText: { fontSize: 14, color: "#6b7280", marginTop: 6 },

  pullHint: { textAlign: "center", color: "#d1d5db", fontSize: 12, marginTop: 8 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  gridItem: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  gridIcon: { fontSize: 28, marginBottom: 8 },
  gridLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },
});
