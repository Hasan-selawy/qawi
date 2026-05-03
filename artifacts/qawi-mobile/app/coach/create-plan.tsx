import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "@/components/Toast";
import { Button, Card, EmptyState, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type CoachMember = { id: string; name: string };
type ExerciseTemplate = {
  id: string;
  categoryId?: string;
  name: string;
  nameAr?: string;
  defaultSets?: number;
  defaultReps?: number;
};
type Category = { id: string; name: string; nameAr?: string };

type DraftExercise = { templateId: string; name: string; sets: number; reps: number; note?: string };
type DraftDay = { tempId: string; dayName: string; dayDate: string; restDay: boolean; exercises: DraftExercise[] };

function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(iso: string, days: number) {
  const d = new Date(iso); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function tempId() { return Math.random().toString(36).slice(2, 9); }

export default function CreatePlan() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDaysISO(todayISO(), 28));
  const [days, setDays] = useState<DraftDay[]>([]);
  const [pickerForDay, setPickerForDay] = useState<string | null>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const toggleMember = (id: string) =>
    setMemberIds((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const members = useQuery({
    queryKey: ["coach", "members"],
    queryFn: () => apiFetch<CoachMember[]>("/coach/members").catch(() => []),
  });

  const save = useMutation({
    mutationFn: async () => {
      for (const memberId of memberIds) {
        const plan = await apiFetch<any>("/workouts", {
          method: "POST",
          data: { name, memberId, startDate, endDate },
        });
        const planId = plan.id;
        for (let i = 0; i < days.length; i++) {
          const d = days[i];
          const created = await apiFetch<any>(`/workouts/${planId}/days`, {
            method: "POST",
            data: {
              dayDate: d.dayDate,
              dayName: d.dayName,
              dayNameAr: d.dayName,
              isRestDay: d.restDay,
            },
          });
          if (!d.restDay) {
            for (let j = 0; j < d.exercises.length; j++) {
              const ex = d.exercises[j];
              await apiFetch(`/workouts/days/${created.id}/exercises`, {
                method: "POST",
                data: {
                  exerciseTemplateId: ex.templateId,
                  sets: ex.sets,
                  reps: ex.reps,
                  orderIndex: j,
                },
              });
            }
          }
        }
      }

      if (saveAsTemplate) {
        await apiFetch("/templates", {
          method: "POST",
          data: {
            name,
            nameAr: name,
            description: `${days.length} days`,
            days: days.map((d, i) => ({
              dayNumber: i + 1,
              dayName: d.dayName,
              dayNameAr: d.dayName,
              isRestDay: d.restDay,
              exercises: d.restDay ? [] : d.exercises.map((ex) => ({
                exerciseTemplateId: ex.templateId,
                sets: ex.sets,
                reps: ex.reps,
              })),
            })),
          },
        });
      }
    },
    onSuccess: () => {
      const count = memberIds.length;
      const tplNote = saveAsTemplate ? (lang === "ar" ? " + قالب" : " + template") : "";
      toast.show(
        lang === "ar"
          ? `✅ تم إنشاء ${count} خطة${tplNote}`
          : `✅ ${count} plan${count === 1 ? "" : "s"} created${tplNote}!`,
        "success",
      );
      qc.invalidateQueries({ queryKey: ["coach"] });
      setTimeout(() => router.back(), 500);
    },
    onError: (e: any) => {
      console.error("[create-plan] save failed", e?.status, e?.body, e?.message);
      const detail = typeof e?.body === "object" ? JSON.stringify(e.body) : (e?.message || "Could not save plan");
      toast.show(lang === "ar" ? `فشل الحفظ: ${detail}` : `Save failed: ${detail}`, "error");
    },
  });

  const canStep1 = memberIds.length > 0 && !!name && !!startDate && !!endDate;
  const canSave = canStep1 && days.length > 0;

  const addDay = (dateISO: string) => {
    setDays((arr) => {
      const existing = arr.find((d) => d.dayDate === dateISO);
      if (existing) return arr.filter((d) => d.dayDate !== dateISO);
      return [...arr, { tempId: tempId(), dayName: `Day ${arr.length + 1}`, dayDate: dateISO, restDay: false, exercises: [] }]
        .sort((a, b) => a.dayDate.localeCompare(b.dayDate));
    });
  };

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
          {t("coach.createPlan")}
        </Text>
        <Text style={{ color: c.mutedForeground, fontSize: 12 }}>{step}/3</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 140 }}>
        {step === 1 ? (
          <Step1
            members={members.data ?? []}
            loading={members.isLoading}
            memberIds={memberIds}
            toggleMember={toggleMember}
            name={name}
            setName={setName}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
          />
        ) : step === 2 ? (
          <Step2
            startDate={startDate}
            endDate={endDate}
            days={days}
            setDays={setDays}
            addDay={addDay}
          />
        ) : (
          <Step3
            days={days}
            setDays={setDays}
            onPickFor={setPickerForDay}
            saveAsTemplate={saveAsTemplate}
            setSaveAsTemplate={setSaveAsTemplate}
            memberCount={memberIds.length}
          />
        )}
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0, right: 0, bottom: 0,
          padding: 16,
          paddingBottom: insets.bottom + 16,
          backgroundColor: c.background,
          borderTopWidth: 1,
          borderTopColor: c.border,
          flexDirection: "row",
          gap: 10,
        }}
      >
        {step > 1 ? (
          <View style={{ flex: 1 }}>
            <Button title={lang === "ar" ? "السابق" : "Back"} variant="secondary" onPress={() => setStep((s) => (s === 3 ? 2 : 1))} />
          </View>
        ) : null}
        <View style={{ flex: 2 }}>
          {step < 3 ? (
            <Button
              title={lang === "ar" ? "التالي" : "Next"}
              icon="arrow-right"
              onPress={() => setStep((s) => (s === 1 ? 2 : 3))}
              disabled={(step === 1 && !canStep1) || (step === 2 && days.length === 0)}
            />
          ) : (
            <Button
              title={t("common.save")}
              icon="check"
              onPress={() => save.mutate()}
              loading={save.isPending}
              disabled={!canSave}
            />
          )}
        </View>
      </View>

      <ExercisePickerModal
        visible={!!pickerForDay}
        onClose={() => setPickerForDay(null)}
        onPick={(ex) => {
          setDays((arr) =>
            arr.map((d) =>
              d.tempId === pickerForDay
                ? {
                    ...d,
                    exercises: [
                      ...d.exercises,
                      {
                        templateId: ex.id,
                        name: pickName(lang, ex) || ex.name,
                        sets: ex.defaultSets ?? 3,
                        reps: ex.defaultReps ?? 10,
                      },
                    ],
                  }
                : d
            )
          );
          setPickerForDay(null);
        }}
      />
    </Screen>
  );
}

