import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Card, EmptyState, Screen, SectionTitle } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{label}</Text>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={{ color: c.foreground, fontSize: 24, fontWeight: "800" }}>{value}</Text>
    </Card>
  );
}

export default function AdminDashboard() {
  const c = useColors();
  const { t, isRTL } = useLanguage();

  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => apiFetch<any>("/admin/dashboard/stats").catch(() => null),
  });
  const expiring = useQuery({
    queryKey: ["admin", "expiring"],
    queryFn: () => apiFetch<any[]>("/admin/members/expiring").catch(() => []),
  });

  return (
    <Screen>
      <RoleHeader title={t("admin.tabs.dashboard")} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl tintColor={c.primary} refreshing={stats.isFetching} onRefresh={() => { stats.refetch(); expiring.refetch(); }} />}
      >
        {stats.isLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
              <StatCard label={t("admin.totalMembers")} value={stats.data?.totalMembers ?? 0} icon="users" color={c.primary} />
              <StatCard label={t("admin.activeWeek")} value={stats.data?.activeThisWeek ?? 0} icon="activity" color={c.success} />
            </View>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
              <StatCard label={t("admin.expiringWeek")} value={stats.data?.expiringThisWeek ?? 0} icon="alert-circle" color={c.warning} />
              <StatCard label={t("admin.totalCoaches")} value={stats.data?.totalCoaches ?? 0} icon="award" color={c.primary} />
            </View>
          </>
        )}

        <SectionTitle>{t("admin.expiring")}</SectionTitle>
        {(expiring.data ?? []).length === 0 ? (
          <Card><EmptyState icon="check-circle" text={t("common.noData")} /></Card>
        ) : (
          (expiring.data ?? []).map((m: any) => (
            <Card key={m.id}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{m.name}</Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                    Expires {(m.subscriptionExpiresAt ?? "").slice(0, 10)}
                  </Text>
                </View>
                <Feather name="clock" size={18} color={c.warning} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
