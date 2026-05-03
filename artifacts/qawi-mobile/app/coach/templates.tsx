import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
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

type Template = { id: string; name: string; nameAr?: string; description?: string };
type CoachMember = { id: string; name: string };

function todayISO() { return new Date().toISOString().slice(0, 10); }

function confirmDelete(title: string, message: string, confirmLabel: string, cancelLabel: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

export default function CoachTemplates() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();

  const [assignFor, setAssignFor] = useState<Template | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const templates = useQuery({
    queryKey: ["coach", "templates"],
    queryFn: () => apiFetch<Template[]>("/templates").catch(() => []),
  });

  const del = useMutation({
    mutationFn: (id: string) => apiFetch(`/templates/${id}`, { method: "DELETE" }),
    onMutate: (id) => setDeletingId(id),
    onSuccess: () => {
      toast.show(lang === "ar" ? "🗑️ تم حذف القالب" : "🗑️ Template deleted", "success");
      qc.invalidateQueries({ queryKey: ["coach", "templates"] });
    },
    onError: (e: any) => {
      console.error("[templates/delete]", e?.status, e?.body, e?.message);
      toast.show(typeof e?.body === "object" ? JSON.stringify(e.body) : (e?.message || "Delete failed"), "error");
    },
    onSettled: () => setDeletingId(null),
  });

  const onDelete = (t: Template) =>
    confirmDelete(
      lang === "ar" ? "حذف القالب" : "Delete template",
      lang === "ar" ? `هل تريد حذف "${pickName(lang, t) || t.name}"؟` : `Delete "${pickName(lang, t) || t.name}"?`,
      lang === "ar" ? "حذف" : "Delete",
      lang === "ar" ? "إلغاء" : "Cancel",
      () => del.mutate(t.id),
    );

  return (
    <Screen>
      <View
        style={{
          paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12,
          flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12,
          borderBottomWidth: 1, borderBottomColor: c.border,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={c.foreground} />
        </Pressable>
        <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1 }}>
          {lang === "ar" ? "قوالبي" : "My Templates"}
        </Text>
      </View>

      {templates.isLoading ? (
        <View style={{ padding: 24 }}><ActivityIndicator color={c.primary} /></View>
      ) : (templates.data ?? []).length === 0 ? (
        <View style={{ padding: 16 }}>
          <Card>
            <EmptyState
              icon="layers"
              text={lang === "ar"
                ? "لا توجد قوالب بعد. أنشئ خطة وحدد «حفظ كقالب» لإنشاء قالب."
                : "No templates yet. Create a plan and tick “Also save as template”."
              }
            />
          </Card>
        </View>
      ) : (
        <FlatList
          data={templates.data!}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const isDeleting = deletingId === item.id;
            return (
              <Card>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                  <View
                    style={{
                      width: 40, height: 40, borderRadius: 10,
                      backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Feather name="layers" size={18} color={c.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 15, textAlign: isRTL ? "right" : "left" }}>
                      {pickName(lang, item) || item.name}
                    </Text>
                    {item.description ? (
                      <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => setAssignFor(item)}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      backgroundColor: c.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                    }}
                  >
                    <Feather name="user-plus" size={14} color={c.primaryForeground} />
                    <Text style={{ color: c.primaryForeground, fontWeight: "800", fontSize: 12 }}>
                      {lang === "ar" ? "تعيين" : "Assign"}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => onDelete(item)} disabled={isDeleting} hitSlop={8}>
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={c.destructive} />
                    ) : (
                      <Feather name="trash-2" size={18} color={c.destructive} />
                    )}
                  </Pressable>
                </View>
              </Card>
            );
          }}
        />
      )}

      <AssignModal template={assignFor} onClose={() => setAssignFor(null)} />
    </Screen>
  );
}

function AssignModal({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const qc = useQueryClient();
  const toast = useToast();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(todayISO());

  React.useEffect(() => {
    if (template) { setMemberId(null); setStartDate(todayISO()); }
  }, [template]);

  const members = useQuery({
    queryKey: ["coach", "members"],
    queryFn: () => apiFetch<CoachMember[]>("/coach/members").catch(() => []),
    enabled: !!template,
  });

  const assign = useMutation({
    mutationFn: () =>
      apiFetch("/workouts/from-template", {
        method: "POST",
        data: { templateId: template!.id, memberId, startDate },
      }),
    onSuccess: () => {
      toast.show(lang === "ar" ? "✅ تم تعيين القالب" : "✅ Template assigned!", "success");
      qc.invalidateQueries({ queryKey: ["coach"] });
      onClose();
    },
    onError: (e: any) => {
      console.error("[templates/assign]", e?.status, e?.body, e?.message);
      const detail = typeof e?.body === "object" ? JSON.stringify(e.body) : (e?.message || "Assign failed");
      toast.show(detail, "error");
    },
  });

  const visible = !!template;
  const canAssign = !!memberId && !!startDate;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, gap: 14 }}>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center" }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", flex: 1, textAlign: isRTL ? "right" : "left" }}>
              {lang === "ar" ? "تعيين القالب" : "Assign template"}
            </Text>
            <Pressable onPress={onClose}><Feather name="x" size={22} color={c.foreground} /></Pressable>
          </View>
          {template ? (
            <Text style={{ color: c.mutedForeground, fontSize: 13, textAlign: isRTL ? "right" : "left" }}>
              {pickName(lang, template) || template.name}
            </Text>
          ) : null}

          <View style={{ gap: 6 }}>
            <Text style={{ color: c.mutedForeground, fontSize: 12, fontWeight: "600" }}>
              {lang === "ar" ? "العضو" : "Member"}
            </Text>
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
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ color: c.mutedForeground, fontSize: 12, fontWeight: "600" }}>
              {lang === "ar" ? "تاريخ البدء" : "Start date"}
            </Text>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={c.mutedForeground}
              style={{
                backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border,
                paddingHorizontal: 14, height: 48, color: c.foreground, fontSize: 15,
              }}
            />
          </View>

          <Button
            title={lang === "ar" ? "تعيين" : "Assign"}
            icon="check"
            onPress={() => assign.mutate()}
            loading={assign.isPending}
            disabled={!canAssign}
          />
        </View>
      </View>
    </Modal>
  );
}
