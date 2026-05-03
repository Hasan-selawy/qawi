import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
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

import { Avatar, Badge, Button, Card, EmptyState, Screen, SectionTitle } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type Overview = {
  member?: { id: string; name?: string; email?: string; isActive?: boolean; subscriptionEndDate?: string };
  latestMeasurements?: {
    weight?: number; chest?: number; waist?: number; arms?: number; legs?: number;
    bodyFat?: number; recordedAt?: string;
  } | null;
  coachNotes?: { id: string; note?: string; content?: string; createdAt?: string }[];
  currentWorkoutPlan?: {
    id: string;
    name?: string;
    startDate?: string;
    endDate?: string;
    scheduleDays?: ScheduleDay[];
  };
  nutritionPlan?: any;
  attendanceStreak?: number;
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
  orderIndex?: number;
};

type ExerciseTemplate = {
  id: string;
  name: string;
  nameAr?: string;
  categoryId?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
};

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [showNote, setShowNote] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);
  const [selectedDay, setSelectedDay] = useState<ScheduleDay | null>(null);
  const [showExPicker, setShowExPicker] = useState(false);

  const overview = useQuery({
    queryKey: ["coach", "member-overview", id],
    queryFn: () => apiFetch<Overview>(`/coach/members/${id}/overview`).catch(() => null),
    enabled: !!id,
  });

  const member = overview.data?.member ?? ({} as NonNullable<Overview["member"]>);
  const latest = overview.data?.latestMeasurements ?? null;
  const notes = overview.data?.coachNotes ?? [];
  const streak = overview.data?.attendanceStreak ?? 0;
  const plan = overview.data?.currentWorkoutPlan ?? null;
  const scheduleDays: ScheduleDay[] = useMemo(
    () => (plan?.scheduleDays ?? []).slice().sort((a, b) => (a.dayDate ?? "").localeCompare(b.dayDate ?? "")),
    [plan]
  );

  const deleteEx = useMutation({
    mutationFn: ({ dayId, exId }: { dayId: string; exId: string }) =>
      apiFetch(`/workouts/days/${dayId}/exercises/${exId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach", "member-overview", id] }),
    onError: (e: any) =>
      Alert.alert(lang === "ar" ? "قوي" : "Qawi", e?.message || (lang === "ar" ? "تعذر حذف التمرين" : "Could not delete exercise")),
  });

  const addEx = useMutation({
    mutationFn: (payload: { dayId: string; exerciseTemplateId: string; sets: number; reps: number; targetWeight?: number }) =>
      apiFetch(`/workouts/days/${payload.dayId}/exercises`, {
        method: "POST",
        data: {
          exerciseTemplateId: payload.exerciseTemplateId,
          sets: payload.sets,
          reps: payload.reps,
          orderIndex: 0,
          ...(payload.targetWeight ? { targetWeight: payload.targetWeight } : {}),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach", "member-overview", id] });
      setShowExPicker(false);
    },
    onError: (e: any) =>
      Alert.alert(lang === "ar" ? "قوي" : "Qawi", e?.message || (lang === "ar" ? "تعذر إضافة التمرين" : "Could not add exercise")),
  });

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
        <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1, textAlign: isRTL ? "right" : "left" }}>
          {member.name ?? ""}
        </Text>
      </View>

      {overview.isLoading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <View key={i} style={{ height: 80, backgroundColor: c.surface, borderRadius: 16, opacity: 0.6 }} />
          ))}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>

          {/* ── Member overview card ── */}
          <Card>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
              <Avatar name={member.name ?? "?"} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16, textAlign: isRTL ? "right" : "left" }}>
                  {member.name}
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                  {member.email}
                </Text>
                {member.subscriptionEndDate ? (
                  <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                    {lang === "ar" ? "ينتهي" : "Expires"} {String(member.subscriptionEndDate).slice(0, 10)}
                  </Text>
                ) : null}
              </View>
              {member.isActive ? <Badge tone="success">●</Badge> : <Badge tone="neutral">—</Badge>}
            </View>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 16, marginTop: 12 }}>
              <Stat label={lang === "ar" ? "تتابع" : "Streak"} value={`${streak} 🔥`} />
              <Stat label={lang === "ar" ? "خطة تمرين" : "Workout"} value={plan ? "✓" : "—"} />
              <Stat label={lang === "ar" ? "خطة غذاء" : "Nutrition"} value={overview.data?.nutritionPlan ? "✓" : "—"} />
            </View>
          </Card>

          {/* ── Workout Plan ── */}
          <SectionTitle>{lang === "ar" ? "خطة التمرين" : "Workout Plan"}</SectionTitle>
          {!plan ? (
            <Card>
              <EmptyState
                icon="calendar"
                text={lang === "ar" ? "لا توجد خطة تمرين مفعّلة" : "No active workout plan"}
              />
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: 12,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 15 }}>{plan.name}</Text>
                <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                  {plan.startDate ? String(plan.startDate).slice(0, 10) : ""}{plan.endDate ? ` → ${String(plan.endDate).slice(0, 10)}` : ""}
                </Text>
              </View>

              {scheduleDays.length === 0 ? (
                <Card>
                  <EmptyState icon="calendar" text={lang === "ar" ? "لا توجد أيام في الخطة" : "No days in plan"} />
                </Card>
              ) : (
                scheduleDays.map((day) => {
                  const exCount = day.exercises?.length ?? 0;
                  const isRest = !!day.isRestDay;
                  const isDone = !!day.isCompleted;
                  const dot = isDone ? c.primary : isRest ? c.mutedForeground : exCount > 0 ? "#3b82f6" : c.border;
                  return (
                    <Pressable
                      key={day.id}
                      onPress={() => setSelectedDay(day)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? c.surface : c.card,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: isDone ? `${c.primary}50` : isRest ? c.border : exCount > 0 ? "#3b82f620" : c.border,
                        padding: 14,
                        flexDirection: isRTL ? "row-reverse" : "row",
                        alignItems: "center",
                        gap: 12,
                      })}
                    >
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>
                          {lang === "ar" ? (day.dayNameAr ?? day.dayName ?? "") : (day.dayName ?? "")}
                        </Text>
                        <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                          {day.dayDate ? String(day.dayDate).slice(0, 10) : ""}
                        </Text>
                      </View>
                      <Text style={{ color: isDone ? c.primary : isRest ? c.mutedForeground : exCount > 0 ? "#3b82f6" : c.mutedForeground, fontSize: 12, fontWeight: "700" }}>
                        {isDone ? (lang === "ar" ? "✅ مكتمل" : "✅ Done") : isRest ? (lang === "ar" ? "😴 راحة" : "😴 Rest") : exCount > 0 ? (lang === "ar" ? `${exCount} تمارين` : `${exCount} ex`) : (lang === "ar" ? "فارغ" : "Empty")}
                      </Text>
                      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={c.mutedForeground} />
                    </Pressable>
                  );
                })
              )}
            </View>
          )}

          {/* ── Measurements ── */}
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
            <SectionTitle>{lang === "ar" ? "القياسات" : "Measurements"}</SectionTitle>
            <Pressable onPress={() => setShowMeasure(true)}>
              <Text style={{ color: c.primary, fontWeight: "700" }}>+ {lang === "ar" ? "إضافة قياس" : "Add"}</Text>
            </Pressable>
          </View>

          {!latest ? (
            <Card><EmptyState icon="bar-chart" text={lang === "ar" ? "لا توجد قياسات" : "No measurements yet"} /></Card>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <MeasureCard label={lang === "ar" ? "الوزن" : "Weight"} value={latest.weight} unit="kg" />
              <MeasureCard label={lang === "ar" ? "الصدر" : "Chest"} value={latest.chest} unit="cm" />
              <MeasureCard label={lang === "ar" ? "الخصر" : "Waist"} value={latest.waist} unit="cm" />
              <MeasureCard label={lang === "ar" ? "الذراع" : "Arms"} value={latest.arms} unit="cm" />
              <MeasureCard label={lang === "ar" ? "الأرجل" : "Legs"} value={latest.legs} unit="cm" />
              <MeasureCard label={lang === "ar" ? "دهون%" : "Body Fat"} value={latest.bodyFat} unit="%" />
            </View>
          )}

          {/* ── Notes ── */}
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
            <SectionTitle>{lang === "ar" ? "الملاحظات" : "Notes"}</SectionTitle>
            <Pressable onPress={() => setShowNote(true)}>
              <Text style={{ color: c.primary, fontWeight: "700" }}>+ {lang === "ar" ? "إضافة" : "Add"}</Text>
            </Pressable>
          </View>

          {notes.length === 0 ? (
            <Card><EmptyState icon="edit-3" text={lang === "ar" ? "لا توجد ملاحظات" : "No notes yet"} /></Card>
          ) : (
            notes.map((n: any) => (
              <Card key={n.id}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{(n.createdAt ?? "").slice(0, 10)}</Text>
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        lang === "ar" ? "حذف الملاحظة" : "Delete note",
                        lang === "ar" ? "هل أنت متأكد؟" : "Are you sure?",
                        [
                          { text: lang === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
                          {
                            text: lang === "ar" ? "حذف" : "Delete",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await apiFetch(`/notes/${n.id}`, { method: "DELETE" });
                                qc.invalidateQueries({ queryKey: ["coach", "member-overview", id] });
                              } catch (e: any) {
                                Alert.alert(lang === "ar" ? "قوي" : "Qawi", e?.message || "Could not delete note");
                              }
                            },
                          },
                        ]
                      )
                    }
                    hitSlop={10}
                    style={{ padding: 6 }}
                  >
                    <Feather name="trash-2" size={16} color={c.mutedForeground} />
                  </Pressable>
                </View>
                <Text style={{ color: c.foreground, marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
                  {n.note ?? n.content}
                </Text>
              </Card>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Modals ── */}
      <AddNoteModal
        visible={showNote}
        memberId={id ?? ""}
        onClose={() => setShowNote(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["coach", "member-overview", id] })}
      />
      <AddMeasurementModal
        visible={showMeasure}
        memberId={id ?? ""}
        onClose={() => setShowMeasure(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["coach", "member-overview", id] })}
      />

      {selectedDay && (
        <DayModal
          day={selectedDay}
          planId={plan?.id ?? ""}
          onClose={() => setSelectedDay(null)}
          onAddExercise={() => setShowExPicker(true)}
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
        />
      )}

      {selectedDay && showExPicker && (
        <ExPickerModal
          dayId={selectedDay.id}
          visible={showExPicker}
          onClose={() => setShowExPicker(false)}
          onAdd={(payload) => addEx.mutate(payload)}
          addPending={addEx.isPending}
        />
      )}
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────
// Day detail bottom sheet
// ─────────────────────────────────────────────────────────────
function DayModal({
  day,
  planId: _planId,
  onClose,
  onAddExercise,
  onDeleteExercise,
  deletePending,
}: {
  day: ScheduleDay;
  planId: string;
  onClose: () => void;
  onAddExercise: () => void;
  onDeleteExercise: (exId: string) => void;
  deletePending: boolean;
}) {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const exercises = day.exercises ?? [];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: c.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 32,
            maxHeight: "85%",
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
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground, fontSize: 17, fontWeight: "800", textAlign: isRTL ? "right" : "left" }}>
                {lang === "ar" ? (day.dayNameAr ?? day.dayName ?? "") : (day.dayName ?? "")}
              </Text>
              {day.dayDate ? (
                <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                  {String(day.dayDate).slice(0, 10)}
                </Text>
              ) : null}
            </View>
            {day.isCompleted && (
              <View style={{ backgroundColor: `${c.primary}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ color: c.primary, fontSize: 12, fontWeight: "700" }}>
                  {lang === "ar" ? "✅ مكتمل" : "✅ Done"}
                </Text>
              </View>
            )}
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={c.foreground} />
            </Pressable>
          </View>

          {/* Content */}
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
                {lang === "ar" ? "لا يوجد تمارين" : "No exercises yet"}
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
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${c.primary}15`, alignItems: "center", justifyContent: "center" }}>
                    <Feather name="activity" size={16} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 14, textAlign: isRTL ? "right" : "left" }}>
                      {lang === "ar" ? (ex.exerciseNameAr ?? ex.exerciseName ?? "") : (ex.exerciseName ?? "")}
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                      {ex.sets ?? 3} × {ex.reps ?? 10}
                      {ex.targetWeight ? (lang === "ar" ? `  @  ${ex.targetWeight} كغ` : `  @  ${ex.targetWeight} kg`) : ""}
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

          {/* Add exercise button */}
          {!day.isRestDay && (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <Pressable
                onPress={onAddExercise}
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
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Exercise picker modal
// ─────────────────────────────────────────────────────────────
function ExPickerModal({
  dayId,
  visible,
  onClose,
  onAdd,
  addPending,
}: {
  dayId: string;
  visible: boolean;
  onClose: () => void;
  onAdd: (payload: { dayId: string; exerciseTemplateId: string; sets: number; reps: number; targetWeight?: number }) => void;
  addPending: boolean;
}) {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<ExerciseTemplate | null>(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");

  const library = useQuery({
    queryKey: ["exercises", "library"],
    queryFn: () => apiFetch<ExerciseTemplate[]>("/exercises/library").catch(() => []),
    enabled: visible,
  });

  const filtered = useMemo(() => {
    const data = library.data ?? [];
    if (!q) return data;
    return data.filter((e) =>
      (e.name ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (e.nameAr ?? "").includes(q)
    );
  }, [library.data, q]);

  function handlePick(ex: ExerciseTemplate) {
    setPicked(ex);
    setSets(String(ex.defaultSets ?? 3));
    setReps(String(ex.defaultReps ?? 10));
    setWeight(ex.defaultWeight ? String(ex.defaultWeight) : "");
  }

  function handleAdd() {
    if (!picked) return;
    onAdd({
      dayId,
      exerciseTemplateId: picked.id,
      sets: parseInt(sets, 10) || 3,
      reps: parseInt(reps, 10) || 10,
      ...(weight ? { targetWeight: parseFloat(weight) } : {}),
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
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
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", padding: 16, gap: 10 }}>
            {picked ? (
              <Pressable onPress={() => setPicked(null)} hitSlop={8}>
                <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={c.foreground} />
              </Pressable>
            ) : null}
            <Text style={{ color: c.foreground, fontSize: 17, fontWeight: "800", flex: 1, textAlign: isRTL ? "right" : "left" }}>
              {picked
                ? lang === "ar"
                  ? "تفاصيل التمرين"
                  : "Exercise Details"
                : lang === "ar"
                ? "اختر تمريناً"
                : "Pick an exercise"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={c.foreground} />
            </Pressable>
          </View>

          {picked ? (
            /* ── Sets / Reps / Weight form ── */
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
                    {lang === "ar" ? (picked.nameAr ?? picked.name) : picked.name}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <NumField label={lang === "ar" ? "مجموعات" : "Sets"} value={sets} onChange={setSets} />
                <NumField label={lang === "ar" ? "تكرارات" : "Reps"} value={reps} onChange={setReps} />
                <NumField label={lang === "ar" ? "وزن (كغ)" : "Weight (kg)"} value={weight} onChange={setWeight} decimal placeholder="0" />
              </View>
              <Pressable
                onPress={handleAdd}
                disabled={addPending}
                style={{
                  backgroundColor: c.primary,
                  borderRadius: 14,
                  height: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: addPending ? 0.6 : 1,
                }}
              >
                {addPending ? (
                  <ActivityIndicator color={c.primaryForeground} />
                ) : (
                  <Text style={{ color: c.primaryForeground, fontWeight: "700", fontSize: 16 }}>
                    {lang === "ar" ? "إضافة للخطة ✓" : "Add to Plan ✓"}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            /* ── Exercise list ── */
            <>
              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <TextInput
                  value={q}
                  onChangeText={setQ}
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
                  <Text style={{ color: c.mutedForeground }}>{lang === "ar" ? "لا توجد نتائج" : "No results"}</Text>
                </View>
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(e) => e.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 6 }}
                  ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
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
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${c.primary}15`, alignItems: "center", justifyContent: "center" }}>
                        <Feather name="activity" size={16} color={c.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 13, textAlign: isRTL ? "right" : "left" }}>
                          {lang === "ar" ? (ex.nameAr ?? ex.name) : ex.name}
                        </Text>
                        <Text style={{ color: c.mutedForeground, fontSize: 11, textAlign: isRTL ? "right" : "left" }}>
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
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────
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

