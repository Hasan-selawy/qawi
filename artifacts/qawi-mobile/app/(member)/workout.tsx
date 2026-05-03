import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from "react-native";

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

  // weights[exerciseId] = string typed by member
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  // Prime weight inputs from plan defaults when data arrives
  useEffect(() => {
    const list = today.data?.exercises ?? [];
    if (list.length === 0) return;
    setWeights((prev) => {
      const next = { ...prev };
      list.forEach((ex) => {
        if (next[ex.id] === undefined) next[ex.id] = ex.weight != null ? String(ex.weight) : "";
      });
      return next;
    });
  }, [today.data]);

  const complete = useMutation({
    mutationFn: async () => {
      const data = today.data;
      if (!data) throw new Error("No workout loaded");
      const exercises = data.exercises ?? [];

      // Step 1: log each exercise
      for (const ex of exercises) {
        const w = parseFloat(weights[ex.id] ?? "");
        await apiFetch("/workouts/logs", {
          method: "POST",
          data: {
            planExerciseId: ex.id,
            actualSets: ex.sets ?? 3,
            actualReps: ex.reps ?? 10,
            actualWeight: Number.isFinite(w) ? w : (ex.weight ?? 0),
          },
        });
      }

      // Step 2: mark day complete
      if (data.dayId) {
        await apiFetch(`/workouts/days/${data.dayId}/complete`, { method: "PUT" });
      }
    },
    onSuccess: () => {
      Alert.alert(lang === "ar" ? "قوي" : "Qawi", lang === "ar" ? "أحسنت! تم حفظ التمرين." : "Great work! Workout saved.");
      setDone({});
      qc.invalidateQueries({ queryKey: ["member"] });
      router.replace("/(member)" as never);
    },
    onError: (e: any) =>
      Alert.alert(lang === "ar" ? "قوي" : "Qawi", e?.message || (lang === "ar" ? "تعذر حفظ التمرين" : "Could not save workout")),
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
              <Button title={lang === "ar" ? "العودة للرئيسية" : "Back to home"} icon="home" onPress={() => router.replace("/(member)" as never)} />
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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
          {list.map((ex, i) => {
            const isDone = !!done[ex.id];
            return (
              <Card key={ex.id}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontSize: 16, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>
                      {pickName(lang, ex) || `Exercise ${i + 1}`}
                    </Text>
                    <Text style={{ color: c.mutedForeground, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
                      {ex.sets ?? 3} × {ex.reps ?? 10}
                    </Text>
                  </View>
                  <Feather
                    name={isDone ? "check-circle" : "circle"}
                    size={28}
                    color={isDone ? c.primary : c.mutedForeground}
                    onPress={() => setDone((d) => ({ ...d, [ex.id]: !d[ex.id] }))}
                  />
                </View>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <Text style={{ color: c.mutedForeground, fontSize: 12, width: 60 }}>{t("member.weight")}</Text>
                  <TextInput
                    value={weights[ex.id] ?? ""}
                    onChangeText={(v) => setWeights((w) => ({ ...w, [ex.id]: v.replace(/[^0-9.]/g, "") }))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={c.mutedForeground}
                    style={{
                      flex: 1,
                      backgroundColor: c.muted,
                      color: c.foreground,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: c.border,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  />
                  <Text style={{ color: c.mutedForeground, fontSize: 12 }}>kg</Text>
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
