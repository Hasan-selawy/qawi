import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Badge, Card, EmptyState, Screen, SectionTitle } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const member = useQuery({
    queryKey: ["coach", "member", id],
    queryFn: () => apiFetch<any>(`/coach/members/${id}`).catch(() => null),
    enabled: !!id,
  });
  const notes = useQuery({
    queryKey: ["coach", "member", id, "notes"],
    queryFn: () => apiFetch<any[]>(`/coach/members/${id}/notes`).catch(() => []),
    enabled: !!id,
  });
  const measurements = useQuery({
    queryKey: ["coach", "member", id, "measurements"],
    queryFn: () => apiFetch<any[]>(`/coach/members/${id}/measurements`).catch(() => []),
    enabled: !!id,
  });

  return (
    <Screen>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={c.foreground} />
        </Pressable>
        <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1 }}>{member.data?.name ?? ""}</Text>
      </View>
      {member.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
          <Card>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
              <Avatar name={member.data?.name ?? "?"} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16, textAlign: isRTL ? "right" : "left" }}>{member.data?.name}</Text>
                <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>{member.data?.email}</Text>
                {member.data?.subscriptionExpiresAt ? (
                  <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                    Expires {member.data.subscriptionExpiresAt.slice(0, 10)}
                  </Text>
                ) : null}
              </View>
              {member.data?.active ? <Badge tone="success">●</Badge> : <Badge tone="neutral">—</Badge>}
            </View>
          </Card>

          <SectionTitle>{t("member.measurements")}</SectionTitle>
          {(measurements.data ?? []).length === 0 ? (
            <Card><EmptyState icon="bar-chart" text={t("common.noData")} /></Card>
          ) : (
            measurements.data!.slice(0, 3).map((m: any) => (
              <Card key={m.id}>
                <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{(m.takenAt ?? "").slice(0, 10)}</Text>
                <Text style={{ color: c.foreground, marginTop: 4 }}>
                  Weight {m.weight ?? "-"} • Chest {m.chest ?? "-"} • Waist {m.waist ?? "-"}
                </Text>
              </Card>
            ))
          )}

          <SectionTitle>Notes</SectionTitle>
          {(notes.data ?? []).length === 0 ? (
            <Card><EmptyState icon="edit-3" text={t("common.noData")} /></Card>
          ) : (
            notes.data!.map((n: any) => (
              <Card key={n.id}>
                <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{(n.createdAt ?? "").slice(0, 10)}</Text>
                <Text style={{ color: c.foreground, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>{n.content ?? n.note}</Text>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
