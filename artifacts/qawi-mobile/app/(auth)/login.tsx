import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
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

function FloatingInput({ label, value, onChangeText, iconName, secureTextEntry, keyboardType, rightSlot }: { label: string; value: string; onChangeText: (v: string) => void; iconName: React.ComponentProps<typeof Ionicons>["name"]; secureTextEntry?: boolean; keyboardType?: "default" | "email-address" | "phone-pad"; rightSlot?: React.ReactNode; }) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => { Animated.timing(anim, { toValue: focused || value ? 1 : 0, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: false }).start(); }, [focused, value, anim]);
  const labelTop = anim.interpolate({ inputRange: [0, 1], outputRange: [22, 8] });
  const labelSize = anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  return (<View style={[styles.input, { borderColor: focused ? C.primary : C.glassBorder }]}><Ionicons name={iconName} size={20} color={focused ? C.primary : C.muted} /><View style={styles.inputBody}><Animated.Text allowFontScaling={false} style={[styles.inputLabel, { top: labelTop as any, fontSize: labelSize as any, color: focused ? C.primary : C.muted }]}>{label}</Animated.Text><TextInput value={value} onChangeText={onChangeText} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} allowFontScaling={false} style={styles.inputField} /></View>{rightSlot}</View>);
}

function GlowingArabicLogo({ fontFamily, label }: { fontFamily: string; label: string }) { return (<View style={styles.logoWrap}><View style={styles.logoGlow1} /><View style={styles.logoGlow2} /><View style={styles.logoGlow3} /><Text allowFontScaling={false} style={[styles.logoText, { fontFamily, fontWeight: "700" }]}>{label}</Text></View>); }

