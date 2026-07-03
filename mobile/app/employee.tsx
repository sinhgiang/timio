import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { mobileAuth } from "@/lib/api";
import { saveEmployee } from "@/lib/storage";

export default function EmployeeLogin() {
  const [slug, setSlug] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    const s = slug.trim().toLowerCase();
    const p = pin.trim();
    if (!s || !p) { setError("Vui lòng nhập đầy đủ thông tin"); return; }
    setLoading(true);
    setError("");
    try {
      const emp = await mobileAuth(s, p);
      await saveEmployee({ ...emp, slug: s, pin: p });
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Quay lại</Text>
        </TouchableOpacity>

        <View style={s.header}>
          <Text style={s.logo}>👤</Text>
          <Text style={s.title}>Đăng nhập Nhân viên</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Mã công ty</Text>
          <TextInput
            style={s.input}
            placeholder="vd: demo"
            placeholderTextColor="#9ca3af"
            value={slug}
            onChangeText={(v) => { setSlug(v); setError(""); }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={s.label}>PIN của bạn</Text>
          <TextInput
            style={s.input}
            placeholder="Nhập PIN"
            placeholderTextColor="#9ca3af"
            value={pin}
            onChangeText={(v) => { setPin(v); setError(""); }}
            keyboardType="numeric"
            secureTextEntry
            maxLength={8}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.btn, loading && s.btnOff]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Đăng nhập</Text>}
          </TouchableOpacity>
        </View>

        <Text style={s.hint}>Liên hệ quản lý để nhận mã công ty và PIN</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  container: { flexGrow: 1, padding: 24, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { color: "#1d4ed8", fontSize: 15, fontWeight: "600" },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
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
  error: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
    backgroundColor: "#fef2f2",
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
