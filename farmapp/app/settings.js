import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { BASE_URL } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";

const HOST_URL = BASE_URL.replace("/api/v1", "");

export default function Settings() {
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [birthReminders, setBirthReminders] = useState(true);
  const [healthReminders, setHealthReminders] = useState(true);

  const SettingRow = ({ icon, label, subtitle, value, onToggle, color }) => (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: (color || Colors.primary) + "20" }]}>
        <Ionicons name={icon} size={18} color={color || Colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.primary + "80" }}
        thumbColor={value ? Colors.primary : Colors.textLight}
      />
    </View>
  );

  const LinkRow = ({ icon, label, subtitle, onPress, color, arrow }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <View style={[styles.settingIcon, { backgroundColor: (color || Colors.primary) + "20" }]}>
        <Ionicons name={icon} size={18} color={color || Colors.primary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, color && { color }]}>{label}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {arrow !== false && <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <SettingRow
            icon="notifications-outline"
            label="Push Notifications"
            subtitle="Enable all app notifications"
            value={notifications}
            onToggle={setNotifications}
          />
          <SettingRow
            icon="heart-outline"
            label="Birth Reminders"
            subtitle="Get notified when a birth is due"
            value={birthReminders}
            onToggle={setBirthReminders}
            color="#EC4899"
          />
          <SettingRow
            icon="medical-outline"
            label="Health Reminders"
            subtitle="Get notified when vaccination is due"
            value={healthReminders}
            onToggle={setHealthReminders}
            color="#14B8A6"
          />
        </View>

        {/* App */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <LinkRow
            icon="document-text-outline"
            label="Privacy Policy"
            subtitle="How we handle your data"
            onPress={() => Linking.openURL(`${HOST_URL}/privacy`)}
          />
          <LinkRow
            icon="shield-checkmark-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL(`${HOST_URL}/terms`)}
          />
        </View>

        {/* Support */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Support</Text>
          <LinkRow
            icon="mail-outline"
            label="Contact Support"
            subtitle="support@farmtag.app"
            onPress={() => Alert.alert("Support", "Email us at support@farmtag.app")}
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: Colors.error }]}>Danger Zone</Text>
          <LinkRow
            icon="trash-bin-outline"
            label="Delete Account"
            subtitle="Permanently delete your account"
            onPress={() => Alert.alert(
              "Delete Account",
              "Are you sure? Provide your reason or confirm.",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Delete", 
                  style: "destructive", 
                  onPress: async () => {
                    try {
                      await fetch(`${BASE_URL}/profile`, { method: 'DELETE', headers: { Authorization: `Bearer ${await require('@react-native-async-storage/async-storage').default.getItem('token')}` } });
                      Alert.alert("Deleted", "Your account has been deleted.", [
                        { text: "OK", onPress: () => logout() }
                      ]);
                    } catch (e) {
                      Alert.alert("Error", "Failed to delete account");
                    }
                  } 
                }
              ]
            )}
            color={Colors.error}
            arrow={false}
          />
          <LinkRow
             icon="link-outline"
             label="Account Deletion Policy"
             subtitle="Read our deletion procedures"
             onPress={() => Linking.openURL(`${HOST_URL}/account-deletion`)}
             color={Colors.error}
          />
        </View>

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
  card: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: "700", color: Colors.text,
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  settingRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  settingIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "600", color: Colors.text },
  settingSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});