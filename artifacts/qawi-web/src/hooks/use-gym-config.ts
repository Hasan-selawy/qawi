import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";
import { useAuth } from "@/hooks/use-auth";

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

export function useGymConfig(): GymConfig {
  const { isAuthenticated } = useAuth();
  const q = useQuery<GymConfig>({
    queryKey: ["me", "gym-config"],
    queryFn: () => apiFetch<GymConfig>("/me/gym-config"),
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });
  return q.data ?? FALLBACK;
}
