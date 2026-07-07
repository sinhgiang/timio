import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, FlatList, RefreshControl,
  TouchableOpacity, ScrollView, Alert, Linking,
} from "react-native";
import { router } from "expo-router";
import { getManager } from "@/lib/storage";
import { getRecruitCandidates, updateRecruitStatus, type RecruitCandidate } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  new: "Mới", reviewing: "Đang xem", interview: "Phỏng vấn", offer: "Offer", hired: "Đã tuyển", rejected: "Từ chối",
};
const STATUS_ORDER = ["new", "reviewing", "interview", "offer", "hired", "rejected"];
const FILTERS = ["new", "reviewing", "interview", "offer", "hired", "rejected"];

function scoreColor(score: number | null): { bg: string; fg: string } {
  if (score == null) return { bg: "#f1f5f9", fg: "#94a3b8" };
  if (score >= 70) return { bg: "#dcfce7", fg: "#15803d" };
  if (score >= 40) return { bg: "#fef9c3", fg: "#a16207" };
  return { bg: "#e2e8f0", fg: "#475569" };
}

export default function RecruitmentScreen() {
  const [candidates, setCandidates] = useState<RecruitCandidate[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("new");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const mgr = await getManager();
    if (!mgr) { router.replace("/"); return; }
    try {
      const data = await getRecruitCandidates("all");
      setCounts(data.counts);
      setCandidates(data.candidates);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    }
  }, []);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  function changeStatus(c: RecruitCandidate) {
    const options = STATUS_ORDER
      .filter((s) => s !== c.status)
      .map((s) => ({
        text: STATUS_LABELS[s],
        onPress: async () => {
          setProcessing(c.id);
          try {
            await updateRecruitStatus(c.id, s);
            setCandidates((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: s } : x)));
            setCounts((prev) => ({ ...prev, [c.status]: Math.max(0, (prev[c.status] ?? 1) - 1), [s]: (prev[s] ?? 0) + 1 }));
          } catch (e) {
            Alert.alert("Lỗi", e instanceof Error ? e.message : "Không đổi được trạng thái");
          }
          setProcessing(null);
        },
      }));
    Alert.alert(`Chuyển "${c.name}" sang`, "Chọn trạng thái mới", [...options, { text: "Huỷ", style: "cancel" }]);
  }

  const shown = candidates.filter((c) => c.status === filter);

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><Text style={s.backText}>‹ Quay lại</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Tuyển dụng</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsRow} contentContainerStyle={s.chipsContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[s.chip, filter === f && s.chipActive]}>
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {STATUS_LABELS[f]}{counts[f] ? ` (${counts[f]})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>
      ) : error ? (
        <View style={s.center}><Text style={s.errorText}>{error}</Text></View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(c) => c.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={s.empty}>Không có ứng viên ở mục này</Text>}
          renderItem={({ item }) => {
            const sc = scoreColor(item.aiScore);
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>
                      {item.name}
                      {item.hasCv ? <Text style={s.cvTag}>  CV</Text> : null}
                    </Text>
                    <Text style={s.job}>{item.jobTitle}</Text>
                  </View>
                  <View style={[s.scoreBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.scoreText, { color: sc.fg }]}>{item.aiScore ?? "—"}</Text>
                  </View>
                </View>

                {item.interviewAt ? (
                  <Text style={s.interview}>🗓 PV: {new Date(item.interviewAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</Text>
                ) : null}
                {item.aiSummary ? <Text style={s.summary} numberOfLines={2}>{item.aiSummary}</Text> : null}

                <View style={s.actions}>
                  {item.phone ? (
                    <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                      <Text style={s.callText}>📞 {item.phone}</Text>
                    </TouchableOpacity>
                  ) : <View />}
                  <TouchableOpacity style={s.moveBtn} onPress={() => changeStatus(item)} disabled={processing === item.id}>
                    <Text style={s.moveText}>{processing === item.id ? "..." : "Chuyển trạng thái"}</Text>
                  </TouchableOpacity>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1d4ed8", paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16 },
  backBtn: { width: 70 },
  backText: { color: "#dbeafe", fontSize: 15 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  chipsRow: { maxHeight: 52, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  chipsContent: { paddingHorizontal: 12, paddingVertical: 9, gap: 8, alignItems: "center" },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: "#f1f5f9" },
  chipActive: { backgroundColor: "#1d4ed8" },
  chipText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  list: { padding: 14, paddingBottom: 40 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 40, fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  name: { fontSize: 15, fontWeight: "700", color: "#111827" },
  cvTag: { fontSize: 11, fontWeight: "700", color: "#2563eb" },
  job: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  scoreBadge: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  scoreText: { fontSize: 14, fontWeight: "800" },
  interview: { fontSize: 12, color: "#7c3aed", marginTop: 8, fontWeight: "600" },
  summary: { fontSize: 12.5, color: "#475569", marginTop: 6, lineHeight: 18 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  callBtn: { paddingVertical: 6 },
  callText: { color: "#2563eb", fontSize: 13, fontWeight: "600" },
  moveBtn: { backgroundColor: "#1d4ed8", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  moveText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  errorText: { color: "#dc2626", fontSize: 14, paddingHorizontal: 20, textAlign: "center" },
});
