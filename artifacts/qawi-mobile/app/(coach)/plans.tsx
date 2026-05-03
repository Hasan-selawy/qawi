import { Feather } from "@expo/vector-icons";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Button, Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type CoachMember = { id: string; name: string; email: string };

export default function CoachPlans() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<"workout" | "nutrition">("workout");

  const members = useQuery({
    queryKey: ["coach", "members"],
    queryFn: () => apiFetch<CoachMember[]>("/coach/members").catch(() => []),
  });

  const memberList = members.data ?? [];

  const plansQueries = useQueries({
    queries: memberList.map((m) => ({
      queryKey: ["coach", "member-plans", tab, m.id],
      queryFn: () =>
        apiFetch<any[]>(tab === "workout" ? `/workouts/member/${m.id}` : `/nutrition/member/${m.id}`)
          .catch(() => [])
          .then((arr) => arr.map((p) => ({ ...p, _member: m }))),
      enabled: !!m.id,
    })),
  });

  const loading = members.isLoading || plansQueries.some((q) => q.isLoading);
  const allPlans = plansQueries.flatMap((q) => q.data ?? []);

  const onCreate = () => {
    if (memberList.length === 0) {
      Alert.alert("Qawi", t("coach.noMembers"));
      return;
    }
    if (tab === "workout") router.push("/coach/create-plan" as never);
    else router.push("/coach/create-nutrition" as never);
  };

  return (
    <Screen>
      <RoleHeader title={t("coach.tabs.plans")} />

      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, paddingHorizontal: 16, paddingTop: 16 }}>
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

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Button title={t("coach.createPlan")} icon="plus" onPress={onCreate} />
      </View>

      {loading ? (
        <View style={{ padding: 24 }}><ActivityIndicator color={c.primary} /></View>
      ) : allPlans.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card><EmptyState icon="layers" text={t("coach.noPlans")} /></Card>
        </View>
      ) : (
        <FlatList
          data={allPlans}
          keyExtractor={(p, i) => `${p.id ?? i}`}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/member/${item._member.id}` as never)}>
              <Card>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15, textAlign: isRTL ? "right" : "left" }}>
                      {pickName(lang, item) || item.name || "Plan"}
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                      {item._member?.name}
                      {item.startDate ? `  •  ${String(item.startDate).slice(0, 10)}` : ""}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={c.mutedForeground} />
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
