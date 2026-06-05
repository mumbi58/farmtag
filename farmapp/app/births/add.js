import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import api from "@/constants/api";

export default function AddBirth() {
  const { pregnancy_id, mother_id } = useLocalSearchParams();
  const [birthDate, setBirthDate] = useState(new Date().toISOString().split("T")[0]);
  const [totalOffspring, setTotalOffspring] = useState("1");
  const [notes, setNotes] = useState("");
  const [offspring, setOffspring] = useState([{ tag_number: "", name: "", gender: "female" }]);
  const [loading, setLoading] = useState(false);

  const addOffspringField = () => {
    setOffspring([...offspring, { tag_number: "", name: "", gender: "female" }]);
  };

  const updateOffspring = (index, field, value) => {
    const updated = [...offspring];
    updated[index][field] = value;
    setOffspring(updated);
  };

  const removeOffspring = (index) => {
    setOffspring(offspring.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!pregnancy_id || !mother_id || !birthDate) {
      Alert.alert("Error", "Missing required information");
      return;
    }
    const validOffspring = offspring.filter((o) => o.tag_number && o.gender);
    setLoading(true);
    try {
      await api.post("/births", {
        pregnancy_id,
        mother_id,
        birth_date: birthDate,
        total_offspring: parseInt(totalOffspring) || 1,
        notes: notes.trim(),
        offspring: validOffspring,
      });
      console.log("[ADD BIRTH] Birth recorded successfully");
      Alert.alert("Success", `Birth recorded! ${validOffspring.length} offspring added.`, [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e) {
      console.log("[ADD BIRTH] Error:", e.message);
      Alert.alert("Error", e.response?.data?.error || "Failed to record birth");
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
        <Text style={styles.headerTitle}>Record Birth</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Birth Details</Text>

        <Text style={styles.label}>Birth Date <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholderTextColor={Colors.textLight}
        />

        <Text style={styles.label}>Total Offspring</Text>
        <TextInput
          style={styles.input}
          placeholder="1"
          value={totalOffspring}
          onChangeText={setTotalOffspring}
          keyboardType="numeric"
          placeholderTextColor={Colors.textLight}
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any notes about the birth..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Offspring Details */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.sectionTitle}>Offspring Details</Text>
          <TouchableOpacity style={styles.addOffspringBtn} onPress={addOffspringField}>
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.addOffspringText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoText}>
            Each offspring will be automatically added to the animal registry
          </Text>
        </View>

        {offspring.map((o, index) => (
          <View key={index} style={styles.offspringCard}>
            <View style={styles.offspringHeader}>
              <Text style={styles.offspringTitle}>Offspring {index + 1}</Text>
              {offspring.length > 1 && (
                <TouchableOpacity onPress={() => removeOffspring(index)}>
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>Tag Number <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. KE-050"
              value={o.tag_number}
              onChangeText={(v) => updateOffspring(index, "tag_number", v)}
              autoCapitalize="characters"
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.label}>Name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Calf-1"
              value={o.name}
              onChangeText={(v) => updateOffspring(index, "name", v)}
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.label}>Gender <Text style={styles.required}>*</Text></Text>
            <View style={styles.optionsRow}>
              {["male", "female"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.optionChip, o.gender === g && styles.optionChipActive]}
                  onPress={() => updateOffspring(index, "gender", g)}
                >
                  <Text style={[styles.optionChipText, o.gender === g && styles.optionChipTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
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
            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
            <Text style={styles.submitBtnText}>Record Birth</Text>
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
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: {
    fontSize: 16, fontWeight: "700", color: Colors.text,
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  addOffspringBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.green100, paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 20,
  },
  addOffspringText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8, marginTop: 4 },
  required: { color: Colors.error },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 13, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.background, marginBottom: 16,
  },
  textArea: { height: 90, textAlignVertical: "top" },
  infoBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.green100, borderRadius: 10,
    padding: 10, marginBottom: 16,
  },
  infoText: { fontSize: 12, color: Colors.primary, flex: 1 },
  offspringCard: {
    backgroundColor: Colors.background, borderRadius: 12,
    padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  offspringHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 10,
  },
  offspringTitle: { fontSize: 14, fontWeight: "700", color: Colors.text },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.white,
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