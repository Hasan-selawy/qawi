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

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDaysISO(todayISO(), 28));
  const [days, setDays] = useState<DraftDay[]>([]);
  const [pickerForDay, setPickerForDay] = useState<string | null>(null);

  const members = useQuery({
    queryKey: ["coach", "members"],
    queryFn: () => apiFetch<CoachMember[]>("/coach/members").catch(() => []),
  });

  const save = useMutation({
    mutationFn: async () => {
      const plan = await apiFetch<any>("/workouts", {
        method: "POST",
        data: { name, memberId, startDate, endDate },
      });
      const planId = plan.id;
      for (const d of days) {
        const created = await apiFetch<any>(`/workouts/${planId}/days`, {
          method: "POST",
          data: { dayName: d.dayName, dayDate: d.dayDate, restDay: d.restDay },
        });
        if (!d.restDay) {
          for (const ex of d.exercises) {
            await apiFetch(`/workouts/days/${created.id}/exercises`, {
              method: "POST",
              data: {
                exerciseTemplateId: ex.templateId,
                sets: ex.sets,
                reps: ex.reps,
                note: ex.note || undefined,
              },
            });
          }
        }
      }
    },
    onSuccess: () => {
      Alert.alert("Qawi", lang === "ar" ? "تم إنشاء الخطة" : "Plan created");
      qc.invalidateQueries({ queryKey: ["coach"] });
      router.back();
    },
    onError: (e: any) => Alert.alert("Qawi", e?.message || "Could not save plan"),
  });

  const canStep1 = !!memberId && !!name && !!startDate && !!endDate;
  const canSave = canStep1 && days.length > 0;

  const addDay = (dateISO: string) => {
    if (days.find((d) => d.dayDate === dateISO)) return;
    setDays((arr) =>
      [...arr, { tempId: tempId(), dayName: `Day ${arr.length + 1}`, dayDate: dateISO, restDay: false, exercises: [] }]
        .sort((a, b) => a.dayDate.localeCompare(b.dayDate))
    );
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
            memberId={memberId}
            setMemberId={setMemberId}
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
          <Step3 days={days} setDays={setDays} onPickFor={setPickerForDay} />
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
  memberId: string | null;
  setMemberId: (v: string) => void;
  name: string; setName: (v: string) => void;
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
}) {
  const c = useColors();
  const { lang } = useLanguage();
  return (
    <>
      <Field label={lang === "ar" ? "العضو" : "Select member"}>
        {props.loading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {props.members.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => props.setMemberId(m.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: props.memberId === m.id ? c.primary : c.surface,
                    borderWidth: 1,
                    borderColor: props.memberId === m.id ? c.primary : c.border,
                  }}
                >
                  <Text style={{ color: props.memberId === m.id ? c.primaryForeground : c.foreground, fontWeight: "700", fontSize: 13 }}>
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
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

function Step2(props: {
  startDate: string; endDate: string;
  days: DraftDay[]; setDays: React.Dispatch<React.SetStateAction<DraftDay[]>>;
  addDay: (iso: string) => void;
}) {
  const c = useColors();
  const { lang, isRTL } = useLanguage();

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
        <View style={{ gap: 8, marginTop: 8 }}>
          {props.days.map((d) => (
            <Card key={d.tempId}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{d.dayDate}</Text>
                  <TextInput
                    value={d.dayName}
                    onChangeText={(v) => props.setDays((arr) => arr.map((x) => x.tempId === d.tempId ? { ...x, dayName: v } : x))}
                    style={{ color: c.foreground, fontSize: 15, fontWeight: "700", padding: 0 }}
                  />
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
                <Pressable onPress={() => props.setDays((arr) => arr.filter((x) => x.tempId !== d.tempId))}>
                  <Feather name="trash-2" size={18} color={c.destructive} />
                </Pressable>
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
}) {
  const c = useColors();
  const { lang } = useLanguage();
  return (
    <>
      {props.days.map((d) => (
        <Card key={d.tempId}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{d.dayDate}</Text>
              <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 15 }}>{d.dayName}</Text>
            </View>
            {d.restDay ? (
              <Text style={{ color: c.warning, fontWeight: "700" }}>{lang === "ar" ? "يوم راحة" : "Rest day"}</Text>
            ) : (
              <Pressable
                onPress={() => props.onPickFor(d.tempId)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
              >
                <Feather name="plus" size={14} color={c.primaryForeground} />
                <Text style={{ color: c.primaryForeground, fontWeight: "700", fontSize: 12 }}>
                  {lang === "ar" ? "تمرين" : "Exercise"}
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
