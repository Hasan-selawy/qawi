import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Avatar, Badge, Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function AdminCoaches() {
  const c = useColors();
  const { t, isRTL } = useLanguage();

  const coaches = useQuery({
    queryKey: ["admin", "coaches"],
    queryFn: () => apiFetch<any[]>("/admin/coaches").catch(() => []),
  });

  return (
    <Screen>
      <RoleHeader title={t("admin.tabs.coaches")} />
      {coaches.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : (coaches.data ?? []).length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card><EmptyState icon="award" text={t("common.noData")} /></Card>
        </View>
      ) : (
        <FlatList
          data={coaches.data}
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
                <Badge tone="primary">{item.memberCount ?? 0}</Badge>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
