import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { RoleHeader } from "@/components/RoleHeader";
import { Card, Screen, SectionTitle } from "@/components/ui";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/services/api";

function KpiCard({ label, value, icon, color }: { label: string; value: any; icon: any; color: string }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: c.mutedForeground, fontSize: 11 }}>{label}</Text>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={{ color: c.foreground, fontSize: 26, fontWeight: "800" }}>{value ?? 0}</Text>
    </Card>
  );
}

export default function HrDashboard() {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const isAr = lang === "ar";

  const todayAttendance = useQuery({
    queryKey: ["hr", "today"],
    queryFn: () => apiFetch<any>("/hr/attendance/today").catch(() => null),
    refetchInterval: 30000,
  });
  const performance = useQuery({
    queryKey: ["hr", "performance"],
    queryFn: () => apiFetch<any[]>("/hr/performance").catch(() => []),
  });
  const report = useQuery({
    queryKey: ["hr", "report"],
    queryFn: () => apiFetch<any>("/hr/reports/attendance").catch(() => null),
  });

  const refreshAll = () => { todayAttendance.refetch(); performance.refetch(); report.refetch(); };

  const ratingColor = (r: number) => {
    if (r >= 4) return "#22C55E";
    if (r >= 3) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <Screen>
      <RoleHeader
        title={isAr ? "الموارد البشرية" : "HR"}
        subtitle={isAr ? "لوحة التحكم" : "Dashboard"}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
        refreshControl={<RefreshControl tintColor={c.primary} refreshing={todayAttendance.isFetching} onRefresh={refreshAll} />}
      >
        {/* Today attendance */}
        <SectionTitle>{isAr ? "حضور اليوم" : "Today's Attendance"}</SectionTitle>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
          <KpiCard
            label={isAr ? "حاضر" : "Present"}
            value={todayAttendance.data?.presentToday ?? 0}
            icon="check-circle" color="#22C55E"
          />
          <KpiCard
            label={isAr ? "غائب" : "Absent"}
            value={todayAttendance.data?.absentToday ?? 0}
            icon="x-circle" color="#EF4444"
          />
        </View>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
          <KpiCard
            label={isAr ? "إجمالي الموظفين" : "Total Staff"}
            value={todayAttendance.data?.totalStaff ?? 0}
            icon="users" color={c.primary}
          />
          <KpiCard
            label={isAr ? "معدل الحضور" : "Attend. Rate"}
            value={todayAttendance.data?.attendanceRate != null ? `${todayAttendance.data.attendanceRate}%` : "—"}
            icon="percent" color="#3B82F6"
          />
        </View>

        {/* Monthly report */}
        {report.data && (
          <>
            <SectionTitle>{isAr ? "تقرير الشهر" : "Monthly Report"}</SectionTitle>
            <Card>
              <View style={{ gap: 10 }}>
                {[
                  { label: isAr ? "أيام العمل" : "Working Days", value: report.data.workingDays ?? 0 },
                  { label: isAr ? "إجمالي الحضور" : "Total Present", value: report.data.totalPresent ?? 0 },
                  { label: isAr ? "إجمالي الغياب" : "Total Absent", value: report.data.totalAbsent ?? 0 },
                ].map((row) => (
                  <View key={row.label} style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between" }}>
                    <Text style={{ color: c.mutedForeground }}>{row.label}</Text>
                    <Text style={{ color: c.foreground, fontWeight: "700" }}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        {/* Coach performance */}
        <SectionTitle>{isAr ? "أداء المدربين" : "Coach Performance"}</SectionTitle>
        {(performance.data ?? []).length === 0 ? (
          <Card>
            <Text style={{ color: c.mutedForeground, textAlign: "center", padding: 16 }}>
              {isAr ? "لا توجد بيانات" : "No data available"}
            </Text>
          </Card>
        ) : (
          (performance.data ?? []).slice(0, 8).map((p: any) => (
            <Card key={p.coachId}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{p.coachName}</Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>
                    {p.membersCount ?? 0} {isAr ? "أعضاء" : "members"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {p.rating != null && (
                    <View style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                      backgroundColor: ratingColor(p.rating) + "22",
                    }}>
                      <Text style={{ color: ratingColor(p.rating), fontWeight: "800", fontSize: 13 }}>
                        ⭐ {p.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                  <Text style={{ color: c.mutedForeground, fontSize: 11 }}>
                    {p.plansCreated ?? 0} {isAr ? "خطط" : "plans"}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
