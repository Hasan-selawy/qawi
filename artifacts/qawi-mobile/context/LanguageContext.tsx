import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { I18nManager } from "react-native";

import en from "@/locales/en.json";
import ar from "@/locales/ar.json";

export type Lang = "en" | "ar";
const KEY = "qawi_lang";
const dicts: Record<Lang, any> = { en, ar };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  t: (key: string) => string;
  isRTL: boolean;
};

const LangCtx = createContext<Ctx | null>(null);

function lookup(dict: any, key: string): string {
  const parts = key.split(".");
  let cur: any = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    (async () => {
      const saved = (await AsyncStorage.getItem(KEY)) as Lang | null;
      if (saved === "en" || saved === "ar") setLangState(saved);
    })();
  }, []);

  const setLang = useCallback(async (l: Lang) => {
    await AsyncStorage.setItem(KEY, l);
    setLangState(l);
    // Note: full RTL flip requires app restart; we visually mirror per-screen using flexDirection.
    try { I18nManager.allowRTL(l === "ar"); } catch { /* ignore */ }
  }, []);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    isRTL: lang === "ar",
    t: (k: string) => lookup(dicts[lang], k),
  }), [lang, setLang]);

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLanguage must be inside LanguageProvider");
  return ctx;
}

export function pickName(lang: Lang, obj: any): string {
  if (!obj) return "";
  if (lang === "ar") return obj.nameAr || obj.descriptionAr || obj.name || obj.description || "";
  return obj.name || obj.description || obj.nameAr || obj.descriptionAr || "";
}
