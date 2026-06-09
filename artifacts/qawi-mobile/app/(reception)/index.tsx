import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Badge, Button, Card, Screen, SectionTitle } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

function StatTile({ label, value, icon, color }: { label: string; value: any; icon: any; color: string }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{label}</Text>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={{ color: c.foreground, fontSize: 26, fontWeight: "800" }}>{value ?? 0}</Text>
    </Card>
  );
}

export default function ReceptionDashboard() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const isAr = lang === "ar";
  const qc = useQueryClient();

  const today = useQuery({
    queryKey: ["reception", "today"],
    queryFn: () => apiFetch<any>("/reception/today").catch(() => null),
    refetchInterval: 30000,
  });
  const feed = useQuery({
    queryKey: ["reception", "feed"],
    queryFn: () => apiFetch<any[]>("/reception/live-feed").catch(() => []),
    refetchInterval: 15000,
  });
  const alerts = useQuery({
    queryKey: ["reception", "alerts"],
    queryFn: () => apiFetch<any[]>("/reception/alerts").catch(() => []),
  });

  const refreshAll = () => { today.refetch(); feed.refetch(); alerts.refetch(); };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  return (
    <Screen>
      <RoleHeader
        title={isAr ? "الاستقبال" : "Reception"}
        subtitle={isAr ? "لوحة التحكم" : "Dashboard"}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl tintColor={c.primary} refreshing={today.isFetching} onRefresh={refreshAll} />
        }
      >
        {/* KPI row */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
          <StatTile
            label={isAr ? "دخول اليوم" : "Check-ins"}
            value={today.data?.checkInsToday ?? 0}
            icon="log-in" color={c.primary}
          />
          <StatTile
            label={isAr ? "داخل الآن" : "In Gym"}
            value={today.data?.currentlyInGym ?? 0}
            icon="activity" color="#22C55E"
          />
        </View>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
          <StatTile
            label={isAr ? "أعضاء جدد" : "Walk-ins"}
            value={today.data?.walkInsToday ?? 0}
            icon="user-plus" color="#3B82F6"
          />
          <StatTile
            label={isAr ? "تنبيهات" : "Alerts"}
            value={(alerts.data ?? []).length}
            icon="alert-circle" color="#F59E0B"
          />
        </View>

        {/* Alerts */}
        {(alerts.data ?? []).length > 0 && (
          <>
            <SectionTitle>{isAr ? "⚠️ تنبيهات" : "⚠️ Alerts"}</SectionTitle>
            {(alerts.data ?? []).slice(0, 5).map((a: any, i: number) => (
              <Card key={i} style={{ borderLeftWidth: 3, borderLeftColor: "#F59E0B" }}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                  <Feather name="alert-circle" size={18} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>
                      {a.memberName}
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                      {a.message}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Live feed */}
        <SectionTitle>{isAr ? "🟢 حركة حية" : "🟢 Live Feed"}</SectionTitle>
        {(feed.data ?? []).length === 0 ? (
          <Card>
            <Text style={{ color: c.mutedForeground, textAlign: "center", paddingVertical: 12 }}>
              {isAr ? "لا توجد حركة بعد" : "No activity yet today"}
            </Text>
          </Card>
        ) : (
          (feed.data ?? []).slice(0, 12).map((f: any, i: number) => (
            <Card key={i}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: f.type === "CHECKIN" ? c.primary + "22" : c.muted,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Feather
                      name={f.type === "CHECKIN" ? "log-in" : "log-out"}
                      size={16}
                      color={f.type === "CHECKIN" ? c.primary : c.mutedForeground}
                    />
                  </View>
                  <View>
                    <Text style={{ color: c.foreground, fontWeight: "600", textAlign: isRTL ? "right" : "left" }}>
                      {f.memberName}
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                      {f.type === "CHECKIN" ? (isAr ? "دخل" : "Checked in") : (isAr ? "خرج" : "Checked out")}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{formatTime(f.timestamp)}</Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
