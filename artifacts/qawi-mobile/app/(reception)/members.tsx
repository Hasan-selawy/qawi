import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Badge, Button, Card, Screen, SectionTitle } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function ReceptionMembers() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const isAr = lang === "ar";
  const qc = useQueryClient();
  const [query, setQuery] = useState("");

  const search = useQuery({
    queryKey: ["reception", "members", query],
    queryFn: () => apiFetch<any[]>(`/reception/members/search${query ? `?q=${encodeURIComponent(query)}` : ""}`).catch(() => []),
  });

  const checkinMut = useMutation({
    mutationFn: (memberId: string) => apiFetch(`/reception/checkin/${memberId}`, { method: "POST" }),
    onSuccess: () => {
      Alert.alert(isAr ? "قوي" : "Qawi", isAr ? "✅ تم تسجيل الدخول!" : "✅ Checked in!");
      qc.invalidateQueries({ queryKey: ["reception"] });
    },
    onError: (e: any) => {
      Alert.alert(isAr ? "قوي" : "Qawi", e?.body?.error ?? (isAr ? "حدث خطأ" : "Error"));
    },
  });

  const subColor = (status: string) => {
    if (status === "ACTIVE") return "#22C55E";
    if (status === "EXPIRING") return "#F59E0B";
    return "#EF4444";
  };

  const subLabel = (status: string) => {
    if (status === "ACTIVE") return isAr ? "نشط" : "Active";
    if (status === "EXPIRING") return isAr ? "ينتهي قريباً" : "Expiring";
    return isAr ? "منتهي" : "Expired";
  };

  return (
    <Screen>
      <RoleHeader title={isAr ? "الأعضاء" : "Members"} subtitle={isAr ? "بحث وتسجيل الدخول" : "Search & Check-in"} />

      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center",
          backgroundColor: c.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          paddingHorizontal: 12,
          gap: 8,
        }}>
          <Feather name="search" size={16} color={c.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={isAr ? "ابحث بالاسم أو البريد..." : "Search by name or email..."}
            placeholderTextColor={c.mutedForeground}
            style={{ flex: 1, color: c.foreground, paddingVertical: 12, textAlign: isRTL ? "right" : "left" }}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={c.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl tintColor={c.primary} refreshing={search.isFetching} onRefresh={() => search.refetch()} />}
        keyboardShouldPersistTaps="handled"
      >
        {search.isLoading ? (
          <Card>
            <Text style={{ color: c.mutedForeground, textAlign: "center", padding: 20 }}>
              {isAr ? "جاري البحث..." : "Searching..."}
            </Text>
          </Card>
        ) : (search.data ?? []).length === 0 ? (
          <Card>
            <Text style={{ color: c.mutedForeground, textAlign: "center", padding: 20 }}>
              {query.length > 0
                ? (isAr ? "لا توجد نتائج" : "No results found")
                : (isAr ? "ابحث للعثور على عضو" : "Search to find a member")}
            </Text>
          </Card>
        ) : (
          (search.data ?? []).map((m: any) => (
            <Card key={m.id}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15, textAlign: isRTL ? "right" : "left" }}>
                    {m.name}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                    {m.email}
                  </Text>
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: subColor(m.subscriptionStatus) }} />
                      <Text style={{ color: subColor(m.subscriptionStatus), fontSize: 11, fontWeight: "600" }}>
                        {subLabel(m.subscriptionStatus)}
                      </Text>
                    </View>
                    {m.checkedInToday && (
                      <Badge tone="primary">{isAr ? "داخل الصالة" : "In Gym"}</Badge>
                    )}
                  </View>
                  {m.subscriptionExpiresAt && (
                    <Text style={{ color: c.mutedForeground, fontSize: 11, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
                      {isAr ? "ينتهي: " : "Expires: "}{(m.subscriptionExpiresAt ?? "").slice(0, 10)}
                    </Text>
                  )}
                </View>
                {!m.checkedInToday && m.subscriptionStatus !== "EXPIRED" && (
                  <Button
                    title={isAr ? "دخول" : "Check In"}
                    icon="log-in"
                    onPress={() => checkinMut.mutate(m.id)}
                    style={{ minWidth: 90 }}
                  />
                )}
                {m.checkedInToday && (
                  <View style={{
                    width: 38, height: 38, borderRadius: 19,
                    backgroundColor: c.primary + "22",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Feather name="check-circle" size={20} color={c.primary} />
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