function Stat({ label, value }: { label: string; value: string | number }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 16, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function MeasureCard({ label, value, unit }: { label: string; value: any; unit: string }) {
  const c = useColors();
  return (
    <View
      style={{
        flexBasis: "31%",
        flexGrow: 1,
        backgroundColor: c.card,
        borderRadius: c.radius,
        borderWidth: 1,
        borderColor: c.border,
        padding: 12,
      }}
    >
      <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 18, marginTop: 4 }}>
        {value != null ? `${value}` : "—"}
      </Text>
      <Text style={{ color: c.mutedForeground, fontSize: 10 }}>{unit}</Text>
    </View>
  );
}

function AddNoteModal({
  visible, memberId, onClose, onSaved,
}: {
  visible: boolean; memberId: string; onClose: () => void; onSaved: () => void;
}) {
  const c = useColors();
  const { lang } = useLanguage();
  const [text, setText] = useState("");
  const save = useMutation({
    mutationFn: () => apiFetch("/notes", { method: "POST", data: { memberId, note: text } }),
    onSuccess: () => { setText(""); onSaved(); onClose(); },
    onError: (e: any) => Alert.alert(lang === "ar" ? "قوي" : "Qawi", e?.message || "Could not save note"),
  });
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1 }}>
              {lang === "ar" ? "إضافة ملاحظة" : "Add Note"}
            </Text>
            <Pressable onPress={onClose}><Feather name="x" size={22} color={c.foreground} /></Pressable>
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder={lang === "ar" ? "اكتب ملاحظتك" : "Write a note…"}
            placeholderTextColor={c.mutedForeground}
            style={{
              minHeight: 120,
              backgroundColor: c.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              padding: 12,
              color: c.foreground,
              textAlignVertical: "top",
            }}
          />
          <Button title={lang === "ar" ? "حفظ" : "Save"} icon="check" onPress={() => save.mutate()} loading={save.isPending} disabled={!text} />
        </View>
      </View>
    </Modal>
  );
}

