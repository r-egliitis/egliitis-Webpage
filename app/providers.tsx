"use client";

import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/components/language-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["light", "dark"]}
      disableTransitionOnChange
    >
      <LanguageProvider>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LanguageProvider>
    </ThemeProvider>
  );
}
