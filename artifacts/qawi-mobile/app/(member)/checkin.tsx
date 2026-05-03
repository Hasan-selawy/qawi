import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React from "react";
import { Alert, FlatList, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Button, Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function CheckinScreen() {
  const c = useColors();
  const { t, isRTL } = useLanguage();
  const qc = useQueryClient();

  const history = useQuery({
    queryKey: ["member", "attendance"],
    queryFn: () => apiFetch<any[]>("/member/attendance").catch(() => []),
  });
  const stats = useQuery({
    queryKey: ["member", "stats"],
    queryFn: () => apiFetch<any>("/member/attendance/stats").catch(() => null),
  });

  const checkedIn = !!stats.data?.checkedInToday;
  const checkedOut = !!stats.data?.checkedOutToday;
  const checkedOutAt: string | undefined = stats.data?.checkedOutAt;

  const checkin = useMutation({
    mutationFn: () => apiFetch("/member/attendance/checkin", { method: "POST" }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ["member"] });
    },
    onError: (e: any) => Alert.alert("Qawi", e?.body?.error || "Check-in failed"),
  });

  const checkout = useMutation({
    mutationFn: () => apiFetch("/member/attendance/checkout", { method: "POST" }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ["member"] });
    },
    onError: (e: any) => Alert.alert("Qawi", e?.body?.error || "Check-out failed"),
  });

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const statusIcon = checkedOut ? "log-out" : checkedIn ? "check-circle" : "log-in";
  const statusLabel = checkedOut
    ? t("member.checkedOutAt").replace("{t}", formatTime(checkedOutAt))
    : checkedIn
    ? t("member.alreadyCheckedIn")
    : t("member.checkIn");

  return (
    <Screen>
      <RoleHeader title={t("member.tabs.checkin")} />
      <View style={{ padding: 16, gap: 16, flex: 1 }}>
        <Card style={{ alignItems: "center", paddingVertical: 32 }}>
          <Feather name={statusIcon} size={42} color={c.primary} />
          <Text style={{ color: c.foreground, fontSize: 20, fontWeight: "800", marginTop: 14, textAlign: "center" }}>
            {statusLabel}
          </Text>
          <Text style={{ color: c.mutedForeground, marginTop: 4 }}>
            {stats.data?.streak ? t("member.streak").replace("{n}", String(stats.data.streak)) : ""}
          </Text>

          {!checkedIn && (
            <Button
              title={t("member.checkIn")}
              icon="check"
              onPress={() => checkin.mutate()}
              loading={checkin.isPending}
              style={{ marginTop: 18, alignSelf: "stretch" }}
            />
          )}

          {checkedIn && !checkedOut && (
            <Button
              title={t("member.endDay")}
              icon="log-out"
              onPress={() =>
                Alert.alert(
                  "Qawi",
                  t("member.endDay") + "?",
                  [
                    { text: t("common.cancel"), style: "cancel" },
                    { text: t("member.checkOut"), onPress: () => checkout.mutate() },
                  ]
                )
              }
              loading={checkout.isPending}
              style={{ marginTop: 18, alignSelf: "stretch" }}
            />
          )}
        </Card>

        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16, textAlign: isRTL ? "right" : "left" }}>History</Text>
        {history.isLoading ? null : (history.data ?? []).length === 0 ? (
          <Card><EmptyState icon="calendar" text={t("common.noData")} /></Card>
        ) : (
          <FlatList
            data={history.data}
            keyExtractor={(item: any, i) => item.id ?? String(i)}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <Card>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: c.foreground }}>{(item.date ?? "").slice(0, 10)}</Text>
                  <Feather name="check-circle" size={18} color={c.primary} />
                </View>
              </Card>
            )}
          />
        )}
      </View>
    </Screen>
  );
}
