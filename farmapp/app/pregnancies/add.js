import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import api from "@/constants/api";

export default function AddPregnancy() {
  const { animal_id } = useLocalSearchParams();
  const [animals, setAnimals] = useState([]);
  const [selectedAnimalID, setSelectedAnimalID] = useState(animal_id || "");
  const [concevedAt, setConcevedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!animal_id) fetchFemaleAnimals();
  }, []);

  const fetchFemaleAnimals = async () => {
    try {
      const res = await api.get("/animals");
      const females = (res.data || []).filter((a) => a.gender === "female" && !a.is_sold);
      setAnimals(females);
    } catch (e) {
      console.log("[ADD PREGNANCY] Fetch animals error:", e.message);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnimalID || !concevedAt) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.post("/pregnancies", {
        animal_id: selectedAnimalID,
        conceived_at: concevedAt,
        notes: notes.trim(),
      });
      console.log("[ADD PREGNANCY] Pregnancy recorded successfully");
      Alert.alert("Success", "Pregnancy recorded!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e) {
      console.log("[ADD PREGNANCY] Error:", e.message);
      Alert.alert("Error", e.response?.data?.error || "Failed to record pregnancy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Record Pregnancy</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Pregnancy Details</Text>

        {/* Animal select — only show if not passed via params */}
        {!animal_id && (
          <>
            <Text style={styles.label}>Select Animal <Text style={styles.required}>*</Text></Text>
            <View style={styles.optionsRow}>
              {animals.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.optionChip, selectedAnimalID === a.id && styles.optionChipActive]}
                  onPress={() => setSelectedAnimalID(a.id)}
                >
                  <Text style={[styles.optionChipText, selectedAnimalID === a.id && styles.optionChipTextActive]}>
                    {a.tag_number} {a.name ? `- ${a.name}` : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Date Conceived <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={concevedAt}
          onChangeText={setConcevedAt}
          placeholderTextColor={Colors.textLight}
        />

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Expected birth date is auto-calculated based on animal type
          </Text>
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any additional notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name="heart-outline" size={20} color={Colors.white} />
            <Text style={styles.submitBtnText}>Record Pregnancy</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.white, justifyContent: "center",
    alignItems: "center", shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
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
    marginBottom: 16, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8, marginTop: 4 },
  required: { color: Colors.error },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 13, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.background, marginBottom: 16,
  },
  textArea: { height: 90, textAlignVertical: "top" },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
  },
  optionChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  optionChipTextActive: { color: Colors.white },
  infoBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.green100, borderRadius: 10,
    padding: 10, marginBottom: 16,
  },
  infoText: { fontSize: 12, color: Colors.primary, flex: 1 },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.primary, borderRadius: 14,
    padding: 16, gap: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
});