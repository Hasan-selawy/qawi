import { Feather } from "@expo/vector-icons";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tone = "success" | "error" | "info";
type ToastApi = { show: (msg: string, tone?: Tone) => void };

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string>("");
  const [tone, setTone] = useState<Tone>("info");
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((m: string, t: Tone = "info") => {
    setMsg(m);
    setTone(t);
    if (timer.current) clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 220, useNativeDriver: true }),
      ]).start(() => setMsg(""));
    }, 3000);
  }, [opacity, translateY]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const palette =
    tone === "success" ? { bg: "#16A34A", icon: "check-circle" as const }
    : tone === "error" ? { bg: "#DC2626", icon: "alert-circle" as const }
    : { bg: "#1F2937", icon: "info" as const };

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {msg ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 16,
            right: 16,
            opacity,
            transform: [{ translateY }],
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: palette.bg,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Feather name={palette.icon} size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", flex: 1 }}>{msg}</Text>
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) return { show: () => {} } as ToastApi;
  return v;
}
