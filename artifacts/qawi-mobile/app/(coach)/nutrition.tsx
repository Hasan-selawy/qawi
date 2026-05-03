import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Button, Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { useGymConfig } from "@/hooks/useGymConfig";
import { apiFetch } from "@/services/api";

type CoachMember = { id: string; name: string; email: string };
type Plan = { id: string; memberId: string; createdAt: string; meals: any[] };

export default function CoachNutritionTab() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const { features } = useGymConfig();
  const router = useRouter();
  const qc = useQueryClient();
  const isAr = lang === "ar";

  const members = useQuery<CoachMember[]>({
    queryKey: ["coach", "members"],
    queryFn: () => apiFetch<CoachMember[]>("/coach/members").catch(() => []),
  });

  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const plans = useQuery<Plan[]>({
    queryKey: ["nutrition", "member", expandedMemberId],
    queryFn: () => apiFetch<Plan[]>(`/nutrition/member/${expandedMemberId}`).catch(() => []),
    enabled: !!expandedMemberId,
  });

  const deletePlan = useMutation({
    mutationFn: (planId: string) => apiFetch(`/nutrition/${planId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nutrition", "member", expandedMemberId] }),
  });

  if (!features.nutritionEnabled) {
    return (
      <Screen>
        <RoleHeader title={isAr ? "التغذية" : "Nutrition"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Feather name="coffee" size={40} color={c.mutedForeground} />
          <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
            {isAr ? "ميزة التغذية غير مفعّلة" : "Nutrition is not enabled for this gym"}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <RoleHeader title={isAr ? "خطط التغذية" : "Nutrition Plans"} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            tintColor={c.primary}
            refreshing={members.isFetching}
            onRefresh={() => {
              members.refetch();
              if (expandedMemberId) qc.invalidateQueries({ queryKey: ["nutrition", "member", expandedMemberId] });
            }}
          />
        }
      >
        {members.isLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : !members.data?.length ? (
          <EmptyState icon="users" text={isAr ? "لا توجد أعضاء" : "No members assigned"} />
        ) : (
          members.data.map((member) => {
            const isExpanded = expandedMemberId === member.id;
            return (
              <Card key={member.id}>
                <Pressable
                  onPress={() => setExpandedMemberId(isExpanded ? null : member.id)}
                  style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary + "33", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: c.primary, fontWeight: "800", fontSize: 16 }}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15 }}>{member.name}</Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{member.email}</Text>
                  </View>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={c.mutedForeground} />
                </Pressable>

                {isExpanded && (
                  <View style={{ marginTop: 12, gap: 10 }}>
                    {plans.isLoading ? (
                      <ActivityIndicator color={c.primary} />
                    ) : !plans.data?.length ? (
                      <View style={{ alignItems: "center", gap: 10, paddingVertical: 8 }}>
                        <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                          {isAr ? "لا توجد خطط تغذية" : "No nutrition plans yet"}
                        </Text>
                        <Button
                          title={isAr ? "إنشاء خطة تغذية" : "Create Nutrition Plan"}
                          icon="plus"
                          onPress={() => router.push("/coach/create-nutrition" as any)}
                          style={{ alignSelf: "stretch" }}
                        />
                      </View>
                    ) : (
                      <>
                        {plans.data.map((plan) => (
                          <View
                            key={plan.id}
                            style={{ borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 12, gap: 6 }}
                          >
                            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                              <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                                {new Date(plan.createdAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                              </Text>
                              <Pressable onPress={() => deletePlan.mutate(plan.id)}>
                                <Feather name="trash-2" size={15} color={c.destructive} />
                              </Pressable>
                            </View>
                            {(plan.meals ?? []).map((meal: any) => (
                              <View key={meal.id} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                                <View style={{ backgroundColor: c.primary + "22", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                  <Text style={{ color: c.primary, fontSize: 10, fontWeight: "700" }}>{meal.mealType}</Text>
                                </View>
                                <Text style={{ color: c.foreground, fontSize: 13, flex: 1 }} numberOfLines={1}>
                                  {(isAr && meal.descriptionAr) ? meal.descriptionAr : meal.description}
                                </Text>
                                <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{meal.calories ?? 0} kcal</Text>
                              </View>
                            ))}
                          </View>
                        ))}
                        <Button
                          title={isAr ? "+ خطة جديدة" : "+ New Plan"}
                          variant="secondary"
                          onPress={() => router.push("/coach/create-nutrition" as any)}
                        />
                      </>
                    )}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
