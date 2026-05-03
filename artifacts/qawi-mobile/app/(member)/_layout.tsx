import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { RoleTabBar } from "@/components/RoleTabBar";
import { useLanguage } from "@/context/LanguageContext";

export default function MemberLayout() {
  const { t } = useLanguage();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <RoleTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{ title: t("member.tabs.home"), tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="workout"
        options={{ title: t("member.tabs.workout"), tabBarIcon: ({ color, size }) => <Feather name="activity" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="checkin"
        options={{ title: t("member.tabs.checkin"), tabBarIcon: ({ color, size }) => <Feather name="check-circle" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: t("member.tabs.nutrition"), tabBarIcon: ({ color, size }) => <Feather name="coffee" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: t("member.tabs.progress"), tabBarIcon: ({ color, size }) => <Feather name="trending-up" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
