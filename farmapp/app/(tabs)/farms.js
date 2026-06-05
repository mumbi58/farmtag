import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import api from "@/constants/api";

function FarmCard({ farm, onPress }) {
  return (
    <TouchableOpacity style={styles.farmCard} onPress={onPress}>
      <View style={styles.farmImage}>
        <Text style={styles.farmEmoji}>🌾</Text>
      </View>
      <View style={styles.farmInfo}>
        <Text style={styles.farmName}>{farm.name}</Text>
        <View style={styles.farmLocation}>
          <Ionicons
            name="location-outline"
            size={13}
            color={Colors.textSecondary}
          />
          <Text style={styles.farmLocationText}>
            {farm.location || "No location set"}
          </Text>
        </View>
        <View style={styles.farmStats}>
          <View style={styles.farmStat}>
            <Ionicons name="heart-outline" size={14} color={Colors.success} />
            <Text style={styles.farmStatLabel}>Animals</Text>
            <Text style={styles.farmStatValue}>{farm.animal_count || 0}</Text>
          </View>
          <View style={styles.farmStat}>
            <Ionicons
              name="trending-up-outline"
              size={14}
              color={Colors.warning}
            />
            <Text style={styles.farmStatLabel}>Investment</Text>
            <Text style={styles.farmStatValue}>
              KES{" "}
              {farm.total_invested >= 1000
                ? `${(farm.total_invested / 1000).toFixed(0)}K`
                : farm.total_invested || 0}
            </Text>
          </View>
          <View style={styles.farmStat}>
            <Ionicons name="cash-outline" size={14} color={Colors.error} />
            <Text style={styles.farmStatLabel}>Expenses</Text>
            <Text style={styles.farmStatValue}>
              KES{" "}
              {farm.total_expenses >= 1000
                ? `${(farm.total_expenses / 1000).toFixed(0)}K`
                : farm.total_expenses || 0}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.viewAnimalsBtn}
          onPress={() => router.push(`/animals?farm_id=${farm.id}`)}
        >
          <Text style={styles.viewAnimalsBtnText}>View Animals</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function Farms() {
  const { user, logout } = useAuth();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [totalAnimals, setTotalAnimals] = useState(0);

  const fetchFarms = async () => {
    try {
      const [farmsRes, dashRes] = await Promise.all([
        api.get("/farms"),
        api.get("/dashboard"),
      ]);
      setFarms(farmsRes.data || []);
      setTotalAnimals(dashRes.data?.total_animals || 0);
      console.log("[FARMS] Loaded:", farmsRes.data?.length, "farms");
    } catch (e) {
      console.log("[FARMS] Fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFarms();
  }, []);

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top right user menu */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>My Farms</Text>
          <Text style={styles.subtitle}>Manage multiple farm locations</Text>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>
      </View>

      {/* User Menu Modal */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuName}>{user?.name}</Text>
              <Text style={styles.menuEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push("/profile");
              }}
            >
              <Ionicons name="person-outline" size={18} color={Colors.text} />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push("/settings");
              }}
            >
              <Ionicons name="settings-outline" size={18} color={Colors.text} />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                logout();
              }}
            >
              <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              <Text style={[styles.menuItemText, { color: Colors.error }]}>
                Log out
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Add Farm Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/farms/add")}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.addButtonText}>Add Farm</Text>
        </TouchableOpacity>

        {/* Farm Cards */}
        {farms.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌾</Text>
            <Text style={styles.emptyText}>No farms yet</Text>
            <Text style={styles.emptySubText}>
              Add your first farm to get started
            </Text>
          </View>
        ) : (
          farms.map((farm) => (
            <FarmCard
              key={farm.id}
              farm={farm}
              onPress={() => router.push(`/farms/${farm.id}`)}
            />
          ))
        )}

        {/* Overall Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Overall Summary</Text>
          <View
            style={[styles.summaryCard, { backgroundColor: Colors.green100 }]}
          >
            <Text style={styles.summaryLabel}>Total Farms</Text>
            <Text style={styles.summaryValue}>{farms.length}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#EEF2FF" }]}>
            <Text style={styles.summaryLabel}>Total Animals</Text>
            <Text style={styles.summaryValue}>{totalAnimals}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: Colors.white, fontWeight: "800", fontSize: 15 },
  content: { padding: 16, paddingBottom: 32 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  farmCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  farmImage: {
    height: 140,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  farmEmoji: { fontSize: 64 },
  farmInfo: { padding: 16 },
  farmName: { fontSize: 20, fontWeight: "800", color: Colors.text },
  farmLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    marginBottom: 12,
  },
  farmLocationText: { fontSize: 13, color: Colors.textSecondary },
  farmStats: { flexDirection: "row", gap: 16, marginBottom: 14 },
  farmStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  farmStatLabel: { fontSize: 12, color: Colors.textSecondary },
  farmStatValue: { fontSize: 13, fontWeight: "700", color: Colors.text },
  viewAnimalsBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  viewAnimalsBtnText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  summarySection: { marginTop: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  summaryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 28, fontWeight: "800", color: Colors.text },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: "700", color: Colors.text },
  emptySubText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 100,
    paddingRight: 16,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 8,
    width: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  menuEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  menuItemText: { fontSize: 14, fontWeight: "600", color: Colors.text },
  menuDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
});
