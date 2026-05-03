import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Card, EmptyState, Input, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type ExerciseTemplate = {
  id: string;
  categoryId?: string;
  name: string;
  nameAr?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
  videoUrl?: string;
};

type Category = { id: string; name: string; nameAr?: string };

export default function CoachLibrary() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const [catId, setCatId] = useState<string>("all");
  const [q, setQ] = useState("");

  const ex = useQuery({
    queryKey: ["exercises", "library"],
    queryFn: () => apiFetch<ExerciseTemplate[]>("/exercises/library").catch(() => []),
  });
  const cats = useQuery({
    queryKey: ["exercises", "categories"],
    queryFn: () => apiFetch<Category[]>("/exercises/categories").catch(() => []),
  });

  const list = useMemo(() => {
    const data = ex.data ?? [];
    return data.filter((e) => {
      const matchCat = catId === "all" || e.categoryId === catId;
      const matchQ = !q || pickName(lang, e).toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [ex.data, catId, q, lang]);

  const catOptions = [{ id: "all", name: t("coach.filters.all"), nameAr: "الكل" }, ...(cats.data ?? [])];

  return (
    <Screen>
      <RoleHeader title={t("coach.tabs.library")} />
      <View style={{ padding: 16, gap: 12 }}>
        <Input icon="search" placeholder={t("common.search")} value={q} onChangeText={setQ} />
        <FlatList
          horizontal
          data={catOptions}
          showsHorizontalScrollIndicator={false}
          inverted={isRTL}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setCatId(item.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: catId === item.id ? c.primary : c.surface,
                borderWidth: 1,
                borderColor: catId === item.id ? c.primary : c.border,
              }}
            >
              <Text style={{ color: catId === item.id ? c.primaryForeground : c.foreground, fontSize: 12, fontWeight: "700" }}>
                {pickName(lang, item)}
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
          keyExtractor={(i) => i.id}
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
                  <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                    {item.defaultSets ?? 3} × {item.defaultReps ?? 10}
                    {item.defaultWeight ? `  •  ${item.defaultWeight}kg` : ""}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
