import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Card, Screen, SectionTitle } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

function KpiCard({ label, value, icon, color, sub }: { label: string; value: any; icon: any; color: string; sub?: string }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{label}</Text>
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
          <Feather name={icon} size={14} color={color} />
        </View>
      </View>
      <Text style={{ color: c.foreground, fontSize: 22, fontWeight: "800" }}>{value ?? "—"}</Text>
      {sub && <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{sub}</Text>}
    </Card>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const c = useColors();
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View>
      <View style={{ height: 8, backgroundColor: c.muted, borderRadius: 4, overflow: "hidden" }}>
        <View style={{ height: 8, width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>
      <Text style={{ color: c.mutedForeground, fontSize: 11, marginTop: 4 }}>{pct}%</Text>
    </View>
  );
}

export default function FinanceDashboard() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const isAr = lang === "ar";

  const summary = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: () => apiFetch<any>("/finance/summary").catch(() => null),
  });
  const revenue = useQuery({
    queryKey: ["finance", "revenue"],
    queryFn: () => apiFetch<any>("/finance/revenue").catch(() => null),
  });
  const subs = useQuery({
    queryKey: ["finance", "subscriptions"],
    queryFn: () => apiFetch<any>("/finance/subscriptions").catch(() => null),
  });

  const refreshAll = () => { summary.refetch(); revenue.refetch(); subs.refetch(); };

  const fmt = (n?: number) => n != null ? `${n.toLocaleString()} SAR` : "—";

  return (
    <Screen>
      <RoleHeader
        title={isAr ? "المالية" : "Finance"}
        subtitle={isAr ? "لوحة التحكم" : "Dashboard"}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        refreshControl={<RefreshControl tintColor={c.primary} refreshing={summary.isFetching} onRefresh={refreshAll} />}
      >
        {/* Revenue KPIs */}
        <SectionTitle>{isAr ? "الإيرادات" : "Revenue"}</SectionTitle>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
          <KpiCard
            label={isAr ? "هذا الشهر" : "This Month"}
            value={fmt(revenue.data?.currentMonthRevenue)}
            icon="trending-up" color="#22C55E"
          />
          <KpiCard
            label={isAr ? "الشهر الماضي" : "Last Month"}
            value={fmt(revenue.data?.lastMonthRevenue)}
            icon="bar-chart-2" color="#3B82F6"
          />
        </View>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
          <KpiCard
            label={isAr ? "إجمالي الإيرادات" : "Total Revenue"}
            value={fmt(revenue.data?.totalRevenue)}
            icon="dollar-sign" color="#F59E0B"
          />
          <KpiCard
            label={isAr ? "متوسط/عضو" : "Avg / Member"}
            value={fmt(revenue.data?.avgPerMember)}
            icon="user" color="#EC4899"
          />
        </View>

        {/* Subscriptions */}
        <SectionTitle>{isAr ? "الاشتراكات" : "Subscriptions"}</SectionTitle>
        <Card>
          <View style={{ gap: 14 }}>
            <View>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ color: c.foreground, fontWeight: "600" }}>{isAr ? "نشط" : "Active"}</Text>
                <Text style={{ color: "#22C55E", fontWeight: "700" }}>{subs.data?.active ?? 0}</Text>
              </View>
              <ProgressBar value={subs.data?.active ?? 0} max={subs.data?.total ?? 1} color="#22C55E" />
            </View>
            <View>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ color: c.foreground, fontWeight: "600" }}>{isAr ? "ينتهي قريباً" : "Expiring Soon"}</Text>
                <Text style={{ color: "#F59E0B", fontWeight: "700" }}>{subs.data?.expiringSoon ?? 0}</Text>
              </View>
              <ProgressBar value={subs.data?.expiringSoon ?? 0} max={subs.data?.total ?? 1} color="#F59E0B" />
            </View>
            <View>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ color: c.foreground, fontWeight: "600" }}>{isAr ? "منتهي" : "Expired"}</Text>
                <Text style={{ color: "#EF4444", fontWeight: "700" }}>{subs.data?.expired ?? 0}</Text>
              </View>
              <ProgressBar value={subs.data?.expired ?? 0} max={subs.data?.total ?? 1} color="#EF4444" />
            </View>
          </View>
        </Card>

        {/* Summary */}
        {summary.data && (
          <>
            <SectionTitle>{isAr ? "ملخص المالية" : "Finance Summary"}</SectionTitle>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
              <KpiCard
                label={isAr ? "إجمالي الأعضاء" : "Total Members"}
                value={summary.data.totalMembers ?? 0}
                icon="users" color={c.primary}
              />
              <KpiCard
                label={isAr ? "طلبات التجديد" : "Renewal Requests"}
                value={summary.data.pendingRenewals ?? 0}
                icon="refresh-cw" color="#F59E0B"
              />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
