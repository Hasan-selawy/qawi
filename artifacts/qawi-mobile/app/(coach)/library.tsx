import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Card, EmptyState, Input, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

const CATS = ["all", "chest", "back", "legs", "shoulders", "arms", "core", "cardio"] as const;

export default function CoachLibrary() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const [cat, setCat] = useState<(typeof CATS)[number]>("all");
  const [q, setQ] = useState("");

  const ex = useQuery({
    queryKey: ["coach", "exercises"],
    queryFn: () => apiFetch<any[]>("/coach/exercises").catch(() => []),
  });

  const list = useMemo(() => {
    const data = ex.data ?? [];
    return data.filter((e) => {
      const matchCat = cat === "all" || (e.category ?? "").toLowerCase() === cat;
      const matchQ = !q || pickName(lang, e).toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [ex.data, cat, q, lang]);

  return (
    <Screen>
      <RoleHeader title={t("coach.tabs.library")} />
      <View style={{ padding: 16, gap: 12 }}>
        <Input icon="search" placeholder={t("common.search")} value={q} onChangeText={setQ} />
        <FlatList
          horizontal
          data={CATS as any}
          showsHorizontalScrollIndicator={false}
          inverted={isRTL}
          keyExtractor={(i: any) => i}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          renderItem={({ item }: any) => (
            <Pressable
              onPress={() => setCat(item)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: cat === item ? c.primary : c.surface,
                borderWidth: 1,
                borderColor: cat === item ? c.primary : c.border,
              }}
            >
              <Text style={{ color: cat === item ? c.primaryForeground : c.foreground, fontSize: 12, fontWeight: "700" }}>
                {item === "all" ? t("coach.filters.all") : t(`coach.categories.${item}`)}
              </Text>
            </Pressable>
          )}
        />
      </View>
      {ex.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : list.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card><EmptyState icon="book-open" text={t("common.noData")} /></Card>
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
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.muted, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="activity" size={20} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{pickName(lang, item)}</Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>{item.category ?? ""}</Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
