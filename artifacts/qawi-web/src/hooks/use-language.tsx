import { ReactNode } from "react";
import { useLanguageStore } from "@/stores/languageStore";

export type Language = "en" | "ar";

export function LanguageProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useLanguage() {
  const lang = useLanguageStore((s) => s.lang);
  const setLang = useLanguageStore((s) => s.setLang);
  const t = useLanguageStore((s) => s.t);

  return { lang, setLang, t };
}
