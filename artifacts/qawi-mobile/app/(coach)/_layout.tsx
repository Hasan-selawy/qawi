import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { RoleTabBar } from "@/components/RoleTabBar";
import { useLanguage } from "@/context/LanguageContext";
import { useGymConfig } from "@/hooks/useGymConfig";

export default function CoachLayout() {
  const { t } = useLanguage();
  const { features } = useGymConfig();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <RoleTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{ title: t("coach.tabs.members"), tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="plans"
        options={{ title: t("coach.tabs.plans"), tabBarIcon: ({ color, size }) => <Feather name="layers" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t("coach.tabs.nutrition"),
          tabBarIcon: ({ color, size }) => <Feather name="coffee" size={size} color={color} />,
          href: features.nutritionEnabled ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: t("coach.tabs.library"), tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t("coach.tabs.profile"), tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
