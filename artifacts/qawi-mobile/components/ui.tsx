import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderRadius: c.radius,
          padding: 16,
          borderWidth: 1,
          borderColor: c.border,
        },
        style as any,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  style?: ViewStyle;
}) {
  const c = useColors();
  const palette =
    variant === "primary"
      ? { bg: c.primary, fg: c.primaryForeground, border: c.primary }
      : variant === "danger"
      ? { bg: c.destructive, fg: c.destructiveForeground, border: c.destructive }
      : variant === "ghost"
      ? { bg: "transparent", fg: c.foreground, border: "transparent" }
      : { bg: c.secondary, fg: c.foreground, border: c.border };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: c.radius,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style as any,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={16} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontWeight: "700", fontFamily: "Inter_600SemiBold" }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { icon?: React.ComponentProps<typeof Feather>["name"] }) {
  const c = useColors();
  const { icon, style, ...rest } = props;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: c.surface,
        borderRadius: c.radius,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 14,
        height: 52,
        gap: 10,
      }}
    >
      {icon ? <Feather name={icon} size={16} color={c.mutedForeground} /> : null}
      <TextInput
        placeholderTextColor={c.mutedForeground}
        style={[{ color: c.foreground, flex: 1, fontFamily: "Inter_400Regular", fontSize: 15 }, style as any]}
        {...rest}
      />
    </View>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "primary";
}) {
  const c = useColors();
  const map: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: c.muted, fg: c.mutedForeground },
    success: { bg: "rgba(34,197,94,0.15)", fg: c.success },
    warning: { bg: "rgba(245,158,11,0.15)", fg: c.warning },
    danger: { bg: "rgba(239,68,68,0.15)", fg: c.destructive },
    primary: { bg: "rgba(34,197,94,0.15)", fg: c.primary },
  };
  const p = map[tone];
  return (
    <View style={{ backgroundColor: p.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ color: p.fg, fontSize: 11, fontWeight: "700" }}>{children}</Text>
    </View>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const c = useColors();
  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: c.primaryForeground, fontWeight: "700", fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[{ flex: 1, backgroundColor: c.background }, style as any]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ color: c.foreground, fontSize: 20, fontWeight: "700", marginBottom: 12 }}>{children}</Text>
  );
}

export function EmptyState({ icon = "inbox", text }: { icon?: React.ComponentProps<typeof Feather>["name"]; text: string }) {
  const c = useColors();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
      <Feather name={icon} size={28} color={c.mutedForeground} />
      <Text style={{ color: c.mutedForeground, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: 12 }} />;
}

export const styles = StyleSheet.create({});
