import { differenceInDays, parseISO } from "date-fns";

export type SubStatus = "ACTIVE" | "EXPIRING" | "EXPIRED";

export function getSubStatus(endDate?: string | null): SubStatus {
  if (!endDate) return "ACTIVE";
  const days = differenceInDays(parseISO(endDate), new Date());
  if (days < 0) return "EXPIRED";
  if (days <= 7) return "EXPIRING";
  return "ACTIVE";
}

export function getDaysRemaining(endDate?: string | null): number {
  if (!endDate) return 0;
  return differenceInDays(parseISO(endDate), new Date());
}

export function getDaysSince(dateIso?: string | null): number | null {
  if (!dateIso) return null;
  return differenceInDays(new Date(), parseISO(dateIso));
}
