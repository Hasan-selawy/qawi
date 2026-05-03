import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
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

import { RoleHeader } from "@/components/RoleHeader";
import { Button, Card, EmptyState, Input, Screen } from "@/components/ui";
import { useLanguage, pickName } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type ExerciseTemplate = {
  id: string;
  categoryId?: string;
  name: string;
  nameAr?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
};
type Category = { id: string; name: string; nameAr?: string };
type CoachMember = { id: string; name: string };

export default function CoachLibrary() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const [catId, setCatId] = useState<string>("all");
  const [q, setQ] = useState("");
  const [pickFor, setPickFor] = useState<ExerciseTemplate | null>(null);

  const ex = useQuery({
    queryKey: ["exercises", "library"],
    queryFn: () => apiFetch<ExerciseTemplate[]>("/exercises/library").catch(() => []),
  });
  const cats = useQuery({
    queryKey: ["exercises", "categories"],
    queryFn: () => apiFetch<Category[]>("/exercises/categories").catch(() => []),
  });

  const list = useMemo(() => {
    const data = ex.data ?? [];
    return data.filter((e) => {
      const matchCat = catId === "all" || e.categoryId === catId;
      const matchQ = !q || pickName(lang, e).toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [ex.data, catId, q, lang]);

  const catOptions = [{ id: "all", name: t("coach.filters.all"), nameAr: "الكل" }, ...(cats.data ?? [])];

  return (
    <Screen>
      <RoleHeader title={t("coach.tabs.library")} />
      <View style={{ padding: 16, gap: 12 }}>
        <Input icon="search" placeholder={t("common.search")} value={q} onChangeText={setQ} />
        <FlatList
          horizontal
          data={catOptions}
          showsHorizontalScrollIndicator={false}
          inverted={isRTL}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setCatId(item.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: catId === item.id ? c.primary : c.surface,
                borderWidth: 1,
                borderColor: catId === item.id ? c.primary : c.border,
              }}
            >
              <Text style={{ color: catId === item.id ? c.primaryForeground : c.foreground, fontSize: 12, fontWeight: "700" }}>
                {pickName(lang, item)}
              </Text>
            </Pressable>
          )}
        />
      </View>
      {ex.isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : list.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card><EmptyState icon="book-open" text={t("common.noData")} /></Card>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.muted, alignItems: "center", justifyContent: "center" }}>
                  <Feather name="activity" size={20} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{pickName(lang, item)}</Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                    {item.defaultSets ?? 3} × {item.defaultReps ?? 10}
                    {item.defaultWeight ? `  •  ${item.defaultWeight}kg` : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setPickFor(item)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: c.primary,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                  }}
                >
                  <Feather name="plus" size={14} color={c.primaryForeground} />
                  <Text style={{ color: c.primaryForeground, fontWeight: "700", fontSize: 12 }}>{t("common.add")}</Text>
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}

      <AddToPlanModal exercise={pickFor} onClose={() => setPickFor(null)} />
    </Screen>
  );
}

