export type Lang = "en" | "ar";

export function pickName(
  lang: Lang,
  obj: { name?: string | null; nameAr?: string | null; customName?: string | null; customNameAr?: string | null } | null | undefined,
): string {
  if (!obj) return "";
  const en = obj.name ?? obj.customName ?? "";
  const ar = obj.nameAr ?? obj.customNameAr ?? "";
  if (lang === "ar") return ar || en;
  return en || ar;
}

export function pickText(
  lang: Lang,
  en?: string | null,
  ar?: string | null,
): string {
  if (lang === "ar") return ar || en || "";
  return en || ar || "";
}
