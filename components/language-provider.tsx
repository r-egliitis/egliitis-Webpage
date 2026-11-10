"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { en, type Dictionary } from "@/content/en";
import { lv } from "@/content/lv";

export type Language = "en" | "lv";

const STORAGE_KEY = "language";
const dictionaries: Record<Language, Dictionary> = { en, lv };

// The choice lives in memory as well as localStorage, so switching still works
// when storage is blocked.
let current: Language | null = null;
const listeners = new Set<() => void>();

function readStoredLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "lv" ? "lv" : "en";
  } catch {
    return "en";
  }
}

function getSnapshot(): Language {
  current ??= readStoredLanguage();
  return current;
}

function getServerSnapshot(): Language {
  return "en";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setLanguage(language: Language) {
  current = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage is unavailable, so the choice only lasts until the page reloads.
  }
  listeners.forEach((listener) => listener());
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Dictionary;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = dictionaries[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {/* React moves these into <head>. They live here, not in Next's metadata
          export, because Next would overwrite the title with the static one. */}
      <title>{t.meta.title}</title>
      <meta name="description" content={t.meta.description} />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
