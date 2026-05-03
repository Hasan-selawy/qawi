import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Badge, Button, Card, EmptyState, Screen, SectionTitle } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function MemberHome() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const today = useQuery({
    queryKey: ["member", "today"],
    queryFn: () => apiFetch<any>("/member/workouts/today").catch(() => null),
  });
  const stats = useQuery({
    queryKey: ["member", "stats"],
    queryFn: () => apiFetch<any>("/member/attendance/stats").catch(() => null),
  });

  const refreshing = today.isFetching || stats.isFetching;

  return (
    <Screen>
      <RoleHeader title={`${t("member.welcome")}, ${user?.name?.split(" ")[0] ?? ""}`} subtitle={user?.gymName ?? undefined} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl tintColor={c.primary} refreshing={refreshing} onRefresh={() => { today.refetch(); stats.refetch(); }} />
        }
      >
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Feather name="zap" size={20} color={c.primary} />
            <Text style={{ color: c.foreground, fontSize: 22, fontWeight: "800", marginTop: 8 }}>
              {stats.data?.streak ?? 0}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{t("member.streak").replace("{n}", "")}</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Feather name="calendar" size={20} color={c.primary} />
            <Text style={{ color: c.foreground, fontSize: 22, fontWeight: "800", marginTop: 8 }}>
              {stats.data?.thisWeek ?? 0}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>This Week</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Feather name="award" size={20} color={c.primary} />
            <Text style={{ color: c.foreground, fontSize: 22, fontWeight: "800", marginTop: 8 }}>
              {stats.data?.totalDays ?? 0}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>Total</Text>
          </Card>
        </View>

        <SectionTitle>{t("member.todayWorkout")}</SectionTitle>
        {today.isLoading ? (
          <Card><ActivityIndicator color={c.primary} /></Card>
        ) : !today.data ? (
          <Card>
            <EmptyState icon="calendar" text={t("member.noPlan")} />
          </Card>
        ) : today.data.restDay ? (
          <Card style={{ alignItems: "center", paddingVertical: 28 }}>
            <Feather name="moon" size={28} color={c.primary} />
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "700", marginTop: 10 }}>
              {t("member.restDay")}
            </Text>
          </Card>
        ) : (
          <Card>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>
                {pickName(lang, today.data) || `Day ${today.data.dayNumber ?? ""}`}
              </Text>
              <Badge tone="primary">{(today.data.exercises?.length ?? 0)} ex</Badge>
            </View>
            <Button title={t("member.startWorkout")} icon="play" onPress={() => router.push("/(member)/workout")} />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
