import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { FeatureLockScreen } from "@/components/FeatureLockScreen";
import { RoleHeader } from "@/components/RoleHeader";
import { Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { useGymConfig } from "@/hooks/useGymConfig";
import { apiFetch } from "@/services/api";

// ─── Colors ─────────────────────────────────────────────────────────────────

const N = {
  calories: "#F59E0B",
  protein: "#22C55E",
  carbs: "#3B82F6",
  fat: "#EC4899",
  water: "#06B6D4",
  over: "#EF4444",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type CoachMember = { id: string; name: string; email: string };

type Target = {
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  waterMl?: number;
  goal?: string;
};

type DailyTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type FoodEntry = {
  id: string;
  foodName: string;
  foodNameAr?: string;
  calories: number;
  quantity?: number;
  unit?: string;
  mealType?: string;
};

type OverviewData = {
  hasTarget: boolean;
  target?: Target;
  totals?: DailyTotals;
  waterMl?: number;
  weeklyAdherence?: number;
  avgCalories7d?: number;
  avgProtein7d?: number;
  memberName?: string;
  entries?: FoodEntry[];
};

type HistoryEntry = {
  loggedAt: string;
  calories?: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const GOALS = [
  { key: "LOSE_WEIGHT", en: "Weight Loss", ar: "خسارة وزن" },
  { key: "MUSCLE_GAIN", en: "Muscle Gain", ar: "بناء عضلات" },
  { key: "MAINTAIN", en: "Maintenance", ar: "محافظة" },
  { key: "RECOMPOSITION", en: "Recomposition", ar: "إعادة تشكيل" },
];

const MEAL_LABELS: Record<string, { en: string; ar: string; emoji: string }> = {
  BREAKFAST: { en: "Breakfast", ar: "الإفطار", emoji: "🌅" },
  LUNCH: { en: "Lunch", ar: "الغداء", emoji: "☀️" },
  DINNER: { en: "Dinner", ar: "العشاء", emoji: "🌙" },
  SNACK: { en: "Snack", ar: "وجبة خفيفة", emoji: "🍎" },
  PRE_WORKOUT: { en: "Pre-Workout", ar: "قبل التمرين", emoji: "💪" },
  POST_WORKOUT: { en: "Post-Workout", ar: "بعد التمرين", emoji: "⚡" },
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ width, height, style }: { width?: number | string; height?: number; style?: any }) {
  return (
    <View
      style={[
        { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 8, height: height ?? 16, width: width ?? "100%" },
        style,
      ]}
    />
  );
}

// ─── Macro Progress Bar ──────────────────────────────────────────────────────

function MacroBar({
  label, labelAr, consumed, target, color, unit = "g", isAr,
}: {
  label: string; labelAr: string; consumed: number; target: number;
  color: string; unit?: string; isAr: boolean;
}) {
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const over = consumed > target && target > 0;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
          {isAr ? labelAr : label}
        </Text>
        <Text style={{ color: over ? N.over : "rgba(255,255,255,0.55)", fontSize: 13 }}>
          {Math.round(consumed)}{unit}{target > 0 ? ` / ${target}${unit}` : ""}
        </Text>
      </View>
      <View style={{ height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <View
          style={{
            height: "100%",
            borderRadius: 4,
            width: `${pct * 100}%`,
            backgroundColor: over ? N.over : color,
          }}
        />
      </View>
    </View>
  );
}

// ─── 7-Day Bar Chart ─────────────────────────────────────────────────────────

function SevenDayChart({ memberId, isAr, c }: { memberId: string; isAr: boolean; c: any }) {
  const history = useQuery<HistoryEntry[]>({
    queryKey: ["nutrition", "v3", "history", memberId],
    queryFn: () => apiFetch<HistoryEntry[]>(`/nutrition/v3/log/history/${memberId}`).catch(() => []),
    enabled: !!memberId,
  });

  const days = useMemo(() => {
    const raw = history.data ?? [];
    return [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      const dayEntries = raw.filter((r) => {
        const rk = r.loggedAt ? new Date(r.loggedAt).toISOString().slice(0, 10) : "";
        return rk === key;
      });
      const totalCal = dayEntries.reduce((s, e) => s + (e.calories ?? 0), 0);
      return {
        label: d.toLocaleDateString(isAr ? "ar-SA" : "en-US", { weekday: "narrow" }),
        calories: Math.round(totalCal),
      };
    });
  }, [history.data, isAr]);

  const maxCal = useMemo(() => Math.max(...days.map((d) => d.calories), 500), [days]);

  if (history.isLoading) {
    return (
      <View style={{ height: 120, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <View style={{ height: 120, flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
      {days.map((d, i) => {
        const barPct = maxCal > 0 ? d.calories / maxCal : 0;
        const barHeight = Math.max(4, Math.round(80 * barPct));
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, marginBottom: 4 }}>
              {d.calories > 0 ? d.calories : ""}
            </Text>
            <View
              style={{
                width: "100%",
                height: barHeight,
                borderRadius: 4,
                backgroundColor: d.calories > 0 ? N.calories : "rgba(255,255,255,0.1)",
                opacity: d.calories > 0 ? 0.85 : 0.3,
              }}
            />
            <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 5 }}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Target Form Modal ────────────────────────────────────────────────────────

function TargetModal({
  visible, onClose, memberId, existing, isAr, isRTL,
}: {
  visible: boolean;
  onClose: () => void;
  memberId: string;
  existing?: Target;
  isAr: boolean;
  isRTL: boolean;
}) {
  const qc = useQueryClient();
  const c = useColors();

  const [form, setForm] = useState({
    calories: String(existing?.calories ?? ""),
    proteinG: String(existing?.proteinG ?? ""),
    carbsG: String(existing?.carbsG ?? ""),
    fatG: String(existing?.fatG ?? ""),
    waterMl: String(existing?.waterMl ?? ""),
    goal: existing?.goal ?? "MAINTAIN",
  });

  const hasExisting = !!(existing?.calories || existing?.proteinG);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        memberId,
        calories: parseInt(form.calories) || 0,
        proteinG: parseInt(form.proteinG) || 0,
        carbsG: parseInt(form.carbsG) || 0,
        fatG: parseInt(form.fatG) || 0,
        waterMl: parseInt(form.waterMl) || 0,
        goal: form.goal,
      };
      return hasExisting
        ? apiFetch(`/nutrition/v3/targets/${memberId}`, { method: "PUT", data: body })
        : apiFetch("/nutrition/v3/targets", { method: "POST", data: body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition", "v3", "overview", memberId] });
      onClose();
    },
    onError: (e: any) => {
      Alert.alert(isAr ? "خطأ" : "Error", (isAr ? e?.messageAr : e?.error) || "Failed to save");
    },
  });

  const fields = [
    { key: "calories" as const, en: "Calories", ar: "السعرات", unit: "kcal", color: N.calories, kbd: "number-pad" as const },
    { key: "proteinG" as const, en: "Protein", ar: "بروتين", unit: "g", color: N.protein, kbd: "number-pad" as const },
    { key: "carbsG" as const, en: "Carbs", ar: "كربوهيدرات", unit: "g", color: N.carbs, kbd: "number-pad" as const },
    { key: "fatG" as const, en: "Fat", ar: "دهون", unit: "g", color: N.fat, kbd: "number-pad" as const },
    { key: "waterMl" as const, en: "Water", ar: "ماء", unit: "ml", color: N.water, kbd: "number-pad" as const },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} onPress={onClose} />
        <View style={{ backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, gap: 16, maxHeight: "90%" }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800" }}>
              {isAr ? (hasExisting ? "تعديل الأهداف" : "تعيين الأهداف") : (hasExisting ? "Edit Targets" : "Set Targets")}
            </Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              {fields.map((f) => (
                <View key={f.key} style={{ width: "47%" }}>
                  <Text style={{ color: f.color, fontSize: 11, fontWeight: "700", marginBottom: 4 }}>
                    {isAr ? f.ar : f.en} ({f.unit})
                  </Text>
                  <TextInput
                    value={form[f.key]}
                    onChangeText={(v) => setForm((p) => ({ ...p, [f.key]: v }))}
                    keyboardType={f.kbd}
                    placeholder="0"
                    placeholderTextColor={c.mutedForeground}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      padding: 10,
                      color: c.foreground,
                      fontSize: 15,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  />
                </View>
              ))}
            </View>

            <Text style={{ color: c.mutedForeground, fontSize: 12, marginBottom: 8 }}>
              {isAr ? "الهدف" : "Goal"}
            </Text>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {GOALS.map((g) => (
                <Pressable
                  key={g.key}
                  onPress={() => setForm((p) => ({ ...p, goal: g.key }))}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: form.goal === g.key ? c.primary : "rgba(255,255,255,0.15)",
                    backgroundColor: form.goal === g.key ? c.primary + "20" : "transparent",
                  }}
                >
                  <Text style={{ color: form.goal === g.key ? c.primary : c.mutedForeground, fontSize: 12, fontWeight: "700" }}>
                    {isAr ? g.ar : g.en}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => save.mutate()}
              disabled={save.isPending}
              style={{
                backgroundColor: c.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              {save.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
                  {isAr ? "حفظ الأهداف" : "Save Targets"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Member Detail View ───────────────────────────────────────────────────────

function MemberDetail({
  memberId, isAr, isRTL, c,
}: {
  memberId: string; isAr: boolean; isRTL: boolean; c: any;
}) {
  const qc = useQueryClient();
  const [targetModalOpen, setTargetModalOpen] = useState(false);

  const overview = useQuery<OverviewData | null>({
    queryKey: ["nutrition", "v3", "overview", memberId],
    queryFn: () =>
      apiFetch<OverviewData>(`/nutrition/v3/coach/overview/${memberId}`).catch(() => null),
    enabled: !!memberId,
  });

  const data = overview.data;
  const hasTarget = data?.hasTarget ?? false;
  const target = data?.target ?? {};
  const totals = data?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const waterMl = data?.waterMl ?? 0;
  const adherence = data?.weeklyAdherence ?? 0;
  const avgCal = data?.avgCalories7d ?? 0;
  const avgProtein = data?.avgProtein7d ?? 0;
  const entries = data?.entries ?? [];

  const entriesByMeal = useMemo(
    () =>
      entries.reduce<Record<string, FoodEntry[]>>((acc, e) => {
        const mt = e.mealType ?? "SNACK";
        if (!acc[mt]) acc[mt] = [];
        acc[mt].push(e);
        return acc;
      }, {}),
    [entries],
  );

  if (overview.isLoading) {
    return (
      <View style={{ gap: 12, padding: 16 }}>
        <Skeleton height={110} />
        <Skeleton height={80} />
        <Skeleton height={130} />
        <Skeleton height={90} />
      </View>
    );
  }

  return (
    <View style={{ gap: 12, paddingBottom: 32 }}>
      {/* Targets card */}
      <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 16 }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
            <Feather name="target" size={16} color={c.primary} />
            <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15 }}>
              {isAr ? "الأهداف اليومية" : "Daily Targets"}
            </Text>
          </View>
          <Pressable onPress={() => setTargetModalOpen(true)}>
            <Text style={{ color: c.primary, fontSize: 12, fontWeight: "700" }}>
              {hasTarget ? (isAr ? "تعديل" : "Edit") : (isAr ? "+ تعيين أهداف" : "+ Set Targets")}
            </Text>
          </Pressable>
        </View>

        {hasTarget ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              { label: "Calories", labelAr: "سعرات", value: target.calories, unit: "kcal", color: N.calories },
              { label: "Protein", labelAr: "بروتين", value: target.proteinG, unit: "g", color: N.protein },
              { label: "Carbs", labelAr: "كارب", value: target.carbsG, unit: "g", color: N.carbs },
              { label: "Fat", labelAr: "دهون", value: target.fatG, unit: "g", color: N.fat },
              { label: "Water", labelAr: "ماء", value: target.waterMl ? (target.waterMl / 1000).toFixed(1) : 0, unit: "L", color: N.water },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  minWidth: 52,
                  borderRadius: 10,
                  padding: 10,
                  alignItems: "center",
                  backgroundColor: item.color + "15",
                  borderWidth: 1,
                  borderColor: item.color + "25",
                }}
              >
                <Text style={{ color: item.color, fontWeight: "900", fontSize: 15 }}>{item.value}</Text>
                <Text style={{ color: item.color + "99", fontSize: 9, fontWeight: "700" }}>{item.unit}</Text>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 }}>
                  {isAr ? item.labelAr : item.label}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <Feather name="target" size={28} color="rgba(255,255,255,0.2)" />
            <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 8 }}>
              {isAr ? "لم يتم تعيين أهداف غذائية بعد" : "No nutrition targets set yet"}
            </Text>
          </View>
        )}
      </View>

      {/* Today's progress */}
      <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 16 }}>
        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14, marginBottom: 14, textAlign: isRTL ? "right" : "left" }}>
          {isAr ? "إجمالي اليوم" : "Today's Totals"}
        </Text>

        <MacroBar
          label="Calories" labelAr="سعرات" unit=" kcal"
          consumed={totals.calories} target={target.calories ?? 0}
          color={N.calories} isAr={isAr}
        />
        <MacroBar
          label="Protein" labelAr="بروتين"
          consumed={totals.protein} target={target.proteinG ?? 0}
          color={N.protein} isAr={isAr}
        />
        <MacroBar
          label="Carbs" labelAr="كربوهيدرات"
          consumed={totals.carbs} target={target.carbsG ?? 0}
          color={N.carbs} isAr={isAr}
        />
        <MacroBar
          label="Fat" labelAr="دهون"
          consumed={totals.fat} target={target.fatG ?? 0}
          color={N.fat} isAr={isAr}
        />

        {(target.waterMl ?? 0) > 0 && (
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: 6 }}>
            <Feather name="droplet" size={14} color={N.water} />
            <Text style={{ color: N.water, fontWeight: "700", fontSize: 14 }}>
              {(waterMl / 1000).toFixed(1)}L
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
              / {(target.waterMl! / 1000).toFixed(1)}L
            </Text>
          </View>
        )}
      </View>

      {/* 7-day chart */}
      <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 16 }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
            <Feather name="trending-up" size={16} color={c.primary} />
            <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14 }}>
              {isAr ? "سجل ٧ أيام" : "7-Day Log"}
            </Text>
          </View>
          {hasTarget && adherence > 0 && (
            <View style={{
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 20,
              backgroundColor: adherence >= 70 ? N.protein + "20" : N.over + "20",
            }}>
              <Text style={{ color: adherence >= 70 ? N.protein : N.over, fontSize: 11, fontWeight: "800" }}>
                {Math.round(adherence)}% {isAr ? "التزام" : "adherence"}
              </Text>
            </View>
          )}
        </View>

        <SevenDayChart memberId={memberId} isAr={isAr} c={c} />

        {hasTarget && (avgCal > 0 || avgProtein > 0) && (
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-around", marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}>
            {[
              { label: isAr ? "متوسط سعرات" : "Avg Calories", value: `${Math.round(avgCal)} kcal`, color: N.calories },
              { label: isAr ? "متوسط بروتين" : "Avg Protein", value: `${Math.round(avgProtein)}g`, color: N.protein },
              { label: isAr ? "التزام أسبوعي" : "Weekly Goal", value: `${Math.round(adherence)}%`, color: adherence >= 70 ? N.protein : N.over },
            ].map((stat) => (
              <View key={stat.label} style={{ alignItems: "center" }}>
                <Text style={{ color: stat.color, fontSize: 16, fontWeight: "900" }}>{stat.value}</Text>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Today's food log */}
      <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 15, textAlign: isRTL ? "right" : "left" }}>
        {isAr ? "سجل طعام اليوم" : "Today's Food Log"}
      </Text>

      {Object.keys(entriesByMeal).length === 0 ? (
        <View style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 28, alignItems: "center", gap: 8 }}>
          <Feather name="coffee" size={28} color="rgba(255,255,255,0.2)" />
          <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
            {isAr ? "لا توجد سجلات طعام اليوم" : "No food logged today"}
          </Text>
        </View>
      ) : (
        Object.entries(entriesByMeal).map(([mt, mealEntries]) => {
          const info = MEAL_LABELS[mt] ?? { en: mt, ar: mt, emoji: "🍽️" };
          const totalCal = mealEntries.reduce((s, e) => s + (e.calories ?? 0), 0);
          return (
            <View
              key={mt}
              style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 14 }}
            >
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 18 }}>{info.emoji}</Text>
                  <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14 }}>
                    {isAr ? info.ar : info.en}
                  </Text>
                </View>
                <Text style={{ color: N.calories, fontSize: 12, fontWeight: "700" }}>
                  {Math.round(totalCal)} kcal
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                {mealEntries.map((entry) => (
                  <View
                    key={entry.id}
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingBottom: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: "rgba(255,255,255,0.05)",
                    }}
                  >
                    <Text style={{ color: c.foreground, fontSize: 13, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                      {isAr && entry.foodNameAr ? entry.foodNameAr : entry.foodName}
                    </Text>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                      {entry.quantity ? (
                        <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                          {entry.quantity} {entry.unit}
                        </Text>
                      ) : null}
                      <Text style={{ color: N.calories, fontSize: 12, fontWeight: "700" }}>
                        {Math.round(entry.calories ?? 0)} kcal
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })
      )}

      <TargetModal
        visible={targetModalOpen}
        onClose={() => setTargetModalOpen(false)}
        memberId={memberId}
        existing={hasTarget ? target : undefined}
        isAr={isAr}
        isRTL={isRTL}
      />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CoachNutritionTab() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const { features } = useGymConfig();
  const isAr = lang === "ar";

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const members = useQuery<CoachMember[]>({
    queryKey: ["coach", "members"],
    queryFn: () => apiFetch<CoachMember[]>("/coach/members").catch(() => []),
  });

  if (!features.nutritionEnabled) {
    return (
      <Screen>
        <RoleHeader title={isAr ? "التغذية" : "Nutrition"} />
        <FeatureLockScreen
          icon="🥗"
          titleEn="Nutrition Not Enabled"
          titleAr="التغذية غير مفعّلة"
          subtitleEn="Nutrition tracking is not enabled for this gym."
          subtitleAr="ميزة التغذية غير مفعّلة لهذه الصالة."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <RoleHeader title={isAr ? "تغذية الأعضاء" : "Member Nutrition"} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            tintColor={c.primary}
            refreshing={members.isFetching}
            onRefresh={() => members.refetch()}
          />
        }
      >
        {/* Member selector */}
        <View style={{ padding: 16, paddingBottom: 0 }}>
          <Text style={{ color: c.mutedForeground, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
            {isAr ? "الأعضاء المسندون" : "Assigned Members"}
          </Text>

          {members.isLoading ? (
            <View style={{ gap: 8 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} height={62} style={{ borderRadius: 12 }} />)}
            </View>
          ) : !members.data?.length ? (
            <View style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
              <Feather name="users" size={28} color="rgba(255,255,255,0.2)" />
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                {isAr ? "لا توجد أعضاء مسندون إليك" : "No members assigned"}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {members.data.map((m) => {
                const isSelected = selectedId === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setSelectedId(isSelected ? null : m.id)}
                    style={{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected ? c.primary + "15" : "rgba(255,255,255,0.04)",
                      borderWidth: 1.5,
                      borderColor: isSelected ? c.primary + "50" : "rgba(255,255,255,0.07)",
                    }}
                  >
                    <View style={{
                      width: 42, height: 42, borderRadius: 21,
                      backgroundColor: c.primary + "30",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Text style={{ color: c.primary, fontWeight: "900", fontSize: 17 }}>
                        {m.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14 }}>{m.name}</Text>
                      <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{m.email}</Text>
                    </View>
                    <Feather
                      name={isSelected ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={isSelected ? c.primary : c.mutedForeground}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Detail panel */}
        {selectedId ? (
          <View style={{ padding: 16, paddingTop: 20 }}>
            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 18 }} />
            <MemberDetail memberId={selectedId} isAr={isAr} isRTL={isRTL} c={c} />
          </View>
        ) : members.data?.length ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
            <Feather name="chevron-up" size={24} color="rgba(255,255,255,0.2)" />
            <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
              {isAr ? "اختر عضوًا لعرض بياناته الغذائية" : "Select a member to view their nutrition"}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
