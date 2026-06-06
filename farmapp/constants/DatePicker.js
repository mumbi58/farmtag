import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function Column({ items, selected, onSelect, renderLabel }) {
  const ref = useRef(null);
  const ITEM_H = 44;

  return (
    <ScrollView
      ref={ref}
      style={styles.col}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
    >
      {items.map((val) => (
        <TouchableOpacity
          key={val}
          style={[styles.colItem, selected === val && styles.colItemActive]}
          onPress={() => onSelect(val)}
        >
          <Text
            style={[
              styles.colItemText,
              selected === val && styles.colItemTextActive,
            ]}
          >
            {renderLabel ? renderLabel(val) : String(val).padStart(2, "0")}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default function DatePicker({
  label,
  value,
  onChange,
  required = false,
  placeholder = "Select date",
}) {
  const [show, setShow] = useState(false);

  const parsed = value ? new Date(value + "T12:00:00") : new Date();
  const [selYear, setSelYear] = useState(parsed.getFullYear());
  const [selMonth, setSelMonth] = useState(parsed.getMonth() + 1); // 1-12
  const [selDay, setSelDay] = useState(parsed.getDate());

  const currentYear = new Date().getFullYear();
  const years = range(1990, currentYear + 5);
  const months = range(1, 12);
  const days = range(1, daysInMonth(selMonth, selYear));

  // Clamp day if month/year change makes previous day out of range
  const maxDay = daysInMonth(selMonth, selYear);
  const safeDay = Math.min(selDay, maxDay);

  const handleConfirm = () => {
    const m = String(selMonth).padStart(2, "0");
    const d = String(safeDay).padStart(2, "0");
    onChange(`${selYear}-${m}-${d}`);
    setShow(false);
  };

  const handleOpen = () => {
    // Reset selectors to current value when opening
    const p = value ? new Date(value + "T12:00:00") : new Date();
    setSelYear(p.getFullYear());
    setSelMonth(p.getMonth() + 1);
    setSelDay(p.getDate());
    setShow(true);
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity style={styles.trigger} onPress={handleOpen}>
        <Ionicons
          name="calendar-outline"
          size={18}
          color={value ? Colors.primary : Colors.textLight}
        />
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.textLight} />
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShow(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Toolbar */}
            <View style={styles.toolbar}>
              <TouchableOpacity onPress={() => setShow(false)}>
                <Text style={styles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.toolbarTitle}>
                {label || "Select Date"}
              </Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.doneBtn}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Month / Day / Year columns */}
            <View style={styles.pickerRow}>
              {/* Month */}
              <View style={[styles.colWrap, { flex: 3 }]}>
                <Text style={styles.colLabel}>Month</Text>
                <Column
                  items={months}
                  selected={selMonth}
                  onSelect={(v) => {
                    setSelMonth(v);
                    const max = daysInMonth(v, selYear);
                    if (selDay > max) setSelDay(max);
                  }}
                  renderLabel={(v) => MONTHS[v - 1]}
                />
              </View>

              {/* Day */}
              <View style={[styles.colWrap, { flex: 2 }]}>
                <Text style={styles.colLabel}>Day</Text>
                <Column
                  items={days}
                  selected={safeDay}
                  onSelect={setSelDay}
                />
              </View>

              {/* Year */}
              <View style={[styles.colWrap, { flex: 2 }]}>
                <Text style={styles.colLabel}>Year</Text>
                <Column
                  items={years}
                  selected={selYear}
                  onSelect={(v) => {
                    setSelYear(v);
                    const max = daysInMonth(selMonth, v);
                    if (selDay > max) setSelDay(max);
                  }}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const ITEM_H = 44;

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  required: { color: Colors.error },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 13,
    backgroundColor: Colors.background,
  },
  triggerText: { flex: 1, fontSize: 15, color: Colors.text },
  placeholder: { color: Colors.textLight },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 32,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toolbarTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  cancelBtn: { fontSize: 15, color: Colors.textSecondary },
  doneBtn: { fontSize: 15, fontWeight: "700", color: Colors.primary },

  // Columns
  pickerRow: {
    flexDirection: "row",
    height: ITEM_H * 5,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  colWrap: { alignItems: "center" },
  colLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  col: { width: "100%" },
  colItem: {
    height: ITEM_H,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  colItemActive: { backgroundColor: Colors.green100 },
  colItemText: { fontSize: 14, color: Colors.textSecondary },
  colItemTextActive: {
    color: Colors.primary,
    fontWeight: "800",
    fontSize: 15,
  },
});
