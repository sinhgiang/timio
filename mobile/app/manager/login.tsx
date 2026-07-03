import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { managerAuth } from "@/lib/api";
import { saveManager } from "@/lib/storage";

export default function ManagerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    const e = email.trim().toLowerCase();
    const p = password;
    if (!e || !p) { setError("Vui lòng nhập email và mật khẩu"); return; }
    setLoading(true);
    setError("");
    try {
      const session = await managerAuth(e, p);
      await saveManager({
        adminId: session.adminId,
        companyId: session.companyId,
        companyName: session.companyName,
        companySlug: session.companySlug,
        adminName: session.adminName,
        email: session.email,
        role: session.role,
        token: session.token,
      });
      router.replace("/manager/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Quay lại</Text>
        </TouchableOpacity>

        <View style={s.header}>
          <Text style={s.logo}>👔</Text>
          <Text style={s.title}>Quản lý / Kế toán</Text>
          <Text style={s.subtitle}>Đăng nhập bằng tài khoản admin</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="admin@cong-ty.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={(v) => { setEmail(v); setError(""); }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={s.label}>Mật khẩu</Text>
          <TextInput
            style={s.input}
            placeholder="Nhập mật khẩu"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(""); }}
            secureTextEntry
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

        <Text style={s.hint}>Dùng email và mật khẩu của tài khoản admin trên timio.vn</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flexGrow: 1, padding: 24, paddingTop: 60 },
  back: { marginBottom: 32 },
  backText: { color: "#1d4ed8", fontSize: 15, fontWeight: "600" },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
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
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  btnOff: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  hint: { color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 24 },
});
