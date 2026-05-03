import { Feather } from "@expo/vector-icons";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { useToast } from "@/components/Toast";
import { Button, Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

function confirmDelete(title: string, message: string, confirmLabel: string, cancelLabel: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

type CoachMember = { id: string; name: string; email: string };

export default function CoachPlans() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<"workout" | "nutrition">("workout");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deletePlan = useMutation({
    mutationFn: (planId: string) =>
      apiFetch(tab === "workout" ? `/workouts/${planId}` : `/nutrition/${planId}`, { method: "DELETE" }),
    onMutate: (planId: string) => setDeletingId(planId),
    onSuccess: () => {
      toast.show(lang === "ar" ? "🗑️ تم حذف الخطة" : "🗑️ Plan deleted", "success");
      qc.invalidateQueries({ queryKey: ["coach"] });
    },
    onError: (e: any) => {
      console.error("[delete-plan] failed", e?.status, e?.body, e?.message);
      const detail = typeof e?.body === "object" ? JSON.stringify(e.body) : (e?.message || "Could not delete");
      toast.show(lang === "ar" ? `فشل الحذف: ${detail}` : `Delete failed: ${detail}`, "error");
    },
    onSettled: () => setDeletingId(null),
  });

  const onDelete = (plan: any) => {
    const label = pickName(lang, plan) || plan.name || "Plan";
    confirmDelete(
      lang === "ar" ? "حذف الخطة" : "Delete plan",
      lang === "ar" ? `هل تريد حذف "${label}"؟ لا يمكن التراجع.` : `Delete "${label}"? This cannot be undone.`,
      lang === "ar" ? "حذف" : "Delete",
      lang === "ar" ? "إلغاء" : "Cancel",
      () => deletePlan.mutate(plan.id),
    );
  };

  const members = useQuery({
    queryKey: ["coach", "members"],
    queryFn: () => apiFetch<CoachMember[]>("/coach/members").catch(() => []),
  });

  const memberList = members.data ?? [];

  const plansQueries = useQueries({
    queries: memberList.map((m) => ({
      queryKey: ["coach", "member-plans", tab, m.id],
      queryFn: () =>
        apiFetch<any[]>(tab === "workout" ? `/workouts/member/${m.id}` : `/nutrition/member/${m.id}`)
          .catch(() => [])
          .then((arr) => arr.map((p) => ({ ...p, _member: m }))),
      enabled: !!m.id,
    })),
  });

  const loading = members.isLoading || plansQueries.some((q) => q.isLoading);
  const allPlans = plansQueries.flatMap((q) => q.data ?? []);

  const onCreate = () => {
    if (memberList.length === 0) {
      Alert.alert(lang === "ar" ? "قوي" : "Qawi", t("coach.noMembers"));
      return;
    }
    if (tab === "workout") router.push("/coach/create-plan" as never);
    else router.push("/coach/create-nutrition" as never);
  };

  return (
    <Screen>
      <RoleHeader title={t("coach.tabs.plans")} />

      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, paddingHorizontal: 16, paddingTop: 16 }}>
        {(["workout", "nutrition"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setTab(s)}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: "center",
              borderRadius: c.radius,
              backgroundColor: tab === s ? c.primary : c.surface,
              borderWidth: 1,
              borderColor: tab === s ? c.primary : c.border,
            }}
          >
            <Text style={{ color: tab === s ? c.primaryForeground : c.foreground, fontWeight: "700" }}>
              {s === "workout" ? "Workout" : "Nutrition"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
        <View style={{ flex: 2 }}>
          <Button title={t("coach.createPlan")} icon="plus" onPress={onCreate} />
        </View>
        {tab === "workout" ? (
          <View style={{ flex: 1 }}>
            <Button
              title={lang === "ar" ? "القوالب" : "Templates"}
              icon="layers"
              variant="secondary"
              onPress={() => router.push("/coach/templates" as never)}
            />
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={{ padding: 24 }}><ActivityIndicator color={c.primary} /></View>
      ) : allPlans.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card><EmptyState icon="layers" text={t("coach.noPlans")} /></Card>
        </View>
      ) : (
        <FlatList
          data={allPlans}
          keyExtractor={(p, i) => `${p.id ?? i}`}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const isDeleting = deletingId === item.id;
            return (
              <Card>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                  <Pressable
                    onPress={() => router.push(`/member/${item._member.id}` as never)}
                    style={{ flex: 1 }}
                  >
                    <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15, textAlign: isRTL ? "right" : "left" }}>
                      {pickName(lang, item) || item.name || "Plan"}
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                      {item._member?.name}
                      {item.startDate ? `  •  ${String(item.startDate).slice(0, 10)}` : ""}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(item)}
                    disabled={isDeleting}
                    hitSlop={10}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: c.surface,
                      borderWidth: 1,
                      borderColor: c.border,
                      opacity: isDeleting ? 0.5 : 1,
                    }}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={c.destructive} />
                    ) : (
                      <Feather name="trash-2" size={16} color={c.destructive} />
                    )}
                  </Pressable>
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
