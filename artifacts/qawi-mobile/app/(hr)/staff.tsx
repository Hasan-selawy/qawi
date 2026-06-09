import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Button, Card, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function HrStaff() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const isAr = lang === "ar";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const staff = useQuery({
    queryKey: ["hr", "staff"],
    queryFn: () => apiFetch<any[]>("/hr/staff").catch(() => []),
  });

  const markAttendanceMut = useMutation({
    mutationFn: ({ userId, type }: { userId: string; type: "PRESENT" | "ABSENT" }) =>
      apiFetch(`/hr/staff/${userId}/attendance`, { method: "POST", data: { type, date: new Date().toISOString().slice(0, 10) } }),
    onSuccess: () => {
      Alert.alert(isAr ? "قوي" : "Qawi", isAr ? "تم تسجيل الحضور" : "Attendance recorded");
      qc.invalidateQueries({ queryKey: ["hr"] });
    },
    onError: (e: any) => Alert.alert(isAr ? "قوي" : "Qawi", e?.body?.error ?? "Error"),
  });

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      COACH: isAr ? "مدرب" : "Coach",
      RECEPTIONIST: isAr ? "استقبال" : "Reception",
      ACCOUNTANT: isAr ? "محاسب" : "Accountant",
      HR: isAr ? "موارد بشرية" : "HR",
      GYM_ADMIN: isAr ? "مدير" : "Admin",
    };
    return map[role] || role;
  };

  const roleColor = (role: string) => {
    const map: Record<string, string> = {
      COACH: c.primary,
      RECEPTIONIST: "#3B82F6",
      ACCOUNTANT: "#F59E0B",
      HR: "#EC4899",
      GYM_ADMIN: "#8B5CF6",
    };
    return map[role] || c.mutedForeground;
  };

  const filtered = (staff.data ?? []).filter((s: any) =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Screen>
      <RoleHeader title={isAr ? "الموظفون" : "Staff"} subtitle={isAr ? "إدارة الحضور والأداء" : "Attendance & Performance"} />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View style={{
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "center", backgroundColor: c.card,
          borderRadius: 12, borderWidth: 1, borderColor: c.border,
          paddingHorizontal: 12, gap: 8,
        }}>
          <Feather name="search" size={16} color={c.mutedForeground} />
          <TextInput
            value={search} onChangeText={setSearch}
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
        refreshControl={<RefreshControl tintColor={c.primary} refreshing={staff.isFetching} onRefresh={() => staff.refetch()} />}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <Card>
            <Text style={{ color: c.mutedForeground, textAlign: "center", padding: 20 }}>
              {isAr ? "لا يوجد موظفون" : "No staff found"}
            </Text>
          </Card>
        ) : (
          filtered.map((s: any) => (
            <Card key={s.id}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15, textAlign: isRTL ? "right" : "left" }}>
                    {s.name}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                    {s.email}
                  </Text>
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                      backgroundColor: roleColor(s.role) + "22",
                    }}>
                      <Text style={{ color: roleColor(s.role), fontSize: 11, fontWeight: "700" }}>
                        {roleLabel(s.role)}
                      </Text>
                    </View>
                    {s.presentToday && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#22C55E" }} />
                        <Text style={{ color: "#22C55E", fontSize: 11, fontWeight: "600" }}>
                          {isAr ? "حاضر" : "Present"}
                        </Text>
                      </View>
                    )}
                  </View>
                  {s.jobTitle && (
                    <Text style={{ color: c.mutedForeground, fontSize: 11, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
                      {s.jobTitle}
                    </Text>
                  )}
                </View>
                {!s.presentToday && (
                  <Button
                    title={isAr ? "حاضر" : "Mark Present"}
                    icon="check"
                    onPress={() => Alert.alert(
                      isAr ? "قوي" : "Qawi",
                      isAr ? `تسجيل حضور ${s.name}؟` : `Mark ${s.name} as present today?`,
                      [
                        { text: isAr ? "إلغاء" : "Cancel", style: "cancel" },
                        { text: isAr ? "تأكيد" : "Confirm", onPress: () => markAttendanceMut.mutate({ userId: s.id, type: "PRESENT" }) },
                      ]
                    )}
                    style={{ minWidth: 100 }}
                  />
                )}
                {s.presentToday && (
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#22C55E22", alignItems: "center", justifyContent: "center" }}>
                    <Feather name="check-circle" size={20} color="#22C55E" />
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
