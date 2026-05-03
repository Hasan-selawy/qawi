import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

function FloatingInput({
  label,
  value,
  onChangeText,
  icon,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  rightSlot,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: React.ComponentProps<typeof Feather>["name"];
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
  rightSlot?: React.ReactNode;
}) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: focused || value ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [focused, value, anim]);

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = focused ? c.primary : c.mutedForeground;

  return (
    <View
      style={{
        height: 64,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: focused ? c.primary : "rgba(255,255,255,0.1)",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        gap: 12,
        ...(focused
          ? { shadowColor: c.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }
          : {}),
      }}
    >
      <Feather name={icon} size={18} color={focused ? c.primary : c.mutedForeground} />
      <View style={{ flex: 1, height: "100%", justifyContent: "center" }}>
        <Animated.Text
          style={{
            position: "absolute",
            top: labelTop as any,
            fontSize: labelSize as any,
            color: labelColor,
            fontFamily: "Inter_500Medium",
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Animated.Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={false}
          style={{
            color: c.foreground,
            fontFamily: "Inter_500Medium",
            fontSize: 15,
            paddingTop: 18,
            paddingBottom: 0,
            height: "100%",
          }}
        />
      </View>
      {rightSlot}
    </View>
  );
}

export default function LoginScreen() {
  const c = useColors();
  const { t, lang, setLang } = useLanguage();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pressScale = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    ).start();
  }, [shimmer]);

  const onSubmit = async () => {
    if (!email || !password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role === "SUPER_ADMIN") Alert.alert("Qawi", t("auth.superNotAllowed"));
    } catch {
      Alert.alert("Qawi", t("auth.loginError"));
    } finally {
      setSubmitting(false);
    }
  };

  const tagline = lang === "ar" ? "تدرب بذكاء. كن أقوى." : "Train Smarter. Get Stronger.";
  const arabicFont = "Cairo_900Black";

  const shimmerTranslate = shimmer.interpolate({ inputRange: [-1, 1], outputRange: [-220, 320] });

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1E" }}>
      <LinearGradient
        colors={["#0A0F1E", "#0A1814", "#0D1F0D"]}
        locations={[0, 0.6, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Radial green glow behind logo */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: insets.top + 60,
          left: "50%",
          marginLeft: -150,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: "rgba(34,197,94,0.15)",
          shadowColor: "#22C55E",
          shadowOpacity: 0.4,
          shadowRadius: 80,
          shadowOffset: { width: 0, height: 0 },
          ...(Platform.OS === "web" ? { filter: "blur(60px)" as any } : {}),
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: insets.top + 100,
          left: "50%",
          marginLeft: -100,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: "rgba(34,197,94,0.18)",
          ...(Platform.OS === "web" ? { filter: "blur(40px)" as any } : {}),
        }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top right language pill */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 60 }}>
            <Pressable
              onPress={() => setLang(lang === "en" ? "ar" : "en")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Feather name="globe" size={13} color="#94A3B8" />
              <Text style={{ color: "#F8FAFC", fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1 }}>
                {lang === "en" ? "EN" : "AR"}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>|</Text>
              <Text style={{ color: "#94A3B8", fontSize: 12, fontFamily: "Cairo_700Bold" }}>
                {lang === "en" ? "عر" : "EN"}
              </Text>
            </Pressable>
          </View>

          {/* Logo block */}
          <View style={{ alignItems: "center", marginBottom: 48 }}>
            <Text
              style={{
                fontSize: 96,
                color: "#22C55E",
                fontFamily: arabicFont,
                lineHeight: 110,
                textShadowColor: "rgba(34,197,94,0.7)",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 30,
                ...(Platform.OS === "web"
                  ? ({ textShadow: "0 0 30px rgba(34,197,94,0.7), 0 0 60px rgba(34,197,94,0.4)" } as any)
                  : {}),
              }}
            >
              قوي
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 18,
                letterSpacing: 8,
                fontFamily: "Inter_700Bold",
                marginTop: 6,
                marginLeft: 8,
              }}
            >
              QAWI
            </Text>
            <View
              style={{
                width: 60,
                height: 2,
                backgroundColor: "#22C55E",
                marginTop: 18,
                marginBottom: 14,
                borderRadius: 1,
              }}
            />
            <Text
              style={{
                color: "#94A3B8",
                fontSize: 13,
                fontFamily: lang === "ar" ? "Cairo_700Bold" : "Inter_500Medium",
                letterSpacing: lang === "ar" ? 0 : 0.5,
              }}
            >
              {tagline}
            </Text>
          </View>

          {/* Inputs */}
          <View style={{ gap: 14 }}>
            <FloatingInput
              label={t("common.email")}
              value={email}
              onChangeText={setEmail}
              icon="mail"
              keyboardType="email-address"
            />
            <FloatingInput
              label={t("common.password")}
              value={password}
              onChangeText={setPassword}
              icon="lock"
              secureTextEntry={!showPwd}
              rightSlot={
                <Pressable hitSlop={10} onPress={() => setShowPwd((s) => !s)}>
                  <Feather name={showPwd ? "eye-off" : "eye"} size={18} color="#94A3B8" />
                </Pressable>
              }
            />
          </View>

          {/* Sign in button */}
          <Animated.View style={{ marginTop: 28, transform: [{ scale: pressScale }] }}>
            <Pressable
              onPressIn={() => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start()}
              onPress={onSubmit}
              disabled={submitting}
              style={{ borderRadius: 14, overflow: "hidden", height: 56 }}
            >
              <LinearGradient
                colors={submitting ? ["#16A34A", "#15803D"] : ["#22C55E", "#16A34A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontFamily: lang === "ar" ? "Cairo_700Bold" : "Inter_700Bold",
                    letterSpacing: 0.5,
                  }}
                >
                  {submitting ? "…" : t("auth.loginButton")}
                </Text>
                {/* shimmer */}
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: 80,
                    transform: [{ translateX: shimmerTranslate }, { skewX: "-20deg" }],
                    backgroundColor: "rgba(255,255,255,0.18)",
                  }}
                />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Bottom register prompt */}
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Pressable hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text
                style={{
                  color: "#94A3B8",
                  fontSize: 13,
                  fontFamily: lang === "ar" ? "Cairo_700Bold" : "Inter_500Medium",
                }}
              >
                {lang === "ar" ? "ليس لديك حساب؟ سجّل صالتك" : "Don't have an account? Register your gym"}
              </Text>
              <Feather name={lang === "ar" ? "arrow-left" : "arrow-right"} size={14} color={c.primary} />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
