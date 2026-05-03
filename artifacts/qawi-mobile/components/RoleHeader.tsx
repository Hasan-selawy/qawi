import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export function RoleHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { lang, setLang, isRTL } = useLanguage();
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <View
      style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: c.background,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
        flexDirection: isRTL ? "row-reverse" : "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: c.foreground,
            fontSize: 22,
            fontWeight: "800",
            textAlign: isRTL ? "right" : "left",
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: c.mutedForeground, marginTop: 2, textAlign: isRTL ? "right" : "left" }}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
        <Pressable
          onPress={() => setLang(lang === "en" ? "ar" : "en")}
          style={{
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 999,
          }}
        >
          <Text style={{ color: c.foreground, fontWeight: "700", fontSize: 12 }}>{lang === "en" ? "AR" : "EN"}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/notifications")}
          style={{
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            width: 36,
            height: 36,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="bell" size={16} color={c.foreground} />
        </Pressable>
        <Pressable
          onPress={() => logout()}
          style={{
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            width: 36,
            height: 36,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="log-out" size={16} color={c.foreground} />
        </Pressable>
      </View>
    </View>
  );
}
