"use client";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { mobileAuth } from "@/lib/api";
import { saveEmployee, getEmployee } from "@/lib/storage";

export default function LoginScreen() {
  const [slug, setSlug] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getEmployee().then((emp) => {
      if (emp) router.replace("/home");
      else setChecking(false);
    });
  }, []);

  async function handleLogin() {
    const s = slug.trim().toLowerCase();
    const p = pin.trim();
    if (!s || !p) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
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

  if (checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>⏱</Text>
          <Text style={styles.appName}>Timio</Text>
          <Text style={styles.subtitle}>Chấm công thông minh</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>

          <Text style={styles.label}>Mã công ty</Text>
          <TextInput
            style={styles.input}
            placeholder="vd: demo"
            placeholderTextColor="#9ca3af"
            value={slug}
            onChangeText={(v) => { setSlug(v); setError(""); }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>PIN của bạn</Text>
          <TextInput
            style={styles.input}
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

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Liên hệ quản lý để nhận mã công ty và PIN
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 36 },
  logo: { fontSize: 56, marginBottom: 8 },
  appName: { fontSize: 36, fontWeight: "800", color: "#1d4ed8", letterSpacing: -1 },
  subtitle: { fontSize: 15, color: "#6b7280", marginTop: 4 },
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
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 20 },
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
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  hint: { color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 24 },
});
