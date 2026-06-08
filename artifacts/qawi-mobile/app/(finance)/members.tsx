import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Card, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function FinanceMembers() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const isAr = lang === "ar";
  const [search, setSearch] = useState("");

  const members = useQuery({
    queryKey: ["finance", "members"],
    queryFn: () => apiFetch<any[]>("/finance/members").catch(() => []),
  });

  const filtered = (members.data ?? []).filter((m: any) =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const subColor = (status: string) => {
    if (status === "ACTIVE") return "#22C55E";
    if (status === "EXPIRING") return "#F59E0B";
    return "#EF4444";
  };

  return (
    <Screen>
      <RoleHeader title={isAr ? "المالية - الأعضاء" : "Member Finances"} />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          backgroundColor: c.card,
          borderRadius: 12,
          borderWidth: 1, borderColor: c.border,
          paddingHorizontal: 12, gap: 8,
        }}>
          <Feather name="search" size={16} color={c.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={isAr ? "بحث..." : "Search..."}
            placeholderTextColor={c.mutedForeground}
            style={{ flex: 1, color: c.foreground, paddingVertical: 12, textAlign: isRTL ? "right" : "left" }}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={c.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        refreshControl={<RefreshControl tintColor={c.primary} refreshing={members.isFetching} onRefresh={() => members.refetch()} />}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <Card>
            <Text style={{ color: c.mutedForeground, textAlign: "center", padding: 20 }}>
              {isAr ? "لا توجد بيانات" : "No data"}
            </Text>
          </Card>
        ) : (
          filtered.map((m: any) => (
            <Card key={m.id}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{m.name}</Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>{m.email}</Text>
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: subColor(m.subscriptionStatus) }} />
                    <Text style={{ color: subColor(m.subscriptionStatus), fontSize: 12, fontWeight: "600" }}>
                      {m.subscriptionStatus}
                    </Text>
                  </View>
                  {m.subscriptionExpiresAt && (
                    <Text style={{ color: c.mutedForeground, fontSize: 11, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
                      {isAr ? "ينتهي: " : "Expires: "}{(m.subscriptionExpiresAt ?? "").slice(0, 10)}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {m.planName && (
                    <View style={{ backgroundColor: c.primary + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: c.primary, fontSize: 11, fontWeight: "700" }}>{m.planName}</Text>
                    </View>
                  )}
                  {m.planPrice != null && (
                    <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 15 }}>{m.planPrice} SAR</Text>
                  )}
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
