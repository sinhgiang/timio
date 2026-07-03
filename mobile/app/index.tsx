import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { getEmployee, getManager } from "@/lib/storage";

export default function RoleSelector() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const [emp, mgr] = await Promise.all([getEmployee(), getManager()]);
      if (emp) { router.replace("/home"); return; }
      if (mgr) { router.replace("/manager/home"); return; }
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}>⏱</Text>
        <Text style={s.appName}>Timio</Text>
        <Text style={s.subtitle}>Chấm công thông minh</Text>
      </View>

      <Text style={s.question}>Bạn là ai?</Text>

      <TouchableOpacity style={s.cardEmployee} onPress={() => router.push("/employee")} activeOpacity={0.85}>
        <Text style={s.cardIcon}>👤</Text>
        <View style={s.cardText}>
          <Text style={s.cardTitle}>Nhân viên</Text>
          <Text style={s.cardSub}>Chấm công vào / ra</Text>
        </View>
        <Text style={s.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.cardManager} onPress={() => router.push("/manager/login")} activeOpacity={0.85}>
        <Text style={s.cardIcon}>👔</Text>
        <View style={s.cardText}>
          <Text style={[s.cardTitle, s.cardTitleDark]}>Quản lý / Kế toán</Text>
          <Text style={[s.cardSub, s.cardSubDark]}>Xem báo cáo, duyệt nghỉ phép</Text>
        </View>
        <Text style={[s.arrow, s.arrowDark]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },
  container: { flex: 1, backgroundColor: "#f1f5f9", padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 48 },
  logo: { fontSize: 60, marginBottom: 8 },
  appName: { fontSize: 38, fontWeight: "800", color: "#1d4ed8", letterSpacing: -1 },
  subtitle: { fontSize: 15, color: "#6b7280", marginTop: 4 },
  question: { fontSize: 18, fontWeight: "700", color: "#374151", textAlign: "center", marginBottom: 20 },
  cardEmployee: {
    backgroundColor: "#1d4ed8",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  cardManager: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIcon: { fontSize: 32, marginRight: 16 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  cardTitleDark: { color: "#111827" },
  cardSub: { fontSize: 13, color: "#bfdbfe", marginTop: 2 },
  cardSubDark: { color: "#6b7280" },
  arrow: { fontSize: 28, color: "#bfdbfe", fontWeight: "300" },
  arrowDark: { color: "#9ca3af" },
});
