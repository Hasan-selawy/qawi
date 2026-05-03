import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Button, Card, EmptyState, Input, Screen, SectionTitle } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

const FIELDS: { key: string; label: string }[] = [
  { key: "weight", label: "weight" },
  { key: "chest", label: "chest" },
  { key: "waist", label: "waist" },
  { key: "arms", label: "arms" },
  { key: "legs", label: "legs" },
  { key: "bodyFat", label: "bodyFat" },
];

export default function ProgressScreen() {
  const c = useColors();
  const { t, isRTL } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});

  const measurements = useQuery({
    queryKey: ["member", "measurements"],
    queryFn: () => apiFetch<any[]>("/member/measurements").catch(() => []),
  });

  const addMeasurement = useMutation({
    mutationFn: (data: any) => apiFetch("/member/measurements", { method: "POST", data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member", "measurements"] });
      setOpen(false);
      setVals({});
    },
    onError: () => Alert.alert("Qawi", "Could not save"),
  });

  const submit = () => {
    const data: Record<string, number> = {};
    Object.entries(vals).forEach(([k, v]) => {
      const n = parseFloat(v);
      if (!Number.isNaN(n)) data[k] = n;
    });
    addMeasurement.mutate({ ...data, takenAt: new Date().toISOString() });
  };

  return (
    <Screen>
      <RoleHeader title={t("member.tabs.progress")} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle>{t("member.measurements")}</SectionTitle>
          <Pressable onPress={() => setOpen(true)}>
            <Feather name="plus-circle" size={24} color={c.primary} />
          </Pressable>
        </View>
        {measurements.data?.length ? (
          measurements.data.slice(0, 5).map((m: any) => (
            <Card key={m.id}>
              <Text style={{ color: c.mutedForeground, fontSize: 12, marginBottom: 6 }}>
                {(m.takenAt ?? m.createdAt ?? "").slice(0, 10)}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {FIELDS.filter((f) => m[f.key] != null).map((f) => (
                  <View key={f.key}>
                    <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{t(`member.${f.label}`)}</Text>
                    <Text style={{ color: c.foreground, fontWeight: "700" }}>{m[f.key]}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))
        ) : (
          <Card><EmptyState icon="bar-chart" text={t("common.noData")} /></Card>
        )}
      </ScrollView>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: c.surface, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800" }}>{t("member.addMeasurement")}</Text>
            {FIELDS.map((f) => (
              <Input
                key={f.key}
                placeholder={t(`member.${f.label}`)}
                keyboardType="numeric"
                value={vals[f.key] ?? ""}
                onChangeText={(v) => setVals((p) => ({ ...p, [f.key]: v }))}
              />
            ))}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Button title={t("common.cancel")} variant="secondary" onPress={() => setOpen(false)} /></View>
              <View style={{ flex: 1 }}><Button title={t("common.save")} onPress={submit} loading={addMeasurement.isPending} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
