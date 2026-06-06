import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "—"}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress, count }) {
  return (
    <TouchableOpacity
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
        {label} {count !== undefined && `(${count})`}
      </Text>
    </TouchableOpacity>
  );
}

export default function AnimalDetail() {
  const { id } = useLocalSearchParams();
  const [animal, setAnimal] = useState(null);
  const [pregnancies, setPregnancies] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [sellingPrice, setSellingPrice] = useState("");
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    fetchAnimalData();
  }, [id]);

  const fetchAnimalData = async () => {
    try {
      const animalRes = await api.get(`/animals/${id}`);
      setAnimal(animalRes.data);
      console.log("[ANIMAL DETAIL] Loaded animal:", animalRes.data?.tag_number);
    } catch (e) {
      console.log("[ANIMAL DETAIL] Error loading animal:", e.message);
      Alert.alert("Error", "Failed to load animal details");
      setLoading(false);
      return;
    }

    try {
      const pregRes = await api.get(`/pregnancies?animal_id=${id}`);
      setPregnancies(pregRes.data || []);
      console.log("[ANIMAL DETAIL] Pregnancies loaded:", pregRes.data?.length);
    } catch (e) {
      console.log("[ANIMAL DETAIL] Pregnancies fetch error:", e.message);
    }

    try {
      const healthRes = await api.get(`/health-records?animal_id=${id}`);
      setHealthRecords(healthRes.data || []);
    } catch (e) {
      console.log("[ANIMAL DETAIL] Health records fetch error:", e.message);
    }

    setLoading(false);
  };

  const calculateAge = (dob) => {
    if (!dob) return "Unknown";
    const birth = new Date(dob);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    if (years === 0) return `${months} months`;
    return `${years} year${years > 1 ? "s" : ""}`;
  };

  const handleRecordBirth = (pregnancyId) => {
    const animalId = Array.isArray(id) ? id[0] : id;
    console.log("[ANIMAL DETAIL] Record birth pressed — pregnancy_id:", pregnancyId, "mother_id:", animalId);
    router.push({ pathname: "/births/add", params: { pregnancy_id: pregnancyId, mother_id: animalId } });
  };

  const handleSellAnimal = async () => {
    if (!sellingPrice) {
      Alert.alert("Error", "Please enter a selling price.");
      return;
    }
    setSelling(true);
    try {
      await api.post(`/animals/${id}/sell`, { selling_price: parseFloat(sellingPrice) });
      setSellModalVisible(false);
      setSellingPrice("");
      fetchAnimalData();
      Alert.alert("Success", "Animal sold successfully!");
    } catch (e) {
      Alert.alert("Error", e.response?.data?.error || "Failed to sell animal.");
    } finally {
      setSelling(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!animal) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Animal not found</Text>
      </View>
    );
  }

  const emoji = ANIMAL_EMOJIS[animal.type?.toLowerCase()] || ANIMAL_EMOJIS.default;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTag}>
              {animal.tag_number} - {animal.name || "No name"}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: animal.is_sold ? Colors.error : Colors.success }]}>
              <Text style={styles.statusText}>{animal.is_sold ? "Sold" : "Active"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.headerSub}>
          {animal.breed || animal.type} • {animal.gender} • {animal.farm_name || ""}
        </Text>

        {/* Animal Image */}
        <View style={styles.animalImageBox}>
          <Text style={styles.animalEmoji}>{emoji}</Text>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          <TabButton label="Overview" active={activeTab === "overview"} onPress={() => setActiveTab("overview")} />
          <TabButton label="Pregnancy" active={activeTab === "pregnancy"} onPress={() => setActiveTab("pregnancy")} count={pregnancies.length} />
          <TabButton label="Health" active={activeTab === "health"} onPress={() => setActiveTab("health")} count={healthRecords.length} />
        </ScrollView>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Animal Details</Text>
              <View style={styles.infoGrid}>
                <InfoRow label="Date of Birth" value={animal.date_of_birth?.split("T")[0]} />
                <InfoRow label="Age" value={calculateAge(animal.date_of_birth)} />
                <InfoRow label="Type" value={animal.type} />
                <InfoRow label="Breed" value={animal.breed} />
                <InfoRow label="Gender" value={animal.gender} />
                <InfoRow label="Tag Number" value={animal.tag_number} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Financial Summary</Text>
              <View style={styles.financialRow}>
                <View style={[styles.financialCard, { borderColor: Colors.warning }]}>
                  <Text style={styles.financialCardLabel}>Buying Price</Text>
                  <Text style={[styles.financialCardValue, { color: Colors.warning }]}>
                    {animal.buying_price ? `KES ${Number(animal.buying_price).toLocaleString()}` : "Not recorded"}
                  </Text>
                  {animal.bought_at && (
                    <Text style={styles.financialCardDate}>{animal.bought_at?.split("T")[0]}</Text>
                  )}
                </View>
                <View style={[styles.financialCard, { borderColor: Colors.success }]}>
                  <Text style={styles.financialCardLabel}>Selling Price</Text>
                  <Text style={[styles.financialCardValue, { color: Colors.success }]}>
                    {animal.selling_price ? `KES ${Number(animal.selling_price).toLocaleString()}` : "Not Sold"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.actionsRow}>
              {!animal.is_sold && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setSellModalVisible(true)}
                >
                  <Ionicons name="cash-outline" size={20} color={Colors.success} />
                  <Text style={[styles.actionBtnText, { color: Colors.success }]}>Sell Animal</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push({ pathname: "/pregnancies/add", params: { animal_id: Array.isArray(id) ? id[0] : id } })}
              >
                <Ionicons name="heart-outline" size={20} color={Colors.primary} />
                <Text style={styles.actionBtnText}>Add Pregnancy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push({ pathname: "/health/add", params: { animal_id: Array.isArray(id) ? id[0] : id } })}
              >
                <Ionicons name="medical-outline" size={20} color={Colors.primary} />
                <Text style={styles.actionBtnText}>Health Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pregnancy Tab */}
        {activeTab === "pregnancy" && (
          <View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push({ pathname: "/pregnancies/add", params: { animal_id: Array.isArray(id) ? id[0] : id } })}
            >
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.addBtnText}>Record Pregnancy</Text>
            </TouchableOpacity>

            {pregnancies.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🤰</Text>
                <Text style={styles.emptyText}>No pregnancy records</Text>
              </View>
            ) : (
              pregnancies.map((p) => {
                console.log("[PREGNANCY RECORD] id:", p.id, "status:", p.status);
                return (
                  <View key={p.id} style={styles.recordCard}>
                    <View style={styles.recordRow}>
                      <Text style={styles.recordLabel}>Conceived</Text>
                      <Text style={styles.recordValue}>{p.conceived_at?.split("T")[0]}</Text>
                    </View>
                    <View style={styles.recordRow}>
                      <Text style={styles.recordLabel}>Expected Birth</Text>
                      <Text style={styles.recordValue}>{p.expected_birth_at?.split("T")[0]}</Text>
                    </View>
                    {p.actual_birth_at && (
                      <View style={styles.recordRow}>
                        <Text style={styles.recordLabel}>Actual Birth</Text>
                        <Text style={styles.recordValue}>{p.actual_birth_at?.split("T")[0]}</Text>
                      </View>
                    )}
                    <View style={[
                      styles.statusPill,
                      { backgroundColor: p.status === "delivered" ? Colors.success + "20" : Colors.warning + "20" }
                    ]}>
                      <Text style={[
                        styles.statusPillText,
                        { color: p.status === "delivered" ? Colors.success : Colors.warning }
                      ]}>
                        {p.status}
                      </Text>
                    </View>

                    {/* Show Record Birth button for any non-delivered pregnancy */}
                    {p.status !== "delivered" && (
                      <TouchableOpacity
                        style={styles.recordActionBtn}
                        onPress={() => handleRecordBirth(p.id)}
                      >
                        <Text style={styles.recordActionBtnText}>Record Birth</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Health Tab */}
        {activeTab === "health" && (
          <View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push({ pathname: "/health/add", params: { animal_id: Array.isArray(id) ? id[0] : id } })}
            >
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.addBtnText}>Add Health Record</Text>
            </TouchableOpacity>

            {healthRecords.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🏥</Text>
                <Text style={styles.emptyText}>No health records</Text>
              </View>
            ) : (
              healthRecords.map((h) => (
                <View key={h.id} style={styles.recordCard}>
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Type</Text>
                    <Text style={styles.recordValue}>{h.record_type}</Text>
                  </View>
                  <View style={styles.recordRow}>
                    <Text style={styles.recordLabel}>Date</Text>
                    <Text style={styles.recordValue}>{h.done_at?.split("T")[0]}</Text>
                  </View>
                  <Text style={styles.recordDesc}>{h.description}</Text>
                  {h.cost && (
                    <View style={styles.recordRow}>
                      <Text style={styles.recordLabel}>Cost</Text>
                      <Text style={styles.recordValue}>KES {Number(h.cost).toLocaleString()}</Text>
                    </View>
                  )}
                  {h.next_due_at && (
                    <View style={[styles.statusPill, { backgroundColor: Colors.info + "20" }]}>
                      <Text style={[styles.statusPillText, { color: Colors.info }]}>
                        Next due: {h.next_due_at?.split("T")[0]}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

      </ScrollView>

      {/* Sell Modal */}
      <Modal visible={sellModalVisible} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.sellModal}>
            <Text style={styles.cardTitle}>Sell Animal</Text>
            <Text style={styles.infoLabel}>Selling Price (KES)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50000"
              keyboardType="numeric"
              value={sellingPrice}
              onChangeText={setSellingPrice}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSellModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmSellBtn} onPress={handleSellAnimal} disabled={selling}>
                {selling ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.confirmSellBtnText}>Confirm Sale</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: Colors.textSecondary },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.white, justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTag: { fontSize: 18, fontWeight: "800", color: Colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { color: Colors.white, fontSize: 11, fontWeight: "700" },
  headerSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, marginLeft: 50 },
  animalImageBox: {
    backgroundColor: Colors.green100, borderRadius: 16,
    height: 180, justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  animalEmoji: { fontSize: 80 },
  tabs: { marginBottom: 16 },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, marginRight: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabBtnText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.white },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 14 },
  infoGrid: { gap: 0 },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: "600", color: Colors.text },
  financialRow: { flexDirection: "row", gap: 12 },
  financialCard: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    padding: 14, backgroundColor: Colors.background,
  },
  financialCardLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  financialCardValue: { fontSize: 16, fontWeight: "800" },
  financialCardDate: { fontSize: 11, color: Colors.textLight, marginTop: 4 },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6, backgroundColor: Colors.white,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.primary,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.primary, borderRadius: 12,
    padding: 12, gap: 6, marginBottom: 14,
  },
  addBtnText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  recordCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  recordRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  recordLabel: { fontSize: 13, color: Colors.textSecondary },
  recordValue: { fontSize: 13, fontWeight: "600", color: Colors.text },
  recordDesc: { fontSize: 13, color: Colors.text, marginVertical: 8 },
  statusPill: {
    alignSelf: "flex-start", paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20, marginTop: 8,
  },
  statusPillText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  recordActionBtn: {
    marginTop: 10, backgroundColor: Colors.primary,
    borderRadius: 10, padding: 10, alignItems: "center",
  },
  recordActionBtnText: { color: Colors.white, fontSize: 13, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
  modalBackground: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  sellModal: { backgroundColor: Colors.white, width: "85%", borderRadius: 16, padding: 20 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 16 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  cancelBtn: { padding: 10, borderRadius: 10 },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: "600" },
  confirmSellBtn: { backgroundColor: Colors.success, padding: 10, borderRadius: 10, minWidth: 100, alignItems: "center" },
  confirmSellBtnText: { color: Colors.white, fontWeight: "700" },
});