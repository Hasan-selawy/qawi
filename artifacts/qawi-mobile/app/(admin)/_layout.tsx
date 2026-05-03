import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { RoleTabBar } from "@/components/RoleTabBar";
import { useLanguage } from "@/context/LanguageContext";

export default function AdminLayout() {
  const { t } = useLanguage();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <RoleTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{ title: t("admin.tabs.dashboard"), tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="members"
        options={{ title: t("admin.tabs.members"), tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="coaches"
        options={{ title: t("admin.tabs.coaches"), tabBarIcon: ({ color, size }) => <Feather name="award" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t("admin.tabs.profile"), tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
