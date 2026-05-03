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

  const today = new Date().toISOString().slice(0, 10);
  const already = (history.data ?? []).some((r: any) => (r.date ?? "").startsWith(today));

  const checkin = useMutation({
    mutationFn: () => apiFetch("/member/attendance/checkin", { method: "POST" }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ["member"] });
    },
    onError: (e: any) => Alert.alert("Qawi", e?.body?.error || "Check-in failed"),
  });

  return (
    <Screen>
      <RoleHeader title={t("member.tabs.checkin")} />
      <View style={{ padding: 16, gap: 16, flex: 1 }}>
        <Card style={{ alignItems: "center", paddingVertical: 32 }}>
          <Feather name={already ? "check-circle" : "log-in"} size={42} color={c.primary} />
          <Text style={{ color: c.foreground, fontSize: 22, fontWeight: "800", marginTop: 14 }}>
            {already ? t("member.alreadyCheckedIn") : t("member.checkIn")}
          </Text>
          <Text style={{ color: c.mutedForeground, marginTop: 4 }}>
            {stats.data?.streak ? t("member.streak").replace("{n}", String(stats.data.streak)) : ""}
          </Text>
          {!already && (
            <Button title={t("member.checkIn")} icon="check" onPress={() => checkin.mutate()} loading={checkin.isPending} style={{ marginTop: 18, alignSelf: "stretch" }} />
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
