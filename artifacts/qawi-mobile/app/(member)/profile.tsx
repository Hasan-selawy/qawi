import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Button, Card, Screen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

type ProfileData = {
  name: string;
  email: string;
  coachName?: string;
  subscriptionEndDate?: string;
};

const CATEGORIES = [
  { value: "COACH_ATTITUDE", en: "Coach Attitude", ar: "سلوك المدرب" },
  { value: "BROKEN_EQUIPMENT", en: "Broken Equipment", ar: "معدات معطلة" },
  { value: "OTHER", en: "Other", ar: "أخرى" },
];

export default function ProfileScreen() {
  const c = useColors();
  const { t, lang, isRTL } = useLanguage();
  const { user, logout } = useAuth();

  const [reportModal, setReportModal] = useState(false);
  const [suggestionModal, setSuggestionModal] = useState(false);
  const [reportCategory, setReportCategory] = useState("COACH_ATTITUDE");
  const [reportDesc, setReportDesc] = useState("");
  const [suggestionText, setSuggestionText] = useState("");

  const profile = useQuery<ProfileData>({
    queryKey: ["member", "profile"],
    queryFn: () => apiFetch<ProfileData>("/member/profile"),
    enabled: !!user,
  });

  const submitReport = useMutation({
    mutationFn: () =>
      apiFetch("/member/reports", {
        method: "POST",
        data: { category: reportCategory, description: reportDesc },
      }),
    onSuccess: () => {
      setReportModal(false);
      setReportDesc("");
      Alert.alert(
        lang === "ar" ? "تم الإرسال" : "Submitted",
        lang === "ar" ? "شكراً، تم إرسال تقريرك." : "Thank you, your report has been submitted."
      );
    },
    onError: () =>
      Alert.alert(lang === "ar" ? "خطأ" : "Error", lang === "ar" ? "تعذر الإرسال" : "Failed to submit"),
  });

  const submitSuggestion = useMutation({
    mutationFn: () =>
      apiFetch("/member/suggestions", {
        method: "POST",
        data: { text: suggestionText },
      }),
    onSuccess: () => {
      setSuggestionModal(false);
      setSuggestionText("");
      Alert.alert(
        lang === "ar" ? "تم الإرسال" : "Submitted",
        lang === "ar" ? "شكراً على اقتراحك!" : "Thank you for your suggestion!"
      );
    },
    onError: () =>
      Alert.alert(lang === "ar" ? "خطأ" : "Error", lang === "ar" ? "تعذر الإرسال" : "Failed to submit"),
  });

  const data = profile.data;

  const subEnd = data?.subscriptionEndDate
    ? new Date(data.subscriptionEndDate)
    : (user as any)?.subscriptionExpiresAt
      ? new Date((user as any).subscriptionExpiresAt)
      : null;
  const today = new Date();
  const daysLeft = subEnd
    ? Math.ceil((subEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const formattedEnd = subEnd
    ? `${String(subEnd.getDate()).padStart(2, "0")}/${String(subEnd.getMonth() + 1).padStart(2, "0")}/${subEnd.getFullYear()}`
    : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
  const isExpired = daysLeft !== null && daysLeft < 0;

  const inputStyle = {
    backgroundColor: c.surface,
    color: c.foreground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: c.border,
    textAlign: (isRTL ? "right" : "left") as "right" | "left",
    fontSize: 15,
    marginBottom: 12,
  };

  return (
    <Screen>
      <RoleHeader title={lang === "ar" ? "ملفي" : "Profile"} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>

        {/* Profile Card */}
        <Card>
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: c.primary + "22",
              alignItems: "center", justifyContent: "center",
              marginBottom: 14,
            }}>
              <Feather name="user" size={34} color={c.primary} />
            </View>
            <Text style={{ color: c.foreground, fontSize: 22, fontWeight: "800", textAlign: "center" }}>
              {data?.name ?? user?.name ?? "—"}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 14, marginTop: 4 }}>
              {data?.email ?? user?.email ?? ""}
            </Text>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 16, gap: 12 }}>
            {/* Coach */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center" }}>
                <Feather name="user-check" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                  {lang === "ar" ? "المدرب" : "Coach"}
                </Text>
                <Text style={{ color: c.foreground, fontSize: 15, fontWeight: "600" }}>
                  {data?.coachName ?? (lang === "ar" ? "غير محدد" : "Not assigned")}
                </Text>
              </View>
            </View>

            {/* Subscription end */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center" }}>
                <Feather name="calendar" size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                  {lang === "ar" ? "انتهاء الاشتراك" : "Subscription End"}
                </Text>
                <Text style={{ color: isExpired ? "#EF4444" : c.foreground, fontSize: 15, fontWeight: "600" }}>
                  {formattedEnd ?? (lang === "ar" ? "غير محدد" : "Not set")}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Expiry Warning */}
        {(isExpiringSoon || isExpired) && (
          <View style={{
            backgroundColor: isExpired ? "#EF444422" : "#EAB30822",
            borderWidth: 1,
            borderColor: isExpired ? "#EF4444" : "#EAB308",
            borderRadius: 12,
            padding: 14,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            gap: 10,
          }}>
            <Feather name="alert-triangle" size={20} color={isExpired ? "#EF4444" : "#EAB308"} />
            <Text style={{ color: isExpired ? "#EF4444" : "#EAB308", fontWeight: "600", flex: 1, textAlign: isRTL ? "right" : "left" }}>
              {isExpired
                ? (lang === "ar" ? "انتهى اشتراكك. تواصل مع الإدارة." : "Your subscription has expired. Contact admin.")
                : (lang === "ar"
                    ? `ينتهي اشتراكك خلال ${daysLeft} أيام`
                    : `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`)}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <Button
          title={lang === "ar" ? "إرسال تقرير" : "Submit a Report"}
          icon="flag"
          variant="secondary"
          onPress={() => setReportModal(true)}
        />
        <Button
          title={lang === "ar" ? "إرسال اقتراح" : "Submit a Suggestion"}
          icon="message-circle"
          variant="secondary"
          onPress={() => setSuggestionModal(true)}
        />

        {/* Logout */}
        <Button
          title={lang === "ar" ? "تسجيل الخروج" : "Logout"}
          icon="log-out"
          variant="danger"
          onPress={logout}
        />
      </ScrollView>

      {/* Report Modal */}
      <Modal visible={reportModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: isRTL ? "right" : "left" }}>
              {lang === "ar" ? "إرسال تقرير" : "Submit a Report"}
            </Text>

            <Text style={{ color: c.mutedForeground, fontSize: 13, marginBottom: 8, textAlign: isRTL ? "right" : "left" }}>
              {lang === "ar" ? "الفئة" : "Category"}
            </Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setReportCategory(cat.value)}
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: reportCategory === cat.value ? c.primary : c.border,
                    backgroundColor: reportCategory === cat.value ? c.primary + "11" : "transparent",
                  }}
                >
                  <View style={{
                    width: 20, height: 20, borderRadius: 10,
                    borderWidth: 2,
                    borderColor: reportCategory === cat.value ? c.primary : c.mutedForeground,
                    backgroundColor: reportCategory === cat.value ? c.primary : "transparent",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {reportCategory === cat.value && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "white" }} />}
                  </View>
                  <Text style={{ color: reportCategory === cat.value ? c.primary : c.foreground, fontWeight: "600" }}>
                    {lang === "ar" ? cat.ar : cat.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={reportDesc}
              onChangeText={setReportDesc}
              placeholder={lang === "ar" ? "صف ما حدث..." : "Describe what happened..."}
              placeholderTextColor={c.mutedForeground}
              multiline
              numberOfLines={4}
              style={[inputStyle, { height: 100, textAlignVertical: "top" }]}
            />

            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title={lang === "ar" ? "إلغاء" : "Cancel"} variant="ghost" onPress={() => setReportModal(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={lang === "ar" ? "إرسال" : "Submit"}
                  onPress={() => submitReport.mutate()}
                  loading={submitReport.isPending}
                  disabled={!reportDesc.trim()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Suggestion Modal */}
      <Modal visible={suggestionModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ color: c.foreground, fontSize: 18, fontWeight: "800", marginBottom: 16, textAlign: isRTL ? "right" : "left" }}>
              {lang === "ar" ? "إرسال اقتراح" : "Submit a Suggestion"}
            </Text>

            <TextInput
              value={suggestionText}
              onChangeText={setSuggestionText}
              placeholder={lang === "ar" ? "اكتب اقتراحك هنا..." : "Write your suggestion here..."}
              placeholderTextColor={c.mutedForeground}
              multiline
              numberOfLines={5}
              style={[inputStyle, { height: 120, textAlignVertical: "top" }]}
            />

            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title={lang === "ar" ? "إلغاء" : "Cancel"} variant="ghost" onPress={() => setSuggestionModal(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={lang === "ar" ? "إرسال" : "Submit"}
                  onPress={() => submitSuggestion.mutate()}
                  loading={submitSuggestion.isPending}
                  disabled={!suggestionText.trim()}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
