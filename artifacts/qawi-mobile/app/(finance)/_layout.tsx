import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { RoleTabBar } from "@/components/RoleTabBar";

export default function FinanceLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <RoleTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Feather name="trending-up" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="members"
        options={{ title: "Members", tabBarIcon: ({ color, size }) => <Feather name="credit-card" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
