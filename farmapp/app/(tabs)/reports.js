import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import api from "@/constants/api";

function ReportCard({ title, value, subtitle, color, icon }) {
  return (
    <View style={[styles.reportCard, { borderLeftColor: color }]}>
      <View style={styles.reportCardTop}>
        <View style={[styles.reportIcon, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.reportTitle}>{title}</Text>
      </View>
      <Text style={[styles.reportValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.reportSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function AnimalFinancialRow({ animal }) {
  const profit = animal.profit_loss;
  const isProfit = profit >= 0;
  return (
    <View style={styles.animalRow}>
      <View style={styles.animalRowLeft}>
        <Text style={styles.animalTag}>{animal.tag_number}</Text>
        <Text style={styles.animalName}>{animal.name || animal.type}</Text>
      </View>
      <View style={styles.animalRowRight}>
        <Text style={styles.animalBuy}>Buy: KES {Number(animal.buying_price).toLocaleString()}</Text>
        <Text style={[styles.animalProfit, { color: isProfit ? Colors.success : Colors.error }]}>
          {isProfit ? "+" : ""}KES {Number(profit).toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [financials, setFinancials] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchReports = async () => {
    try {
      const [statsRes, financialsRes, expenseRes] = await Promise.all([
        api.get("/dashboard"),
        api.get("/dashboard/financials"),
        api.get("/expenses/summary?period=yearly"),
      ]);
      setStats(statsRes.data);
      setFinancials(financialsRes.data || []);
      setExpenseSummary(expenseRes.data);
      console.log("[REPORTS] Data loaded");
    } catch (e) {
      console.log("[REPORTS] Fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, []);

  const formatCurrency = (amount) => {
    if (!amount) return "KES 0";
    if (amount >= 1000000) return `KES ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KES ${(amount / 1000).toFixed(0)}K`;
    return `KES ${Number(amount).toFixed(0)}`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtitle}>Financial overview of your farms</Text>

      {/* Tab Toggle */}
      <View style={styles.tabToggle}>
        {["overview", "animals", "expenses"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <View>
          <ReportCard
            title="Total Invested"
            value={formatCurrency(stats?.total_invested)}
            subtitle={`Across all active animals`}
            color={Colors.warning}
            icon="cash-outline"
          />
          <ReportCard
            title="Total Earned"
            value={formatCurrency(stats?.total_earned)}
            subtitle={`${stats?.animals_sold || 0} animals sold`}
            color={Colors.success}
            icon="trending-up-outline"
          />
          <ReportCard
            title="Net Profit / Loss"
            value={formatCurrency(stats?.profit_loss)}
            subtitle="Earned minus invested"
            color={(stats?.profit_loss || 0) >= 0 ? Colors.success : Colors.error}
            icon="stats-chart-outline"
          />
          <ReportCard
            title="Active Animals"
            value={stats?.total_animals || 0}
            subtitle={`Across ${stats?.total_farms || 0} farms`}
            color="#6366F1"
            icon="heart-outline"
          />
          <ReportCard
            title="Active Pregnancies"
            value={stats?.active_pregnancies || 0}
            subtitle={`${stats?.births_due_in_30_days || 0} due in 30 days`}
            color={Colors.info}
            icon="calendar-outline"
          />
        </View>
      )}

      {/* Animals Tab */}
      {activeTab === "animals" && (
        <View>
          <Text style={styles.sectionTitle}>Per Animal Profit / Loss</Text>
          {financials.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>No financial data yet</Text>
            </View>
          ) : (
            financials.map((animal) => (
              <AnimalFinancialRow key={animal.animal_id} animal={animal} />
            ))
          )}
        </View>
      )}

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <View>
          <Text style={styles.sectionTitle}>
            Yearly Expenses — KES {Number(expenseSummary?.grand_total || 0).toLocaleString()}
          </Text>
          {expenseSummary?.summary?.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💸</Text>
              <Text style={styles.emptyText}>No expenses this year</Text>
            </View>
          ) : (
            expenseSummary?.summary?.map((item) => (
              <View key={item.category} style={styles.expenseRow}>
                <View style={styles.expenseRowLeft}>
                  <Text style={styles.expenseCat}>{item.category}</Text>
                  <View style={styles.expenseBar}>
                    <View style={[
                      styles.expenseBarFill,
                      { width: `${item.percentage}%`, backgroundColor: Colors.primary }
                    ]} />
                  </View>
                </View>
                <View style={styles.expenseRowRight}>
                  <Text style={styles.expenseTotal}>KES {Number(item.total).toLocaleString()}</Text>
                  <Text style={styles.expensePercent}>{item.percentage?.toFixed(0)}%</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, marginBottom: 16 },
  tabToggle: {
    flexDirection: "row", backgroundColor: Colors.white,
    borderRadius: 12, padding: 4, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  reportCard: {
    backgroundColor: Colors.white, borderRadius: 14,
    padding: 16, marginBottom: 12, borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  reportCardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reportIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  reportTitle: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  reportValue: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  reportSubtitle: { fontSize: 12, color: Colors.textLight },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  animalRow: {
    backgroundColor: Colors.white, borderRadius: 12,
    padding: 14, marginBottom: 8, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  animalRowLeft: {},
  animalTag: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  animalName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  animalRowRight: { alignItems: "flex-end" },
  animalBuy: { fontSize: 12, color: Colors.textSecondary },
  animalProfit: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  expenseRow: {
    backgroundColor: Colors.white, borderRadius: 12,
    padding: 14, marginBottom: 8, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  expenseRowLeft: { flex: 1, marginRight: 12 },
  expenseCat: { fontSize: 14, fontWeight: "600", color: Colors.text, textTransform: "capitalize", marginBottom: 6 },
  expenseBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2 },
  expenseBarFill: { height: 4, borderRadius: 2 },
  expenseRowRight: { alignItems: "flex-end" },
  expenseTotal: { fontSize: 14, fontWeight: "800", color: Colors.text },
  expensePercent: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
});