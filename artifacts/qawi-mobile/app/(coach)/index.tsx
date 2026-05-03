import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Avatar, Badge, Card, EmptyState, Input, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type Filter = "all" | "active" | "inactive" | "expiring";

export default function CoachMembers() {
  const c = useColors();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const members = useQuery({
    queryKey: ["coach", "members"],
    queryFn: () => apiFetch<any[]>("/coach/members").catch(() => []),
  });

  const list = useMemo(() => {
    const data = members.data ?? [];
    return data.filter((m) => {
      const matchesQ = !q || (m.name ?? "").toLowerCase().includes(q.toLowerCase());
      if (!matchesQ) return false;
      if (filter === "active") return !!m.active;
      if (filter === "inactive") return !m.active;
      if (filter === "expiring") return !!m.expiringSoon;
      return true;
    });
  }, [members.data, q, filter]);

  const filters: Filter[] = ["all", "active", "inactive", "expiring"];

  return (
    <Screen>
      <RoleHeader title={t("coach.tabs.members")} />
      <View style={{ padding: 16, gap: 12 }}>
        <Input icon="search" placeholder={t("coach.searchMembers")} value={q} onChangeText={setQ} />
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
          {filters.map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: filter === f ? c.primary : c.surface,
                borderWidth: 1,
                borderColor: filter === f ? c.primary : c.border,
              }}
            >
              <Text style={{ color: filter === f ? c.primaryForeground : c.foreground, fontSize: 12, fontWeight: "700" }}>
                {t(`coach.filters.${f}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {members.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : list.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card><EmptyState icon="users" text={t("coach.noMembers")} /></Card>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i: any) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/member/${item.id}` as any)}>
              <Card>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                  <Avatar name={item.name ?? "?"} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15, textAlign: isRTL ? "right" : "left" }}>{item.name}</Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>{item.email}</Text>
                  </View>
                  {item.expiringSoon ? <Badge tone="warning">⏳</Badge> : item.active ? <Badge tone="success">●</Badge> : <Badge tone="neutral">—</Badge>}
                  <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={c.mutedForeground} />
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
