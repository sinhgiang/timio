import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { getEmployee, type StoredEmployee } from "@/lib/storage";
import { submitLeave, type LeaveType } from "@/lib/api";

const LEAVE_TYPES: { key: LeaveType; label: string }[] = [
  { key: "annual", label: "Phép năm" },
  { key: "sick", label: "Nghỉ ốm" },
  { key: "unpaid", label: "Không lương" },
  { key: "maternity", label: "Thai sản" },
  { key: "other", label: "Khác" },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(v: string): boolean {
  if (!DATE_RE.test(v)) return false;
  const d = new Date(v);
  return !isNaN(d.getTime());
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function LeaveRequestScreen() {
  const [employee, setEmployee] = useState<StoredEmployee | null>(null);
  const [ready, setReady] = useState(false);
  const [type, setType] = useState<LeaveType>("annual");
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      const emp = await getEmployee();
      if (!emp) { router.replace("/"); return; }
      setEmployee(emp);
      setReady(true);
    })();
  }, []);

  async function handleSubmit() {
    if (!employee || submitting) return;
    setError("");
    setSuccess("");

    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      setError("Ngày không hợp lệ. Định dạng YYYY-MM-DD");
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      setError("Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do nghỉ");
      return;
    }

    setSubmitting(true);
    try {
      await submitLeave(employee.id, employee.pin, {
        type,
        fromDate,
        toDate,
        reason: reason.trim(),
      });
      setSuccess("Đã gửi đơn nghỉ phép!");
      setTimeout(() => router.back(), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gửi đơn thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return <View style={s.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>;
  }

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={s.title}>Xin nghỉ phép</Text>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            {/* Type picker */}
            <Text style={s.label}>Loại nghỉ</Text>
            <View style={s.typeGrid}>
              {LEAVE_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[s.typeChip, type === t.key && s.typeChipActive]}
                  onPress={() => setType(t.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.typeChipText, type === t.key && s.typeChipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dates */}
            <View style={s.dateRow}>
              <View style={s.dateCol}>
                <Text style={s.label}>Từ ngày</Text>
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  value={fromDate}
                  onChangeText={(v) => { setFromDate(v); setError(""); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={s.dateCol}>
                <Text style={s.label}>Đến ngày</Text>
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#9ca3af"
                  value={toDate}
                  onChangeText={(v) => { setToDate(v); setError(""); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {/* Reason */}
            <Text style={s.label}>Lý do</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="Nhập lý do nghỉ..."
              placeholderTextColor="#9ca3af"
              value={reason}
              onChangeText={(v) => { setReason(v); setError(""); }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {error ? <Text style={s.error}>{error}</Text> : null}
            {success ? <Text style={s.success}>{success}</Text> : null}

            <TouchableOpacity
              style={[s.btn, submitting && s.btnOff]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Gửi đơn</Text>}
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>Đơn sẽ được gửi tới quản lý để duyệt</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },

  header: { backgroundColor: "#1d4ed8", paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  back: { marginBottom: 8 },
  backText: { color: "#bfdbfe", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },

  scroll: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  typeChipActive: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  typeChipText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  typeChipTextActive: { color: "#fff" },

  dateRow: { flexDirection: "row", gap: 12 },
  dateCol: { flex: 1 },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    marginBottom: 16,
  },
  textarea: { minHeight: 100, paddingTop: 14 },

  error: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 8,
  },
  success: {
    color: "#16a34a",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
    backgroundColor: "#f0fdf4",
    padding: 10,
    borderRadius: 8,
  },
  btn: {
    backgroundColor: "#1d4ed8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  btnOff: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  hint: { color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 24 },
});