function AddToPlanModal({ exercise, onClose }: { exercise: ExerciseTemplate | null; onClose: () => void }) {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const qc = useQueryClient();

  const [memberId, setMemberId] = useState<string | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [note, setNote] = useState("");

  const open = !!exercise;

  useEffect(() => {
    if (exercise) {
      setSets(String(exercise.defaultSets ?? 3));
      setReps(String(exercise.defaultReps ?? 10));
      setNote("");
      setMemberId(null);
      setDayId(null);
    }
  }, [exercise]);

  const members = useQuery({
    queryKey: ["coach", "members"],
    queryFn: () => apiFetch<CoachMember[]>("/coach/members").catch(() => []),
    enabled: open,
  });
  const plans = useQuery({
    queryKey: ["coach", "member-workouts", memberId],
    queryFn: () => apiFetch<any[]>(`/workouts/member/${memberId}`).catch(() => []),
    enabled: !!memberId,
  });

  const days: { id: string; label: string }[] = useMemo(() => {
    const list = plans.data ?? [];
    if (list.length === 0) return [];
    const latest = list[list.length - 1];
    const ds = latest.days ?? latest.scheduleDays ?? [];
    return ds.map((d: any) => ({
      id: d.id,
      label: `${d.dayName ?? d.name ?? d.dayDate ?? ""}${d.restDay ? " (Rest)" : ""}`,
    }));
  }, [plans.data]);

  useEffect(() => {
    if (days.length > 0 && !dayId) setDayId(days[0].id);
  }, [days, dayId]);

  const memberName = members.data?.find((m) => m.id === memberId)?.name ?? "";

  const add = useMutation({
    mutationFn: () =>
      apiFetch(`/workouts/days/${dayId}/exercises`, {
        method: "POST",
        data: {
          exerciseTemplateId: exercise!.id,
          sets: parseInt(sets, 10) || (exercise?.defaultSets ?? 3),
          reps: parseInt(reps, 10) || (exercise?.defaultReps ?? 10),
          note: note || undefined,
        },
      }),
    onSuccess: () => {
      Alert.alert(
        "Qawi",
        lang === "ar" ? `تمت الإضافة لخطة ${memberName}!` : `Added to ${memberName}'s plan!`
      );
      qc.invalidateQueries({ queryKey: ["coach"] });
      onClose();
    },
    onError: (e: any) => Alert.alert("Qawi", e?.message || "Could not add exercise"),
  });

  const canSubmit = !!memberId && !!dayId && !!sets && !!reps;

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
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
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", padding: 16, gap: 8 }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1 }}>
              {pickName(lang, exercise)}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={c.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            <Field label={lang === "ar" ? "العضو" : "Select Member"}>
              {members.isLoading ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(members.data ?? []).map((m) => (
                      <Pressable
                        key={m.id}
                        onPress={() => { setMemberId(m.id); setDayId(null); }}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 999,
                          backgroundColor: memberId === m.id ? c.primary : c.surface,
                          borderWidth: 1,
                          borderColor: memberId === m.id ? c.primary : c.border,
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

            {memberId ? (
              <Field label={lang === "ar" ? "اليوم" : "Select Day"}>
                {plans.isLoading ? (
                  <ActivityIndicator color={c.primary} />
                ) : days.length === 0 ? (
                  <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                    {lang === "ar" ? "لا توجد خطة مفعّلة لهذا العضو" : "No active plan for this member"}
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {days.map((d) => (
                        <Pressable
                          key={d.id}
                          onPress={() => setDayId(d.id)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 999,
                            backgroundColor: dayId === d.id ? c.primary : c.surface,
                            borderWidth: 1,
                            borderColor: dayId === d.id ? c.primary : c.border,
                          }}
                        >
                          <Text style={{ color: dayId === d.id ? c.primaryForeground : c.foreground, fontWeight: "700", fontSize: 13 }}>
                            {d.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </Field>
            ) : null}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label={lang === "ar" ? "المجموعات" : "Sets"}>
                  <NumberBox value={sets} onChangeText={setSets} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label={lang === "ar" ? "التكرارات" : "Reps"}>
                  <NumberBox value={reps} onChangeText={setReps} />
                </Field>
              </View>
            </View>

            <Field label={lang === "ar" ? "ملاحظة المدرب (اختياري)" : "Coach note (optional)"}>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                placeholder={lang === "ar" ? "اكتب ملاحظتك هنا" : "Write a note for the member"}
                placeholderTextColor={c.mutedForeground}
                style={{
                  minHeight: 70,
                  backgroundColor: c.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: 12,
                  color: c.foreground,
                  textAlignVertical: "top",
                }}
              />
            </Field>

            <Button
              title={t("coach.addExercise")}
              icon="plus"
              onPress={() => add.mutate()}
              loading={add.isPending}
              disabled={!canSubmit}
            />
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

function NumberBox({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  const c = useColors();
  return (
    <TextInput
      value={value}
      onChangeText={(v) => onChangeText(v.replace(/[^0-9]/g, ""))}
      keyboardType="number-pad"
      placeholderTextColor={c.mutedForeground}
      style={{
        backgroundColor: c.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 14,
        height: 48,
        color: c.foreground,
        fontSize: 16,
      }}
    />
  );
}
