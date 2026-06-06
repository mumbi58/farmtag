import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import api from "@/constants/api";
import DatePicker from "@/constants/DatePicker";

const RECORD_TYPES = ["Vaccination", "Treatment", "Vet Visit", "Deworming", "Other"];

export default function AddHealthRecord() {
  const { animal_id } = useLocalSearchParams();
  const [animals, setAnimals] = useState([]);
  const [selectedAnimalID, setSelectedAnimalID] = useState(animal_id || "");
  const [recordType, setRecordType] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [doneAt, setDoneAt] = useState(new Date().toISOString().split("T")[0]);
  const [nextDueAt, setNextDueAt] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!animal_id) fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    try {
      const res = await api.get("/animals");
      setAnimals(res.data || []);
    } catch (e) {
      console.log("[ADD HEALTH] Fetch animals error:", e.message);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnimalID || !recordType || !description || !doneAt) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.post("/health-records", {
        animal_id: selectedAnimalID,
        record_type: recordType.toLowerCase(),
        description: description.trim(),
        cost: cost ? parseFloat(cost) : 0,
        done_at: doneAt,
        next_due_at: nextDueAt,
      });
      console.log("[ADD HEALTH] Health record created successfully");
      Alert.alert("Success", "Health record saved!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e) {
      console.log("[ADD HEALTH] Error:", e.message);
      Alert.alert("Error", e.response?.data?.error || "Failed to save health record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Record</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Health Details</Text>

        {/* Animal select only if not passed */}
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
                    {a.tag_number}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Record Type <Text style={styles.required}>*</Text></Text>
        <View style={styles.optionsRow}>
          {RECORD_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.optionChip, recordType === type && styles.optionChipActive]}
              onPress={() => setRecordType(type)}
            >
              <Text style={[styles.optionChipText, recordType === type && styles.optionChipTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the treatment or procedure..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor={Colors.textLight}
        />

        <Text style={styles.label}>Cost (KES)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 1500"
          value={cost}
          onChangeText={setCost}
          keyboardType="numeric"
          placeholderTextColor={Colors.textLight}
        />

        <DatePicker
          label="Date Done"
          value={doneAt}
          onChange={setDoneAt}
          required
        />

        <DatePicker
          label="Next Due Date"
          value={nextDueAt}
          onChange={setNextDueAt}
          placeholder="Select next due date (optional)"
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
            <Ionicons name="medical-outline" size={20} color={Colors.white} />
            <Text style={styles.submitBtnText}>Save Health Record</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
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
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.primary, borderRadius: 14,
    padding: 16, gap: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
});