function Step1(props: {
  members: CoachMember[];
  loading: boolean;
  memberIds: string[];
  toggleMember: (id: string) => void;
  name: string; setName: (v: string) => void;
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
}) {
  const c = useColors();
  const { lang } = useLanguage();
  return (
    <>
      <Field
        label={
          lang === "ar"
            ? `الأعضاء (يمكن اختيار أكثر من واحد) ${props.memberIds.length ? `— ${props.memberIds.length} مُختار` : ""}`
            : `Members (pick one or more) ${props.memberIds.length ? `— ${props.memberIds.length} selected` : ""}`
        }
      >
        {props.loading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {props.members.map((m) => {
              const active = props.memberIds.includes(m.id);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => props.toggleMember(m.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: active ? c.primary : c.surface,
                    borderWidth: 1,
                    borderColor: active ? c.primary : c.border,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {active ? <Feather name="check" size={12} color={c.primaryForeground} /> : null}
                  <Text style={{ color: active ? c.primaryForeground : c.foreground, fontWeight: "700", fontSize: 13 }}>
                    {m.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Field>
      <Field label={lang === "ar" ? "اسم الخطة" : "Plan name"}>
        <Box value={props.name} onChangeText={props.setName} placeholder={lang === "ar" ? "مثلاً: خطة 4 أسابيع" : "e.g. 4-week strength"} />
      </Field>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label={lang === "ar" ? "تاريخ البدء" : "Start date"}>
            <Box value={props.startDate} onChangeText={props.setStartDate} placeholder="YYYY-MM-DD" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label={lang === "ar" ? "تاريخ الانتهاء" : "End date"}>
            <Box value={props.endDate} onChangeText={props.setEndDate} placeholder="YYYY-MM-DD" />
          </Field>
        </View>
      </View>
    </>
  );
}

const DAY_PRESETS_EN = ["Push", "Pull", "Legs", "Chest", "Back", "Shoulders", "Arms", "Cardio", "Full Body"];
const DAY_PRESETS_AR = ["دفع", "سحب", "أرجل", "صدر", "ظهر", "أكتاف", "ذراعين", "كارديو", "كامل الجسم"];

function Step2(props: {
  startDate: string; endDate: string;
  days: DraftDay[]; setDays: React.Dispatch<React.SetStateAction<DraftDay[]>>;
  addDay: (iso: string) => void;
}) {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const presets = lang === "ar" ? DAY_PRESETS_AR : DAY_PRESETS_EN;

  const dateRange = useMemo(() => {
    const out: string[] = [];
    let d = props.startDate;
    let i = 0;
    while (d <= props.endDate && i < 60) {
      out.push(d);
      d = addDaysISO(d, 1); i++;
    }
    return out;
  }, [props.startDate, props.endDate]);

  const setDayName = (tempId: string, name: string) =>
    props.setDays((arr) => arr.map((x) => x.tempId === tempId ? { ...x, dayName: name } : x));

  return (
    <>
      <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
        {lang === "ar" ? "اضغط على تاريخ لإضافته كيوم تدريب" : "Tap a date to add it as a training day"}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {dateRange.map((iso) => {
          const picked = props.days.some((d) => d.dayDate === iso);
          return (
            <Pressable
              key={iso}
              onPress={() => props.addDay(iso)}
              style={{
                width: 64,
                paddingVertical: 10,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: picked ? c.primary : c.surface,
                borderWidth: 1,
                borderColor: picked ? c.primary : c.border,
              }}
            >
              <Text style={{ color: picked ? c.primaryForeground : c.mutedForeground, fontSize: 10 }}>
                {new Date(iso).toLocaleDateString(undefined, { weekday: "short" })}
              </Text>
              <Text style={{ color: picked ? c.primaryForeground : c.foreground, fontWeight: "800" }}>
                {iso.slice(8, 10)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {props.days.length > 0 ? (
        <View style={{ gap: 10, marginTop: 8 }}>
          <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
            {lang === "ar"
              ? "اسم كل يوم — اكتب أو اختر من المقترحات"
              : "Name each day — type or tap a preset (Push, Pull, Legs…)"}
          </Text>
          {props.days.map((d, idx) => (
            <Card key={d.tempId}>
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, alignItems: "center" }}>
                  <View
                    style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: c.primary, fontWeight: "900" }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                      {new Date(d.dayDate).toLocaleDateString(undefined, { weekday: "long" })} • {d.dayDate}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <Feather name="edit-2" size={12} color={c.mutedForeground} />
                      <TextInput
                        value={d.dayName}
                        onChangeText={(v) => setDayName(d.tempId, v)}
                        placeholder={lang === "ar" ? "مثلاً: دفع" : "e.g. Push"}
                        placeholderTextColor={c.mutedForeground}
                        style={{
                          flex: 1, color: c.foreground, fontSize: 16, fontWeight: "800",
                          padding: 0, textAlign: isRTL ? "right" : "left",
                        }}
                      />
                    </View>
                  </View>
                  <Pressable
                    onPress={() => props.setDays((arr) => arr.map((x) => x.tempId === d.tempId ? { ...x, restDay: !x.restDay } : x))}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                      backgroundColor: d.restDay ? c.warning : c.muted,
                    }}
                  >
                    <Text style={{ color: d.restDay ? "#000" : c.foreground, fontSize: 11, fontWeight: "700" }}>
                      {d.restDay ? (lang === "ar" ? "راحة" : "Rest") : (lang === "ar" ? "تدريب" : "Train")}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => props.setDays((arr) => arr.filter((x) => x.tempId !== d.tempId))} hitSlop={8}>
                    <Feather name="trash-2" size={18} color={c.destructive} />
                  </Pressable>
                </View>
                {!d.restDay ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {presets.map((p) => {
                        const active = d.dayName === p;
                        return (
                          <Pressable
                            key={p}
                            onPress={() => setDayName(d.tempId, p)}
                            style={{
                              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                              backgroundColor: active ? c.primary : c.surface,
                              borderWidth: 1, borderColor: active ? c.primary : c.border,
                            }}
                          >
                            <Text style={{ color: active ? c.primaryForeground : c.foreground, fontSize: 12, fontWeight: "700" }}>
                              {p}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Card><EmptyState icon="calendar" text={lang === "ar" ? "لم تتم إضافة أيام بعد" : "No days added yet"} /></Card>
      )}
    </>
  );
}

function Step3(props: {
  days: DraftDay[];
  setDays: React.Dispatch<React.SetStateAction<DraftDay[]>>;
  onPickFor: (tempId: string) => void;
  saveAsTemplate: boolean;
  setSaveAsTemplate: (v: boolean) => void;
  memberCount: number;
}) {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  return (
    <>
      <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
        {lang === "ar"
          ? "اضغط على «إضافة تمرين» في اليوم الذي تريد"
          : "Tap “Add exercise” on the day you want it added to"}
      </Text>

      <Card>
        <Pressable
          onPress={() => props.setSaveAsTemplate(!props.saveAsTemplate)}
          style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}
        >
          <View
            style={{
              width: 22, height: 22, borderRadius: 6,
              borderWidth: 2,
              borderColor: props.saveAsTemplate ? c.primary : c.border,
              backgroundColor: props.saveAsTemplate ? c.primary : "transparent",
              alignItems: "center", justifyContent: "center",
            }}
          >
            {props.saveAsTemplate ? <Feather name="check" size={14} color={c.primaryForeground} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 14, textAlign: isRTL ? "right" : "left" }}>
              {lang === "ar" ? "حفظ كقالب أيضًا" : "Also save as template"}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 11, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
              {lang === "ar"
                ? "لإعادة استخدامه لاحقًا للأعضاء الجدد"
                : "Reuse it later for new members in one tap"}
            </Text>
          </View>
        </Pressable>
        {props.memberCount > 1 ? (
          <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: c.primary + "1A", flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Feather name="users" size={14} color={c.primary} />
            <Text style={{ color: c.primary, fontSize: 12, fontWeight: "700", flex: 1 }}>
              {lang === "ar"
                ? `سيتم إنشاء نسخة لكل من ${props.memberCount} أعضاء`
                : `Will create a copy for each of the ${props.memberCount} selected members`}
            </Text>
          </View>
        ) : null}
      </Card>

      {props.days.map((d, idx) => (
        <Card key={d.tempId}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ color: c.primary, fontWeight: "900" }}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.mutedForeground, fontSize: 11, textAlign: isRTL ? "right" : "left" }}>
                {new Date(d.dayDate).toLocaleDateString(undefined, { weekday: "short" })} • {d.dayDate}
              </Text>
              <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 16, textAlign: isRTL ? "right" : "left" }}>
                {d.dayName}
              </Text>
            </View>
            {d.restDay ? (
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: c.warning + "22" }}>
                <Text style={{ color: c.warning, fontWeight: "700", fontSize: 12 }}>
                  {lang === "ar" ? "يوم راحة" : "Rest day"}
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => props.onPickFor(d.tempId)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  backgroundColor: c.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                }}
              >
                <Feather name="plus" size={14} color={c.primaryForeground} />
                <Text style={{ color: c.primaryForeground, fontWeight: "800", fontSize: 12 }}>
                  {lang === "ar" ? "إضافة تمرين" : "Add exercise"}
                </Text>
              </Pressable>
            )}
          </View>
          {d.exercises.length > 0 ? (
            <View style={{ marginTop: 10, gap: 8 }}>
              {d.exercises.map((ex, idx) => (
                <View key={idx} style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ color: c.foreground, fontWeight: "700", flex: 1 }}>{ex.name}</Text>
                    <Pressable
                      onPress={() =>
                        props.setDays((arr) =>
                          arr.map((x) => x.tempId === d.tempId
                            ? { ...x, exercises: x.exercises.filter((_, i) => i !== idx) }
                            : x)
                        )
                      }
                    >
                      <Feather name="x" size={16} color={c.destructive} />
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                    <NumberPill
                      label={lang === "ar" ? "مج" : "Sets"}
                      value={ex.sets}
                      onChange={(v) =>
                        props.setDays((arr) =>
                          arr.map((x) => x.tempId === d.tempId
                            ? { ...x, exercises: x.exercises.map((e, i) => i === idx ? { ...e, sets: v } : e) }
                            : x)
                        )
                      }
                    />
                    <NumberPill
                      label={lang === "ar" ? "تك" : "Reps"}
                      value={ex.reps}
                      onChange={(v) =>
                        props.setDays((arr) =>
                          arr.map((x) => x.tempId === d.tempId
                            ? { ...x, exercises: x.exercises.map((e, i) => i === idx ? { ...e, reps: v } : e) }
                            : x)
                        )
                      }
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      ))}
    </>
  );
}

function ExercisePickerModal({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (e: ExerciseTemplate) => void }) {
  const c = useColors();
  const { t, lang } = useLanguage();
  const [catId, setCatId] = useState("all");
  const [q, setQ] = useState("");
  const ex = useQuery({ queryKey: ["exercises", "library"], queryFn: () => apiFetch<ExerciseTemplate[]>("/exercises/library").catch(() => []), enabled: visible });
  const cats = useQuery({ queryKey: ["exercises", "categories"], queryFn: () => apiFetch<Category[]>("/exercises/categories").catch(() => []), enabled: visible });

  const list = (ex.data ?? []).filter((e) => {
    const matchCat = catId === "all" || e.categoryId === catId;
    const matchQ = !q || pickName(lang, e).toLowerCase().includes(q.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32, maxHeight: "85%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1 }}>
              {lang === "ar" ? "اختر تمرينًا" : "Pick exercise"}
            </Text>
            <Pressable onPress={onClose}><Feather name="x" size={22} color={c.foreground} /></Pressable>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("common.search")}
            placeholderTextColor={c.mutedForeground}
            style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, height: 44, color: c.foreground, marginBottom: 10 }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[{ id: "all", name: t("coach.filters.all"), nameAr: "الكل" }, ...(cats.data ?? [])].map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCatId(cat.id)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
                    backgroundColor: catId === cat.id ? c.primary : c.surface,
                    borderWidth: 1, borderColor: catId === cat.id ? c.primary : c.border,
                  }}
                >
                  <Text style={{ color: catId === cat.id ? c.primaryForeground : c.foreground, fontWeight: "700", fontSize: 12 }}>{pickName(lang, cat)}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 6 }}>
            {list.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => onPick(e)}
                style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center" }}
              >
                <Text style={{ color: c.foreground, fontWeight: "700", flex: 1 }}>{pickName(lang, e)}</Text>
                <Feather name="plus-circle" size={18} color={c.primary} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
        paddingHorizontal: 14, height: 48, color: c.foreground, fontSize: 15,
      }, props.style as any]}
    />
  );
}

function NumberPill({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{label}</Text>
      <TextInput
        value={String(value)}
        onChangeText={(v) => onChange(parseInt(v.replace(/[^0-9]/g, ""), 10) || 0)}
        keyboardType="number-pad"
        style={{ color: c.foreground, fontWeight: "700", padding: 0, minWidth: 30 }}
      />
    </View>
  );
}
