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
import api from "@/constants/api";

const CATEGORY_CONFIG = {
  feed: { icon: "leaf-outline", color: "#F59E0B", emoji: "🌾" },
  medicine: { icon: "medical-outline", color: "#EC4899", emoji: "💊" },
  labor: { icon: "people-outline", color: "#6366F1", emoji: "👷" },
  equipment: { icon: "construct-outline", color: "#14B8A6", emoji: "🔧" },
  other: { icon: "ellipsis-horizontal-outline", color: "#8B5CF6", emoji: "📦" },
};

function ExpenseCategoryCard({ category, total, percentage }) {
  const config =
    CATEGORY_CONFIG[category?.toLowerCase()] || CATEGORY_CONFIG.other;
  return (
    <View style={styles.categoryCard}>
      <View
        style={[styles.categoryIcon, { backgroundColor: config.color + "20" }]}
      >
        <Text style={styles.categoryEmoji}>{config.emoji}</Text>
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{category}</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${percentage}%`, backgroundColor: config.color },
            ]}
          />
        </View>
        <Text style={styles.categoryPercent}>
          {percentage.toFixed(0)}% of total
        </Text>
      </View>
      <Text style={[styles.categoryTotal, { color: config.color }]}>
        KES {Number(total).toLocaleString()}
      </Text>
    </View>
  );
}

function ExpenseItem({ expense }) {
  const config =
    CATEGORY_CONFIG[expense.category?.toLowerCase()] || CATEGORY_CONFIG.other;
  return (
    <View style={styles.expenseItem}>
      <View
        style={[styles.expenseIcon, { backgroundColor: config.color + "20" }]}
      >
        <Text>{config.emoji}</Text>
      </View>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseCategory}>{expense.category}</Text>
        <Text style={styles.expenseDesc}>
          {expense.description || "No description"}
        </Text>
        <Text style={styles.expenseDate}>
          {expense.expense_date?.split("T")[0]}
        </Text>
      </View>
      <Text style={[styles.expenseAmount, { color: config.color }]}>
        KES {Number(expense.amount).toLocaleString()}
      </Text>
    </View>
  );
}

export default function Expenses() {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchExpenses = async (pageNum = 1) => {
    try {
      const limit = 5;
      const [summaryRes, expensesRes] = await Promise.all([
        api.get(`/expenses/summary?period=${period}`),
        api.get(`/expenses?period=${period}&page=${pageNum}&limit=${limit}`),
      ]);
      setSummary(summaryRes.data);
      const data = expensesRes.data || [];
      setExpenses(data);
      setPage(pageNum);
      setHasMore(data.length === limit);
      console.log("[EXPENSES] Loaded page:", pageNum, "with", data.length, "expenses");
    } catch (e) {
      console.log("[EXPENSES] Fetch error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses(1);
  }, [period]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExpenses(1);
  }, [period]);

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
      {/* Title */}
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Expenses</Text>
          <Text style={styles.subtitle}>Track all farm expenses</Text>
        </View>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/expenses/add")}
      >
        <Ionicons name="add" size={20} color={Colors.white} />
        <Text style={styles.addButtonText}>Add Expense</Text>
      </TouchableOpacity>

      {/* Period Toggle */}
      <View style={styles.periodToggle}>
        {["monthly", "yearly", "all"].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[
                styles.periodBtnText,
                period === p && styles.periodBtnTextActive,
              ]}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total Card */}
      <View style={styles.totalCard}>
        <View style={styles.totalCardLeft}>
          <View style={styles.totalIcon}>
            <Ionicons name="cash-outline" size={22} color={Colors.success} />
          </View>
          <View>
            <Text style={styles.totalLabel}>Total Expenses</Text>
            <Text style={styles.totalPeriod}>
              {period.charAt(0).toUpperCase() + period.slice(1)} Period
            </Text>
          </View>
        </View>
        <Text style={styles.totalValue}>
          KES {Number(summary?.grand_total || 0).toLocaleString()}
        </Text>
      </View>

      {/* Category Breakdown */}
      {summary?.summary?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Category</Text>
          {summary.summary.map((item) => (
            <ExpenseCategoryCard
              key={item.category}
              category={item.category}
              total={item.total}
              percentage={item.percentage}
            />
          ))}
        </View>
      )}

      {/* Recent Expenses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        {expenses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyText}>No expenses recorded</Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <ExpenseItem key={expense.id} expense={expense} />
          ))
        )}
      </View>

      {/* Pagination Controls */}
      {(page > 1 || hasMore) && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
            onPress={() => fetchExpenses(page - 1)}
            disabled={page === 1}
          >
            <Text style={styles.pageBtnText}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>Page {page}</Text>
          <TouchableOpacity
            style={[styles.pageBtn, !hasMore && styles.pageBtnDisabled]}
            onPress={() => fetchExpenses(page + 1)}
            disabled={!hasMore}
          >
            <Text style={styles.pageBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  titleRow: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: { color: Colors.white, fontSize: 15, fontWeight: "700" },
  periodToggle: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  periodBtnTextActive: { color: Colors.white },
  totalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  totalCardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  totalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.green100,
    justifyContent: "center",
    alignItems: "center",
  },
  totalLabel: { fontSize: 14, fontWeight: "600", color: Colors.text },
  totalPeriod: { fontSize: 12, color: Colors.textSecondary },
  totalValue: { fontSize: 22, fontWeight: "800", color: Colors.text },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryEmoji: { fontSize: 22 },
  categoryInfo: { flex: 1 },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 6,
    textTransform: "capitalize",
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: { height: 4, borderRadius: 2 },
  categoryPercent: { fontSize: 11, color: Colors.textLight },
  categoryTotal: { fontSize: 15, fontWeight: "800" },
  expenseItem: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  expenseInfo: { flex: 1 },
  expenseCategory: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    textTransform: "capitalize",
  },
  expenseDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  expenseDate: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15, color: Colors.textSecondary },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    marginTop: 8,
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
});
