import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Button, Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type PlanExercise = {
  id: string;
  name?: string;
  nameAr?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  videoUrl?: string | null;
};
type TodayResponse = {
  dayId?: string;
  restDay?: boolean;
  isCompleted?: boolean;
  exercises?: PlanExercise[];
};

export default function WorkoutScreen() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const qc = useQueryClient();
  const router = useRouter();

  const today = useQuery({
    queryKey: ["member", "today"],
    queryFn: () => apiFetch<TodayResponse>("/member/workouts/today").catch(() => null),
  });

  // Per-set weights: exerciseId → string[] (one per set)
  const [setWeights, setSetWeights] = useState<Record<string, string[]>>({});
  // Per-set actual reps: exerciseId → string[]
  const [setReps, setSetReps] = useState<Record<string, string[]>>({});
  // Per-set notes: exerciseId → string[]
  const [setNotes, setSetNotes] = useState<Record<string, string[]>>({});
  // Per-set completion: exerciseId → boolean[]
  const [setDone, setSetDone] = useState<Record<string, boolean[]>>({});

  const initState = (list: PlanExercise[]) => {
    setSetWeights((prev) => {
      const next = { ...prev };
      list.forEach((ex) => {
        if (!next[ex.id]) {
          const n = ex.sets ?? 3;
          next[ex.id] = Array(n).fill(ex.weight != null ? String(ex.weight) : "");
        }
      });
      return next;
    });
    setSetReps((prev) => {
      const next = { ...prev };
      list.forEach((ex) => {
        if (!next[ex.id]) next[ex.id] = Array(ex.sets ?? 3).fill(String(ex.reps ?? 10));
      });
      return next;
    });
    setSetNotes((prev) => {
      const next = { ...prev };
      list.forEach((ex) => {
        if (!next[ex.id]) next[ex.id] = Array(ex.sets ?? 3).fill("");
      });
      return next;
    });
    setSetDone((prev) => {
      const next = { ...prev };
      list.forEach((ex) => {
        if (!next[ex.id]) next[ex.id] = Array(ex.sets ?? 3).fill(false);
      });
      return next;
    });
  };

  useEffect(() => {
    const list = today.data?.exercises ?? [];
    if (list.length > 0) initState(list);
  }, [today.data]);

  const totalSets = Object.values(setDone).reduce((acc, arr) => acc + arr.length, 0);
  const completedSets = Object.values(setDone).reduce((acc, arr) => acc + arr.filter(Boolean).length, 0);

  const complete = useMutation({
    mutationFn: async () => {
      const data = today.data;
      if (!data) throw new Error("No workout loaded");
      const exercises = data.exercises ?? [];

      for (const ex of exercises) {
        const weights = setWeights[ex.id] ?? [];
        const reps = setReps[ex.id] ?? [];
        const notes = setNotes[ex.id] ?? [];
        const done = setDone[ex.id] ?? [];
        const numSets = ex.sets ?? 3;

        for (let i = 0; i < numSets; i++) {
          if (!done[i]) continue;
          const w = parseFloat(weights[i] ?? "");
          const r = parseInt(reps[i] ?? "", 10);
          await apiFetch("/workouts/logs", {
            method: "POST",
            data: {
              planExerciseId: ex.id,
              actualSets: 1,
              actualReps: Number.isFinite(r) ? r : (ex.reps ?? 10),
              actualWeight: Number.isFinite(w) ? w : (ex.weight ?? 0),
              notes: notes[i] || null,
            },
          });
        }
      }

      if (data.dayId) {
        await apiFetch(`/workouts/days/${data.dayId}/complete`, { method: "PUT" });
      }
    },
    onSuccess: () => {
      Alert.alert(
        lang === "ar" ? "قوي 💪" : "Qawi 💪",
        lang === "ar"
          ? `أحسنت! أنجزت ${completedSets} من ${totalSets} مجموعة اليوم.`
          : `Great work! You completed ${completedSets}/${totalSets} sets today.`
      );
      setSetDone({});
      qc.invalidateQueries({ queryKey: ["member"] });
      router.replace("/(member)" as never);
    },
    onError: (e: any) =>
      Alert.alert(
        lang === "ar" ? "قوي" : "Qawi",
        e?.message || (lang === "ar" ? "تعذر حفظ التمرين" : "Could not save workout")
      ),
  });

  const list = today.data?.exercises ?? [];

  const toggleSet = (exId: string, setIdx: number) => {
    setSetDone((prev) => {
      const arr = [...(prev[exId] ?? [])];
      arr[setIdx] = !arr[setIdx];
      return { ...prev, [exId]: arr };
    });
  };

  return (
    <Screen>
      <RoleHeader title={t("member.tabs.workout")} />
      {today.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : today.data?.isCompleted ? (
        <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
          <Card style={{ alignItems: "center", paddingVertical: 36 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center" }}>
              <Feather name="check-circle" size={34} color={c.primary} />
            </View>
            <Text style={{ color: c.foreground, fontSize: 20, fontWeight: "800", marginTop: 14, textAlign: "center" }}>
              {lang === "ar" ? "أنهيت تمرين اليوم 💪" : "You've finished today's workout 💪"}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 12 }}>
              {lang === "ar" ? "أحسنت! نراك في التمرين القادم." : "Great job! See you next time."}
            </Text>
            <View style={{ marginTop: 20, width: "100%" }}>
              <Button title={lang === "ar" ? "العودة للرئيسية" : "Back to home"} icon="home" onPress={() => router.replace("/(member)" as never)} />
            </View>
          </Card>
        </View>
      ) : !today.data || today.data.restDay || list.length === 0 ? (
        <View style={{ flex: 1, padding: 20 }}>
          <Card>
            <EmptyState icon="moon" text={today.data?.restDay ? t("member.restDay") : t("member.noPlan")} />
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
          {/* Session progress bar */}
          {totalSets > 0 && (
            <View style={{ backgroundColor: c.muted, borderRadius: 12, padding: 14 }}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14 }}>
                  {lang === "ar" ? "تقدم الجلسة" : "Session Progress"}
                </Text>
                <Text style={{ color: c.primary, fontWeight: "800", fontSize: 14 }}>
                  {completedSets}/{totalSets} {lang === "ar" ? "مجموعة" : "sets"}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: c.border, borderRadius: 3, overflow: "hidden" }}>
                <View style={{ height: 6, width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%`, backgroundColor: c.primary, borderRadius: 3 }} />
              </View>
            </View>
          )}

          {list.map((ex, i) => {
            const numSets = ex.sets ?? 3;
            const weights = setWeights[ex.id] ?? Array(numSets).fill("");
            const reps = setReps[ex.id] ?? Array(numSets).fill(String(ex.reps ?? 10));
            const notes = setNotes[ex.id] ?? Array(numSets).fill("");
            const done = setDone[ex.id] ?? Array(numSets).fill(false);
            const allDone = done.every(Boolean);

            return (
              <Card key={ex.id}>
                {/* Video button */}
                {ex.videoUrl ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(ex.videoUrl!)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      backgroundColor: "#CC0000", paddingHorizontal: 12, paddingVertical: 6,
                      borderRadius: 8, marginBottom: 10, alignSelf: "flex-start",
                    }}
                  >
                    <Feather name="play" size={12} color="white" style={{ marginRight: 6 }} />
                    <Text style={{ color: "white", fontSize: 12, fontWeight: "600" }}>
                      {lang === "ar" ? "شاهد الفيديو" : "Watch Video"}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Exercise header */}
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontSize: 16, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>
                      {pickName(lang, ex) || `Exercise ${i + 1}`}
                    </Text>
                    <Text style={{ color: c.mutedForeground, marginTop: 3, textAlign: isRTL ? "right" : "left", fontSize: 13 }}>
                      {numSets} {lang === "ar" ? "مجموعات" : "sets"} × {ex.reps ?? 10} {lang === "ar" ? "تكرار مخطط" : "planned reps"}
                    </Text>
                  </View>
                  {/* Mark all sets done quickly */}
                  <TouchableOpacity
                    onPress={() => setSetDone((prev) => ({ ...prev, [ex.id]: Array(numSets).fill(!allDone) }))}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: allDone ? c.primary + "22" : c.muted,
                      flexDirection: "row", alignItems: "center", gap: 4,
                    }}
                  >
                    <Feather name={allDone ? "check-circle" : "circle"} size={16} color={allDone ? c.primary : c.mutedForeground} />
                    <Text style={{ color: allDone ? c.primary : c.mutedForeground, fontSize: 11, fontWeight: "600" }}>
                      {lang === "ar" ? "الكل" : "All"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Per-set rows */}
                <View style={{ gap: 10 }}>
                  {Array.from({ length: numSets }).map((_, setIdx) => {
                    const isDone = done[setIdx] ?? false;
                    return (
                      <View
                        key={setIdx}
                        style={{
                          backgroundColor: isDone ? c.primary + "11" : c.muted + "55",
                          borderRadius: 12, padding: 12,
                          borderWidth: 1.5,
                          borderColor: isDone ? c.primary + "44" : c.border + "44",
                        }}
                      >
                        {/* Set header row */}
                        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <View style={{
                            width: 28, height: 28, borderRadius: 14,
                            backgroundColor: isDone ? c.primary : c.primary + "33",
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <Text style={{ color: isDone ? "white" : c.primary, fontSize: 12, fontWeight: "800" }}>
                              {setIdx + 1}
                            </Text>
                          </View>
                          <Text style={{ color: c.mutedForeground, fontSize: 13, fontWeight: "600", flex: 1, textAlign: isRTL ? "right" : "left" }}>
                            {lang === "ar" ? `مجموعة ${setIdx + 1}` : `Set ${setIdx + 1}`}
                            {" · "}
                            <Text style={{ color: c.mutedForeground, fontWeight: "400" }}>
                              {lang === "ar" ? `${ex.reps ?? 10} تكرار مخطط` : `${ex.reps ?? 10} planned`}
                            </Text>
                          </Text>
                          {/* Complete Set button */}
                          <TouchableOpacity
                            onPress={() => toggleSet(ex.id, setIdx)}
                            style={{
                              width: 34, height: 34, borderRadius: 17,
                              backgroundColor: isDone ? c.primary : c.muted,
                              alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Feather name={isDone ? "check" : "circle"} size={18} color={isDone ? "white" : c.mutedForeground} />
                          </TouchableOpacity>
                        </View>

                        {/* Inputs row: weight + actual reps */}
                        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginBottom: 8 }}>
                          {/* Weight */}
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: c.mutedForeground, fontSize: 11, marginBottom: 4, textAlign: isRTL ? "right" : "left" }}>
                              {lang === "ar" ? "الوزن (kg)" : "Weight (kg)"}
                            </Text>
                            <TextInput
                              value={weights[setIdx] ?? ""}
                              onChangeText={(v) => {
                                const s = v.replace(/[^0-9.]/g, "");
                                setSetWeights((prev) => {
                                  const arr = [...(prev[ex.id] ?? Array(numSets).fill(""))];
                                  arr[setIdx] = s;
                                  return { ...prev, [ex.id]: arr };
                                });
                              }}
                              keyboardType="decimal-pad"
                              placeholder="0"
                              placeholderTextColor={c.mutedForeground}
                              style={{
                                backgroundColor: c.surface, color: c.foreground,
                                borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
                                borderWidth: 1, borderColor: c.border,
                                textAlign: isRTL ? "right" : "left", fontSize: 15, fontWeight: "600",
                              }}
                            />
                          </View>

                          {/* Actual reps */}
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: c.mutedForeground, fontSize: 11, marginBottom: 4, textAlign: isRTL ? "right" : "left" }}>
                              {lang === "ar" ? "التكرار الفعلي" : "Actual Reps"}
                            </Text>
                            <TextInput
                              value={reps[setIdx] ?? ""}
                              onChangeText={(v) => {
                                const s = v.replace(/[^0-9]/g, "");
                                setSetReps((prev) => {
                                  const arr = [...(prev[ex.id] ?? Array(numSets).fill(""))];
                                  arr[setIdx] = s;
                                  return { ...prev, [ex.id]: arr };
                                });
                              }}
                              keyboardType="number-pad"
                              placeholder={String(ex.reps ?? 10)}
                              placeholderTextColor={c.mutedForeground}
                              style={{
                                backgroundColor: c.surface, color: c.foreground,
                                borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
                                borderWidth: 1, borderColor: isDone ? c.primary + "66" : c.border,
                                textAlign: isRTL ? "right" : "left", fontSize: 15, fontWeight: "600",
                              }}
                            />
                          </View>
                        </View>

                        {/* Notes */}
                        <TextInput
                          value={notes[setIdx] ?? ""}
                          onChangeText={(v) => {
                            setSetNotes((prev) => {
                              const arr = [...(prev[ex.id] ?? Array(numSets).fill(""))];
                              arr[setIdx] = v;
                              return { ...prev, [ex.id]: arr };
                            });
                          }}
                          placeholder={lang === "ar" ? "ملاحظة (اختياري)..." : "Note (optional)..."}
                          placeholderTextColor={c.mutedForeground}
                          style={{
                            backgroundColor: c.surface, color: c.foreground,
                            borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
                            borderWidth: 1, borderColor: c.border,
                            textAlign: isRTL ? "right" : "left", fontSize: 13,
                          }}
                        />
                      </View>
                    );
                  })}
                </View>
              </Card>
            );
          })}

          {/* Session summary */}
          {completedSets > 0 && (
            <View style={{
              backgroundColor: c.primary + "22", borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: c.primary + "44",
              flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10,
            }}>
              <Feather name="zap" size={22} color={c.primary} />
              <Text style={{ color: c.primary, fontWeight: "700", fontSize: 15, flex: 1 }}>
                {lang === "ar"
                  ? `أنجزت ${completedSets} من ${totalSets} مجموعة 💪`
                  : `${completedSets}/${totalSets} sets completed 💪`}
              </Text>
            </View>
          )}

          <Button
            title={t("member.completeWorkout")}
            icon="check"
            onPress={() => {
              if (completedSets === 0) {
                Alert.alert(
                  lang === "ar" ? "لا توجد مجموعات مكتملة" : "No sets completed",
                  lang === "ar"
                    ? "أكمل مجموعة واحدة على الأقل قبل الحفظ."
                    : "Complete at least one set before saving.",
                  [
                    { text: lang === "ar" ? "استمر" : "Continue", style: "cancel" },
                    {
                      text: lang === "ar" ? "احفظ على أي حال" : "Save anyway",
                      onPress: () => complete.mutate(),
                    },
                  ]
                );
              } else {
                complete.mutate();
              }
            }}
            loading={complete.isPending}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
