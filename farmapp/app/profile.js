import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { Colors } from "@/constants/colors";
import api from "@/constants/api";

export default function Profile() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    setLoading(true);
    try {
      await api.put("/profile", { name: name.trim(), phone: phone.trim() });
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
      console.log("[PROFILE] Profile updated");
    } catch (e) {
      console.log("[PROFILE] Update error:", e.message);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {user?.is_premium ? (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          ) : (
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>Free Plan</Text>
            </View>
          )}
        </View>

        {/* Edit Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Edit Profile</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 0712345678"
            keyboardType="phone-pad"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputDisabled}>
            <Text style={styles.inputDisabledText}>{user?.email}</Text>
          </View>
          <Text style={styles.hint}>Email cannot be changed</Text>

          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Account Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan</Text>
            <Text style={styles.infoValue}>{user?.is_premium ? "Premium" : "Free (10 animals)"}</Text>
          </View>
          {!user?.is_premium && (
            <TouchableOpacity style={styles.upgradeBtn}>
              <Ionicons name="star-outline" size={16} color={Colors.white} />
              <Text style={styles.upgradeBtnText}>Upgrade to Premium — KES 299/mo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.white, justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: Colors.white },
  userName: { fontSize: 20, fontWeight: "800", color: Colors.text },
  userEmail: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  premiumBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#FEF3C7", paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20, marginTop: 8,
  },
  premiumText: { fontSize: 12, fontWeight: "700", color: "#F59E0B" },
  freeBadge: {
    backgroundColor: Colors.border, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20, marginTop: 8,
  },
  freeText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: "700", color: Colors.text,
    marginBottom: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 13, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.background, marginBottom: 4,
  },
  inputDisabled: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 13, backgroundColor: Colors.border + "50", marginBottom: 4,
  },
  inputDisabledText: { fontSize: 15, color: Colors.textSecondary },
  hint: { fontSize: 11, color: Colors.textLight, marginBottom: 16 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    padding: 14, alignItems: "center", marginTop: 8,
  },
  saveBtnText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: "600", color: Colors.text },
  upgradeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#F59E0B", borderRadius: 12,
    padding: 14, marginTop: 12,
  },
  upgradeBtnText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: Colors.white, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: Colors.error + "50",
  },
  logoutText: { color: Colors.error, fontSize: 15, fontWeight: "700" },
});