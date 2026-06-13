import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Avatar, Badge, Card, EmptyState, Input, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function AdminMembers() {
  const c = useColors();
  const { t, isRTL, lang } = useLanguage();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const members = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => apiFetch<any[]>("/admin/members").catch(() => []),
  });

  const toggleSelfTraining = useMutation({
    mutationFn: ({ memberId, enabled }: { memberId: string; enabled: boolean }) =>
      apiFetch(`/admin/members/${memberId}/self-training`, { method: "PATCH", data: { enabled } }),
    onSuccess: (_: any, vars: { memberId: string; enabled: boolean }) => {
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
      Alert.alert(
        lang === "ar" ? "قوي" : "Qawi",
        vars.enabled ? t("member.selfTrainingEnabledMsg") : t("member.selfTrainingDisabledMsg")
      );
    },
    onError: (err: any) => {
      Alert.alert(lang === "ar" ? "خطأ" : "Error", err?.body?.error || "Failed");
    },
  });

  const list = useMemo(() => {
    const data = members.data ?? [];
    if (!q) return data;
    return data.filter(
      (m) =>
        (m.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (m.email ?? "").toLowerCase().includes(q.toLowerCase())
    );
  }, [members.data, q]);

  const onMemberPress = (item: any) => {
    const isSelfTraining = !!item.selfTrainingEnabled;
    const toggleLabel = isSelfTraining ? t("member.disableSelfTraining") : t("member.enableSelfTraining");

    Alert.alert(item.name, undefined, [
      {
        text: toggleLabel,
        onPress: () => {
          if (!isSelfTraining) {
            Alert.alert(
              lang === "ar" ? "تأكيد" : "Confirm",
              t("member.selfTrainingConfirm"),
              [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("member.enableSelfTraining"),
                  onPress: () => toggleSelfTraining.mutate({ memberId: item.id, enabled: true }),
                },
              ]
            );
          } else {
            toggleSelfTraining.mutate({ memberId: item.id, enabled: false });
          }
        },
      },
      { text: t("common.close"), style: "cancel" },
    ]);
  };

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
          <Card>
            <EmptyState icon="users" text={t("common.noData")} />
          </Card>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i: any) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onMemberPress(item)} activeOpacity={0.75}>
              <Card>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                  <Avatar name={item.name ?? "?"} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                      {item.email}
                    </Text>
                  </View>
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
                    {item.selfTrainingEnabled && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                          backgroundColor: "#7c3aed22",
                          borderColor: "#7c3aed55",
                          borderWidth: 1,
                          borderRadius: 10,
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                        }}
                      >
                        <Feather name="activity" size={10} color="#a78bfa" />
                        <Text style={{ color: "#a78bfa", fontSize: 10, fontWeight: "700" }}>
                          {lang === "ar" ? "ذاتي" : "Self"}
                        </Text>
                      </View>
                    )}
                    {item.expiringSoon ? (
                      <Badge tone="warning">⏳</Badge>
                    ) : (
                      <Badge tone={item.active ? "success" : "neutral"}>{item.active ? "●" : "—"}</Badge>
                    )}
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}
