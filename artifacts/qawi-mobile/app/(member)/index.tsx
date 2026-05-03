import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import NetInfo from "@react-native-community/netinfo";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Badge, Button, Card, EmptyState, Screen, SectionTitle } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

const PENDING_CHECKINS_KEY = "pendingCheckins";

type PendingCheckin = {
  id: string;
  type: "checkin" | "checkout";
  timestamp: string;
};

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
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Track network state
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      const wasOffline = !isOnline;
      setIsOnline(online);
      // When we come back online, sync queued check-ins
      if (wasOffline && online) {
        syncPendingCheckins();
      }
    });
    return () => unsub();
  }, [isOnline]);

  // Count pending on mount
  useEffect(() => {
    AsyncStorage.getItem(PENDING_CHECKINS_KEY).then((raw) => {
      if (raw) {
        try { setPendingCount(JSON.parse(raw).length); } catch { /* */ }
      }
    });
  }, []);

  const syncPendingCheckins = useCallback(async () => {
    const raw = await AsyncStorage.getItem(PENDING_CHECKINS_KEY).catch(() => null);
    if (!raw) return;
    let pending: PendingCheckin[] = [];
    try { pending = JSON.parse(raw); } catch { return; }
    if (pending.length === 0) return;

    const remaining: PendingCheckin[] = [];
    for (const p of pending) {
      try {
        const endpoint = p.type === "checkin" ? "/attendance/me/checkin" : "/attendance/me/checkout";
        await apiFetch(endpoint, { method: "POST" });
      } catch {
        remaining.push(p);
      }
    }
    await AsyncStorage.setItem(PENDING_CHECKINS_KEY, JSON.stringify(remaining)).catch(() => {});
    setPendingCount(remaining.length);
    if (remaining.length < pending.length) {
      qc.invalidateQueries({ queryKey: ["member"] });
    }
  }, []);

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

  const doCheckin = async (type: "checkin" | "checkout") => {
    if (!isOnline) {
      // Queue for later
      const raw = await AsyncStorage.getItem(PENDING_CHECKINS_KEY).catch(() => "[]");
      let queue: PendingCheckin[] = [];
      try { queue = JSON.parse(raw ?? "[]"); } catch { /* */ }
      queue.push({ id: Date.now().toString(), type, timestamp: new Date().toISOString() });
      await AsyncStorage.setItem(PENDING_CHECKINS_KEY, JSON.stringify(queue)).catch(() => {});
      setPendingCount(queue.length);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        lang === "ar" ? "قوي" : "Qawi",
        lang === "ar" ? "تم الحفظ! سيُزامَن تلقائياً عند عودة الاتصال 📶" : "Saved offline! Will sync when back online 📶"
      );
      return;
    }
    const endpoint = type === "checkin" ? "/attendance/me/checkin" : "/attendance/me/checkout";
    try {
      await apiFetch(endpoint, { method: "POST" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ["member"] });
    } catch (e: any) {
      Alert.alert(lang === "ar" ? "قوي" : "Qawi", e?.body?.error || (type === "checkin" ? "Check-in failed" : "Check-out failed"));
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  const refreshing = today.isFetching || stats.isFetching || upcoming.isFetching;

  return (
    <Screen>
      <RoleHeader title={`${t("member.welcome")}, ${user?.name?.split(" ")[0] ?? ""}`} subtitle={user?.gymName ?? undefined} />

      {/* Offline indicator */}
      {!isOnline && (
        <View style={{ backgroundColor: "#ca8a04", paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="wifi-off" size={14} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", flex: 1 }}>
            {lang === "ar" ? "لا يوجد اتصال — سيتم المزامنة لاحقاً" : "Offline — check-ins will sync when reconnected"}
          </Text>
          {pendingCount > 0 && (
            <Text style={{ color: "#fde047", fontSize: 11, fontWeight: "800" }}>{pendingCount} pending</Text>
          )}
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={
          <RefreshControl
            tintColor={c.primary}
            refreshing={refreshing}
            onRefresh={() => { today.refetch(); stats.refetch(); upcoming.refetch(); syncPendingCheckins(); }}
          />
        }
      >
        <Card style={{ alignItems: "center", paddingVertical: 22 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
            <Feather
              name={checkedOut ? "log-out" : checkedIn ? "check-circle" : "log-in"}
              size={28}
              color={!isOnline ? c.mutedForeground : c.primary}
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
              title={isOnline ? t("member.checkIn") : (lang === "ar" ? "تسجيل دخول (أوفلاين)" : "Check In (Offline)")}
              icon="check"
              onPress={() => doCheckin("checkin")}
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
                  { text: t("member.checkOut"), onPress: () => doCheckin("checkout") },
                ])
              }
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
          <Card>
            <View style={{ gap: 10 }}>
              {[...Array(3)].map((_, i) => (
                <View key={i} style={{ height: 16, backgroundColor: c.muted, borderRadius: 8, opacity: 0.6 }} />
              ))}
            </View>
          </Card>
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
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center" }}>
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
          <Card>
            <EmptyState icon="calendar" text={t("member.noUpcoming")} />
          </Card>
        ) : (
          (upcoming.data ?? []).slice(0, 5).map((d: any) => (
            <UpcomingDayCard key={d.dayId} day={d} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
