import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { RoleTabBar } from "@/components/RoleTabBar";

export default function HrLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <RoleTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="staff"
        options={{ title: "Staff", tabBarIcon: ({ color, size }) => <Feather name="briefcase" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
