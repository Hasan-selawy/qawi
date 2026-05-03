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
  const upcoming = useQuery({
    queryKey: ["member", "upcoming"],
    queryFn: () => apiFetch<any[]>("/member/workouts/upcoming").catch(() => []),
  });

  const refreshing = today.isFetching || stats.isFetching || upcoming.isFetching;

  return (
    <Screen>
      <RoleHeader title={`${t("member.welcome")}, ${user?.name?.split(" ")[0] ?? ""}`} subtitle={user?.gymName ?? undefined} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl tintColor={c.primary} refreshing={refreshing} onRefresh={() => { today.refetch(); stats.refetch(); upcoming.refetch(); }} />
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
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{t("member.thisWeek")}</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: "center" }}>
            <Feather name="award" size={20} color={c.primary} />
            <Text style={{ color: c.foreground, fontSize: 22, fontWeight: "800", marginTop: 8 }}>
              {stats.data?.totalDays ?? 0}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{t("member.total")}</Text>
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

        <SectionTitle>{t("member.upcomingTraining")}</SectionTitle>
        {(upcoming.data ?? []).length === 0 ? (
          <Card><EmptyState icon="calendar" text={t("member.noUpcoming")} /></Card>
        ) : (
          (upcoming.data ?? []).slice(0, 5).map((d: any) => {
            const dateStr = (d.date ?? "").slice(0, 10);
            const label = lang === "ar" ? (d.dayNameAr ?? d.dayName) : d.dayName;
            return (
              <Card key={d.dayId}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15 }}>{label || dateStr}</Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2 }}>{dateStr}</Text>
                  </View>
                  {d.restDay ? (
                    <Badge tone="neutral">{t("member.restDay")}</Badge>
                  ) : (
                    <Badge tone="primary">{d.exerciseCount ?? 0} ex</Badge>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
