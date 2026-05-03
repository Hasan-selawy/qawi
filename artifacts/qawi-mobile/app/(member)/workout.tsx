import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Button, Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function WorkoutScreen() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const qc = useQueryClient();
  const [done, setDone] = useState<Record<string, boolean>>({});

  const today = useQuery({
    queryKey: ["member", "today"],
    queryFn: () => apiFetch<any>("/member/workouts/today").catch(() => null),
  });

  const complete = useMutation({
    mutationFn: () => apiFetch("/member/workouts/complete", { method: "POST", data: { date: new Date().toISOString().slice(0, 10) } }),
    onSuccess: () => {
      Alert.alert("Qawi", "Workout completed!");
      setDone({});
      qc.invalidateQueries({ queryKey: ["member"] });
    },
    onError: () => Alert.alert("Qawi", "Could not complete workout"),
  });

  return (
    <Screen>
      <RoleHeader title={t("member.tabs.workout")} />
      {today.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : !today.data || today.data.restDay ? (
        <View style={{ flex: 1, padding: 20 }}>
          <Card><EmptyState icon="moon" text={today.data?.restDay ? t("member.restDay") : t("member.noPlan")} /></Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
          {(today.data.exercises ?? []).map((ex: any, i: number) => {
            const id = ex.id ?? String(i);
            const isDone = !!done[id];
            return (
              <Card key={id}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontSize: 16, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>
                      {pickName(lang, ex) || `Exercise ${i + 1}`}
                    </Text>
                    <Text style={{ color: c.mutedForeground, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
                      {ex.sets ?? 3} × {ex.reps ?? 10}{ex.weight ? `  •  ${ex.weight}kg` : ""}
                    </Text>
                  </View>
                  <Feather
                    name={isDone ? "check-circle" : "circle"}
                    size={28}
                    color={isDone ? c.primary : c.mutedForeground}
                    onPress={() => setDone((d) => ({ ...d, [id]: !d[id] }))}
                  />
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
