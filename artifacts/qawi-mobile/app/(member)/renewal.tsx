import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

import { Button, Screen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DURATION_ORDER = ["ONE_MONTH", "THREE_MONTHS", "SIX_MONTHS", "TWELVE_MONTHS"];

const DURATION_LABELS: Record<string, { en: string; ar: string }> = {
  ONE_MONTH: { en: "1 Month", ar: "شهر واحد" },
  THREE_MONTHS: { en: "3 Months", ar: "3 أشهر" },
  SIX_MONTHS: { en: "6 Months", ar: "6 أشهر" },
  TWELVE_MONTHS: { en: "12 Months", ar: "12 شهراً" },
};

export default function RenewalScreen() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [selectedDuration, setSelectedDuration] = useState("ONE_MONTH");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState(false);

  const insets = useSafeAreaInsets();
  const gymId = (user as any)?.gymId;

  const { data: plans = [], isLoading } = useQuery<any[]>({
    queryKey: ["public", "gym-plans", gymId],
    queryFn: () => apiFetch(`/public/gym/${gymId}/member-plans`),
    enabled: !!gymId,
  });

  const submitMut = useMutation({
    mutationFn: (data: any) =>
      apiFetch("/member/renewal-request", { method: "POST", data }),
    onSuccess: () => {
      setConfirmModal(false);
      setSelectedPlan(null);
      Alert.alert(
        lang === "ar" ? "تم الإرسال ✅" : "Request Sent ✅",
        lang === "ar"
          ? "تم إرسال طلبك بنجاح. يرجى التوجه إلى الاستقبال للدفع وتفعيل الاشتراك."
          : "Your renewal request has been sent. Please pay at reception to activate your subscription.",
        [{ text: lang === "ar" ? "حسناً" : "OK", onPress: () => router.back() }]
      );
    },
    onError: () =>
      Alert.alert(
        lang === "ar" ? "خطأ" : "Error",
        lang === "ar" ? "تعذر إرسال الطلب" : "Failed to submit request"
      ),
  });

  const plansForDuration = plans.filter((p: any) => p.duration === selectedDuration);

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setConfirmModal(true);
  };

  const handleConfirm = () => {
    if (!selectedPlan) return;
    submitMut.mutate({
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      planNameAr: selectedPlan.nameAr,
      planDuration: lang === "ar" ? selectedPlan.durationLabelAr : selectedPlan.durationLabel,
    });
  };

  return (
    <Screen>
      {/* Header with back button */}
      <View style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: c.background,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={c.foreground} />
        </TouchableOpacity>
        <Text style={{ color: c.foreground, fontSize: 20, fontWeight: "800" }}>
          {lang === "ar" ? "تجديد الاشتراك" : "Renew Subscription"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}>

        {/* Info banner */}
        <View style={{
          backgroundColor: c.primary + "18",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.primary + "44",
          padding: 14,
          flexDirection: isRTL ? "row-reverse" : "row",
          alignItems: "flex-start",
          gap: 10,
        }}>
          <Feather name="info" size={18} color={c.primary} style={{ marginTop: 1 }} />
          <Text style={{ color: c.foreground, fontSize: 13, flex: 1, textAlign: isRTL ? "right" : "left", lineHeight: 20 }}>
            {lang === "ar"
              ? "اختر خطتك وأرسل طلب التجديد. بعد الموافقة، توجه إلى الاستقبال للدفع وتفعيل اشتراكك."
              : "Select your plan and send a renewal request. After approval, visit reception to pay and activate your subscription."}
          </Text>
        </View>

        {/* Duration Selector */}
        <View>
          <Text style={{ color: c.mutedForeground, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, textAlign: isRTL ? "right" : "left" }}>
            {lang === "ar" ? "المدة" : "Duration"}
          </Text>
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: 8 }}>
            {DURATION_ORDER.map((dur) => {
              const label = DURATION_LABELS[dur];
              const isSelected = selectedDuration === dur;
              const hasPlans = plans.some((p: any) => p.duration === dur);
              if (!hasPlans) return null;
              return (
                <TouchableOpacity
                  key={dur}
                  onPress={() => setSelectedDuration(dur)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: isSelected ? c.primary : c.border,
                    backgroundColor: isSelected ? c.primary + "22" : "transparent",
                  }}
                >
                  <Text style={{ color: isSelected ? c.primary : c.foreground, fontWeight: "700", fontSize: 14 }}>
                    {lang === "ar" ? label.ar : label.en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Plans */}
        {isLoading ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator color={c.primary} size="large" />
          </View>
        ) : plansForDuration.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Feather name="package" size={40} color={c.mutedForeground} />
            <Text style={{ color: c.mutedForeground, marginTop: 12, fontSize: 15 }}>
              {lang === "ar" ? "لا توجد خطط لهذه المدة" : "No plans for this duration"}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={{ color: c.mutedForeground, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, textAlign: isRTL ? "right" : "left" }}>
              {lang === "ar" ? "الخطط المتاحة" : "Available Plans"}
            </Text>
            {plansForDuration.map((plan: any) => (
              <TouchableOpacity
                key={plan.id}
                onPress={() => handleSelectPlan(plan)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: 16,
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: c.primary + "22",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Feather name="tag" size={22} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 16, textAlign: isRTL ? "right" : "left" }}>
                    {lang === "ar" ? (plan.nameAr || plan.name) : plan.name}
                  </Text>
                  {plan.description && (
                    <Text style={{ color: c.mutedForeground, fontSize: 13, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                      {lang === "ar" ? (plan.descriptionAr || plan.description) : plan.description}
                    </Text>
                  )}
                  <Text style={{ color: c.primary, fontWeight: "800", fontSize: 18, marginTop: 6, textAlign: isRTL ? "right" : "left" }}>
                    {Number(plan.price).toFixed(3)}{" "}
                    <Text style={{ fontSize: 13, fontWeight: "400", color: c.mutedForeground }}>JOD</Text>
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={c.mutedForeground} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Confirm Modal */}
      <Modal visible={confirmModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: c.background,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 44,
          }}>
            <Text style={{ color: c.foreground, fontSize: 20, fontWeight: "800", marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
              {lang === "ar" ? "تأكيد الطلب" : "Confirm Request"}
            </Text>

            <View style={{
              backgroundColor: c.surface, borderRadius: 12, padding: 16,
              borderWidth: 1, borderColor: c.border, marginBottom: 16,
            }}>
              <Text style={{ color: c.mutedForeground, fontSize: 12, textAlign: isRTL ? "right" : "left" }}>
                {lang === "ar" ? "الخطة المختارة" : "Selected Plan"}
              </Text>
              <Text style={{ color: c.foreground, fontSize: 17, fontWeight: "700", marginTop: 4, textAlign: isRTL ? "right" : "left" }}>
                {selectedPlan ? (lang === "ar" ? (selectedPlan.nameAr || selectedPlan.name) : selectedPlan.name) : ""}
              </Text>
              <Text style={{ color: c.primary, fontSize: 22, fontWeight: "800", marginTop: 6, textAlign: isRTL ? "right" : "left" }}>
                {selectedPlan ? `${Number(selectedPlan.price).toFixed(3)} JOD` : ""}
              </Text>
            </View>

            <View style={{
              backgroundColor: "#EAB30818",
              borderRadius: 10, borderWidth: 1, borderColor: "#EAB30840",
              padding: 12, marginBottom: 20,
              flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-start", gap: 10,
            }}>
              <Feather name="alert-circle" size={16} color="#EAB308" style={{ marginTop: 1 }} />
              <Text style={{ color: "#EAB308", fontSize: 13, flex: 1, lineHeight: 19, textAlign: isRTL ? "right" : "left" }}>
                {lang === "ar"
                  ? "بعد إرسال الطلب، يرجى التوجه إلى الاستقبال للدفع وتفعيل اشتراكك."
                  : "After sending this request, please visit reception to pay and activate your subscription."}
              </Text>
            </View>

            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={lang === "ar" ? "إلغاء" : "Cancel"}
                  variant="ghost"
                  onPress={() => { setConfirmModal(false); setSelectedPlan(null); }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={lang === "ar" ? "إرسال الطلب" : "Send Request"}
                  onPress={handleConfirm}
                  loading={submitMut.isPending}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
