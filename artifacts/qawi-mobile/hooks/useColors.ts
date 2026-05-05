import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useGymConfig } from "@/hooks/useGymConfig";

/**
 * Returns design tokens for the current color scheme, with gym custom
 * branding primary color applied when the feature is enabled.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette =
    scheme === "dark" && "dark" in colors
      ? (colors as any).dark
      : colors.light;

  const config = useGymConfig();
  const customPrimary =
    config.features.customBrandingEnabled && config.branding.primaryColor
      ? config.branding.primaryColor
      : null;

  if (customPrimary) {
    return {
      ...palette,
      radius: colors.radius,
      primary: customPrimary,
      tint: customPrimary,
      accent: customPrimary,
    };
  }

  return { ...palette, radius: colors.radius };
}
