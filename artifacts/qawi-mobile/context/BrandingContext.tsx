import React, { createContext, useContext, useMemo } from "react";

import { useGymConfig } from "@/hooks/useGymConfig";
import colors from "@/constants/colors";

type BrandingColors = typeof colors.light & { radius: number };

type BrandingCtx = {
  colors: BrandingColors;
  primaryColor: string;
  logoUrl: string | null;
  gymName: string | null;
  customBrandingEnabled: boolean;
};

const Ctx = createContext<BrandingCtx | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const config = useGymConfig();

  const brandingColors: BrandingColors = useMemo(() => {
    const base = { ...colors.light, radius: colors.radius };
    const primary = config.features.customBrandingEnabled && config.branding.primaryColor
      ? config.branding.primaryColor
      : base.primary;
    return {
      ...base,
      primary,
      tint: primary,
      accent: primary,
      accentForeground: base.accentForeground,
    };
  }, [config.features.customBrandingEnabled, config.branding.primaryColor]);

  const value = useMemo<BrandingCtx>(
    () => ({
      colors: brandingColors,
      primaryColor: brandingColors.primary,
      logoUrl: config.features.customBrandingEnabled ? config.branding.logoUrl : null,
      gymName: config.gymName,
      customBrandingEnabled: config.features.customBrandingEnabled,
    }),
    [brandingColors, config]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBranding(): BrandingCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBranding must be used inside BrandingProvider");
  return ctx;
}
