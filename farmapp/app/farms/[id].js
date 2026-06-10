import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import api from "@/constants/api";

export default function FarmDetailsPage() {
  const { id } = useLocalSearchParams();
  const [farm, setFarm] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFarmData();
  }, [id]);

  const fetchFarmData = async () => {
    setLoading(true);
    try {
      const farmRes = await api.get(`/farms/${id}`);
      const data = farmRes.data;
      setFarm(data);
      setEditName(data.name || "");
      setEditLocation(data.location || "");

      // Fetch animals for this farm
      const animalsRes = await api.get(`/animals?farm_id=${id}`);
      setAnimals(animalsRes.data || []);
    } catch (e) {
      console.log("[FARM DETAIL] Error fetching:", e.message);
      Alert.alert("Error", "Failed to load farm details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Farm name is required");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/farms/${id}`, {
        name: editName.trim(),
        location: editLocation.trim(),
      });
      setFarm({ ...farm, name: editName.trim(), location: editLocation.trim() });
      setIsEditing(false);
      Alert.alert("Success", "Farm updated successfully!");
    } catch (e) {
      Alert.alert("Error", e.response?.data?.error || "Failed to update farm");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    Alert.alert(
      "Archive Farm",
      "Are you sure you want to delete this farm? Its animals will be preserved but the farm itself will be marked as inactive.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/farms/${id}`);
              Alert.alert("Archived", "Farm has been successfully archived.", [
                { text: "OK", onPress: () => router.replace("/farms") }
              ]);
            } catch (e) {
              Alert.alert("Error", "Failed to archive farm.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{isEditing ? "Edit Farm" : farm?.name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editBtnToggle} 
            onPress={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
          >
            <Ionicons name={isEditing ? "close" : "pencil"} size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View style={styles.card}>
            <Text style={styles.label}>Farm Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Farm Name"
            />
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={editLocation}
              onChangeText={setEditLocation}
              placeholder="Location"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{farm?.location || "Not specified"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Animals</Text>
                <Text style={styles.infoValue}>{animals.length}</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
              <Text style={styles.archiveBtnText}>Archive Farm</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.white, justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  editBtnToggle: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.white, justifyContent: "center", alignItems: "center",
  },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: "600", color: Colors.text },
  statusBadge: { backgroundColor: Colors.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: Colors.white, fontSize: 12, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 13, fontSize: 15, color: Colors.text, backgroundColor: Colors.background, marginBottom: 16 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  archiveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.white, borderColor: Colors.error, borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 10, gap: 8 },
  archiveBtnText: { color: Colors.error, fontSize: 16, fontWeight: "700" },
});