function ContactSheet({ visible, onClose, lang }: { visible: boolean; onClose: () => void; lang: string }) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gymName, setGymName] = useState("");
  const [city, setCity] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => { if (!visible) { setTimeout(() => setSubmitted(false), 250); } }, [visible]);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/public/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName, phoneNumber, gymName, city }) });
      if (!res.ok) throw new Error('Failed');
      setSubmitted(true);
      setTimeout(() => { onClose(); setSubmitted(false); setFullName(''); setPhoneNumber(''); setGymName(''); setCity(''); }, 3000);
    } catch {
      Alert.alert('Qawi', lang === 'ar' ? 'حدث خطأ' : 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.sheetBackdrop}><Pressable style={StyleSheet.absoluteFillObject as any} onPress={onClose} /><View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>{submitted ? <View style={styles.sheetSuccess}><View style={styles.check}><Ionicons name="checkmark" size={34} color={C.primary} /></View><Text style={styles.sheetTitle}>{lang === 'ar' ? 'شكراً! سنتصل بك قريباً 📞' : 'Thank you! We will call you soon 📞'}</Text></View> : <><Text style={styles.sheetHeading}>{lang === 'ar' ? 'سجّل صالتك' : 'Register Your Gym'}</Text><Text style={styles.sheetSub}>{lang === 'ar' ? 'أدخل بياناتك وسنتصل بك خلال 24 ساعة' : "Fill in your details and we'll contact you within 24 hours"}</Text><View style={styles.sheetForm}><FloatingInput label={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} value={fullName} onChangeText={setFullName} iconName="person-outline" /><FloatingInput label={lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'} value={phoneNumber} onChangeText={setPhoneNumber} iconName="call-outline" keyboardType="phone-pad" /><FloatingInput label={lang === 'ar' ? 'اسم الصالة' : 'Gym Name'} value={gymName} onChangeText={setGymName} iconName="business-outline" /><FloatingInput label={lang === 'ar' ? 'المدينة' : 'City'} value={city} onChangeText={setCity} iconName="location-outline" /><Pressable onPress={submit} disabled={loading} style={styles.sendButton}><LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sendGradient}><Text style={styles.sendText}>{loading ? '...' : (lang === 'ar' ? 'إرسال الطلب' : 'Send Request')}</Text></LinearGradient></Pressable></View></>}</View></View></Modal>);
}

export default function LoginScreen() {
  const { t, lang, setLang } = useLanguage();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const pressScale = useRef(new Animated.Value(1)).current;
  const onSubmit = async () => { if (!email || !password) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); setSubmitting(true); try { const u = await login(email.trim(), password); if (u.role === "SUPER_ADMIN") Alert.alert("قوي", t("auth.superNotAllowed")); } catch (e: any) { let msg = t("auth.loginError"); if (e?.status === 401 || e?.status === 403) { msg = t("auth.loginError"); } else if (typeof e?.status === "number") { msg = `Server error ${e.status}: ${e?.body?.error || e?.message || "Unknown"}`; } else { msg = `Network error: ${e?.message || "Cannot reach server"}`; } Alert.alert("قوي", msg); } finally { setSubmitting(false); } };
  const tagline = lang === "ar" ? "تدرب بذكاء. كن أقوى." : "Train Smarter. Get Stronger.";
  const arabicFont = "Cairo_900Black";
  const arabicBold = "Cairo_700Bold";
  const englishMedium = "Inter_500Medium";
  const englishBold = "Inter_700Bold";
  return (<View style={styles.root}><LinearGradient colors={["#0A0F1E", "#0A1A0A"]} style={StyleSheet.absoluteFillObject} /><KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><View style={styles.topRow}><Pressable onPress={() => setLang(lang === "en" ? "ar" : "en")} style={({ pressed }) => [styles.langPill, { opacity: pressed ? 0.7 : 1 }]}><Ionicons name="globe-outline" size={14} color={C.muted} /><Text style={[styles.langText, { fontFamily: englishBold }]}>{lang === "en" ? "EN" : "AR"}</Text><Text style={styles.langDivider}>|</Text><Text style={[styles.langText, { color: C.muted, fontFamily: arabicBold }]}>{lang === "en" ? "عر" : "EN"}</Text></Pressable></View><View style={styles.logoBlock}><GlowingArabicLogo fontFamily={arabicFont} label="قوي" /><Text allowFontScaling={false} style={[styles.brand, { fontFamily: englishBold, letterSpacing: 6 }]}>QAWI</Text><View style={styles.divider} /><Text style={[styles.tagline, { fontFamily: lang === "ar" ? arabicBold : englishMedium }]}>{tagline}</Text></View><View style={styles.inputs}><FloatingInput label={t("common.email")} value={email} onChangeText={setEmail} iconName="mail-outline" keyboardType="email-address" /><FloatingInput label={t("common.password")} value={password} onChangeText={setPassword} iconName="lock-closed-outline" secureTextEntry={!showPwd} rightSlot={<Pressable hitSlop={10} onPress={() => setShowPwd((s) => !s)}><Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color={C.muted} /></Pressable>} /></View><Animated.View style={[styles.signinWrap, { transform: [{ scale: pressScale }] }]}><Pressable onPressIn={() => Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start()} onPress={onSubmit} disabled={submitting} style={styles.signin}><LinearGradient colors={submitting ? [C.primaryDark, "#15803D"] : [C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.signinGradient}><Text style={[styles.signinText, { fontFamily: lang === "ar" ? arabicBold : englishBold }]}>{submitting ? "..." : t("auth.loginButton")}</Text></LinearGradient></Pressable></Animated.View><View style={styles.spacer} /><View style={styles.registerRow}><Pressable hitSlop={10} style={styles.registerInner} onPress={() => setContactOpen(true)}><Text style={[styles.registerText, { fontFamily: lang === "ar" ? arabicBold : englishMedium }]}>{lang === "ar" ? "ليس لديك حساب؟ سجّل صالتك" : "Don't have an account? Register your gym"}</Text><Ionicons name={lang === "ar" ? "arrow-back" : "arrow-forward"} size={14} color={C.primary} /></Pressable></View></ScrollView></KeyboardAvoidingView><ContactSheet visible={contactOpen} onClose={() => setContactOpen(false)} lang={lang} /></View>);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  kav: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 28 },
  topRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 60 },
  langPill: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.glassBorder, backgroundColor: "rgba(255,255,255,0.04)" },
  langText: { color: C.text, fontSize: 12, letterSpacing: 1 },
  langDivider: { color: C.divider, fontSize: 12 },
  logoBlock: { alignItems: "center", marginBottom: 48 },
  logoWrap: { width: 280, height: 140, alignItems: "center", justifyContent: "center" },
  logoGlow1: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(34,197,94,0.07)" },
  logoGlow2: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(34,197,94,0.05)" },
  logoGlow3: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(34,197,94,0.04)" },
  logoText: { fontSize: 100, lineHeight: 120, color: C.primary, textAlign: "center", includeFontPadding: false },
  brand: { color: C.text, fontSize: 18, letterSpacing: 8, marginTop: 6, marginLeft: 8 },
  divider: { width: 60, height: 2, backgroundColor: C.primary, marginTop: 18, marginBottom: 14, borderRadius: 1 },
  tagline: { color: C.muted, fontSize: 13, letterSpacing: 0.4 },
  inputs: { gap: 14 },
  input: { height: 64, borderRadius: 12, backgroundColor: C.glassBg, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12 },
  inputBody: { flex: 1, height: "100%", justifyContent: "center" },
  inputLabel: { position: "absolute", fontFamily: "Inter_500Medium", letterSpacing: 0.2 },
  inputField: { color: C.text, fontFamily: "Inter_500Medium", fontSize: 15, paddingTop: 18, paddingBottom: 0, height: "100%" },
  signinWrap: { marginTop: 28 },
  signin: { borderRadius: 14, overflow: "hidden", height: 56 },
  signinGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  signinText: { color: "#FFFFFF", fontSize: 16, letterSpacing: 0.5 },
  spacer: { flex: 1, minHeight: 20 },
  registerRow: { alignItems: "center", marginTop: 40 },
  registerInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  registerText: { color: C.muted, fontSize: 13 },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: "#0E1424", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 14 },
  sheetHeading: { color: C.text, fontSize: 22, fontWeight: "700", marginBottom: 6 },
  sheetSub: { color: C.muted, fontSize: 13, marginBottom: 16 },
  sheetForm: { gap: 12 },
  sendButton: { borderRadius: 14, overflow: "hidden", height: 54, marginTop: 8 },
  sendGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  sendText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sheetSuccess: { alignItems: "center", justifyContent: "center", paddingVertical: 26 },
  check: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(34,197,94,0.12)", marginBottom: 14 },
  sheetTitle: { color: C.text, fontSize: 18, fontWeight: "700", textAlign: "center" },
});
