import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import api from "@/constants/api";

const ANIMAL_TYPES = ["Cow", "Goat", "Sheep", "Pig", "Camel", "Horse", "Chicken", "Other"];
const GENDERS = ["Male", "Female"];

function FormField({ label, required, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      {children}
    </View>
  );
}

function SelectOptions({ options, value, onChange }) {
  return (
    <View style={styles.optionsRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.optionChip, value === opt && styles.optionChipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.optionChipText, value === opt && styles.optionChipTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AddAnimal() {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [farmID, setFarmID] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [boughtFrom, setBoughtFrom] = useState("");
  const [boughtAt, setBoughtAt] = useState("");

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const res = await api.get("/farms");
      setFarms(res.data || []);
      if (res.data?.length > 0) setFarmID(res.data[0].id);
    } catch (e) {
      console.log("[ADD ANIMAL] Fetch farms error:", e.message);
    }
  };

  const handleSubmit = async () => {
    if (!tagNumber || !type || !gender || !farmID) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.post("/animals", {
        farm_id: farmID,
        tag_number: tagNumber.trim(),
        name: name.trim(),
        type: type.toLowerCase(),
        breed: breed.trim(),
        gender: gender.toLowerCase(),
        date_of_birth: dateOfBirth,
        buying_price: buyingPrice ? parseFloat(buyingPrice) : 0,
        bought_from: boughtFrom.trim(),
        bought_at: boughtAt,
      });
      console.log("[ADD ANIMAL] Animal created successfully");
      Alert.alert("Success", "Animal added successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e) {
      console.log("[ADD ANIMAL] Error:", e.message);
      Alert.alert("Error", e.response?.data?.error || "Failed to add animal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Animal</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Basic Information</Text>

        {/* Farm */}
        <FormField label="Farm" required>
          <View style={styles.optionsRow}>
            {farms.map((farm) => (
              <TouchableOpacity
                key={farm.id}
                style={[styles.optionChip, farmID === farm.id && styles.optionChipActive]}
                onPress={() => setFarmID(farm.id)}
              >
                <Text style={[styles.optionChipText, farmID === farm.id && styles.optionChipTextActive]}>
                  {farm.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FormField>

        {/* Tag Number */}
        <FormField label="Tag Number" required>
          <TextInput
            style={styles.input}
            placeholder="e.g. KE-001"
            value={tagNumber}
            onChangeText={setTagNumber}
            autoCapitalize="characters"
            placeholderTextColor={Colors.textLight}
          />
        </FormField>

        {/* Name */}
        <FormField label="Name (optional)">
          <TextInput
            style={styles.input}
            placeholder="e.g. Bella"
            value={name}
            onChangeText={setName}
            placeholderTextColor={Colors.textLight}
          />
        </FormField>

        {/* Type */}
        <FormField label="Animal Type" required>
          <SelectOptions options={ANIMAL_TYPES} value={type} onChange={setType} />
        </FormField>

        {/* Breed */}
        <FormField label="Breed">
          <TextInput
            style={styles.input}
            placeholder="e.g. Friesian, Boran"
            value={breed}
            onChangeText={setBreed}
            placeholderTextColor={Colors.textLight}
          />
        </FormField>

        {/* Gender */}
        <FormField label="Gender" required>
          <SelectOptions options={GENDERS} value={gender} onChange={setGender} />
        </FormField>

        {/* Date of Birth */}
        <FormField label="Date of Birth">
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholderTextColor={Colors.textLight}
          />
        </FormField>
      </View>

      {/* Purchase Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Purchase Information</Text>

        <FormField label="Buying Price (KES)">
          <TextInput
            style={styles.input}
            placeholder="e.g. 25000"
            value={buyingPrice}
            onChangeText={setBuyingPrice}
            keyboardType="numeric"
            placeholderTextColor={Colors.textLight}
          />
        </FormField>

        <FormField label="Bought From">
          <TextInput
            style={styles.input}
            placeholder="e.g. Kajiado Market"
            value={boughtFrom}
            onChangeText={setBoughtFrom}
            placeholderTextColor={Colors.textLight}
          />
        </FormField>

        <FormField label="Date Purchased">
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={boughtAt}
            onChangeText={setBoughtAt}
            placeholderTextColor={Colors.textLight}
          />
        </FormField>
      </View>

      {/* Submit */}
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
            <Text style={styles.submitBtnText}>Add Animal</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: "row", alignItems: "center",
    gap: 12, marginBottom: 20,
  },
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
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: Colors.text, marginBottom: 8 },
  required: { color: Colors.error },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    padding: 13, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.background,
  },
  optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
    padding: 16, gap: 8, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
});