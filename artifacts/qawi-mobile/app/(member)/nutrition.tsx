import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

export default function NutritionScreen() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();

  const plan = useQuery({
    queryKey: ["member", "nutrition"],
    queryFn: () => apiFetch<any>("/member/nutrition/active").catch(() => null),
  });

  const meals = (plan.data?.meals ?? []) as any[];

  return (
    <Screen>
      <RoleHeader title={t("member.tabs.nutrition")} subtitle={plan.data ? pickName(lang, plan.data) : undefined} />
      {plan.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : !plan.data ? (
        <View style={{ padding: 20 }}>
          <Card><EmptyState icon="coffee" text={t("member.noNutrition")} /></Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
          {plan.data.totalCalories ? (
            <Card>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between" }}>
                <View><Text style={{ color: c.mutedForeground, fontSize: 12 }}>Calories</Text><Text style={{ color: c.foreground, fontWeight: "800", fontSize: 18 }}>{plan.data.totalCalories}</Text></View>
                <View><Text style={{ color: c.mutedForeground, fontSize: 12 }}>Protein</Text><Text style={{ color: c.foreground, fontWeight: "800", fontSize: 18 }}>{plan.data.totalProtein ?? "-"}g</Text></View>
                <View><Text style={{ color: c.mutedForeground, fontSize: 12 }}>Carbs</Text><Text style={{ color: c.foreground, fontWeight: "800", fontSize: 18 }}>{plan.data.totalCarbs ?? "-"}g</Text></View>
                <View><Text style={{ color: c.mutedForeground, fontSize: 12 }}>Fats</Text><Text style={{ color: c.foreground, fontWeight: "800", fontSize: 18 }}>{plan.data.totalFats ?? "-"}g</Text></View>
              </View>
            </Card>
          ) : null}
          {meals.map((m: any, i: number) => (
            <Card key={m.id ?? i}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16 }}>
                  {t(`member.${(m.type ?? "snack").toLowerCase()}`) || pickName(lang, m)}
                </Text>
                <Feather name="coffee" size={16} color={c.primary} />
              </View>
              <Text style={{ color: c.mutedForeground, marginTop: 6, textAlign: isRTL ? "right" : "left" }}>{pickName(lang, m)}</Text>
              {m.calories ? (
                <Text style={{ color: c.mutedForeground, marginTop: 4, fontSize: 12 }}>{m.calories} kcal • P {m.protein ?? "-"}g • C {m.carbs ?? "-"}g • F {m.fats ?? "-"}g</Text>
              ) : null}
            </Card>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
