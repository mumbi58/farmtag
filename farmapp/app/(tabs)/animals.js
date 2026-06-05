import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import api from "@/constants/api";

const ANIMAL_EMOJIS = {
  cow: "🐄",
  goat: "🐐",
  sheep: "🐑",
  pig: "🐷",
  camel: "🐪",
  horse: "🐴",
  chicken: "🐔",
  default: "🐾",
};

function AnimalCard({ animal, onPress }) {
  const emoji =
    ANIMAL_EMOJIS[animal.type?.toLowerCase()] || ANIMAL_EMOJIS.default;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardImage}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
        {!animal.is_sold && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        )}
        {animal.is_sold && (
          <View style={[styles.activeBadge, { backgroundColor: Colors.error }]}>
            <Text style={styles.activeBadgeText}>Sold</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.tagNumber}>{animal.tag_number}</Text>
          <Ionicons name="eye-outline" size={18} color={Colors.primary} />
        </View>
        <Text style={styles.animalName}>
          {animal.name || animal.tag_number}
        </Text>
        <Text style={styles.animalMeta}>
          {animal.type} • {animal.breed || "Unknown breed"}
        </Text>
        <Text style={styles.animalMeta}>
          {animal.gender} • {animal.farm_name || ""}
        </Text>
        {animal.buying_price > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Buy Price:</Text>
            <Text style={styles.priceValue}>
              KES {Number(animal.buying_price).toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function Animals() {
  const [animals, setAnimals] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchAnimals = async () => {
    try {
      const res = await api.get("/animals");
      // Also fetch buying prices
      const data = res.data || [];
      setAnimals(data);
      setFiltered(data);
      console.log("[ANIMALS] Loaded:", data.length, "animals");
    } catch (e) {
      console.log("[ANIMALS] Fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnimals();
  }, []);

  useEffect(() => {
    let result = [...animals];
    if (search) {
      result = result.filter(
        (a) =>
          a.tag_number?.toLowerCase().includes(search.toLowerCase()) ||
          a.name?.toLowerCase().includes(search.toLowerCase()) ||
          a.type?.toLowerCase().includes(search.toLowerCase()) ||
          a.breed?.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (typeFilter !== "All Types") {
      result = result.filter(
        (a) => a.type?.toLowerCase() === typeFilter.toLowerCase(),
      );
    }
    if (statusFilter === "Active") result = result.filter((a) => !a.is_sold);
    if (statusFilter === "Sold") result = result.filter((a) => a.is_sold);
    setFiltered(result);
    setPage(1);
  }, [search, typeFilter, statusFilter, animals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnimals();
  }, []);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Animal Registry</Text>
          <Text style={styles.subtitle}>{filtered.length} animals found</Text>
        </View>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/animals/add")}
      >
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.addButtonText}>Add Animal</Text>
      </TouchableOpacity>

      {/* Filters */}
      <View style={styles.filtersBox}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by tag, name, type, or breed"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textLight}
          />
        </View>

        <View style={styles.filterRow}>
          <Ionicons
            name="filter-outline"
            size={16}
            color={Colors.textSecondary}
          />
          {["All Types", "Cow", "Goat", "Sheep", "Pig", "Camel"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                typeFilter === type && styles.filterChipActive,
              ]}
              onPress={() => setTypeFilter(type)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  typeFilter === type && styles.filterChipTextActive,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterRow}>
          {["All Status", "Active", "Sold"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={paginated}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AnimalCard
            animal={item}
            onPress={() => router.push(`/animals/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🐾</Text>
            <Text style={styles.emptyText}>No animals found</Text>
            <Text style={styles.emptySubText}>
              Add your first animal to get started
            </Text>
          </View>
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <Text style={styles.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              {Array.from(
                { length: Math.min(totalPages, 5) },
                (_, i) => i + 1,
              ).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.pageNumber,
                    page === p && styles.pageNumberActive,
                  ]}
                  onPress={() => setPage(p)}
                >
                  <Text
                    style={[
                      styles.pageNumberText,
                      page === p && styles.pageNumberTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  page === totalPages && styles.pageBtnDisabled,
                ]}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  titleRow: { paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    margin: 16,
    padding: 14,
    gap: 8,
  },
  addButtonText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  filtersBox: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: { fontSize: 12, color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.white, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    backgroundColor: Colors.green100,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  cardEmoji: { fontSize: 56 },
  activeBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activeBadgeText: { color: Colors.white, fontSize: 11, fontWeight: "700" },
  cardBody: { padding: 14 },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tagNumber: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  animalName: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  animalMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  priceLabel: { fontSize: 13, color: Colors.textSecondary },
  priceValue: { fontSize: 13, fontWeight: "700", color: Colors.text },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: "700", color: Colors.text },
  emptySubText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: "600", color: Colors.text },
  pageNumber: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pageNumberActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pageNumberText: { fontSize: 13, fontWeight: "600", color: Colors.text },
  pageNumberTextActive: { color: Colors.white },
});
