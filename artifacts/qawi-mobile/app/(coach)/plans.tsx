import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function CoachPlans() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const [tab, setTab] = useState<"workout" | "nutrition">("workout");

  const workouts = useQuery({
    queryKey: ["coach", "workout-templates"],
    queryFn: () => apiFetch<any[]>("/coach/workout-templates").catch(() => []),
    enabled: tab === "workout",
  });
  const nutrition = useQuery({
    queryKey: ["coach", "nutrition-templates"],
    queryFn: () => apiFetch<any[]>("/coach/nutrition-templates").catch(() => []),
    enabled: tab === "nutrition",
  });

  const data: any[] = (tab === "workout" ? workouts.data : nutrition.data) ?? [];
  const loading = tab === "workout" ? workouts.isLoading : nutrition.isLoading;

  return (
    <Screen>
      <RoleHeader title={t("coach.tabs.plans")} />
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, padding: 16 }}>
        {(["workout", "nutrition"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setTab(s)}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              borderRadius: c.radius,
              backgroundColor: tab === s ? c.primary : c.surface,
              borderWidth: 1,
              borderColor: tab === s ? c.primary : c.border,
            }}
          >
            <Text style={{ color: tab === s ? c.primaryForeground : c.foreground, fontWeight: "700" }}>
              {s === "workout" ? "Workout" : "Nutrition"}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator color={c.primary} />
      ) : data.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card><EmptyState icon="layers" text={t("coach.noPlans")} /></Card>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i: any) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15, textAlign: isRTL ? "right" : "left" }}>{pickName(lang, item)}</Text>
                  {item.daysPerWeek ? (
                    <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>{item.daysPerWeek} days / week</Text>
                  ) : null}
                </View>
                <Feather name="layers" size={18} color={c.primary} />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
