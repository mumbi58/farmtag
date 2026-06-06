import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import api from "@/constants/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
      console.log("[FORGOT PASSWORD] Reset email sent to:", email);
    } catch (e) {
      console.log("[FORGOT PASSWORD] Error:", e.message);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.emoji}>🔐</Text>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your email and we'll send you a reset link.
          </Text>

          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successEmoji}>📧</Text>
              <Text style={styles.successTitle}>Check your email!</Text>
              <Text style={styles.successText}>
                We sent a password reset link to{"\n"}
                <Text style={styles.successEmail}>{email}</Text>
              </Text>
              <TouchableOpacity
                style={styles.backToLoginBtn}
                onPress={() => router.push("/login")}
              >
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={Colors.textLight}
              />

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => router.back()}
              >
                <Text style={styles.backLinkText}>
                  Remember your password?{" "}
                  <Text style={styles.backLinkBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 20 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.white, justifyContent: "center",
    alignItems: "center", shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    marginBottom: 32,
  },
  content: { flex: 1, alignItems: "center", paddingTop: 20 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "800", color: Colors.text, marginBottom: 8 },
  subtitle: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: "center", lineHeight: 20, marginBottom: 32,
  },
  form: { width: "100%" },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 14, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.white, marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    padding: 16, alignItems: "center",
  },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  backLink: { marginTop: 20, alignItems: "center" },
  backLinkText: { fontSize: 14, color: Colors.textSecondary },
  backLinkBold: { color: Colors.primary, fontWeight: "700" },
  successBox: {
    width: "100%", backgroundColor: Colors.white,
    borderRadius: 20, padding: 28, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  successEmoji: { fontSize: 48, marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: "800", color: Colors.text, marginBottom: 8 },
  successText: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 },
  successEmail: { fontWeight: "700", color: Colors.primary },
  backToLoginBtn: {
    marginTop: 24, backgroundColor: Colors.primary,
    borderRadius: 12, padding: 14, width: "100%", alignItems: "center",
  },
  backToLoginText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
});