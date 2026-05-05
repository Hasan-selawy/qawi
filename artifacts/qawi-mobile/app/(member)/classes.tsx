import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FeatureLockScreen } from "@/components/FeatureLockScreen";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { useGymConfig } from "@/hooks/useGymConfig";
import { apiFetch } from "@/services/api";

function ClassCard({ cls, onBook, onCancel, booking }: {
  cls: any; onBook: () => void; onCancel: () => void; booking: boolean;
}) {
  const { lang } = useLanguage();
  const C = useColors();
  const dt = parseISO(cls.dateTime);
  const isFull = cls.isFull;
  const isBooked = cls.isBooked;

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: isBooked ? C.primary + "40" : C.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.dateBox, { backgroundColor: C.primary + "15", borderColor: C.primary + "30" }]}>
          <Text style={[styles.dateMonth, { color: C.primary }]}>{format(dt, "MMM")}</Text>
          <Text style={[styles.dateDay, { color: C.text }]}>{format(dt, "d")}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.className, { color: C.text }]} numberOfLines={1}>{cls.name}</Text>
            {isBooked && (
              <View style={[styles.badge, { backgroundColor: C.primary + "20" }]}>
                <Text style={[styles.badgeText, { color: C.primary }]}>
                  {lang === "ar" ? "محجوز" : "Booked"}
                </Text>
              </View>
            )}
            {isFull && !isBooked && (
              <View style={[styles.badge, { backgroundColor: "#F59E0B20" }]}>
                <Text style={[styles.badgeText, { color: "#F59E0B" }]}>
                  {lang === "ar" ? "ممتلئ" : "Full"}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Feather name="clock" size={12} color={C.mutedForeground} />
            <Text style={[styles.meta, { color: C.mutedForeground }]}>
              {format(dt, "h:mm a")} · {cls.durationMinutes}min
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="users" size={12} color={C.mutedForeground} />
            <Text style={[styles.meta, { color: C.mutedForeground }]}>
              {cls.bookedCount}/{cls.maxCapacity} {lang === "ar" ? "حجز" : "booked"} · 👤 {cls.instructorName}
            </Text>
          </View>
          {cls.description ? (
            <Text style={[styles.desc, { color: C.mutedForeground }]} numberOfLines={2}>
              {cls.description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.cardActions}>
        {isBooked ? (
          <Pressable
            onPress={onCancel}
            style={[styles.btn, styles.btnOutline, { borderColor: "#EF444440" }]}
          >
            <Text style={[styles.btnText, { color: "#EF4444" }]}>
              {lang === "ar" ? "إلغاء الحجز" : "Cancel Booking"}
            </Text>
          </Pressable>
        ) : isFull ? (
          <View style={[styles.btn, { backgroundColor: C.muted, opacity: 0.5 }]}>
            <Text style={[styles.btnText, { color: C.mutedForeground }]}>
              {lang === "ar" ? "الحصة ممتلئة" : "Class Full"}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={onBook}
            style={[styles.btn, { backgroundColor: C.primary }]}
            disabled={booking}
          >
            {booking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.btnText, { color: "#fff" }]}>
                {lang === "ar" ? "احجز الآن" : "Book Now"}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function MemberClasses() {
  const { lang } = useLanguage();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { features } = useGymConfig();

  const [bookingId, setBookingId] = useState<string | null>(null);

  const { data: classes, isLoading, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ["member", "classes"],
    queryFn: () => apiFetch("/member/classes"),
    enabled: features.classBookingEnabled,
  });

  const bookClass = useMutation({
    mutationFn: (classId: string) => apiFetch(`/member/classes/${classId}/book`, { method: "POST" }),
    onMutate: (classId) => setBookingId(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", "classes"] });
      Alert.alert("✅", lang === "ar" ? "تم حجز الحصة بنجاح!" : "Class booked successfully!");
    },
    onError: (err: any) => {
      Alert.alert(
        lang === "ar" ? "تعذّر الحجز" : "Booking Failed",
        err?.error || (lang === "ar" ? "حدث خطأ" : "Something went wrong")
      );
    },
    onSettled: () => setBookingId(null),
  });

  const cancelBooking = useMutation({
    mutationFn: (classId: string) => apiFetch(`/member/classes/${classId}/book`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", "classes"] });
    },
    onError: (err: any) => {
      Alert.alert(
        lang === "ar" ? "تعذّر الإلغاء" : "Cancel Failed",
        err?.error || (lang === "ar" ? "حدث خطأ" : "Something went wrong")
      );
    },
  });

  if (!features.classBookingEnabled) {
    return (
      <FeatureLockScreen
        icon="🗓️"
        titleEn="Classes Not Activated Yet"
        titleAr="لم يتم تفعيل الحصص بعد"
        subtitleEn="Your gym hasn't enabled this feature yet."
        subtitleAr="لم تقم صالتك بتفعيل هذه الميزة بعد."
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: C.background }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>
          {lang === "ar" ? "الحصص" : "Classes"}
        </Text>
        <Text style={[styles.headerSub, { color: C.mutedForeground }]}>
          {lang === "ar" ? "الحصص المتاحة لحجزها" : "Available classes to book"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : !classes?.length ? (
        <ScrollView
          contentContainerStyle={styles.emptyWrap}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.primary} />}
        >
          <Feather name="calendar" size={48} color={C.mutedForeground} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>
            {lang === "ar" ? "لا توجد حصص قادمة" : "No upcoming classes"}
          </Text>
          <Text style={[styles.emptyDesc, { color: C.mutedForeground }]}>
            {lang === "ar" ? "سيُضيف مسؤول الصالة حصصاً قريباً." : "Your gym admin will add classes soon."}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {classes.map((cls: any) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              booking={bookingId === cls.id}
              onBook={() => {
                Alert.alert(
                  lang === "ar" ? "تأكيد الحجز" : "Confirm Booking",
                  `${cls.name} — ${format(parseISO(cls.dateTime), "EEE MMM d, h:mm a")}`,
                  [
                    { text: lang === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
                    { text: lang === "ar" ? "حجز" : "Book", onPress: () => bookClass.mutate(cls.id) },
                  ]
                );
              }}
              onCancel={() => {
                Alert.alert(
                  lang === "ar" ? "إلغاء الحجز" : "Cancel Booking",
                  lang === "ar" ? "هل أنت متأكد من إلغاء حجزك؟" : "Are you sure you want to cancel?",
                  [
                    { text: lang === "ar" ? "لا" : "No", style: "cancel" },
                    { text: lang === "ar" ? "نعم، إلغاء" : "Yes, Cancel", style: "destructive", onPress: () => cancelBooking.mutate(cls.id) },
                  ]
                );
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  headerTitle: { fontSize: 28, fontWeight: "700", marginBottom: 2 },
  headerSub: { fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 14 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  cardTop: { flexDirection: "row", gap: 14 },
  dateBox: { width: 52, height: 60, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  dateMonth: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  dateDay: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  cardInfo: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  className: { fontSize: 16, fontWeight: "700", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { fontSize: 12 },
  desc: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  cardActions: {},
  btn: { height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnOutline: { borderWidth: 1 },
  btnText: { fontSize: 14, fontWeight: "600" },
});
