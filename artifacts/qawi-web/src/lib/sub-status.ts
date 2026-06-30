import { differenceInDays, parseISO } from "date-fns";

/** Days of post-expiry grace access before a member is locked out. Mirrors the
 *  backend SubscriptionStatusUtil.GRACE_PERIOD_DAYS. */
export const GRACE_PERIOD_DAYS = 3;

export type SubStatus = "ACTIVE" | "EXPIRING" | "GRACE" | "EXPIRED";

export function getSubStatus(endDate?: string | null): SubStatus {
  if (!endDate) return "ACTIVE";
  const days = differenceInDays(parseISO(endDate), new Date());
  if (days < 0) return days >= -GRACE_PERIOD_DAYS ? "GRACE" : "EXPIRED";
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
