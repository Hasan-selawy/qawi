import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { FeatureLockScreen } from "@/components/FeatureLockScreen";
import { RoleHeader } from "@/components/RoleHeader";
import { Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { useGymConfig } from "@/hooks/useGymConfig";
import { apiFetch } from "@/services/api";

export default function NutritionScreen() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const qc = useQueryClient();
  const { features } = useGymConfig();

  const plan = useQuery({
    queryKey: ["member", "nutrition"],
    queryFn: () => apiFetch<any>("/member/nutrition/active").catch(() => null),
    enabled: features.nutritionEnabled,
  });

  const toggleDone = useMutation({
    mutationFn: ({ mealId, done }: { mealId: string; done: boolean }) =>
      apiFetch(`/member/meals/${mealId}/done`, { method: done ? "POST" : "DELETE" }),
    onMutate: async ({ mealId, done }) => {
      await qc.cancelQueries({ queryKey: ["member", "nutrition"] });
      const prev = qc.getQueryData<any>(["member", "nutrition"]);
      if (prev?.meals) {
        qc.setQueryData(["member", "nutrition"], {
          ...prev,
          meals: prev.meals.map((m: any) => (m.id === mealId ? { ...m, done } : m)),
        });
      }
      Haptics.selectionAsync().catch(() => {});
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["member", "nutrition"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["member", "nutrition"] });
    },
  });

  if (!features.nutritionEnabled) {
    return (
      <FeatureLockScreen
        icon="🥗"
        titleEn="Nutrition Not Activated Yet"
        titleAr="لم يتم تفعيل التغذية بعد"
        subtitleEn="Your gym hasn't enabled this feature yet."
        subtitleAr="لم تقم صالتك بتفعيل هذه الميزة بعد."
      />
    );
  }

  const meals = (plan.data?.meals ?? []) as any[];
  const doneCount = meals.filter((m) => m.done).length;

  return (
    <Screen>
      <RoleHeader title={t("member.tabs.nutrition")} subtitle={plan.data ? pickName(lang, plan.data) : undefined} />
      {plan.isLoading ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <View key={i} style={{ height: 80, backgroundColor: c.surface, borderRadius: 16, opacity: 0.6 }} />
          ))}
        </ScrollView>
      ) : !plan.data ? (
        <ScrollView
          contentContainerStyle={{ padding: 20, flex: 1 }}
          refreshControl={<RefreshControl tintColor={c.primary} refreshing={plan.isFetching} onRefresh={() => plan.refetch()} />}
        >
          <Card>
            <EmptyState icon="coffee" text={t("member.noNutrition")} />
            <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: "center", marginTop: 8 }}>
              {lang === "ar" ? "لم يُعيَّن لك خطة تغذية بعد. تواصل مع كوتشك." : "No nutrition plan assigned yet. Ask your coach to add one."}
            </Text>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl tintColor={c.primary} refreshing={plan.isFetching} onRefresh={() => plan.refetch()} />}
        >
          {plan.data.totalCalories ? (
            <Card>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between" }}>
                <View><Text style={{ color: c.mutedForeground, fontSize: 12 }}>Calories</Text><Text style={{ color: c.foreground, fontWeight: "800", fontSize: 18 }}>{plan.data.totalCalories}</Text></View>
                <View><Text style={{ color: c.mutedForeground, fontSize: 12 }}>Protein</Text><Text style={{ color: c.foreground, fontWeight: "800", fontSize: 18 }}>{plan.data.totalProtein ?? "-"}g</Text></View>
                <View><Text style={{ color: c.mutedForeground, fontSize: 12 }}>Carbs</Text><Text style={{ color: c.foreground, fontWeight: "800", fontSize: 18 }}>{plan.data.totalCarbs ?? "-"}g</Text></View>
                <View><Text style={{ color: c.mutedForeground, fontSize: 12 }}>Fats</Text><Text style={{ color: c.foreground, fontWeight: "800", fontSize: 18 }}>{plan.data.totalFats ?? "-"}g</Text></View>
              </View>
              {meals.length > 0 ? (
                <Text style={{ color: c.mutedForeground, marginTop: 10, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                  {doneCount}/{meals.length} {t("member.mealDone")}
                </Text>
              ) : null}
            </Card>
          ) : null}
          {meals.length === 0 ? (
            <Card><EmptyState icon="coffee" text={lang === "ar" ? "لا توجد وجبات في هذه الخطة" : "No meals in this plan yet"} /></Card>
          ) : (
            meals.map((m: any, i: number) => {
              const done = !!m.done;
              return (
                <Pressable
                  key={m.id ?? i}
                  onPress={() => m.id && toggleDone.mutate({ mealId: m.id, done: !done })}
                  style={{ opacity: toggleDone.isPending ? 0.7 : 1 }}
                >
                  <Card style={done ? { borderColor: c.primary, borderWidth: 1 } : undefined}>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16, textDecorationLine: done ? "line-through" : "none" }}>
                        {t(`member.${(m.type ?? "snack").toLowerCase()}`) || pickName(lang, m)}
                      </Text>
                      <Feather name={done ? "check-circle" : "circle"} size={20} color={done ? c.primary : c.mutedForeground} />
                    </View>
                    <Text style={{ color: c.mutedForeground, marginTop: 6, textAlign: isRTL ? "right" : "left" }}>{pickName(lang, m)}</Text>
                    {m.calories ? (
                      <Text style={{ color: c.mutedForeground, marginTop: 4, fontSize: 12 }}>{m.calories} kcal • P {m.protein ?? "-"}g • C {m.carbs ?? "-"}g • F {m.fats ?? "-"}g</Text>
                    ) : null}
                    <Text style={{ color: done ? c.primary : c.mutedForeground, marginTop: 6, fontSize: 11, fontWeight: "600", textAlign: isRTL ? "right" : "left" }}>
                      {done ? `✓ ${t("member.mealDone")}` : t("member.tapToMarkDone")}
                    </Text>
                  </Card>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
