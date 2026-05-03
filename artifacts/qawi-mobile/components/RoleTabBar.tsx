import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export type TabIconName = React.ComponentProps<typeof Feather>["name"];

export function RoleTabBar({ state, descriptors, navigation }: any) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: c.surface,
        borderTopWidth: 1,
        borderTopColor: c.border,
        paddingBottom: bottomPad,
        paddingTop: 8,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const icon = (options as any).tabBarIcon?.({ focused, color: focused ? c.primary : c.mutedForeground, size: 22 });
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6 }}
          >
            {icon}
            <Text
              style={{
                color: focused ? c.primary : c.mutedForeground,
                fontSize: 11,
                fontWeight: focused ? "700" : "500",
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
