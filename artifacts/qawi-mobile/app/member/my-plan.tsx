import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, EmptyState, Screen, SectionTitle } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type Overview = {
  member?: { id: string; name?: string };
  currentWorkoutPlan?: {
    id: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    scheduleDays?: ScheduleDay[];
  };
};

type ScheduleDay = {
  id: string;
  dayDate?: string;
  dayName?: string;
  dayNameAr?: string;
  isRestDay?: boolean;
  isCompleted?: boolean;
  exercises?: PlanExercise[];
};

type PlanExercise = {
  id: string;
  exerciseName?: string;
  exerciseNameAr?: string;
  sets?: number;
  reps?: number;
  targetWeight?: number;
};

type ExerciseTemplate = {
  id: string;
  name: string;
  nameAr?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
};

export default function MyPlanScreen() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [selectedDay, setSelectedDay] = useState<ScheduleDay | null>(null);

  const overview = useQuery({
    queryKey: ["member", "my-plan-overview"],
    queryFn: () =>
      apiFetch<Overview>(`/coach/members/${user?.id}/overview`).catch(() => null),
    enabled: !!user?.id,
  });

  const plan = overview.data?.currentWorkoutPlan ?? null;
  const scheduleDays: ScheduleDay[] = useMemo(
    () =>
      (plan?.scheduleDays ?? [])
        .slice()
        .sort((a, b) => (a.dayDate ?? "").localeCompare(b.dayDate ?? "")),
    [plan]
  );

  const deleteEx = useMutation({
    mutationFn: ({ dayId, exId }: { dayId: string; exId: string }) =>
      apiFetch(`/workouts/days/${dayId}/exercises/${exId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member", "my-plan-overview"] }),
    onError: (e: any) =>
      Alert.alert(
        lang === "ar" ? "قوي" : "Qawi",
        e?.message || (lang === "ar" ? "تعذر حذف التمرين" : "Could not delete exercise")
      ),
  });

  return (
    <Screen>
      {/* Header */}
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
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={c.foreground} />
        </Pressable>
        <Text
          style={{
            color: c.foreground,
            fontSize: 18,
            fontWeight: "800",
            flex: 1,
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {lang === "ar" ? "خطة تمريني" : "My Workout Plan"}
        </Text>
      </View>

      {overview.isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[...Array(5)].map((_, i) => (
            <View
              key={i}
              style={{ height: 70, backgroundColor: c.surface, borderRadius: 16, opacity: 0.6 }}
            />
          ))}
        </View>
      ) : !plan ? (
        <View style={{ flex: 1, padding: 20 }}>
          <Card>
            <EmptyState
              icon="calendar"
              text={lang === "ar" ? "لا توجد خطة تمرين مفعّلة" : "No active workout plan"}
            />
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
          {/* Plan header */}
          <View
            style={{
              backgroundColor: "#7C3AED18",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#7C3AED44",
              padding: 14,
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
              <Feather name="edit-3" size={18} color="#7C3AED" />
              <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 16 }}>{plan.name}</Text>
            </View>
            <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
              {plan.startDate ? String(plan.startDate).slice(0, 10) : ""}
              {plan.endDate ? ` → ${String(plan.endDate).slice(0, 10)}` : ""}
            </Text>
          </View>

          <SectionTitle>{lang === "ar" ? "الجدول الأسبوعي" : "Weekly Schedule"}</SectionTitle>

          {scheduleDays.length === 0 ? (
            <Card>
              <EmptyState
                icon="calendar"
                text={lang === "ar" ? "الخطة بدأت للتو — الأيام ستظهر هنا تدريجياً" : "Plan just started — days will appear here soon"}
              />
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {scheduleDays.map((day) => {
                const exCount = day.exercises?.length ?? 0;
                const isRest = !!day.isRestDay;
                const isDone = !!day.isCompleted;
                const dot = isDone
                  ? c.primary
                  : isRest
                  ? c.mutedForeground
                  : exCount > 0
                  ? "#3b82f6"
                  : c.border;
                return (
                  <Pressable
                    key={day.id}
                    onPress={() => setSelectedDay(day)}
                    style={({ pressed }) => ({
                      backgroundColor: pressed ? c.surface : c.card,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isDone
                        ? `${c.primary}50`
                        : isRest
                        ? c.border
                        : exCount > 0
                        ? "#3b82f620"
                        : c.border,
                      padding: 14,
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      gap: 12,
                    })}
                  >
                    <View
                      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: c.foreground,
                          fontWeight: "700",
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {lang === "ar"
                          ? day.dayNameAr ?? day.dayName ?? ""
                          : day.dayName ?? ""}
                      </Text>
                      <Text
                        style={{
                          color: c.mutedForeground,
                          fontSize: 12,
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {day.dayDate ? String(day.dayDate).slice(0, 10) : ""}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: isDone
                          ? c.primary
                          : isRest
                          ? c.mutedForeground
                          : exCount > 0
                          ? "#3b82f6"
                          : c.mutedForeground,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {isDone
                        ? lang === "ar"
                          ? "✅ مكتمل"
                          : "✅ Done"
                        : isRest
                        ? lang === "ar"
                          ? "😴 راحة"
                          : "😴 Rest"
                        : exCount > 0
                        ? lang === "ar"
                          ? `${exCount} تمارين`
                          : `${exCount} ex`
                        : lang === "ar"
                        ? "اضغط لإضافة"
                        : "Tap to add"}
                    </Text>
                    <Feather
                      name={isRTL ? "chevron-left" : "chevron-right"}
                      size={16}
                      color={c.mutedForeground}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {selectedDay && (
        <DayModal
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          onDeleteExercise={(exId) =>
            Alert.alert(
              lang === "ar" ? "حذف التمرين" : "Delete exercise",
              lang === "ar" ? "هل أنت متأكد من الحذف؟" : "Remove this exercise?",
              [
                { text: lang === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
                {
                  text: lang === "ar" ? "حذف" : "Delete",
                  style: "destructive",
                  onPress: () => deleteEx.mutate({ dayId: selectedDay.id, exId }),
                },
              ]
            )
          }
          deletePending={deleteEx.isPending}
          onExerciseAdded={() =>
            qc.invalidateQueries({ queryKey: ["member", "my-plan-overview"] })
          }
        />
      )}
    </Screen>
  );
}

function DayModal({
  day,
  onClose,
  onDeleteExercise,
  deletePending,
  onExerciseAdded,
}: {
  day: ScheduleDay;
  onClose: () => void;
  onDeleteExercise: (exId: string) => void;
  deletePending: boolean;
  onExerciseAdded?: () => void;
}) {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const exercises = day.exercises ?? [];

  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<ExerciseTemplate | null>(null);
  const [pickerQ, setPickerQ] = useState("");
  const [pSets, setPSets] = useState("3");
  const [pReps, setPReps] = useState("10");
  const [pWeight, setPWeight] = useState("");

  const library = useQuery({
    queryKey: ["exercises", "library"],
    queryFn: () => apiFetch<ExerciseTemplate[]>("/exercises/library").catch(() => []),
    enabled: pickerOpen,
  });

  const filtered = useMemo(() => {
    const data = library.data ?? [];
    if (!pickerQ) return data;
    return data.filter(
      (e) =>
        (e.name ?? "").toLowerCase().includes(pickerQ.toLowerCase()) ||
        (e.nameAr ?? "").includes(pickerQ)
    );
  }, [library.data, pickerQ]);

  const addEx = useMutation({
    mutationFn: (payload: {
      exerciseTemplateId: string;
      sets: number;
      reps: number;
      targetWeight?: number;
    }) =>
      apiFetch(`/workouts/days/${day.id}/exercises`, {
        method: "POST",
        data: { ...payload, orderIndex: 0 },
      }),
    onSuccess: () => {
      onExerciseAdded?.();
      setPickerOpen(false);
      setPicked(null);
      setPickerQ("");
    },
    onError: (e: any) =>
      Alert.alert(
        lang === "ar" ? "قوي" : "Qawi",
        e?.message || (lang === "ar" ? "تعذر إضافة التمرين" : "Could not add exercise")
      ),
  });

  function openPicker() {
    setPicked(null);
    setPickerQ("");
    setPSets("3");
    setPReps("10");
    setPWeight("");
    setPickerOpen(true);
  }

  function handlePick(ex: ExerciseTemplate) {
    setPicked(ex);
    setPSets(String(ex.defaultSets ?? 3));
    setPReps(String(ex.defaultReps ?? 10));
    setPWeight(ex.defaultWeight ? String(ex.defaultWeight) : "");
  }

  function handleAdd() {
    if (!picked) return;
    addEx.mutate({
      exerciseTemplateId: picked.id,
      sets: parseInt(pSets, 10) || 3,
      reps: parseInt(pReps, 10) || 10,
      ...(pWeight ? { targetWeight: parseFloat(pWeight) } : {}),
    });
  }

  const backFromPicker = () => {
    if (picked) {
      setPicked(null);
    } else {
      setPickerOpen(false);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={pickerOpen ? backFromPicker : onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 32,
            maxHeight: "92%",
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: isRTL ? "row-reverse" : "row",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
              gap: 10,
            }}
          >
            {pickerOpen && (
              <Pressable onPress={backFromPicker} hitSlop={10}>
                <Feather
                  name={isRTL ? "arrow-right" : "arrow-left"}
                  size={22}
                  color={c.foreground}
                />
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: c.foreground,
                  fontSize: 17,
                  fontWeight: "800",
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                {pickerOpen
                  ? picked
                    ? lang === "ar"
                      ? "تفاصيل التمرين"
                      : "Exercise Details"
                    : lang === "ar"
                    ? "اختر تمريناً"
                    : "Pick an exercise"
                  : lang === "ar"
                  ? day.dayNameAr ?? day.dayName ?? ""
                  : day.dayName ?? ""}
              </Text>
              {!pickerOpen && day.dayDate ? (
                <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                  {String(day.dayDate).slice(0, 10)}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={pickerOpen ? backFromPicker : onClose} hitSlop={10}>
              <Feather name="x" size={22} color={c.foreground} />
            </Pressable>
          </View>

          {/* Exercise picker: list */}
          {pickerOpen && !picked && (
            <>
              <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                <TextInput
                  value={pickerQ}
                  onChangeText={setPickerQ}
                  placeholder={lang === "ar" ? "بحث عن تمرين…" : "Search exercises…"}
                  placeholderTextColor={c.mutedForeground}
                  style={{
                    backgroundColor: c.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: c.border,
                    paddingHorizontal: 14,
                    height: 46,
                    color: c.foreground,
                    fontSize: 14,
                    textAlign: isRTL ? "right" : "left",
                  }}
                />
              </View>
              {library.isLoading ? (
                <View style={{ padding: 32, alignItems: "center" }}>
                  <ActivityIndicator color={c.primary} />
                </View>
              ) : filtered.length === 0 ? (
                <View style={{ padding: 32, alignItems: "center" }}>
                  <Text style={{ color: c.mutedForeground }}>
                    {lang === "ar" ? "لا توجد نتائج" : "No results"}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(e) => e.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 6 }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item: ex }) => (
                    <Pressable
                      onPress={() => handlePick(ex)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? c.surface : c.card,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: c.border,
                        padding: 12,
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        gap: 10,
                      })}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: `${c.primary}15`,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="activity" size={16} color={c.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: c.foreground,
                            fontWeight: "700",
                            fontSize: 13,
                            textAlign: isRTL ? "right" : "left",
                          }}
                        >
                          {lang === "ar" ? ex.nameAr ?? ex.name : ex.name}
                        </Text>
                        <Text
                          style={{
                            color: c.mutedForeground,
                            fontSize: 11,
                            textAlign: isRTL ? "right" : "left",
                          }}
                        >
                          {ex.defaultSets ?? 3} × {ex.defaultReps ?? 10}
                          {ex.defaultWeight ? `  •  ${ex.defaultWeight}kg` : ""}
                        </Text>
                      </View>
                      <Feather
                        name={isRTL ? "chevron-left" : "chevron-right"}
                        size={16}
                        color={c.mutedForeground}
                      />
                    </Pressable>
                  )}
                />
              )}
            </>
          )}

          {/* Exercise picker: sets/reps form */}
          {pickerOpen && picked && (
            <View style={{ padding: 16, gap: 14 }}>
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Feather name="activity" size={20} color={c.primary} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: c.foreground,
                      fontWeight: "700",
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {lang === "ar" ? picked.nameAr ?? picked.name : picked.name}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <NumField
                  label={lang === "ar" ? "مجموعات" : "Sets"}
                  value={pSets}
                  onChange={setPSets}
                />
                <NumField
                  label={lang === "ar" ? "تكرارات" : "Reps"}
                  value={pReps}
                  onChange={setPReps}
                />
                <NumField
                  label={lang === "ar" ? "وزن (كغ)" : "Weight (kg)"}
                  value={pWeight}
                  onChange={setPWeight}
                  decimal
                  placeholder="0"
                />
              </View>
              <Pressable
                onPress={handleAdd}
                disabled={addEx.isPending}
                style={{
                  backgroundColor: c.primary,
                  borderRadius: 14,
                  height: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: addEx.isPending ? 0.6 : 1,
                }}
              >
                {addEx.isPending ? (
                  <ActivityIndicator color={c.primaryForeground} />
                ) : (
                  <Text style={{ color: c.primaryForeground, fontWeight: "700", fontSize: 16 }}>
                    {lang === "ar" ? "إضافة للخطة ✓" : "Add to Plan ✓"}
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Day view: exercises list */}
          {!pickerOpen && (
            <>
              {day.isRestDay ? (
                <View style={{ padding: 40, alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 48 }}>😴</Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 16, fontWeight: "600" }}>
                    {lang === "ar" ? "يوم راحة" : "Rest Day"}
                  </Text>
                </View>
              ) : exercises.length === 0 ? (
                <View style={{ padding: 40, alignItems: "center", gap: 8 }}>
                  <Feather name="inbox" size={40} color={c.mutedForeground} />
                  <Text style={{ color: c.mutedForeground, fontSize: 14 }}>
                    {lang === "ar" ? "لا يوجد تمارين — أضف أول تمرين!" : "No exercises yet — add your first!"}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={exercises}
                  keyExtractor={(e) => e.id}
                  contentContainerStyle={{ padding: 14, gap: 8 }}
                  ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                  renderItem={({ item: ex }) => (
                    <View
                      style={{
                        backgroundColor: c.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: c.border,
                        padding: 12,
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: `${c.primary}15`,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="activity" size={16} color={c.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: c.foreground,
                            fontWeight: "700",
                            fontSize: 14,
                            textAlign: isRTL ? "right" : "left",
                          }}
                        >
                          {lang === "ar"
                            ? ex.exerciseNameAr ?? ex.exerciseName ?? ""
                            : ex.exerciseName ?? ""}
                        </Text>
                        <Text
                          style={{
                            color: c.mutedForeground,
                            fontSize: 12,
                            textAlign: isRTL ? "right" : "left",
                          }}
                        >
                          {ex.sets ?? 3} × {ex.reps ?? 10}
                          {ex.targetWeight
                            ? lang === "ar"
                              ? `  @  ${ex.targetWeight} كغ`
                              : `  @  ${ex.targetWeight} kg`
                            : ""}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => onDeleteExercise(ex.id)}
                        disabled={deletePending}
                        hitSlop={8}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(239,68,68,0.12)",
                          opacity: deletePending ? 0.5 : 1,
                        }}
                      >
                        <Feather name="trash-2" size={15} color="#ef4444" />
                      </Pressable>
                    </View>
                  )}
                />
              )}

              {!day.isRestDay && (
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                  <Pressable
                    onPress={openPicker}
                    style={{
                      backgroundColor: c.primary,
                      borderRadius: 14,
                      height: 50,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Feather name="plus" size={18} color={c.primaryForeground} />
                    <Text style={{ color: c.primaryForeground, fontWeight: "700", fontSize: 15 }}>
                      {lang === "ar" ? "إضافة تمرين" : "Add Exercise"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function NumField({
  label,
  value,
  onChange,
  decimal,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  decimal?: boolean;
  placeholder?: string;
}) {
  const c = useColors();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) =>
          onChange(decimal ? v.replace(/[^0-9.]/g, "") : v.replace(/[^0-9]/g, ""))
        }
        keyboardType={decimal ? "decimal-pad" : "number-pad"}
        placeholder={placeholder ?? "0"}
        placeholderTextColor={c.mutedForeground}
        style={{
          backgroundColor: c.surface,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: c.border,
          paddingHorizontal: 10,
          height: 46,
          color: c.foreground,
          fontSize: 15,
          textAlign: "center",
        }}
      />
    </View>
  );
}
