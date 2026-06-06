import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import api from "@/constants/api";

const FEATURES = [
  { icon: "leaf-outline", text: "Unlimited farms" },
  { icon: "paw-outline", text: "Unlimited animals" },
  { icon: "heart-outline", text: "Pregnancy & birth tracking" },
  { icon: "medical-outline", text: "Health records & reminders" },
  { icon: "bar-chart-outline", text: "Full financial reports" },
  { icon: "notifications-outline", text: "Birth & health reminders" },
  { icon: "cloud-download-outline", text: "Export reports" },
];

export default function Premium() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("monthly");

  const plans = [
    {
      id: "monthly",
      label: "Monthly",
      price: "KES 299",
      period: "per month",
      savings: null,
    },
    {
      id: "yearly",
      label: "Yearly",
      price: "KES 1,999",
      period: "per year",
      savings: "Save KES 1,589",
    },
  ];

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // This is where you'd integrate payment (e.g. M-Pesa, Stripe)
      // For now we'll just show a coming soon message
      Alert.alert(
        "Coming Soon! 🎉",
        "Payment integration is being set up. We'll notify you when it's ready!\n\nFor now contact us to activate premium manually.",
        [{ text: "OK" }]
      );
      console.log("[PREMIUM] Upgrade attempted — plan:", selectedPlan);
    } catch (e) {
      console.log("[PREMIUM] Upgrade error:", e.message);
      Alert.alert("Error", "Failed to process upgrade");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>⭐</Text>
          <Text style={styles.heroTitle}>Unlock Full FarmTag</Text>
          <Text style={styles.heroSubtitle}>
            Manage unlimited farms and animals with complete tracking and reporting
          </Text>
        </View>

        {/* Features */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What you get</Text>
          {FEATURES.map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choose a plan</Text>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, selectedPlan === plan.id && styles.planCardActive]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={styles.planLeft}>
                <View style={[styles.planRadio, selectedPlan === plan.id && styles.planRadioActive]}>
                  {selectedPlan === plan.id && <View style={styles.planRadioDot} />}
                </View>
                <View>
                  <Text style={[styles.planLabel, selectedPlan === plan.id && styles.planLabelActive]}>
                    {plan.label}
                  </Text>
                  {plan.savings && (
                    <Text style={styles.planSavings}>{plan.savings}</Text>
                  )}
                </View>
              </View>
              <View style={styles.planRight}>
                <Text style={[styles.planPrice, selectedPlan === plan.id && styles.planPriceActive]}>
                  {plan.price}
                </Text>
                <Text style={styles.planPeriod}>{plan.period}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Free vs Premium */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Free vs Premium</Text>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonFeature} />
            <Text style={styles.comparisonFree}>Free</Text>
            <Text style={styles.comparisonPremium}>Premium</Text>
          </View>
          {[
            { feature: "Farms", free: "1", premium: "Unlimited" },
            { feature: "Animals", free: "10", premium: "Unlimited" },
            { feature: "Reports", free: "Basic", premium: "Full" },
            { feature: "Reminders", free: "❌", premium: "✅" },
            { feature: "Export", free: "❌", premium: "✅" },
          ].map((row, i) => (
            <View key={i} style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>{row.feature}</Text>
              <Text style={styles.comparisonFreeVal}>{row.free}</Text>
              <Text style={styles.comparisonPremiumVal}>{row.premium}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.upgradeBtn, loading && { opacity: 0.7 }]}
          onPress={handleUpgrade}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="star" size={20} color={Colors.white} />
              <Text style={styles.upgradeBtnText}>
                Upgrade Now — {plans.find(p => p.id === selectedPlan)?.price}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Cancel anytime. No hidden fees. Secure payment.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.white, justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  hero: {
    alignItems: "center", backgroundColor: Colors.primary,
    borderRadius: 20, padding: 28, marginBottom: 16,
  },
  heroEmoji: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: "800", color: Colors.white, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: "700", color: Colors.text,
    marginBottom: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  featureRow: {
    flexDirection: "row", alignItems: "center",
    gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  featureIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.green100,
    justifyContent: "center", alignItems: "center",
  },
  featureText: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: "500" },
  planCard: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 14, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    marginBottom: 10, backgroundColor: Colors.background,
  },
  planCardActive: { borderColor: Colors.primary, backgroundColor: Colors.green100 },
  planLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  planRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    justifyContent: "center", alignItems: "center",
  },
  planRadioActive: { borderColor: Colors.primary },
  planRadioDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  planLabel: { fontSize: 15, fontWeight: "700", color: Colors.text },
  planLabelActive: { color: Colors.primary },
  planSavings: { fontSize: 12, color: Colors.success, fontWeight: "600", marginTop: 2 },
  planRight: { alignItems: "flex-end" },
  planPrice: { fontSize: 18, fontWeight: "800", color: Colors.text },
  planPriceActive: { color: Colors.primary },
  planPeriod: { fontSize: 11, color: Colors.textSecondary },
  comparisonHeader: {
    flexDirection: "row", marginBottom: 8,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  comparisonRow: {
    flexDirection: "row", paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  comparisonFeature: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: "600" },
  comparisonFree: { width: 70, textAlign: "center", fontSize: 13, fontWeight: "700", color: Colors.textSecondary },
  comparisonPremium: { width: 80, textAlign: "center", fontSize: 13, fontWeight: "700", color: Colors.primary },
  comparisonFreeVal: { width: 70, textAlign: "center", fontSize: 13, color: Colors.textSecondary },
  comparisonPremiumVal: { width: 80, textAlign: "center", fontSize: 13, color: Colors.primary, fontWeight: "600" },
  upgradeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#F59E0B", borderRadius: 14,
    padding: 16, gap: 8, marginBottom: 12,
  },
  upgradeBtnText: { color: Colors.white, fontSize: 16, fontWeight: "800" },
  disclaimer: { textAlign: "center", fontSize: 12, color: Colors.textLight },
});