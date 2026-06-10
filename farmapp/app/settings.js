import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, Linking,
  Modal, TextInput, ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import api, { BASE_URL } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";

const HOST_URL = BASE_URL.replace("/api/v1", "");

export default function Settings() {
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [birthReminders, setBirthReminders] = useState(true);
  const [healthReminders, setHealthReminders] = useState(true);

  // Custom Delete Account States
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toUpperCase() !== "DELETE") {
      Alert.alert("Error", "Please type DELETE to confirm");
      return;
    }
    setDeleting(true);
    try {
      await fetch(`${BASE_URL}/profile`, { 
        method: 'DELETE', 
        headers: { 
          Authorization: `Bearer ${await require('@react-native-async-storage/async-storage').default.getItem('token')}` 
        } 
      });
      setDeleteModalVisible(false);
      Alert.alert("Deleted", "Your account has been deleted.", [
        { text: "OK", onPress: () => logout() }
      ]);
    } catch (e) {
      Alert.alert("Error", "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

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
          <LinkRow
            icon="paper-plane-outline"
            label="Send Test Notification"
            subtitle="Trigger a test push notification"
            onPress={async () => {
              try {
                await api.post("/profile/test-push");
                Alert.alert("Sent", "Test push notification sent successfully!");
              } catch (e) {
                Alert.alert("Error", e.response?.data?.error || "Failed to trigger test notification. Make sure you are on a real device.");
              }
            }}
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
            subtitle="info@kerdonet.com"
            onPress={() => Linking.openURL("mailto:info@kerdonet.com")}
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: Colors.error }]}>Danger Zone</Text>
          <LinkRow
            icon="trash-bin-outline"
            label="Delete Account"
            subtitle="Permanently delete your account"
            onPress={() => setDeleteModalVisible(true)}
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

      {/* Custom Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={24} color={Colors.error} />
                <Text style={styles.warningText}>
                  This action is permanent. All your farms, animals, expenses, and records will be soft-deleted immediately and permanently purged after 30 days.
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Why are you leaving? (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Let us know how we can improve..."
                value={deleteReason}
                onChangeText={setDeleteReason}
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.textLight}
              />

              <Text style={styles.fieldLabel}>
                To confirm, type <Text style={{ fontWeight: "800", color: Colors.error }}>DELETE</Text> below:
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Type DELETE"
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                autoCapitalize="characters"
                placeholderTextColor={Colors.textLight}
              />

              <TouchableOpacity
                style={[
                  styles.deleteBtnConfirm,
                  deleteConfirmText.toUpperCase() !== "DELETE" && styles.deleteBtnConfirmDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText.toUpperCase() !== "DELETE" || deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.deleteBtnConfirmText}>Delete Permanently</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtnConfirm}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelBtnConfirmText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.error,
  },
  modalBody: {
    paddingVertical: 20,
    paddingBottom: 40,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: Colors.error + "10",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.error,
    fontWeight: "600",
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
    marginBottom: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  deleteBtnConfirm: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  deleteBtnConfirmDisabled: {
    opacity: 0.5,
  },
  deleteBtnConfirmText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtnConfirm: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnConfirmText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: "700",
  },
});