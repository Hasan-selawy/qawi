import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { useGymConfigStore, type GymConfig } from "@/stores/gymConfigStore";

export type { GymConfig };

export function useGymConfig(): GymConfig {
  const token = useAuthStore((s) => s.token);
  const setConfig = useGymConfigStore((s) => s.setConfig);

  const { data } = useQuery<GymConfig>({
    queryKey: ["me", "gym-config"],
    queryFn: () => apiFetch<GymConfig>("/me/gym-config"),
    enabled: !!token,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setConfig(data);
    }
  }, [data, setConfig]);

  return useGymConfigStore((s) => s.config);
}
