import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0A0F1E" }}>
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === "MEMBER") return <Redirect href="/(member)" />;
  if (user.role === "COACH") return <Redirect href="/(coach)" />;
  if (user.role === "GYM_ADMIN") return <Redirect href="/(admin)" />;
  return <Redirect href="/(auth)/login" />;
}
