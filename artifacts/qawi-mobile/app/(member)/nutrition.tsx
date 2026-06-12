import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { FeatureLockScreen } from "@/components/FeatureLockScreen";
import { RoleHeader } from "@/components/RoleHeader";
import { Screen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { useGymConfig } from "@/hooks/useGymConfig";
import { apiFetch } from "@/services/api";

const N_COLORS = {
  calories: "#F59E0B",
  protein: "#22C55E",
  carbs: "#3B82F6",
  fat: "#EC4899",
  water: "#06B6D4",
  over: "#EF4444",
};

const MEAL_TYPES = [
  { key: "BREAKFAST", en: "Breakfast", ar: "الإفطار", emoji: "🌅" },
  { key: "LUNCH", en: "Lunch", ar: "الغداء", emoji: "☀️" },
  { key: "DINNER", en: "Dinner", ar: "العشاء", emoji: "🌙" },
  { key: "SNACK", en: "Snack", ar: "وجبة خفيفة", emoji: "🍎" },
  { key: "PRE_WORKOUT", en: "Pre-Workout", ar: "قبل التمرين", emoji: "💪" },
  { key: "POST_WORKOUT", en: "Post-Workout", ar: "بعد التمرين", emoji: "⚡" },
];

const UNITS = ["g", "ml", "pieces", "cups", "tbsp", "servings"];

const RING_RADIUS = 80;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function CalorieRing({
  consumed,
  target,
  remaining,
  lang,
}: {
  consumed: number;
  target: number;
  remaining: number;
  lang: string;
}) {
  const progress = target > 0 ? Math.min(1, consumed / target) : 0;
  const over = consumed > target && target > 0;
  const ringColor = over ? N_COLORS.over : N_COLORS.calories;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <View style={{ alignItems: "center", marginVertical: 8 }}>
      <View style={{ position: "relative", width: 200, height: 200 }}>
        <Svg width={200} height={200} viewBox="0 0 200 200">
          <G rotation="-90" origin="100,100">
            <Circle
              cx={100}
              cy={100}
              r={RING_RADIUS}
              fill="transparent"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={14}
            />
            <Circle
              cx={100}
              cy={100}
              r={RING_RADIUS}
              fill="transparent"
              stroke={ringColor}
              strokeWidth={14}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {target > 0 ? (
            <>
              <Text
                style={{
                  color: over ? N_COLORS.over : "white",
                  fontSize: 28,
                  fontWeight: "800",
                }}
              >
                {Math.abs(Math.round(remaining))}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {lang === "ar"
                  ? over
                    ? "kcal زيادة"
                    : "kcal متبقي"
                  : over
                  ? "kcal over"
                  : "kcal left"}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 10,
                  marginTop: 4,
                }}
              >
                {Math.round(consumed)} / {target}
              </Text>
            </>
          ) : (
            <>
              <Text
                style={{
                  color: "white",
                  fontSize: 28,
                  fontWeight: "800",
                }}
              >
                {Math.round(consumed)}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {lang === "ar" ? "kcal اليوم" : "kcal today"}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function MacroBar({
  label,
  labelAr,
  consumed,
  target,
  color,
  unit = "g",
  lang,
}: {
  label: string;
  labelAr: string;
  consumed: number;
  target: number;
  color: string;
  unit?: string;
  lang: string;
}) {
  const progress = target > 0 ? Math.min(1, consumed / target) : 0;
  const over = consumed > target && target > 0;

  return (
    <View style={{ marginBottom: 10 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <Text style={{ color: "white", fontWeight: "600", fontSize: 13 }}>
          {lang === "ar" ? labelAr : label}
        </Text>
        <Text
          style={{
            color: over ? N_COLORS.over : "rgba(255,255,255,0.55)",
            fontSize: 13,
          }}
        >
          {Math.round(consumed)}
          {unit}
          {target > 0 ? ` / ${target}${unit}` : ""}
        </Text>
      </View>
      <View
        style={{
          height: 7,
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            backgroundColor: over ? N_COLORS.over : color,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}

function WaterTracker({
  waterMl,
  targetMl,
  lang,
  onAdd,
  adding,
}: {
  waterMl: number;
  targetMl: number;
  lang: string;
  onAdd: (ml: number) => void;
  adding: boolean;
}) {
  const liters = waterMl / 1000;
  const targetL = targetMl > 0 ? targetMl / 1000 : 2.5;
  const progress = Math.min(1, liters / targetL);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(6,182,212,0.08)",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(6,182,212,0.2)",
        marginBottom: 4,
      }}
    >
      <Text style={{ fontSize: 22, marginRight: 10 }}>💧</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: N_COLORS.water, fontWeight: "700" }}>
            {liters.toFixed(1)}L
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
            / {targetL.toFixed(1)}L
          </Text>
        </View>
        <View
          style={{
            height: 5,
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 3,
            marginTop: 6,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              height: "100%",
              backgroundColor: N_COLORS.water,
              borderRadius: 3,
            }}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginLeft: 12 }}>
        {[250, 500].map((ml) => (
          <TouchableOpacity
            key={ml}
            onPress={() => onAdd(ml)}
            disabled={adding}
            style={{
              backgroundColor: "rgba(6,182,212,0.15)",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: "rgba(6,182,212,0.3)",
            }}
          >
            <Text
              style={{
                color: N_COLORS.water,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              +{ml}ml
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function FoodEntryRow({
  entry,
  lang,
  onDelete,
}: {
  entry: any;
  lang: string;
  onDelete: () => void;
}) {
  const name =
    lang === "ar" && entry.foodNameAr ? entry.foodNameAr : entry.foodName;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.06)",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: "white", fontWeight: "600", fontSize: 14 }}
          numberOfLines={1}
        >
          {name}
        </Text>
        {entry.quantity ? (
          <Text
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {entry.quantity} {entry.unit}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: "flex-end", marginRight: 12 }}>
        <Text
          style={{
            color: N_COLORS.calories,
            fontWeight: "700",
            fontSize: 13,
          }}
        >
          {Math.round(entry.calories ?? 0)} kcal
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: 11,
            marginTop: 1,
          }}
        >
          P {Math.round(entry.proteinG ?? 0)}g · C{" "}
          {Math.round(entry.carbsG ?? 0)}g · F {Math.round(entry.fatG ?? 0)}g
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="trash-2" size={16} color="rgba(239,68,68,0.6)" />
      </TouchableOpacity>
    </View>
  );
}

function MealSection({
  mealType,
  entries,
  lang,
  onDelete,
  onAddFood,
}: {
  mealType: (typeof MEAL_TYPES)[0];
  entries: any[];
  lang: string;
  onDelete: (id: string) => void;
  onAddFood: (mealType: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalCal = entries.reduce((s, e) => s + (e.calories ?? 0), 0);
  const label = lang === "ar" ? mealType.ar : mealType.en;

  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 14,
        marginBottom: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
        }}
      >
        <Text style={{ fontSize: 18, marginRight: 10 }}>{mealType.emoji}</Text>
        <Text style={{ color: "white", fontWeight: "700", flex: 1 }}>
          {label}
        </Text>
        {totalCal > 0 ? (
          <Text
            style={{
              color: N_COLORS.calories,
              fontSize: 13,
              fontWeight: "600",
              marginRight: 8,
            }}
          >
            {Math.round(totalCal)} kcal
          </Text>
        ) : null}
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color="rgba(255,255,255,0.4)"
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          {entries.length === 0 ? (
            <Text
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 12,
                textAlign: "center",
                paddingVertical: 8,
              }}
            >
              {lang === "ar" ? "لا يوجد طعام مسجل" : "Nothing logged yet"}
            </Text>
          ) : (
            entries.map((entry) => (
              <FoodEntryRow
                key={entry.id}
                entry={entry}
                lang={lang}
                onDelete={() => onDelete(entry.id)}
              />
            ))
          )}
          <TouchableOpacity
            onPress={() => onAddFood(mealType.key)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 8,
              marginTop: 4,
              borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              borderStyle: "dashed",
            }}
          >
            <Feather
              name="plus"
              size={14}
              color="rgba(255,255,255,0.4)"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}
            >
              {lang === "ar" ? "إضافة طعام" : "Add food"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

type AddFoodPhase = "input" | "loading" | "result";

function AddFoodModal({
  visible,
  onClose,
  memberId,
  initialMealType,
  lang,
  isRTL,
  onLogged,
}: {
  visible: boolean;
  onClose: () => void;
  memberId: string;
  initialMealType: string;
  lang: string;
  isRTL: boolean;
  onLogged: () => void;
}) {
  const c = {
    bg: "#0A0F1E",
    surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.10)",
  };

  const [phase, setPhase] = useState<AddFoodPhase>("input");
  const [foodInput, setFoodInput] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("servings");
  const [mealType, setMealType] = useState(initialMealType || "BREAKFAST");
  const [aiResult, setAiResult] = useState<any>(null);

  const reset = () => {
    setPhase("input");
    setFoodInput("");
    setQuantity("1");
    setUnit("servings");
    setMealType(initialMealType || "BREAKFAST");
    setAiResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const analyze = async () => {
    if (!foodInput.trim()) return;
    setPhase("loading");
    try {
      const result = await apiFetch<any>("/nutrition/calculate", {
        method: "POST",
        data: {
          foodName: foodInput.trim(),
          quantity: parseFloat(quantity) || 100,
          unit,
        },
      });
      setAiResult(result);
      setPhase("result");
    } catch (e) {
      Alert.alert(
        lang === "ar" ? "خطأ" : "Error",
        lang === "ar"
          ? "فشل في تحليل الطعام. حاول مرة أخرى."
          : "Failed to analyze food. Please try again."
      );
      setPhase("input");
    }
  };

  const logFood = async () => {
    if (!aiResult) return;
    try {
      await apiFetch("/nutrition/log/manual", {
        method: "POST",
        data: {
          memberId,
          foodName: aiResult.foodName,
          foodNameAr: aiResult.foodNameAr ?? "",
          mealType,
          quantity: parseFloat(quantity) || 100,
          unit,
          calories: aiResult.calories,
          protein: aiResult.protein,
          carbs: aiResult.carbs,
          fat: aiResult.fat,
          fiber: aiResult.fiber ?? null,
          sugar: aiResult.sugar ?? null,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onLogged();
      handleClose();
    } catch (e) {
      Alert.alert(
        lang === "ar" ? "خطأ" : "Error",
        lang === "ar" ? "فشل في حفظ السجل." : "Failed to save food entry."
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "#0A0F1E" }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 18,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.08)",
          }}
        >
          <TouchableOpacity onPress={handleClose} style={{ marginRight: 14 }}>
            <Feather name="x" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <Text style={{ color: "white", fontWeight: "700", fontSize: 18, flex: 1 }}>
            {lang === "ar" ? "إضافة طعام" : "Add Food"}
          </Text>
          {phase === "result" ? (
            <TouchableOpacity onPress={() => setPhase("input")}>
              <Text style={{ color: N_COLORS.calories, fontWeight: "600" }}>
                {lang === "ar" ? "تعديل" : "Edit"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 18, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {phase === "loading" ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 80,
              }}
            >
              <ActivityIndicator
                size="large"
                color={N_COLORS.calories}
                style={{ marginBottom: 20 }}
              />
              <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>
                {lang === "ar"
                  ? "جاري حساب القيم الغذائية..."
                  : "Calculating nutrition..."}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 8,
                  fontSize: 13,
                }}
              >
                {lang === "ar"
                  ? "يستخدم الذكاء الاصطناعي"
                  : "Powered by AI"}
              </Text>
            </View>
          ) : phase === "result" && aiResult ? (
            <>
              <View
                style={{
                  backgroundColor: "rgba(245,158,11,0.08)",
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: "rgba(245,158,11,0.2)",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "700",
                    fontSize: 18,
                    marginBottom: 2,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {lang === "ar" && aiResult.foodNameAr
                    ? aiResult.foodNameAr
                    : aiResult.foodName}
                </Text>
                {aiResult.foodNameAr && aiResult.foodName ? (
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 13,
                      marginBottom: 16,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {lang === "ar" ? aiResult.foodName : aiResult.foodNameAr}
                  </Text>
                ) : null}

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-around",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  {[
                    {
                      emoji: "🔥",
                      value: Math.round(aiResult.calories ?? 0),
                      unit: "kcal",
                      color: N_COLORS.calories,
                    },
                    {
                      emoji: "🥩",
                      value: Math.round(aiResult.protein ?? 0),
                      unit: "g protein",
                      color: N_COLORS.protein,
                    },
                    {
                      emoji: "🌾",
                      value: Math.round(aiResult.carbs ?? 0),
                      unit: "g carbs",
                      color: N_COLORS.carbs,
                    },
                    {
                      emoji: "🧈",
                      value: Math.round(aiResult.fat ?? 0),
                      unit: "g fat",
                      color: N_COLORS.fat,
                    },
                  ].map((item) => (
                    <View key={item.unit} style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                      <Text
                        style={{
                          color: item.color,
                          fontWeight: "800",
                          fontSize: 20,
                          marginTop: 4,
                        }}
                      >
                        {item.value}
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255,255,255,0.45)",
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {item.unit}
                      </Text>
                    </View>
                  ))}
                </View>

                {aiResult.confidence != null && aiResult.confidence < 0.8 ? (
                  <View
                    style={{
                      marginTop: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(251,191,36,0.1)",
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    <Feather
                      name="alert-triangle"
                      size={13}
                      color="#FBBF24"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ color: "#FBBF24", fontSize: 12 }}>
                      {lang === "ar"
                        ? `دقة تقريبية: ${Math.round((aiResult.confidence ?? 0) * 100)}%`
                        : `Approx. confidence: ${Math.round((aiResult.confidence ?? 0) * 100)}%`}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                {lang === "ar" ? "يُضاف إلى" : "Adding to"}{" "}
                <Text style={{ color: "white", fontWeight: "600" }}>
                  {MEAL_TYPES.find((m) => m.key === mealType)?.[
                    lang === "ar" ? "ar" : "en"
                  ]}
                </Text>
              </Text>

              <TouchableOpacity
                onPress={logFood}
                style={{
                  backgroundColor: N_COLORS.protein,
                  borderRadius: 14,
                  padding: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "800",
                    fontSize: 16,
                  }}
                >
                  {lang === "ar" ? "إضافة إلى السجل ✓" : "Add to Log ✓"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    fontWeight: "600",
                    marginBottom: 8,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {lang === "ar" ? "ماذا أكلت؟" : "What did you eat?"}
                </Text>
                <TextInput
                  value={foodInput}
                  onChangeText={setFoodInput}
                  placeholder={
                    lang === "ar"
                      ? "مثال: شاورما دجاج / 2 eggs scrambled"
                      : "e.g. chicken shawarma / شاورما دجاج"
                  }
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: 14,
                    color: "white",
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                    textAlign: isRTL ? "right" : "left",
                  }}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 12,
                      fontWeight: "600",
                      marginBottom: 8,
                    }}
                  >
                    {lang === "ar" ? "الكمية" : "Quantity"}
                  </Text>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderRadius: 12,
                      padding: 14,
                      color: "white",
                      fontSize: 16,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.1)",
                      textAlign: "center",
                    }}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 12,
                      fontWeight: "600",
                      marginBottom: 8,
                    }}
                  >
                    {lang === "ar" ? "الوحدة" : "Unit"}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flexDirection: "row" }}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {UNITS.map((u) => (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setUnit(u)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor:
                            unit === u
                              ? "rgba(245,158,11,0.2)"
                              : "rgba(255,255,255,0.06)",
                          borderWidth: 1,
                          borderColor:
                            unit === u
                              ? N_COLORS.calories
                              : "rgba(255,255,255,0.1)",
                        }}
                      >
                        <Text
                          style={{
                            color:
                              unit === u ? N_COLORS.calories : "rgba(255,255,255,0.6)",
                            fontWeight: unit === u ? "700" : "400",
                            fontSize: 13,
                          }}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 12,
                    fontWeight: "600",
                    marginBottom: 8,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {lang === "ar" ? "نوع الوجبة" : "Meal type"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {MEAL_TYPES.map((mt) => (
                    <TouchableOpacity
                      key={mt.key}
                      onPress={() => setMealType(mt.key)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor:
                          mealType === mt.key
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(255,255,255,0.05)",
                        borderWidth: 1,
                        borderColor:
                          mealType === mt.key
                            ? N_COLORS.protein
                            : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <Text
                        style={{
                          color:
                            mealType === mt.key
                              ? N_COLORS.protein
                              : "rgba(255,255,255,0.5)",
                          fontWeight: mealType === mt.key ? "700" : "400",
                          fontSize: 12,
                        }}
                      >
                        {mt.emoji} {lang === "ar" ? mt.ar : mt.en}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={analyze}
                disabled={!foodInput.trim()}
                style={{
                  backgroundColor: foodInput.trim()
                    ? N_COLORS.calories
                    : "rgba(245,158,11,0.3)",
                  borderRadius: 14,
                  padding: 16,
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "800",
                    fontSize: 16,
                  }}
                >
                  {lang === "ar"
                    ? "✨ احسب القيم الغذائية"
                    : "✨ Calculate Nutrition"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function NutritionScreen() {
  const { features } = useGymConfig();
  const { user } = useAuth();
  const { lang, isRTL } = useLanguage();
  const c = useColors();
  const qc = useQueryClient();

  const [addFoodVisible, setAddFoodVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState("BREAKFAST");

  const memberId = user?.id ?? "";

  const todayQuery = useQuery({
    queryKey: ["nutrition", "today", memberId],
    queryFn: () =>
      apiFetch<any>(`/nutrition/log/today/${memberId}`).catch(() => null),
    enabled: !!memberId && features.nutritionEnabled,
    refetchInterval: 60_000,
  });

  const deleteEntry = useMutation({
    mutationFn: (entryId: string) =>
      apiFetch(`/nutrition/log/${entryId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition", "today"] });
      Haptics.selectionAsync().catch(() => {});
    },
    onError: () => {
      Alert.alert(
        lang === "ar" ? "خطأ" : "Error",
        lang === "ar" ? "فشل في حذف السجل." : "Failed to delete entry."
      );
    },
  });

  const logWater = useMutation({
    mutationFn: (amountMl: number) =>
      apiFetch("/nutrition/water", {
        method: "POST",
        data: { memberId, amount: amountMl / 1000 },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition", "today"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
  });

  const data = todayQuery.data;
  const hasTarget = !!data?.target;
  const target = data?.target ?? {};
  const todayTotals = data?.totals ?? {};
  const waterMl = Math.round((todayTotals?.water?.consumed ?? 0) * 1000);

  const targetCal = target.targetCalories ?? 0;
  const remaining = targetCal - (todayTotals?.calories?.consumed ?? 0);

  const totals = {
    calories: todayTotals?.calories?.consumed ?? 0,
    protein: todayTotals?.protein?.consumed ?? 0,
    carbs: todayTotals?.carbs?.consumed ?? 0,
    fat: todayTotals?.fat?.consumed ?? 0,
  };

  const entriesByMeal = useMemo(() => {
    const map = data?.entriesByMeal ?? {};
    const result: Record<string, any[]> = {};
    for (const mt of MEAL_TYPES) {
      result[mt.key] = map[mt.key] ?? [];
    }
    return result;
  }, [data?.entriesByMeal]);

  const confirmDelete = (entryId: string, name: string) => {
    Alert.alert(
      lang === "ar" ? "حذف السجل" : "Delete Entry",
      lang === "ar"
        ? `هل تريد حذف "${name}"؟`
        : `Remove "${name}" from your log?`,
      [
        { text: lang === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: lang === "ar" ? "حذف" : "Delete",
          style: "destructive",
          onPress: () => deleteEntry.mutate(entryId),
        },
      ]
    );
  };

  const openAddFood = (mealType: string) => {
    setActiveMealType(mealType);
    setAddFoodVisible(true);
  };

  if (!features.nutritionEnabled) {
    return (
      <FeatureLockScreen
        icon="🥗"
        titleEn="Nutrition Not Activated"
        titleAr="التغذية غير مفعّلة"
        subtitleEn="Your gym hasn't enabled this feature yet."
        subtitleAr="لم تقم صالتك بتفعيل هذه الميزة بعد."
      />
    );
  }

  return (
    <Screen>
      <RoleHeader
        title={lang === "ar" ? "التغذية" : "Nutrition"}
        subtitle={
          hasTarget && target.goal
            ? lang === "ar"
              ? target.goal === "LOSE_WEIGHT"
                ? "خسارة وزن"
                : target.goal === "GAIN_MUSCLE"
                ? "بناء عضلات"
                : "محافظة على الوزن"
              : target.goal === "LOSE_WEIGHT"
              ? "Weight Loss"
              : target.goal === "GAIN_MUSCLE"
              ? "Muscle Gain"
              : "Maintenance"
            : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
        refreshControl={
          <RefreshControl
            tintColor={N_COLORS.calories}
            refreshing={todayQuery.isFetching}
            onRefresh={() =>
              qc.invalidateQueries({ queryKey: ["nutrition", "today"] })
            }
          />
        }
      >
        {todayQuery.isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  height: i === 1 ? 220 : 80,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: 16,
                }}
              />
            ))}
          </>
        ) : (
          <>
            {/* Calorie Ring + Macros */}
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.04)",
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.07)",
              }}
            >
              <CalorieRing
                consumed={totals.calories ?? 0}
                target={targetCal}
                remaining={remaining}
                lang={lang}
              />

              <View style={{ marginTop: 8 }}>
                <MacroBar
                  label="Protein"
                  labelAr="بروتين"
                  consumed={totals.protein ?? 0}
                  target={target.targetProtein ?? 0}
                  color={N_COLORS.protein}
                  lang={lang}
                />
                <MacroBar
                  label="Carbs"
                  labelAr="كربوهيدرات"
                  consumed={totals.carbs ?? 0}
                  target={target.targetCarbs ?? 0}
                  color={N_COLORS.carbs}
                  lang={lang}
                />
                <MacroBar
                  label="Fat"
                  labelAr="دهون"
                  consumed={totals.fat ?? 0}
                  target={target.targetFat ?? 0}
                  color={N_COLORS.fat}
                  lang={lang}
                />
              </View>

              {!hasTarget ? (
                <Text
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 12,
                    textAlign: "center",
                    marginTop: 12,
                  }}
                >
                  {lang === "ar"
                    ? "لم يتم تعيين أهداف غذائية بعد — تواصل مع كوتشك"
                    : "No nutrition targets set yet — contact your coach"}
                </Text>
              ) : null}
            </View>

            {/* Water Tracker */}
            <WaterTracker
              waterMl={waterMl}
              targetMl={Math.round((target.targetWater ?? 2) * 1000)}
              lang={lang}
              onAdd={(ml) => logWater.mutate(ml)}
              adding={logWater.isPending}
            />

            {/* Add Food Button */}
            <TouchableOpacity
              onPress={() => openAddFood("BREAKFAST")}
              style={{
                backgroundColor: N_COLORS.protein,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                shadowColor: N_COLORS.protein,
                shadowOpacity: 0.35,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Feather name="plus-circle" size={20} color="white" />
                <Text
                  style={{
                    color: "white",
                    fontWeight: "800",
                    fontSize: 16,
                  }}
                >
                  {lang === "ar" ? "+ إضافة طعام" : "+ Add Food"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Meal Sections */}
            {MEAL_TYPES.map((mt) => (
              <MealSection
                key={mt.key}
                mealType={mt}
                entries={entriesByMeal[mt.key] ?? []}
                lang={lang}
                onDelete={(id) => {
                  const allEntries = Object.values(data?.entriesByMeal ?? {}).flat() as any[];
                  const entry = allEntries.find((e: any) => e.id === id);
                  const name =
                    lang === "ar" && entry?.foodNameAr
                      ? entry.foodNameAr
                      : entry?.foodName ?? "item";
                  confirmDelete(id, name);
                }}
                onAddFood={openAddFood}
              />
            ))}
          </>
        )}
      </ScrollView>

      <AddFoodModal
        visible={addFoodVisible}
        onClose={() => setAddFoodVisible(false)}
        memberId={memberId}
        initialMealType={activeMealType}
        lang={lang}
        isRTL={isRTL}
        onLogged={() => {
          qc.invalidateQueries({ queryKey: ["nutrition", "today"] });
        }}
      />
    </Screen>
  );
}
