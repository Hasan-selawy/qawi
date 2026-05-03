import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function NotificationsScreen() {
  const c = useColors();
  const { t, isRTL } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const notifs = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<any[]>("/notifications").catch(() => []),
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
        <Text style={{ color: c.foreground, fontSize: 20, fontWeight: "800" }}>{t("notifications.title")}</Text>
      </View>
      {notifs.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : (notifs.data ?? []).length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card><EmptyState icon="bell" text={t("notifications.empty")} /></Card>
        </View>
      ) : (
        <FlatList
          data={notifs.data}
          keyExtractor={(i: any, idx) => i.id ?? String(idx)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Card>
              <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{item.title}</Text>
              <Text style={{ color: c.mutedForeground, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>{item.body ?? item.message}</Text>
              <Text style={{ color: c.mutedForeground, marginTop: 6, fontSize: 11 }}>{(item.createdAt ?? "").slice(0, 16).replace("T", " ")}</Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
