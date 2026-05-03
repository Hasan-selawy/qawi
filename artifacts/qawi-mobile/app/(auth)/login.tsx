import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Input, Screen } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const c = useColors();
  const { t, lang, setLang, isRTL } = useLanguage();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role === "SUPER_ADMIN") {
        Alert.alert("Qawi", t("auth.superNotAllowed"));
      }
    } catch (e: any) {
      Alert.alert("Qawi", t("auth.loginError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "flex-end", marginBottom: 24 }}>
            <Pressable
              onPress={() => setLang(lang === "en" ? "ar" : "en")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: c.surface,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Feather name="globe" size={14} color={c.foreground} />
              <Text style={{ color: c.foreground, fontWeight: "600" }}>{lang === "en" ? "العربية" : "English"}</Text>
            </Pressable>
          </View>

          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 22,
                backgroundColor: c.primary,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <Text style={{ color: "#0A0F1E", fontSize: 34, fontWeight: "900" }}>قوي</Text>
            </View>
            <Text style={{ color: c.foreground, fontSize: 28, fontWeight: "800", textAlign: "center" }}>
              {t("auth.title")}
            </Text>
            <Text style={{ color: c.mutedForeground, marginTop: 6, textAlign: "center" }}>{t("auth.subtitle")}</Text>
          </View>

          <View style={{ gap: 14 }}>
            <Input
              icon="mail"
              placeholder={t("common.email")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
            <Input
              icon="lock"
              placeholder={t("common.password")}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Button title={t("auth.loginButton")} onPress={onSubmit} loading={submitting} icon="log-in" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
