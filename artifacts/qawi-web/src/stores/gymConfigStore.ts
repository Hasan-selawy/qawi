import { create } from "zustand";

export type GymConfig = {
  gymId: string | null;
  gymName: string | null;
  features: {
    nutritionEnabled: boolean;
    pushNotificationsEnabled: boolean;
    customBrandingEnabled: boolean;
    classBookingEnabled: boolean;
    analyticsAdvancedEnabled: boolean;
    nutritionWorkflow: string;
  };
  branding: { logoUrl: string | null; primaryColor: string | null };
  limits: { maxMembers: number | null };
};

const FALLBACK: GymConfig = {
  gymId: null,
  gymName: null,
  features: {
    nutritionEnabled: true,
    pushNotificationsEnabled: true,
    customBrandingEnabled: false,
    classBookingEnabled: false,
    analyticsAdvancedEnabled: false,
    nutritionWorkflow: 'COACH_ONLY',
  },
  branding: { logoUrl: null, primaryColor: null },
  limits: { maxMembers: null },
};

interface GymConfigState {
  config: GymConfig;
  setConfig: (config: GymConfig) => void;
  features: GymConfig["features"];
  branding: GymConfig["branding"];
  gymName: string | null;
  isEnabled: (flag: keyof Omit<GymConfig["features"], "nutritionWorkflow">) => boolean;
}

export const useGymConfigStore = create<GymConfigState>((set, get) => ({
  config: FALLBACK,
  features: FALLBACK.features,
  branding: FALLBACK.branding,
  gymName: FALLBACK.gymName,
  setConfig: (config) =>
    set({
      config,
      features: config.features,
      branding: config.branding,
      gymName: config.gymName,
    }),
  isEnabled: (flag) => get().features[flag],
}));
