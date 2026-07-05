import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  RefreshControl, TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { getEmployee } from "@/lib/storage";
import { getFeed, type FeedResult, type FeedAnnouncement } from "@/lib/api";

function typeStyle(type: string): { bg: string; color: string; label: string } {
  switch (type) {
    case "urgent": return { bg: "#fee2e2", color: "#dc2626", label: "Khẩn" };
    case "warning": return { bg: "#fef9c3", color: "#92400e", label: "Lưu ý" };
    case "event": return { bg: "#ede9fe", color: "#7c3aed", label: "Sự kiện" };
    case "info": return { bg: "#dbeafe", color: "#1d4ed8", label: "Thông tin" };
    default: return { bg: "#f3f4f6", color: "#6b7280", label: type || "Chung" };
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return iso; }
}

export default function FeedScreen() {
  const [data, setData] = useState<FeedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const emp = await getEmployee();
    if (!emp) { router.replace("/"); return; }
    try {
      const res = await getFeed(emp.id, emp.pin);
      setData(res);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      setData(null);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Ghim lên đầu
  const announcements = [...(data?.announcements ?? [])].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );
  const holidays = data?.holidays ?? [];

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={s.title}>Bảng tin & Ngày lễ</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View> : null}

          {/* Announcements */}
          <Text style={s.sectionTitle}>Thông báo</Text>
          {announcements.length === 0 ? (
            <View style={s.emptyCard}><Text style={s.emptyText}>Chưa có thông báo nào</Text></View>
          ) : (
            announcements.map((a: FeedAnnouncement, i) => {
              const ts = typeStyle(a.type);
              return (
                <View key={i} style={[s.card, a.pinned && s.cardPinned]}>
                  <View style={s.cardTop}>
                    <View style={s.cardTitleWrap}>
                      {a.pinned && <Text style={s.pin}>📌</Text>}
                      <Text style={s.cardTitle}>{a.title}</Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: ts.bg }]}>
                      <Text style={[s.badgeText, { color: ts.color }]}>{ts.label}</Text>
                    </View>
                  </View>
                  {a.content ? <Text style={s.cardContent}>{a.content}</Text> : null}
                  {a.publishedAt ? <Text style={s.cardDate}>{formatDate(a.publishedAt)}</Text> : null}
                </View>
              );
            })
          )}

          {/* Holidays */}
          <Text style={[s.sectionTitle, { marginTop: 20 }]}>Ngày lễ năm nay</Text>
          {holidays.length === 0 ? (
            <View style={s.emptyCard}><Text style={s.emptyText}>Chưa có ngày lễ</Text></View>
          ) : (
            <View style={s.holidayCard}>
              {holidays.map((h, i) => (
                <View key={i} style={[s.holidayRow, i > 0 && s.holidayRowBorder]}>
                  <Text style={s.holidayDate}>{formatDate(h.date)}</Text>
                  <Text style={s.holidayName}>{h.name}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
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
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },

  scroll: { padding: 16, paddingBottom: 40 },

  errorBox: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: "#dc2626", marginBottom: 16 },
  errorText: { color: "#dc2626", fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 10 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPinned: { borderLeftWidth: 4, borderLeftColor: "#1d4ed8" },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardTitleWrap: { flexDirection: "row", alignItems: "center", flex: 1, gap: 6 },
  pin: { fontSize: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardContent: { fontSize: 14, color: "#4b5563", marginTop: 8, lineHeight: 20 },
  cardDate: { fontSize: 12, color: "#9ca3af", marginTop: 8 },

  emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 20, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontSize: 14 },

  holidayCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  holidayRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 16 },
  holidayRowBorder: { borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  holidayDate: { fontSize: 14, fontWeight: "700", color: "#1d4ed8", width: 90 },
  holidayName: { fontSize: 14, color: "#374151", flex: 1 },
});
