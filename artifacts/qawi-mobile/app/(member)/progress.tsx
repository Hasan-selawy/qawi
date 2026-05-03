import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Button, Card, EmptyState, Input, Screen, SectionTitle } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

const FIELDS: { key: string; label: string }[] = [
  { key: "weight", label: "weight" },
  { key: "chest", label: "chest" },
  { key: "waist", label: "waist" },
  { key: "arms", label: "arms" },
  { key: "legs", label: "legs" },
  { key: "bodyFat", label: "bodyFat" },
];

type HistoryDay = {
  dayId: string;
  dayName: string;
  dayNameAr: string;
  date: string;
  completedAt: string;
  exercises: {
    planExerciseId: string;
    exerciseTemplateId?: string;
    exerciseName?: string;
    exerciseNameAr?: string;
    targetSets: number;
    targetReps: number;
    targetWeight: number;
    actualSets?: number;
    actualReps?: number;
    actualWeight?: number;
    isPersonalBest?: boolean;
  }[];
};

function HistoryDayCard({ day, lang, isRTL }: { day: HistoryDay; lang: string; isRTL: boolean }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const name = lang === "ar" ? (day.dayNameAr || day.dayName) : day.dayName;
  const date = (day.completedAt ?? day.date ?? "").slice(0, 10);
  const logged = day.exercises.filter((e) => e.actualWeight != null);

  return (
    <Card>
      <TouchableOpacity
        onPress={() => day.exercises.length > 0 && setOpen((o) => !o)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
              {name}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2 }}>{date}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{
              backgroundColor: c.primary + "22", borderRadius: 12,
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ color: c.primary, fontSize: 12, fontWeight: "700" }}>
                {logged.length} {lang === "ar" ? "تمرين" : "ex"}
              </Text>
            </View>
            {day.exercises.length > 0 && (
              <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={c.mutedForeground} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {day.exercises.map((ex) => {
            const exName = (lang === "ar" ? ex.exerciseNameAr : ex.exerciseName) || ex.exerciseName || "—";
            const hitTarget =
              ex.actualSets != null &&
              ex.actualReps != null &&
              ex.actualSets >= ex.targetSets &&
              ex.actualReps >= ex.targetReps;

            return (
              <View
                key={ex.planExerciseId}
                style={{
                  backgroundColor: c.muted + "44",
                  borderRadius: 10,
                  padding: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: ex.isPersonalBest ? "#f59e0b" : hitTarget ? "#22c55e" : c.border,
                }}
              >
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: c.foreground, fontWeight: "600", fontSize: 13, flex: 1 }} numberOfLines={1}>
                    {ex.isPersonalBest ? "🏆 " : ""}{exName}
                  </Text>
                  {ex.actualWeight != null && (
                    <Text style={{ color: c.primary, fontWeight: "800", fontSize: 14 }}>
                      {ex.actualWeight} kg
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12, marginTop: 4 }}>
                  <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                    {lang === "ar" ? "الهدف:" : "Target:"} {ex.targetSets}×{ex.targetReps}
                  </Text>
                  {ex.actualSets != null && (
                    <Text style={{ color: hitTarget ? "#22c55e" : "#f97316", fontSize: 11, fontWeight: "600" }}>
                      {lang === "ar" ? "الفعلي:" : "Actual:"} {ex.actualSets}×{ex.actualReps}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

export default function ProgressScreen() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [historyFilter, setHistoryFilter] = useState<"week" | "month" | "all">("all");

  const measurements = useQuery({
    queryKey: ["member", "measurements"],
    queryFn: () => apiFetch<any[]>("/member/measurements").catch(() => []),
  });

  const history = useQuery({
    queryKey: ["member", "workoutHistory"],
    queryFn: () => apiFetch<HistoryDay[]>("/member/workouts/history").catch(() => []),
  });

  const addMeasurement = useMutation({
    mutationFn: (data: any) => apiFetch("/member/measurements", { method: "POST", data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member", "measurements"] });
      setOpen(false);
      setVals({});
    },
    onError: () =>
      Alert.alert(lang === "ar" ? "قوي" : "Qawi", lang === "ar" ? "تعذر الحفظ" : "Could not save"),
  });

  const submit = () => {
    const data: Record<string, number> = {};
    Object.entries(vals).forEach(([k, v]) => {
      const n = parseFloat(v);
      if (!Number.isNaN(n)) data[k] = n;
    });
    if (Object.keys(data).length === 0) {
      Alert.alert(
        lang === "ar" ? "قوي" : "Qawi",
        lang === "ar" ? "أدخل قيمة واحدة على الأقل" : "Enter at least one measurement"
      );
      return;
    }
    addMeasurement.mutate({ ...data, takenAt: new Date().toISOString() });
  };

  // Filter history by time range
  const now = new Date();
  const filteredHistory = (history.data ?? []).filter((day) => {
    if (historyFilter === "all") return true;
    const d = new Date(day.completedAt ?? day.date);
    const diffMs = now.getTime() - d.getTime();
    if (historyFilter === "week") return diffMs <= 7 * 24 * 3600 * 1000;
    if (historyFilter === "month") return diffMs <= 30 * 24 * 3600 * 1000;
    return true;
  });

  // Personal records: max weight per exercise
  const prMap: Record<string, { name: string; weight: number; date: string }> = {};
  (history.data ?? []).forEach((day) => {
    day.exercises.forEach((ex) => {
      if (ex.actualWeight == null) return;
      const key = ex.exerciseTemplateId ?? ex.planExerciseId;
      const name = (lang === "ar" ? ex.exerciseNameAr : ex.exerciseName) || ex.exerciseName || "?";
      const date = (day.completedAt ?? day.date ?? "").slice(0, 10);
      if (!prMap[key] || ex.actualWeight > prMap[key].weight) {
        prMap[key] = { name, weight: ex.actualWeight, date };
      }
    });
  });
  const prs = Object.values(prMap).sort((a, b) => b.weight - a.weight);

  const refreshing = measurements.isFetching || history.isFetching;

  return (
    <Screen>
      <RoleHeader title={t("member.tabs.progress")} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            tintColor={c.primary}
            refreshing={refreshing}
            onRefresh={() => { measurements.refetch(); history.refetch(); }}
          />
        }
      >
        {/* ── Personal Records ── */}
        {prs.length > 0 && (
          <View>
            <SectionTitle>🏆 {lang === "ar" ? "الأرقام القياسية" : "Personal Records"}</SectionTitle>
            <View style={{ gap: 8, marginTop: 8 }}>
              {prs.slice(0, 5).map((pr, idx) => (
                <Card key={idx} style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>
                      {pr.name}
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 11, marginTop: 2 }}>{pr.date}</Text>
                  </View>
                  <View style={{ backgroundColor: "#f59e0b22", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: "#f59e0b", fontWeight: "800", fontSize: 16 }}>{pr.weight} kg</Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* ── Workout History ── */}
        <View>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
            <SectionTitle>{lang === "ar" ? "سجل التدريبات" : "Workout History"}</SectionTitle>
          </View>

          {/* Filter tabs */}
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginTop: 10, marginBottom: 12 }}>
            {(["week", "month", "all"] as const).map((f) => {
              const label =
                f === "week" ? (lang === "ar" ? "هذا الأسبوع" : "This Week") :
                f === "month" ? (lang === "ar" ? "هذا الشهر" : "This Month") :
                (lang === "ar" ? "الكل" : "All Time");
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setHistoryFilter(f)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 20,
                    alignItems: "center",
                    backgroundColor: historyFilter === f ? c.primary : c.muted,
                  }}
                >
                  <Text style={{ color: historyFilter === f ? "#fff" : c.mutedForeground, fontSize: 12, fontWeight: "700" }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {history.isLoading ? (
            [...Array(3)].map((_, i) => (
              <View key={i} style={{ height: 72, backgroundColor: c.surface, borderRadius: 16, marginBottom: 8, opacity: 0.6 }} />
            ))
          ) : filteredHistory.length === 0 ? (
            <Card>
              <EmptyState icon="activity" text={lang === "ar" ? "لا توجد تدريبات مكتملة بعد" : "No completed workouts yet"} />
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredHistory.map((day) => (
                <HistoryDayCard key={day.dayId} day={day} lang={lang} isRTL={isRTL} />
              ))}
            </View>
          )}
        </View>

        {/* ── Measurements ── */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>{t("member.measurements")}</SectionTitle>
          <Pressable onPress={() => setOpen(true)}>
            <Feather name="plus-circle" size={24} color={c.primary} />
          </Pressable>
        </View>

        {measurements.isLoading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={{ height: 80, backgroundColor: c.surface, borderRadius: 16, opacity: 0.6 }} />
            ))}
          </>
        ) : !measurements.data?.length ? (
          <Card>
            <EmptyState icon="bar-chart" text={t("common.noData")} />
            <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: "center", marginTop: 8 }}>
              {lang === "ar" ? "لم تُسجَّل أي قياسات بعد. أضف قياسك الأول!" : "No measurements yet. Add your first one!"}
            </Text>
            <View style={{ marginTop: 12 }}>
              <Button title={lang === "ar" ? "إضافة قياس" : "Add Measurement"} icon="plus" onPress={() => setOpen(true)} />
            </View>
          </Card>
        ) : (
          measurements.data.slice(0, 5).map((m: any) => (
            <Card key={m.id}>
              <Text style={{ color: c.mutedForeground, fontSize: 12, marginBottom: 6 }}>
                {(m.takenAt ?? m.createdAt ?? "").slice(0, 10)}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {FIELDS.filter((f) => m[f.key] != null).map((f) => (
                  <View key={f.key}>
                    <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{t(`member.${f.label}`)}</Text>
                    <Text style={{ color: c.foreground, fontWeight: "700" }}>{m[f.key]}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: c.surface, padding: 20,
            borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12,
          }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800" }}>{t("member.addMeasurement")}</Text>
            {FIELDS.map((f) => (
              <Input
                key={f.key}
                placeholder={t(`member.${f.label}`)}
                keyboardType="numeric"
                value={vals[f.key] ?? ""}
                onChangeText={(v) => setVals((p) => ({ ...p, [f.key]: v }))}
              />
            ))}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Button title={t("common.cancel")} variant="secondary" onPress={() => setOpen(false)} /></View>
              <View style={{ flex: 1 }}><Button title={t("common.save")} onPress={submit} loading={addMeasurement.isPending} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
