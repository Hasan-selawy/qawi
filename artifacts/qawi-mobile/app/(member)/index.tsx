import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import NetInfo from "@react-native-community/netinfo";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Badge, Button, Card, EmptyState, Screen, SectionTitle } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useBranding } from "@/context/BrandingContext";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";
import { attendanceQueue, syncAttendance } from "@/services/attendance-sync";

function LogoBanner() {
  const c = useColors();
  const { customBrandingEnabled, logoUrl, gymName } = useBranding();
  const [imgFailed, setImgFailed] = useState(false);

  if (customBrandingEnabled) {
    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          backgroundColor: c.background,
          gap: 4,
        }}
      >
        {logoUrl && !imgFailed ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ height: 60, width: 180 }}
            resizeMode="contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Text style={{ color: c.foreground, fontSize: 20, fontWeight: "800" }}>
            {gymName || "Qawi"}
          </Text>
        )}
        <Text style={{ color: c.mutedForeground, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>
          Powered by Qawi
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        backgroundColor: c.background,
      }}
    >
      <Text style={{ color: c.primary, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 }}>
        Qawi
      </Text>
    </View>
  );
}



function SelfTrainingPlanCard() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [planName, setPlanName] = useState("");

  const createPlan = useMutation({
    mutationFn: () => {
      const today = new Date();
      const end = new Date(today);
      end.setDate(end.getDate() + 30);
      return apiFetch("/workouts", {
        method: "POST",
        data: {
          name: planName.trim() || (lang === "ar" ? "خطتي" : "My Plan"),
          memberId: user?.id,
          startDate: today.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member"] });
      setCreating(false);
      setPlanName("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    onError: (err: any) => {
      Alert.alert(
        lang === "ar" ? "خطأ" : "Error",
        err?.body?.messageAr || err?.body?.error || (lang === "ar" ? "فشل إنشاء الخطة" : "Failed to create plan")
      );
    },
  });

  return (
    <Card style={{ borderColor: "#7c3aed44", borderWidth: 1 }}>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: "#7c3aed22", alignItems: "center", justifyContent: "center",
        }}>
          <Feather name="activity" size={18} color="#a78bfa" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#a78bfa", fontWeight: "800", fontSize: 14, textAlign: isRTL ? "right" : "left" }}>
            {t("member.selfTraining")}
          </Text>
          <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
            {t("member.noPlanSelfTraining")}
          </Text>
        </View>
      </View>

      {creating ? (
        <View style={{ gap: 10 }}>
          <TextInput
            value={planName}
            onChangeText={setPlanName}
            placeholder={t("member.planNamePlaceholder")}
            placeholderTextColor={c.mutedForeground}
            style={{
              backgroundColor: c.muted,
              color: c.foreground,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 14,
              borderWidth: 1,
              borderColor: "#7c3aed44",
              textAlign: isRTL ? "right" : "left",
            }}
            autoFocus
          />
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
            <Pressable
              onPress={() => createPlan.mutate()}
              disabled={createPlan.isPending}
              style={{
                flex: 1, backgroundColor: "#7c3aed", borderRadius: 10,
                paddingVertical: 11, alignItems: "center",
                opacity: createPlan.isPending ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                {createPlan.isPending
                  ? (lang === "ar" ? "جارٍ الإنشاء..." : "Creating...")
                  : t("member.createMyPlan")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setCreating(false); setPlanName(""); }}
              style={{
                paddingHorizontal: 18, backgroundColor: c.muted, borderRadius: 10,
                paddingVertical: 11, alignItems: "center",
              }}
            >
              <Text style={{ color: c.mutedForeground, fontWeight: "600", fontSize: 14 }}>
                {t("common.cancel")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setCreating(true)}
          style={{
            backgroundColor: "#7c3aed",
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            flexDirection: isRTL ? "row-reverse" : "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
            {t("member.buildMyPlan")}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

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
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const [rejectedCount, setRejectedCount] = useState(0);
  const syncPendingCheckins = useCallback(async () => {
    if (!user?.id || !token) return;
    try {
      const result = await syncAttendance(user.id, token);
      setPendingCount(result.pending);
      setRejectedCount(result.rejected);
      if (result.synced) qc.invalidateQueries({ queryKey: ["member"] });
      if (result.newlyRejected) Alert.alert(lang === "ar" ? "سجلات تحتاج مراجعة" : "Attendance needs review",
        lang === "ar" ? "تعذر قبول بعض السجلات. راجع تاريخ الحضور وحالة الاشتراك." : "Some saved operations were rejected. Check attendance dates and subscription status.");
      return result;
    } catch (error) {
      Alert.alert(lang === "ar" ? "قوي" : "Qawi", error instanceof Error ? error.message : "Unable to read saved attendance");
    }
  }, [user?.id, token, qc, lang]);

  useEffect(() => NetInfo.addEventListener((state) => {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    setIsOnline(online);
    if (online) void syncPendingCheckins();
  }), [syncPendingCheckins]);

  useEffect(() => {
    if (!isOnline || !pendingCount) return;
    const timer = setInterval(() => { void syncPendingCheckins(); }, 15000);
    return () => clearInterval(timer);
  }, [isOnline, pendingCount, syncPendingCheckins]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    attendanceQueue.list(user.id).then((records) => {
      if (active) {
        setPendingCount(records.filter((item) => item.status === "pending").length);
        setRejectedCount(records.filter((item) => item.status === "rejected").length);
      }
    }).catch((error) => Alert.alert("Qawi", error.message));
    // Old global queues have no account owner. Preserve them; never replay under the next login.
    AsyncStorage.getItem("pendingCheckins").then(async (raw) => {
      if (raw && raw !== "[]" && !await AsyncStorage.getItem("qawi.legacy-attendance-warning-shown")) {
        Alert.alert("Qawi", lang === "ar" ? "توجد سجلات قديمة بلا حساب مرتبط. تم الاحتفاظ بها على الجهاز؛ تواصل مع الدعم لمراجعتها." : "Older offline records have no account owner. They remain on this device; contact support to review them.");
        await AsyncStorage.setItem("qawi.legacy-attendance-warning-shown", "true");
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.id, lang]);

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

  const checkedIn = !!stats.data?.checkedInToday;
  const checkedOut = !!stats.data?.checkedOutToday;
  const checkedOutAt: string | undefined = stats.data?.checkedOutAt;

  const doCheckin = async (type: "checkin" | "checkout") => {
    if (!user?.id || !token) return;
    try {
      await attendanceQueue.enqueue(user.id, type === "checkin" ? "CHECKIN" : "CHECKOUT");
      const records = await attendanceQueue.list(user.id);
      setPendingCount(records.filter((item) => item.status === "pending").length);
      const result = isOnline ? await syncPendingCheckins() : undefined;
      if (!isOnline) Alert.alert(lang === "ar" ? "قوي" : "Qawi",
        lang === "ar" ? "تم الحفظ على الجهاز. ستتم المزامنة عند عودة الاتصال." : "Saved on this device. Attendance will sync when connected.");
      if (!isOnline || result?.synced) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert("Qawi", error instanceof Error ? error.message : "Attendance could not be saved");
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
      <LogoBanner />

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

      {isOnline && pendingCount > 0 && <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text accessibilityLiveRegion="polite" style={{ color: c.mutedForeground, fontSize: 12 }}>
          {lang === "ar" ? `${pendingCount} سجلات محفوظة على الجهاز وتنتظر المزامنة التلقائية.` : `${pendingCount} records are saved on this device and waiting to sync automatically.`}
        </Text>
      </View>}
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
        {rejectedCount > 0 && <Card>
          <Text accessibilityLiveRegion="polite" style={{ color: c.foreground }}>
            {lang === "ar" ? `${rejectedCount} سجلات تحتاج مراجعة. راجع الحضور وحالة الاشتراك.` : `${rejectedCount} saved records need review. Check attendance dates and subscription status.`}
          </Text>
          <Button title={lang === "ar" ? "إزالة السجلات المرفوضة بعد المراجعة" : "Discard rejected records after review"}
            onPress={() => Alert.alert("Qawi", lang === "ar" ? "هل راجعت هذه السجلات؟" : "Have you reviewed these records?", [
              { text: t("common.cancel"), style: "cancel" },
              { text: lang === "ar" ? "إزالة" : "Discard", style: "destructive", onPress: async () => {
                if (user?.id) { await attendanceQueue.discardRejected(user.id); setRejectedCount(0); }
              } },
            ])} />
        </Card>}
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
          user?.selfTrainingEnabled ? (
            <SelfTrainingPlanCard />
          ) : (
            <Card>
              <EmptyState icon="calendar" text={t("member.noPlan")} />
            </Card>
          )
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
            <Button title={t("member.startWorkout")} icon="play" onPress={() => router.push("/workout" as never)} />
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
