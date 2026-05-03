import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function NotificationsScreen() {
  const c = useColors();
  const { t, isRTL, lang } = useLanguage();
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
        {notifs.isFetching && (
          <View style={{ marginStart: "auto" }}>
            <Feather name="refresh-cw" size={16} color={c.mutedForeground} />
          </View>
        )}
      </View>

      {notifs.isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <View key={i} style={{ height: 72, backgroundColor: c.surface, borderRadius: 16, opacity: 0.6 }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={notifs.data ?? []}
          keyExtractor={(i: any, idx) => i.id ?? String(idx)}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={<RefreshControl tintColor={c.primary} refreshing={notifs.isFetching} onRefresh={() => notifs.refetch()} />}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Card>
                <EmptyState icon="bell" text={t("notifications.empty")} />
                <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: "center", marginTop: 8 }}>
                  {lang === "ar" ? "ستظهر إشعاراتك هنا عند وصولها." : "Your notifications will appear here when they arrive."}
                </Text>
              </Card>
            </View>
          }
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
