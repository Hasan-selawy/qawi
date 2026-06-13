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

type WorkoutPlan = {
  id: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  memberId?: string;
};

type ScheduleDay = {
  id: string;
  dayDate?: string;
  dayName?: string;
  dayNameAr?: string;
  isRestDay?: boolean;
  isCompleted?: boolean;
  exercises?: RawExercise[];
};

type RawExercise = {
  id: string;
  exerciseTemplateId?: string;
  customName?: string;
  customNameAr?: string;
  sets?: number;
  reps?: number;
  targetWeight?: number;
};

type PlanDetail = {
  id: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  days?: ScheduleDay[];
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
  const [showAddDay, setShowAddDay] = useState(false);

  const plans = useQuery({
    queryKey: ["member", "my-plans"],
    queryFn: () =>
      apiFetch<WorkoutPlan[]>(`/workouts/member/${user?.id}`).catch(() => []),
    enabled: !!user?.id,
  });

  const activePlan: WorkoutPlan | null = useMemo(() => {
    const list = plans.data ?? [];
    if (!list.length) return null;
    return list.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""))[0];
  }, [plans.data]);

  const planDetail = useQuery({
    queryKey: ["member", "my-plan-detail", activePlan?.id],
    queryFn: () =>
      apiFetch<PlanDetail>(`/workouts/${activePlan!.id}`).catch(() => null),
    enabled: !!activePlan?.id,
  });

  const library = useQuery({
    queryKey: ["exercises", "library"],
    queryFn: () => apiFetch<ExerciseTemplate[]>("/exercises/library").catch(() => []),
    enabled: !!activePlan?.id,
  });

  const libMap = useMemo(() => {
    const m: Record<string, ExerciseTemplate> = {};
    (library.data ?? []).forEach((e) => { m[e.id] = e; });
    return m;
  }, [library.data]);

  const days: ScheduleDay[] = useMemo(
    () =>
      (planDetail.data?.days ?? [])
        .slice()
        .sort((a, b) => (a.dayDate ?? "").localeCompare(b.dayDate ?? "")),
    [planDetail.data]
  );

  const deleteEx = useMutation({
    mutationFn: ({ dayId, exId }: { dayId: string; exId: string }) =>
      apiFetch(`/workouts/days/${dayId}/exercises/${exId}`, { method: "DELETE" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["member", "my-plan-detail", activePlan?.id] }),
    onError: (e: any) =>
      Alert.alert(
        lang === "ar" ? "قوي" : "Qawi",
        e?.message || (lang === "ar" ? "تعذر حذف التمرين" : "Could not delete exercise")
      ),
  });

  const isLoading = plans.isLoading || planDetail.isLoading;

  function invalidatePlan() {
    qc.invalidateQueries({ queryKey: ["member", "my-plan-detail", activePlan?.id] });
    qc.invalidateQueries({ queryKey: ["member"] });
  }

  const exName = (ex: RawExercise) => {
    if (lang === "ar") {
      return ex.customNameAr ?? ex.customName ?? libMap[ex.exerciseTemplateId ?? ""]?.nameAr ?? libMap[ex.exerciseTemplateId ?? ""]?.name ?? "—";
    }
    return ex.customName ?? libMap[ex.exerciseTemplateId ?? ""]?.name ?? "—";
  };

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

      {isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[...Array(5)].map((_, i) => (
            <View
              key={i}
              style={{ height: 70, backgroundColor: c.surface, borderRadius: 16, opacity: 0.6 }}
            />
          ))}
        </View>
      ) : !activePlan ? (
        <View style={{ flex: 1, padding: 20 }}>
          <Card>
            <EmptyState
              icon="calendar"
              text={lang === "ar" ? "لا توجد خطة تمرين — أنشئها من تبويب التمرين" : "No workout plan — create one from the Workout tab"}
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
              <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 16 }}>
                {planDetail.data?.name ?? activePlan.name}
              </Text>
            </View>
            <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
              {activePlan.startDate ? String(activePlan.startDate).slice(0, 10) : ""}
              {activePlan.endDate ? ` → ${String(activePlan.endDate).slice(0, 10)}` : ""}
            </Text>
          </View>

          {/* Section title + add day */}
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
            <SectionTitle>{lang === "ar" ? "أيام الخطة" : "Plan Days"}</SectionTitle>
            <Pressable onPress={() => setShowAddDay(true)} hitSlop={10}>
              <Text style={{ color: "#7C3AED", fontWeight: "700", fontSize: 14 }}>
                + {lang === "ar" ? "يوم" : "Day"}
              </Text>
            </Pressable>
          </View>

          {days.length === 0 ? (
            <Card>
              <EmptyState
                icon="calendar"
                text={lang === "ar" ? "لا توجد أيام — أضف يومك الأول" : "No days yet — add your first day"}
              />
              <View style={{ marginTop: 12 }}>
                <Button
                  title={lang === "ar" ? "إضافة يوم" : "Add Day"}
                  icon="plus"
                  onPress={() => setShowAddDay(true)}
                />
              </View>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {days.map((day) => {
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
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: c.foreground,
                          fontWeight: "700",
                          textAlign: isRTL ? "right" : "left",
                        }}
                      >
                        {lang === "ar" ? day.dayNameAr ?? day.dayName ?? "" : day.dayName ?? ""}
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
                        ? lang === "ar" ? "✅ مكتمل" : "✅ Done"
                        : isRest
                        ? lang === "ar" ? "😴 راحة" : "😴 Rest"
                        : exCount > 0
                        ? lang === "ar" ? `${exCount} تمارين` : `${exCount} ex`
                        : lang === "ar" ? "اضغط لإضافة" : "Tap to add"}
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

      {/* Day detail modal */}
      {selectedDay && activePlan && (
        <DayModal
          day={selectedDay}
          libMap={libMap}
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
          onExerciseAdded={invalidatePlan}
        />
      )}

      {/* Add day modal */}
      {showAddDay && activePlan && (
        <AddDayModal
          planId={activePlan.id}
          existingCount={days.length}
          startDate={activePlan.startDate}
          onClose={() => setShowAddDay(false)}
          onAdded={invalidatePlan}
        />
      )}
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// Add Day modal
// ─────────────────────────────────────────────────────────────
function AddDayModal({
  planId,
  existingCount,
  startDate,
  onClose,
  onAdded,
}: {
  planId: string;
  existingCount: number;
  startDate?: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const c = useColors();
  const { lang, isRTL } = useLanguage();

  const defaultDate = useMemo(() => {
    const base = startDate ? new Date(startDate) : new Date();
    base.setDate(base.getDate() + existingCount);
    return base.toISOString().slice(0, 10);
  }, [startDate, existingCount]);

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayNamesAr = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

  const [dayDate, setDayDate] = useState(defaultDate);
  const [dayName, setDayName] = useState(dayNames[existingCount % 7]);
  const [dayNameAr, setDayNameAr] = useState(dayNamesAr[existingCount % 7]);
  const [isRestDay, setIsRestDay] = useState(false);

  const addDay = useMutation({
    mutationFn: () =>
      apiFetch(`/workouts/${planId}/days`, {
        method: "POST",
        data: { dayDate, dayName, dayNameAr, isRestDay },
      }),
    onSuccess: () => { onAdded(); onClose(); },
    onError: (e: any) =>
      Alert.alert(
        lang === "ar" ? "قوي" : "Qawi",
        e?.message || (lang === "ar" ? "تعذر إضافة اليوم" : "Could not add day")
      ),
  });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            paddingBottom: 36,
            gap: 14,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800" }}>
              {lang === "ar" ? "إضافة يوم" : "Add Day"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={c.foreground} />
            </Pressable>
          </View>

          {/* Day name */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
              {lang === "ar" ? "اسم اليوم (EN)" : "Day name (EN)"}
            </Text>
            <TextInput
              value={dayName}
              onChangeText={setDayName}
              style={{ backgroundColor: c.surface, color: c.foreground, borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 46, fontSize: 14, textAlign: isRTL ? "right" : "left" }}
              placeholderTextColor={c.mutedForeground}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
              {lang === "ar" ? "اسم اليوم (AR)" : "Day name (AR)"}
            </Text>
            <TextInput
              value={dayNameAr}
              onChangeText={setDayNameAr}
              style={{ backgroundColor: c.surface, color: c.foreground, borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 46, fontSize: 14, textAlign: "right" }}
              placeholderTextColor={c.mutedForeground}
            />
          </View>

          {/* Date */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
              {lang === "ar" ? "التاريخ (YYYY-MM-DD)" : "Date (YYYY-MM-DD)"}
            </Text>
            <TextInput
              value={dayDate}
              onChangeText={setDayDate}
              style={{ backgroundColor: c.surface, color: c.foreground, borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, height: 46, fontSize: 14, textAlign: isRTL ? "right" : "left" }}
              placeholderTextColor={c.mutedForeground}
              keyboardType="numeric"
            />
          </View>

          {/* Rest day toggle */}
          <Pressable
            onPress={() => setIsRestDay((p) => !p)}
            style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: isRestDay ? "#7C3AED" : c.border,
                backgroundColor: isRestDay ? "#7C3AED" : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isRestDay && <Feather name="check" size={14} color="#fff" />}
            </View>
            <Text style={{ color: c.foreground, fontWeight: "600" }}>
              {lang === "ar" ? "يوم راحة" : "Rest day"}
            </Text>
          </Pressable>

          <Button
            title={addDay.isPending ? (lang === "ar" ? "جارٍ الإضافة..." : "Adding…") : (lang === "ar" ? "إضافة اليوم" : "Add Day")}
            icon="plus"
            onPress={() => addDay.mutate()}
            disabled={addDay.isPending}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Day detail modal with exercise picker
// ─────────────────────────────────────────────────────────────
function DayModal({
  day,
  libMap,
  onClose,
  onDeleteExercise,
  deletePending,
  onExerciseAdded,
}: {
  day: ScheduleDay;
  libMap: Record<string, ExerciseTemplate>;
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

  const libraryList = useMemo(() => Object.values(libMap), [libMap]);

  const filtered = useMemo(() => {
    if (!pickerQ) return libraryList;
    return libraryList.filter(
      (e) =>
        (e.name ?? "").toLowerCase().includes(pickerQ.toLowerCase()) ||
        (e.nameAr ?? "").includes(pickerQ)
    );
  }, [libraryList, pickerQ]);

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

  const backFromPicker = () => {
    if (picked) setPicked(null);
    else setPickerOpen(false);
  };

  function exDisplayName(ex: RawExercise) {
    if (lang === "ar") {
      return ex.customNameAr ?? ex.customName ?? libMap[ex.exerciseTemplateId ?? ""]?.nameAr ?? libMap[ex.exerciseTemplateId ?? ""]?.name ?? "—";
    }
    return ex.customName ?? libMap[ex.exerciseTemplateId ?? ""]?.name ?? "—";
  }

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
                <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={c.foreground} />
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
                    ? lang === "ar" ? "تفاصيل التمرين" : "Exercise Details"
                    : lang === "ar" ? "اختر تمريناً" : "Pick an exercise"
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

          {/* Exercise picker: search list */}
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
              {filtered.length === 0 ? (
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
                      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={c.mutedForeground} />
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
                  <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>
                    {lang === "ar" ? picked.nameAr ?? picked.name : picked.name}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <NumField label={lang === "ar" ? "مجموعات" : "Sets"} value={pSets} onChange={setPSets} />
                <NumField label={lang === "ar" ? "تكرارات" : "Reps"} value={pReps} onChange={setPReps} />
                <NumField label={lang === "ar" ? "وزن (كغ)" : "Weight (kg)"} value={pWeight} onChange={setPWeight} decimal placeholder="0" />
              </View>
              <Pressable
                onPress={() => {
                  if (!picked) return;
                  addEx.mutate({
                    exerciseTemplateId: picked.id,
                    sets: parseInt(pSets, 10) || 3,
                    reps: parseInt(pReps, 10) || 10,
                    ...(pWeight ? { targetWeight: parseFloat(pWeight) } : {}),
                  });
                }}
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

          {/* Day view: exercise list */}
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
                          {exDisplayName(ex)}
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
  label, value, onChange, decimal, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; decimal?: boolean; placeholder?: string;
}) {
  const c = useColors();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(decimal ? v.replace(/[^0-9.]/g, "") : v.replace(/[^0-9]/g, ""))}
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
