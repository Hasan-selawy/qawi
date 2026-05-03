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
  const [done, setDone] = useState<Record<string, boolean>>({});

  // Initialise weight arrays when exercises load
  useEffect(() => {
    const list = today.data?.exercises ?? [];
    if (list.length === 0) return;
    setSetWeights((prev) => {
      const next = { ...prev };
      list.forEach((ex) => {
        if (!next[ex.id]) {
          const numSets = ex.sets ?? 3;
          const defaultW = ex.weight != null ? String(ex.weight) : "";
          next[ex.id] = Array(numSets).fill(defaultW);
        }
      });
      return next;
    });
  }, [today.data]);

  const complete = useMutation({
    mutationFn: async () => {
      const data = today.data;
      if (!data) throw new Error("No workout loaded");
      const exercises = data.exercises ?? [];

      // Log each set of each exercise as its own WorkoutLog entry
      for (const ex of exercises) {
        const sets = setWeights[ex.id] ?? [];
        for (let i = 0; i < sets.length; i++) {
          const w = parseFloat(sets[i] ?? "");
          await apiFetch("/workouts/logs", {
            method: "POST",
            data: {
              planExerciseId: ex.id,
              actualSets: 1,
              actualReps: ex.reps ?? 10,
              actualWeight: Number.isFinite(w) ? w : (ex.weight ?? 0),
            },
          });
        }
      }

      // Mark day complete
      if (data.dayId) {
        await apiFetch(`/workouts/days/${data.dayId}/complete`, { method: "PUT" });
      }
    },
    onSuccess: () => {
      Alert.alert(
        lang === "ar" ? "قوي" : "Qawi",
        lang === "ar" ? "أحسنت! تم حفظ التمرين." : "Great work! Workout saved."
      );
      setDone({});
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
            <View
              style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: c.primary + "22",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Feather name="check-circle" size={34} color={c.primary} />
            </View>
            <Text style={{ color: c.foreground, fontSize: 20, fontWeight: "800", marginTop: 14, textAlign: "center" }}>
              {lang === "ar" ? "أنهيت تمرين اليوم 💪" : "You've finished today's workout 💪"}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 12 }}>
              {lang === "ar" ? "أحسنت! نراك في التمرين القادم." : "Great job! See you next time."}
            </Text>
            <View style={{ marginTop: 20, width: "100%" }}>
              <Button
                title={lang === "ar" ? "العودة للرئيسية" : "Back to home"}
                icon="home"
                onPress={() => router.replace("/(member)" as never)}
              />
            </View>
          </Card>
        </View>
      ) : !today.data || today.data.restDay || list.length === 0 ? (
        <View style={{ flex: 1, padding: 20 }}>
          <Card>
            <EmptyState
              icon="moon"
              text={today.data?.restDay ? t("member.restDay") : t("member.noPlan")}
            />
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
          {list.map((ex, i) => {
            const numSets = ex.sets ?? 3;
            const weights = setWeights[ex.id] ?? Array(numSets).fill("");
            const isDone = !!done[ex.id];

            return (
              <Card key={ex.id}>
                {/* Video button */}
                {ex.videoUrl ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(ex.videoUrl!)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      backgroundColor: "#CC0000",
                      paddingHorizontal: 12, paddingVertical: 6,
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
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontSize: 16, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>
                      {pickName(lang, ex) || `Exercise ${i + 1}`}
                    </Text>
                    <Text style={{ color: c.mutedForeground, marginTop: 3, textAlign: isRTL ? "right" : "left", fontSize: 13 }}>
                      {numSets} {lang === "ar" ? "مجموعات" : "sets"} × {ex.reps ?? 10} {lang === "ar" ? "تكرار" : "reps"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDone((d) => ({ ...d, [ex.id]: !d[ex.id] }))}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: isDone ? c.primary + "22" : c.muted,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Feather
                      name={isDone ? "check-circle" : "circle"}
                      size={22}
                      color={isDone ? c.primary : c.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>

                {/* Per-set weight inputs */}
                <View style={{ gap: 8 }}>
                  {weights.map((w, setIdx) => (
                    <View
                      key={setIdx}
                      style={{
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center", gap: 10,
                        backgroundColor: c.muted + "55",
                        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
                      }}
                    >
                      <View style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: c.primary + "33",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Text style={{ color: c.primary, fontSize: 11, fontWeight: "800" }}>
                          {setIdx + 1}
                        </Text>
                      </View>
                      <Text style={{ color: c.mutedForeground, fontSize: 12, width: 50 }}>
                        {lang === "ar" ? `مج ${setIdx + 1}` : `Set ${setIdx + 1}`}
                      </Text>
                      <TextInput
                        value={w}
                        onChangeText={(v) => {
                          const sanitised = v.replace(/[^0-9.]/g, "");
                          setSetWeights((prev) => {
                            const arr = [...(prev[ex.id] ?? Array(numSets).fill(""))];
                            arr[setIdx] = sanitised;
                            return { ...prev, [ex.id]: arr };
                          });
                        }}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={c.mutedForeground}
                        style={{
                          flex: 1,
                          backgroundColor: c.surface,
                          color: c.foreground,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor: c.border,
                          textAlign: isRTL ? "right" : "left",
                          fontSize: 15,
                          fontWeight: "600",
                        }}
                      />
                      <Text style={{ color: c.mutedForeground, fontSize: 12 }}>kg</Text>
                    </View>
                  ))}
                </View>
              </Card>
            );
          })}

          <Button
            title={t("member.completeWorkout")}
            icon="check"
            onPress={() => complete.mutate()}
            loading={complete.isPending}
          />
        </ScrollView>
      )}
    </Screen>
  );
}
