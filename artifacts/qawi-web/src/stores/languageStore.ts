import { create } from "zustand";
import { persist } from "zustand/middleware";
import en from "../locales/en.json";
import ar from "../locales/ar.json";

type Language = "en" | "ar";

interface LanguageState {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (path: string) => string;
}

const storage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      if (str === "en" || str === "ar") {
        return { state: { lang: str }, version: 0 };
      }
      return null;
    }
  },
  setItem: (name: string, value: any) => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      lang: "en",
      setLang: (lang) => {
        set({ lang });
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        document.documentElement.lang = lang;
      },
      t: (path: string) => {
        const keys = path.split(".");
        let current: any = get().lang === "ar" ? ar : en;
        for (const key of keys) {
          if (current[key] === undefined) {
            return path;
          }
          current = current[key];
        }
        return current as string;
      },
    }),
    {
      name: "qawi_lang",
      storage,
      partialize: (state) => ({ lang: state.lang }),
    }
  )
);
