import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

interface FeatureLockScreenProps {
  icon: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
}

export function FeatureLockScreen({
  icon,
  titleEn,
  titleAr,
  subtitleEn,
  subtitleAr,
}: FeatureLockScreenProps) {
  const c = useColors();
  const { lang, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 44 }}>{icon}</Text>
      </View>

      <Text
        style={{
          color: c.foreground,
          fontSize: 22,
          fontWeight: "800",
          textAlign: "center",
          marginBottom: 10,
          lineHeight: 30,
        }}
      >
        {lang === "ar" ? titleAr : titleEn}
      </Text>

      <Text
        style={{
          color: c.mutedForeground,
          fontSize: 15,
          textAlign: "center",
          lineHeight: 22,
        }}
      >
        {lang === "ar" ? subtitleAr : subtitleEn}
      </Text>
    </View>
  );
}
