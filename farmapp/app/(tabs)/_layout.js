import { useState } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable
} from "react-native";
import { useAuth } from "@/context/AuthContext";

function Header() {
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🌿</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>FarmTag</Text>
          <Text style={styles.headerSubtitle}>Farm Management System</Text>
        </View>
      </View>

      {/* Profile Avatar */}
      <TouchableOpacity style={styles.avatar} onPress={() => setMenuVisible(true)}>
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>

      {/* Dropdown Menu */}
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuName}>{user?.name}</Text>
              <Text style={styles.menuEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); router.push("/profile"); }}
            >
              <Ionicons name="person-outline" size={18} color={Colors.text} />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); router.push("/settings"); }}
            >
              <Ionicons name="settings-outline" size={18} color={Colors.text} />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); logout(); }}
            >
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              <Text style={[styles.menuItemText, { color: Colors.error }]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        header: () => <Header />,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="animals" options={{ title: "Animals", tabBarIcon: ({ color, size }) => <Ionicons name="paw-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="expenses" options={{ title: "Expenses", tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: "Reports", tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="farms" options={{ title: "Farms", tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center", alignItems: "center",
  },
  logoEmoji: { fontSize: 18 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.white },
  headerSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { color: Colors.white, fontWeight: "800", fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start", alignItems: "flex-end",
    paddingTop: 100, paddingRight: 16,
  },
  menuCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 8, width: 220,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  menuHeader: {
    padding: 12, borderBottomWidth: 1,
    borderBottomColor: Colors.border, marginBottom: 4,
  },
  menuName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  menuEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    gap: 10, padding: 12, borderRadius: 10,
  },
  menuItemText: { fontSize: 14, fontWeight: "600", color: Colors.text },
  menuDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
});