import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
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
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFarms = async (pageNum = 1) => {
    try {
      const limit = 5;
      const [farmsRes, dashRes] = await Promise.all([
        api.get(`/farms?page=${pageNum}&limit=${limit}`),
        api.get("/dashboard"),
      ]);
      const data = farmsRes.data || [];
      setFarms(data);
      setPage(pageNum);
      setHasMore(data.length === limit);
      setTotalAnimals(dashRes.data?.total_animals || 0);
      console.log("[FARMS] Loaded page", pageNum, "with", data.length, "farms");
    } catch (e) {
      console.log("[FARMS] Fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFarms(1);
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFarms(1);
  }, []);

  if (loading && page === 1) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Farms</Text>
      </View>

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

        {/* Pagination Controls */}
        {(page > 1 || hasMore) && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
              onPress={() => fetchFarms(page - 1)}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={16} color={Colors.text} />
              <Text style={styles.pageBtnText}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.pageIndicator}>Page {page}</Text>
            <TouchableOpacity
              style={[styles.pageBtn, !hasMore && styles.pageBtnDisabled]}
              onPress={() => fetchFarms(page + 1)}
              disabled={!hasMore}
            >
              <Text style={styles.pageBtnText}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Overall Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Overall Summary</Text>
          <View style={[styles.summaryCard, { backgroundColor: "#EEF2FF" }]}>
            <Text style={styles.summaryLabel}>Total Animals Registered</Text>
            <Text style={styles.summaryValue}>{totalAnimals}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.white, justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
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
    height: 120,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  farmEmoji: { fontSize: 56 },
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
  summarySection: { marginTop: 16 },
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
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: "600", color: Colors.text },
  pageIndicator: { fontSize: 14, fontWeight: "700", color: Colors.textSecondary },
});
