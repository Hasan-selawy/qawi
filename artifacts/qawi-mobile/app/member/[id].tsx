import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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

import { Avatar, Badge, Button, Card, EmptyState, Screen, SectionTitle } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type Overview = {
  member?: { id: string; name?: string; email?: string; isActive?: boolean; subscriptionEndDate?: string };
  latestMeasurements?: {
    weight?: number; chest?: number; waist?: number; arms?: number; legs?: number;
    bodyFat?: number; recordedAt?: string;
  } | null;
  coachNotes?: { id: string; note?: string; content?: string; createdAt?: string }[];
  currentWorkoutPlan?: any;
  nutritionPlan?: any;
  attendanceStreak?: number;
};

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [showNote, setShowNote] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);

  const overview = useQuery({
    queryKey: ["coach", "member-overview", id],
    queryFn: () => apiFetch<Overview>(`/coach/members/${id}/overview`).catch(() => null),
    enabled: !!id,
  });

  const member = overview.data?.member ?? ({} as NonNullable<Overview["member"]>);
  const latest = overview.data?.latestMeasurements ?? null;
  const notes = overview.data?.coachNotes ?? [];
  const streak = overview.data?.attendanceStreak ?? 0;

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
          {member.name ?? ""}
        </Text>
      </View>

      {overview.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
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
              <Stat
                label={lang === "ar" ? "خطة تمرين" : "Workout"}
                value={overview.data?.currentWorkoutPlan ? "✓" : "—"}
              />
              <Stat
                label={lang === "ar" ? "خطة غذاء" : "Nutrition"}
                value={overview.data?.nutritionPlan ? "✓" : "—"}
              />
            </View>
          </Card>

          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
            <SectionTitle>{t("member.measurements")}</SectionTitle>
            <Pressable onPress={() => setShowMeasure(true)}>
              <Text style={{ color: c.primary, fontWeight: "700" }}>+ {t("member.addMeasurement")}</Text>
            </Pressable>
          </View>

          {!latest ? (
            <Card><EmptyState icon="bar-chart" text={t("common.noData")} /></Card>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <MeasureCard label={t("member.weight")} value={latest.weight} unit="kg" />
              <MeasureCard label={t("member.chest")} value={latest.chest} unit="cm" />
              <MeasureCard label={t("member.waist")} value={latest.waist} unit="cm" />
              <MeasureCard label={t("member.arms")} value={latest.arms} unit="cm" />
              <MeasureCard label={t("member.legs")} value={latest.legs} unit="cm" />
              <MeasureCard label={t("member.bodyFat")} value={latest.bodyFat} unit="%" />
            </View>
          )}

          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
            <SectionTitle>{lang === "ar" ? "الملاحظات" : "Notes"}</SectionTitle>
            <Pressable onPress={() => setShowNote(true)}>
              <Text style={{ color: c.primary, fontWeight: "700" }}>+ {t("coach.addNote")}</Text>
            </Pressable>
          </View>

          {notes.length === 0 ? (
            <Card><EmptyState icon="edit-3" text={t("common.noData")} /></Card>
          ) : (
            notes.map((n: any) => (
              <Card key={n.id}>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{(n.createdAt ?? "").slice(0, 10)}</Text>
                  <Pressable
                    onPress={() => {
                      console.log("[notes] delete pressed", n.id);
                      Alert.alert(
                        lang === "ar" ? "حذف الملاحظة" : "Delete note",
                        lang === "ar" ? "هل أنت متأكد من حذف هذه الملاحظة؟" : "Are you sure you want to delete this note?",
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
                                Alert.alert("Qawi", e?.message || (lang === "ar" ? "تعذر حذف الملاحظة" : "Could not delete note"));
                              }
                            },
                          },
                        ],
                      );
                    }}
                    style={({ pressed }) => ({
                      padding: 10,
                      marginRight: -8,
                      marginLeft: -8,
                      marginTop: -8,
                      marginBottom: -8,
                      borderRadius: 999,
                      backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "transparent",
                    })}
                  >
                    <Feather name="trash-2" size={18} color={c.mutedForeground} />
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
    </Screen>
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
  visible,
  memberId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  memberId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = useColors();
  const { t, lang } = useLanguage();
  const [text, setText] = useState("");
  const save = useMutation({
    mutationFn: () =>
      apiFetch("/notes", { method: "POST", data: { memberId, note: text } }),
    onSuccess: () => {
      setText("");
      onSaved();
      onClose();
    },
    onError: (e: any) => Alert.alert("Qawi", e?.message || "Could not save note"),
  });
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1 }}>
              {t("coach.addNote")}
            </Text>
            <Pressable onPress={onClose}><Feather name="x" size={22} color={c.foreground} /></Pressable>
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            placeholder={lang === "ar" ? "اكتب ملاحظتك" : "Write a note about this member"}
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
          <Button title={t("common.save")} icon="check" onPress={() => save.mutate()} loading={save.isPending} disabled={!text} />
        </View>
      </View>
    </Modal>
  );
}

function AddMeasurementModal({
  visible,
  memberId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  memberId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = useColors();
  const { t } = useLanguage();
  const [m, setM] = useState({ weight: "", chest: "", waist: "", arms: "", legs: "", bodyFatPercentage: "" });
  const setField = (k: keyof typeof m) => (v: string) => setM((s) => ({ ...s, [k]: v.replace(/[^0-9.]/g, "") }));
  const save = useMutation({
    mutationFn: () => {
      const payload: any = { memberId };
      Object.entries(m).forEach(([k, v]) => {
        if (v) payload[k] = parseFloat(v);
      });
      return apiFetch("/measurements", { method: "POST", data: payload });
    },
    onSuccess: () => {
      setM({ weight: "", chest: "", waist: "", arms: "", legs: "", bodyFatPercentage: "" });
      onSaved();
      onClose();
    },
    onError: (e: any) => Alert.alert("Qawi", e?.message || "Could not save measurement"),
  });
  const fields: { key: keyof typeof m; label: string; unit: string }[] = [
    { key: "weight", label: t("member.weight"), unit: "kg" },
    { key: "chest", label: t("member.chest"), unit: "cm" },
    { key: "waist", label: t("member.waist"), unit: "cm" },
    { key: "arms", label: t("member.arms"), unit: "cm" },
    { key: "legs", label: t("member.legs"), unit: "cm" },
    { key: "bodyFatPercentage", label: t("member.bodyFat"), unit: "%" },
  ];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 12, maxHeight: "85%" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1 }}>
              {t("member.addMeasurement")}
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
          <Button title={t("common.save")} icon="check" onPress={() => save.mutate()} loading={save.isPending} />
        </View>
      </View>
    </Modal>
  );
}
