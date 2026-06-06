import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import api from "@/constants/api";

function StatCard({ icon, label, value, color, trend }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardTop}>
        <View style={[styles.statIconBox, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {trend && (
          <Ionicons
            name={trend === "up" ? "trending-up" : "trending-down"}
            size={18}
            color={trend === "up" ? Colors.success : Colors.error}
          />
        )}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function UpcomingBirthCard({ item }) {
  return (
    <TouchableOpacity 
      style={styles.birthCard}
      onPress={() => router.push({ pathname: "/births/add", params: { pregnancy_id: item.pregnancy_id, mother_id: item.animal_id } })}
    >
      <View style={styles.birthCardLeft}>
        <Text style={styles.birthEmoji}>🐄</Text>
        <View>
          <Text style={styles.birthTag}>{item.tag_number}</Text>
          <Text style={styles.birthType}>
            {item.animal_type} • {item.farm_name}
          </Text>
        </View>
      </View>
      <View style={styles.birthCardRight}>
        <Text style={styles.birthDate}>{item.expected_birth_at}</Text>
        <View
          style={[
            styles.birthBadge,
            {
              backgroundColor:
                item.days_remaining <= 7
                  ? Colors.error + "20"
                  : Colors.success + "20",
            },
          ]}
        >
          <Text
            style={[
              styles.birthBadgeText,
              {
                color: item.days_remaining <= 7 ? Colors.error : Colors.success,
              },
            ]}
          >
            {item.days_remaining}d left
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcomingBirths, setUpcomingBirths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const [statsRes, birthsRes] = await Promise.all([
        api.get("/dashboard"),
        api.get("/dashboard/upcoming-births"),
      ]);
      setStats(statsRes.data);
      setUpcomingBirths(birthsRes.data || []);
      console.log("[DASHBOARD] Stats loaded:", statsRes.data);
    } catch (e) {
      console.log("[DASHBOARD] Fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard();
  }, []);

  const formatCurrency = (amount) => {
    if (!amount) return "KES 0";
    if (amount >= 1000000) return `KES ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KES ${(amount / 1000).toFixed(0)}K`;
    return `KES ${amount.toFixed(0)}`;
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View>
          <Text style={styles.welcomeText}>Welcome to FarmTag</Text>
          <Text style={styles.welcomeSubText}>
            Manage your farm efficiently with real-time insights
          </Text>
        </View>
      </View>

      {/* Stat Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="heart-outline"
          label="Total Animals"
          value={stats?.total_animals ?? 0}
          color={Colors.success}
          trend="up"
        />
        <StatCard
          icon="cash-outline"
          label="Total Invested"
          value={formatCurrency(stats?.total_invested)}
          color={Colors.warning}
          trend="down"
        />
        <StatCard
          icon="trending-up-outline"
          label="Total Earned"
          value={formatCurrency(stats?.total_earned)}
          color="#6366F1"
          trend="up"
        />
        <StatCard
          icon="calendar-outline"
          label="Due Births"
          value={stats?.births_due_in_30_days ?? 0}
          color={Colors.error}
        />
      </View>

      {/* Profit/Loss Card */}
      <View
        style={[
          styles.profitCard,
          {
            borderLeftColor:
              (stats?.profit_loss ?? 0) >= 0 ? Colors.success : Colors.error,
          },
        ]}
      >
        <Text style={styles.profitLabel}>Overall Profit / Loss</Text>
        <Text
          style={[
            styles.profitValue,
            {
              color:
                (stats?.profit_loss ?? 0) >= 0 ? Colors.success : Colors.error,
            },
          ]}
        >
          {formatCurrency(stats?.profit_loss ?? 0)}
        </Text>
        <Text style={styles.profitSub}>
          {stats?.animals_sold ?? 0} animals sold ·{" "}
          {stats?.active_pregnancies ?? 0} active pregnancies
        </Text>
      </View>

      {/* Upcoming Births */}
      {upcomingBirths.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤰 Upcoming Births</Text>
          {upcomingBirths.map((item) => (
            <UpcomingBirthCard key={item.pregnancy_id} item={item} />
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {[
            {
              label: "Add Animal",
              icon: "add-circle-outline",
              route: "/animals/add",
            },
            { label: "Add Farm", icon: "leaf-outline", route: "/farms/add" },
            {
              label: "Add Expense",
              icon: "receipt-outline",
              route: "/expenses/add",
            },
            {
              label: "Record Birth",
              icon: "heart-outline",
              route: "/births/add",
            },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickAction}
              onPress={() => router.push(action.route)}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon} size={24} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  welcomeBanner: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  welcomeText: { fontSize: 18, fontWeight: "800", color: Colors.white },
  welcomeSubText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    width: "47%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "800", color: Colors.text },
  profitCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  profitLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  profitValue: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  profitSub: { fontSize: 12, color: Colors.textLight },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  birthCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  birthCardLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  birthEmoji: { fontSize: 28 },
  birthTag: { fontSize: 14, fontWeight: "700", color: Colors.text },
  birthType: { fontSize: 12, color: Colors.textSecondary },
  birthCardRight: { alignItems: "flex-end", gap: 4 },
  birthDate: { fontSize: 12, color: Colors.textSecondary },
  birthBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  birthBadgeText: { fontSize: 11, fontWeight: "700" },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickAction: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    width: "47%",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.green100,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    textAlign: "center",
  },
});
