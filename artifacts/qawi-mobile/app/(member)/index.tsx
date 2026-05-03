import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Badge, Button, Card, EmptyState, Screen, SectionTitle } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

function UpcomingDayCard({ day }: { day: any }) {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const dateStr = (day.date ?? "").slice(0, 10);
  const label = lang === "ar" ? (day.dayNameAr ?? day.dayName) : day.dayName;
  const exercises: any[] = day.exercises ?? [];
  const canExpand = !day.restDay && exercises.length > 0;

  return (
    <Card>
      <Pressable
        onPress={() => canExpand && setOpen((o) => !o)}
        style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15 }}>{label || dateStr}</Text>
          <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2 }}>{dateStr}</Text>
        </View>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
          {day.restDay ? (
            <Badge tone="neutral">{t("member.restDay")}</Badge>
          ) : (
            <Badge tone="primary">{day.exerciseCount ?? 0} ex</Badge>
          )}
          {canExpand && (
            <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={c.mutedForeground} />
          )}
        </View>
      </Pressable>

      {open && canExpand && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {exercises.map((ex: any, idx: number) => {
            const exName = (lang === "ar" ? ex.nameAr : ex.name) || ex.name || ex.nameAr || "—";
            const detail = [
              ex.sets != null && ex.reps != null ? `${ex.sets} × ${ex.reps}` : null,
              ex.weight != null ? `${ex.weight} kg` : null,
            ].filter(Boolean).join("  •  ");
            return (
              <View
                key={ex.id ?? idx}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  borderTopWidth: idx === 0 ? 1 : 0,
                  borderTopColor: c.border,
                }}
              >
                <View
                  style={{
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: c.primary + "22",
                    alignItems: "center", justifyContent: "center",
                    marginEnd: isRTL ? 0 : 10, marginStart: isRTL ? 10 : 0,
                  }}
                >
                  <Text style={{ color: c.primary, fontSize: 11, fontWeight: "700" }}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                    {exName}
                  </Text>
                  {detail ? (
                    <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2 }}>{detail}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

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
    queryFn: () => apiFetch<any>("/attendance/me/stats").catch(() => null),
  });
  const upcoming = useQuery({
    queryKey: ["member", "upcoming"],
    queryFn: () => apiFetch<any[]>("/member/workouts/upcoming").catch(() => []),
  });

  const qc = useQueryClient();
  const checkedIn = !!stats.data?.checkedInToday;
  const checkedOut = !!stats.data?.checkedOutToday;
  const checkedOutAt: string | undefined = stats.data?.checkedOutAt;

  const checkin = useMutation({
    mutationFn: () => apiFetch("/attendance/me/checkin", { method: "POST" }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ["member"] });
    },
    onError: (e: any) => Alert.alert(lang === "ar" ? "قوي" : "Qawi", e?.body?.error || "Check-in failed"),
  });
  const checkout = useMutation({
    mutationFn: () => apiFetch("/attendance/me/checkout", { method: "POST" }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ["member"] });
    },
    onError: (e: any) => Alert.alert(lang === "ar" ? "قوي" : "Qawi", e?.body?.error || "Check-out failed"),
  });

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

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
        <Card style={{ alignItems: "center", paddingVertical: 22 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
            <Feather
              name={checkedOut ? "log-out" : checkedIn ? "check-circle" : "log-in"}
              size={28}
              color={c.primary}
            />
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800" }}>
              {checkedOut
                ? t("member.checkedOutAt").replace("{t}", formatTime(checkedOutAt))
                : checkedIn
                ? t("member.alreadyCheckedIn")
                : t("member.checkIn")}
            </Text>
          </View>
          {!!stats.data?.streak && (
            <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 6 }}>
              🔥 {t("member.streak").replace("{n}", String(stats.data.streak))}
            </Text>
          )}
          {!checkedIn && (
            <Button
              title={t("member.checkIn")}
              icon="check"
              onPress={() => checkin.mutate()}
              loading={checkin.isPending}
              style={{ marginTop: 14, alignSelf: "stretch" }}
            />
          )}
          {checkedIn && !checkedOut && (
            <Button
              title={t("member.endDay")}
              icon="log-out"
              onPress={() =>
                Alert.alert(lang === "ar" ? "قوي" : "Qawi", t("member.endDay") + "?", [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("member.checkOut"), onPress: () => checkout.mutate() },
                ])
              }
              loading={checkout.isPending}
              style={{ marginTop: 14, alignSelf: "stretch" }}
            />
          )}
        </Card>

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
        ) : today.data.isCompleted ? (
          <Card style={{ alignItems: "center", paddingVertical: 28 }}>
            <View
              style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: c.primary + "22",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Feather name="check-circle" size={30} color={c.primary} />
            </View>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", marginTop: 12, textAlign: "center" }}>
              {lang === "ar" ? "أنهيت تمرين اليوم 💪" : "You've finished today's workout 💪"}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 6, textAlign: "center" }}>
              {lang === "ar" ? "أحسنت! نراك في التمرين القادم." : "Great job! See you next time."}
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
          (upcoming.data ?? []).slice(0, 5).map((d: any) => (
            <UpcomingDayCard key={d.dayId} day={d} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
