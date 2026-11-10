"use client";

import { useLanguage, type Language } from "@/components/language-provider";

const languages: Language[] = ["en", "lv"];

export function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t.a11y.languageSwitch}
      className="flex items-center gap-1 font-mono text-xs"
    >
      {languages.map((option, index) => (
        <span key={option} className="flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden className="text-muted">
              |
            </span>
          )}
          <button
            type="button"
            lang={option}
            aria-pressed={language === option}
            onClick={() => setLanguage(option)}
            className={`px-1 py-1 transition-colors hover:text-fg ${
              language === option
                ? "font-bold text-fg underline decoration-accent decoration-2 underline-offset-4"
                : "text-muted"
            }`}
          >
            {option.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