function AddMeasurementModal({
  visible, memberId, onClose, onSaved,
}: {
  visible: boolean; memberId: string; onClose: () => void; onSaved: () => void;
}) {
  const c = useColors();
  const { lang } = useLanguage();
  const [m, setM] = useState({ weight: "", chest: "", waist: "", arms: "", legs: "", bodyFatPercentage: "" });
  const setField = (k: keyof typeof m) => (v: string) => setM((s) => ({ ...s, [k]: v.replace(/[^0-9.]/g, "") }));
  const save = useMutation({
    mutationFn: () => {
      const payload: any = { memberId };
      Object.entries(m).forEach(([k, v]) => { if (v) payload[k] = parseFloat(v); });
      return apiFetch("/measurements", { method: "POST", data: payload });
    },
    onSuccess: () => { setM({ weight: "", chest: "", waist: "", arms: "", legs: "", bodyFatPercentage: "" }); onSaved(); onClose(); },
    onError: (e: any) => Alert.alert(lang === "ar" ? "قوي" : "Qawi", e?.message || "Could not save measurement"),
  });
  const fields: { key: keyof typeof m; label: string; unit: string }[] = [
    { key: "weight", label: lang === "ar" ? "الوزن" : "Weight", unit: "kg" },
    { key: "chest", label: lang === "ar" ? "الصدر" : "Chest", unit: "cm" },
    { key: "waist", label: lang === "ar" ? "الخصر" : "Waist", unit: "cm" },
    { key: "arms", label: lang === "ar" ? "الذراع" : "Arms", unit: "cm" },
    { key: "legs", label: lang === "ar" ? "الأرجل" : "Legs", unit: "cm" },
    { key: "bodyFatPercentage", label: lang === "ar" ? "دهون %" : "Body Fat", unit: "%" },
  ];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 12, maxHeight: "85%" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1 }}>
              {lang === "ar" ? "إضافة قياسات" : "Add Measurements"}
            </Text>
            <Pressable onPress={onClose}><Feather name="x" size={22} color={c.foreground} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 10 }}>
            {fields.map((f) => (
              <View key={f.key} style={{ gap: 4 }}>
                <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{f.label} ({f.unit})</Text>
                <TextInput
                  value={m[f.key]}
                  onChangeText={setField(f.key)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={c.mutedForeground}
                  style={{
                    backgroundColor: c.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: c.border,
                    paddingHorizontal: 14,
                    height: 48,
                    color: c.foreground,
                  }}
                />
              </View>
            ))}
          </ScrollView>
          <Button title={lang === "ar" ? "حفظ" : "Save"} icon="check" onPress={() => save.mutate()} loading={save.isPending} />
        </View>
      </View>
    </Modal>
  );
}
