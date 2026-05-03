import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type CoachMember = { id: string; name: string };
type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
type DraftMeal = {
  tempId: string;
  mealType: MealType;
  name: string;
  nameAr: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
};

const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export default function CreateNutrition() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [memberId, setMemberId] = useState<string | null>(null);
  const [meals, setMeals] = useState<DraftMeal[]>([]);

  const members = useQuery({
    queryKey: ["coach", "members"],
    queryFn: () => apiFetch<CoachMember[]>("/coach/members").catch(() => []),
  });

  const addMeal = () =>
    setMeals((m) => [
      ...m,
      {
        tempId: Math.random().toString(36).slice(2, 9),
        mealType: "BREAKFAST",
        name: "",
        nameAr: "",
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
      },
    ]);

  const updateMeal = (id: string, patch: Partial<DraftMeal>) =>
    setMeals((arr) => arr.map((m) => (m.tempId === id ? { ...m, ...patch } : m)));

  const save = useMutation({
    mutationFn: async () => {
      const plan = await apiFetch<any>("/nutrition", { method: "POST", data: { memberId } });
      const planId = plan.id;
      for (const m of meals) {
        await apiFetch(`/nutrition/${planId}/meals`, {
          method: "POST",
          data: {
            mealType: m.mealType,
            name: m.name,
            nameAr: m.nameAr || undefined,
            calories: parseInt(m.calories, 10) || 0,
            protein: parseFloat(m.protein) || 0,
            carbs: parseFloat(m.carbs) || 0,
            fats: parseFloat(m.fats) || 0,
          },
        });
      }
    },
    onSuccess: () => {
      Alert.alert("Qawi", lang === "ar" ? "تم إنشاء خطة الغذاء" : "Nutrition plan created");
      qc.invalidateQueries({ queryKey: ["coach"] });
      router.back();
    },
    onError: (e: any) => Alert.alert("Qawi", e?.message || "Could not save plan"),
  });

  const canSave = !!memberId && meals.length > 0 && meals.every((m) => m.name);

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
        <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1 }}>
          {t("coach.createNutrition")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 140 }}>
        <Field label={lang === "ar" ? "العضو" : "Select member"}>
          {members.isLoading ? (
            <ActivityIndicator color={c.primary} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(members.data ?? []).map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setMemberId(m.id)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
                      backgroundColor: memberId === m.id ? c.primary : c.surface,
                      borderWidth: 1, borderColor: memberId === m.id ? c.primary : c.border,
                    }}
                  >
                    <Text style={{ color: memberId === m.id ? c.primaryForeground : c.foreground, fontWeight: "700", fontSize: 13 }}>
                      {m.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </Field>

        {meals.length === 0 ? (
          <Card><EmptyState icon="coffee" text={lang === "ar" ? "أضف وجبة للبدء" : "Add a meal to get started"} /></Card>
        ) : (
          meals.map((meal) => (
            <Card key={meal.tempId}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {MEAL_TYPES.map((mt) => (
                    <Pressable
                      key={mt}
                      onPress={() => updateMeal(meal.tempId, { mealType: mt })}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                        backgroundColor: meal.mealType === mt ? c.primary : c.surface,
                        borderWidth: 1, borderColor: meal.mealType === mt ? c.primary : c.border,
                      }}
                    >
                      <Text style={{ color: meal.mealType === mt ? c.primaryForeground : c.foreground, fontSize: 11, fontWeight: "700" }}>
                        {t(`member.${mt.toLowerCase()}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => setMeals((arr) => arr.filter((m) => m.tempId !== meal.tempId))}>
                  <Feather name="trash-2" size={18} color={c.destructive} />
                </Pressable>
              </View>
              <View style={{ gap: 8 }}>
                <Box value={meal.name} onChangeText={(v) => updateMeal(meal.tempId, { name: v })} placeholder={lang === "ar" ? "الوصف بالإنجليزية" : "Description (EN)"} />
                <Box value={meal.nameAr} onChangeText={(v) => updateMeal(meal.tempId, { nameAr: v })} placeholder={lang === "ar" ? "الوصف بالعربية" : "Description (AR)"} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Box value={meal.calories} onChangeText={(v) => updateMeal(meal.tempId, { calories: v.replace(/[^0-9]/g, "") })} keyboardType="number-pad" placeholder="kcal" style={{ flex: 1 }} />
                  <Box value={meal.protein} onChangeText={(v) => updateMeal(meal.tempId, { protein: v.replace(/[^0-9.]/g, "") })} keyboardType="decimal-pad" placeholder="P (g)" style={{ flex: 1 }} />
                  <Box value={meal.carbs} onChangeText={(v) => updateMeal(meal.tempId, { carbs: v.replace(/[^0-9.]/g, "") })} keyboardType="decimal-pad" placeholder="C (g)" style={{ flex: 1 }} />
                  <Box value={meal.fats} onChangeText={(v) => updateMeal(meal.tempId, { fats: v.replace(/[^0-9.]/g, "") })} keyboardType="decimal-pad" placeholder="F (g)" style={{ flex: 1 }} />
                </View>
              </View>
            </Card>
          ))
        )}

        <Button title={lang === "ar" ? "+ إضافة وجبة" : "+ Add meal"} variant="secondary" onPress={addMeal} />
      </ScrollView>

      <View
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          padding: 16, paddingBottom: insets.bottom + 16,
          backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border,
        }}
      >
        <Button
          title={t("common.save")}
          icon="check"
          onPress={() => save.mutate()}
          loading={save.isPending}
          disabled={!canSave}
        />
      </View>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.mutedForeground, fontSize: 12, fontWeight: "600" }}>{label}</Text>
      {children}
    </View>
  );
}

function Box(props: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.mutedForeground}
      {...props}
      style={[{
        backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border,
        paddingHorizontal: 14, height: 46, color: c.foreground, fontSize: 14,
      }, props.style as any]}
    />
  );
}
