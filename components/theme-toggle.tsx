"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "motion/react";
import { useLanguage } from "@/components/language-provider";
import { MoonIcon, SunIcon } from "@/components/ui/icons";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLanguage();
  // Avoids a hydration mismatch: the server doesn't know the stored theme,
  // so we only trust `resolvedTheme` once the client has mounted.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <motion.button
      type="button"
      aria-label={t.a11y.themeToggle}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      whileTap={{ scale: 0.9 }}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-fg transition-colors hover:border-fg"
    >
      <AnimatePresence mode="wait" initial={false}>
        {mounted && (
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {isDark ? <MoonIcon /> : <SunIcon />}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
