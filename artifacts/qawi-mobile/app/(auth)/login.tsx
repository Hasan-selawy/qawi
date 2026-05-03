import { Ionicons } from "@expo/vector-icons";
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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const C = {
  bg: "#0A0F1E",
  bgBottom: "#0A1A0A",
  primary: "#22C55E",
  primaryDark: "#16A34A",
  text: "#F8FAFC",
  muted: "#94A3B8",
  glassBg: "rgba(255,255,255,0.05)",
  glassBorder: "rgba(255,255,255,0.10)",
  divider: "rgba(255,255,255,0.30)",
};

function FloatingInput({
  label,
  value,
  onChangeText,
  iconName,
  secureTextEntry,
  keyboardType,
  rightSlot,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  rightSlot?: React.ReactNode;
}) {
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

  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [22, 8] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });

  return (
    <View
      style={[
        styles.input,
        { borderColor: focused ? C.primary : C.glassBorder },
      ]}
    >
      <Ionicons name={iconName} size={20} color={focused ? C.primary : C.muted} />
      <View style={styles.inputBody}>
        <Animated.Text
          style={[
            styles.inputLabel,
            { top: labelTop as any, fontSize: labelSize as any, color: focused ? C.primary : C.muted },
          ]}
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
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.inputField}
        />
      </View>
      {rightSlot}
    </View>
  );
}

function GlowingArabicLogo({ fontFamily }: { fontFamily: string }) {
  return (
    <Text
      allowFontScaling={false}
      style={[
        styles.logoText,
        {
          fontFamily,
          textShadowColor: "rgba(34,197,94,0.85)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 24,
        },
      ]}
    >
      قوي
    </Text>
  );
}

export default function LoginScreen() {
  const { t, lang, setLang } = useLanguage();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pressScale = useRef(new Animated.Value(1)).current;

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
  const arabicBold = "Cairo_700Bold";
  const englishMedium = "Inter_500Medium";
  const englishBold = "Inter_700Bold";

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[C.bg, "#0A1814", C.bgBottom]}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Soft ambient green halo behind logo (layered for diffuse falloff) */}
      <View style={[styles.glow1, { top: insets.top + 40 }]} />
      <View style={[styles.glow2, { top: insets.top + 90 }]} />
      <View style={[styles.glow3, { top: insets.top + 140 }]} />
      <View style={[styles.glow4, { top: insets.top + 180 }]} />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top right language pill */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => setLang(lang === "en" ? "ar" : "en")}
              style={({ pressed }) => [styles.langPill, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="globe-outline" size={14} color={C.muted} />
              <Text style={[styles.langText, { fontFamily: englishBold }]}>{lang === "en" ? "EN" : "AR"}</Text>
              <Text style={styles.langDivider}>|</Text>
              <Text style={[styles.langText, { color: C.muted, fontFamily: arabicBold }]}>
                {lang === "en" ? "عر" : "EN"}
              </Text>
            </Pressable>
          </View>

          {/* Logo block */}
          <View style={styles.logoBlock}>
            <GlowingArabicLogo fontFamily={arabicFont} />
            <Text style={[styles.brand, { fontFamily: englishBold }]}>QAWI</Text>
            <View style={styles.divider} />
            <Text
              style={[
                styles.tagline,
                { fontFamily: lang === "ar" ? arabicBold : englishMedium },
              ]}
            >
              {tagline}
            </Text>
          </View>

          {/* Inputs */}
          <View style={styles.inputs}>
            <FloatingInput
              label={t("common.email")}
              value={email}
              onChangeText={setEmail}
              iconName="mail-outline"
              keyboardType="email-address"
            />
            <FloatingInput
              label={t("common.password")}
              value={password}
              onChangeText={setPassword}
              iconName="lock-closed-outline"
              secureTextEntry={!showPwd}
              rightSlot={
                <Pressable hitSlop={10} onPress={() => setShowPwd((s) => !s)}>
                  <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.muted} />
                </Pressable>
              }
            />
          </View>

          {/* Sign in button */}
          <Animated.View style={[styles.signinWrap, { transform: [{ scale: pressScale }] }]}>
            <Pressable
              onPressIn={() => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start()}
              onPress={onSubmit}
              disabled={submitting}
              style={styles.signin}
            >
              <LinearGradient
                colors={submitting ? [C.primaryDark, "#15803D"] : [C.primary, C.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signinGradient}
              >
                <Text
                  style={[
                    styles.signinText,
                    { fontFamily: lang === "ar" ? arabicBold : englishBold },
                  ]}
                >
                  {submitting ? "..." : t("auth.loginButton")}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Bottom register prompt */}
          <View style={styles.spacer} />
          <View style={styles.registerRow}>
            <Pressable hitSlop={10} style={styles.registerInner}>
              <Text
                style={[
                  styles.registerText,
                  { fontFamily: lang === "ar" ? arabicBold : englishMedium },
                ]}
              >
                {lang === "ar" ? "ليس لديك حساب؟ سجّل صالتك" : "Don't have an account? Register your gym"}
              </Text>
              <Ionicons
                name={lang === "ar" ? "arrow-back" : "arrow-forward"}
                size={14}
                color={C.primary}
              />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  kav: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28 },
  topRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 60 },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.glassBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  langText: { color: C.text, fontSize: 12, letterSpacing: 1 },
  langDivider: { color: C.divider, fontSize: 12 },
  glow1: {
    position: "absolute",
    left: "50%",
    marginLeft: -210,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(34,197,94,0.04)",
    pointerEvents: "none",
  },
  glow2: {
    position: "absolute",
    left: "50%",
    marginLeft: -160,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(34,197,94,0.05)",
    pointerEvents: "none",
  },
  glow3: {
    position: "absolute",
    left: "50%",
    marginLeft: -110,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(34,197,94,0.06)",
    pointerEvents: "none",
  },
  glow4: {
    position: "absolute",
    left: "50%",
    marginLeft: -70,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(34,197,94,0.07)",
    pointerEvents: "none",
  },
  logoBlock: { alignItems: "center", marginBottom: 48 },
  logoText: {
    fontSize: 100,
    lineHeight: 120,
    color: C.primary,
    textAlign: "center",
    includeFontPadding: false,
  },
  brand: { color: C.text, fontSize: 18, letterSpacing: 8, marginTop: 6, marginLeft: 8 },
  divider: { width: 60, height: 2, backgroundColor: C.primary, marginTop: 18, marginBottom: 14, borderRadius: 1 },
  tagline: { color: C.muted, fontSize: 13, letterSpacing: 0.4 },
  inputs: { gap: 14 },
  input: {
    height: 64,
    borderRadius: 12,
    backgroundColor: C.glassBg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },
  inputBody: { flex: 1, height: "100%", justifyContent: "center" },
  inputLabel: { position: "absolute", fontFamily: "Inter_500Medium", letterSpacing: 0.2 },
  inputField: {
    color: C.text,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    paddingTop: 18,
    paddingBottom: 0,
    height: "100%",
  },
  signinWrap: { marginTop: 28 },
  signin: { borderRadius: 14, overflow: "hidden", height: 56 },
  signinGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  signinText: { color: "#FFFFFF", fontSize: 16, letterSpacing: 0.5 },
  spacer: { flex: 1, minHeight: 20 },
  registerRow: { alignItems: "center", marginTop: 40 },
  registerInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  registerText: { color: C.muted, fontSize: 13 },
});
