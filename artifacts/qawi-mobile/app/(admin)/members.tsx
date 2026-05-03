import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Avatar, Badge, Card, EmptyState, Input, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function AdminMembers() {
  const c = useColors();
  const { t, isRTL } = useLanguage();
  const [q, setQ] = useState("");

  const members = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => apiFetch<any[]>("/admin/members").catch(() => []),
  });

  const list = useMemo(() => {
    const data = members.data ?? [];
    if (!q) return data;
    return data.filter((m) => (m.name ?? "").toLowerCase().includes(q.toLowerCase()) || (m.email ?? "").toLowerCase().includes(q.toLowerCase()));
  }, [members.data, q]);

  return (
    <Screen>
      <RoleHeader title={t("admin.tabs.members")} />
      <View style={{ padding: 16 }}>
        <Input icon="search" placeholder={t("common.search")} value={q} onChangeText={setQ} />
      </View>
      {members.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : list.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card><EmptyState icon="users" text={t("common.noData")} /></Card>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i: any) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                <Avatar name={item.name ?? "?"} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{item.name}</Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>{item.email}</Text>
                </View>
                {item.expiringSoon ? <Badge tone="warning">⏳</Badge> : <Badge tone={item.active ? "success" : "neutral"}>{item.active ? "●" : "—"}</Badge>}
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
