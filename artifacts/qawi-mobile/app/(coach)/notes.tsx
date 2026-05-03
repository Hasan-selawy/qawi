import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function CoachNotes() {
  const c = useColors();
  const { t, isRTL } = useLanguage();

  const notes = useQuery({
    queryKey: ["coach", "notes"],
    queryFn: () => apiFetch<any[]>("/coach/notes/recent").catch(() => []),
  });

  return (
    <Screen>
      <RoleHeader title={t("coach.tabs.notes")} />
      {notes.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : (notes.data ?? []).length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card><EmptyState icon="edit-3" text={t("common.noData")} /></Card>
        </View>
      ) : (
        <FlatList
          data={notes.data}
          keyExtractor={(i: any, idx) => i.id ?? String(idx)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ color: c.mutedForeground, fontSize: 11, textAlign: isRTL ? "right" : "left" }}>
                {item.memberName ?? ""} • {(item.createdAt ?? "").slice(0, 10)}
              </Text>
              <Text style={{ color: c.foreground, marginTop: 6, textAlign: isRTL ? "right" : "left" }}>{item.content ?? item.note}</Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
