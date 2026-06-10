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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchAnimals = async (pageNum = 1, queryText = search) => {
    try {
      const limit = 5;
      const res = await api.get(`/animals?page=${pageNum}&limit=${limit}&q=${queryText}`);
      const data = res.data || [];
      setAnimals(data);
      setPage(pageNum);
      setHasMore(data.length === limit);
      console.log("[ANIMALS] Loaded page:", pageNum, "with", data.length, "animals");
    } catch (e) {
      console.log("[ANIMALS] Fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnimals(1, search);
    }, [])
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search !== "") {
        setLoading(true);
        fetchAnimals(1, search);
      } else {
        fetchAnimals(1, "");
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnimals(1, search);
  }, [search]);

  if (loading && page === 1) {
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
          <Text style={styles.subtitle}>Manage your livestock records</Text>
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
        <View style={[styles.searchRow, { marginBottom: 0 }]}>
          <Ionicons name="search-outline" size={18} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by tag, name, type, or breed"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textLight}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={animals}
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
          (page > 1 || hasMore) ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                onPress={() => fetchAnimals(page - 1)}
                disabled={page === 1}
              >
                <Text style={styles.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageIndicator}>Page {page}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, !hasMore && styles.pageBtnDisabled]}
                onPress={() => fetchAnimals(page + 1)}
                disabled={!hasMore}
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
    gap: 12,
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
  pageIndicator: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginHorizontal: 8,
  },
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
