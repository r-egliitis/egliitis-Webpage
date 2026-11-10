"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { WaveGridBackground } from "@/components/ui/wave-grid-background";

function useMediaQuery(query: string, serverValue: boolean) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

const emptySubscribe = () => () => {};

// Colours mirror --surface / --wave-base / --wave-high in globals.css.
const palette = {
  dark: { background: "#2e2c2b", base: "#232120", high: "#f0eee9" },
  light: { background: "#f0eee9", base: "#e2dfd8", high: "#2e2c2b" },
};

// A strip of the interactive wave grid under the hero text. Nothing sits on
// top of it, so it never hides content. Edges fade into the page.
export function HeroWaves() {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)", false);
  const small = useMediaQuery("(max-width: 640px)", false);

  const colors = palette[resolvedTheme === "light" ? "light" : "dark"];

  return (
    <div
      aria-hidden
      className="h-[240px] w-full sm:h-[380px]"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent), linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    >
      {mounted && (
        <WaveGridBackground
          key={small ? "small" : "large"}
          gridSize={small ? 24 : 40}
          background={colors.background}
          colorBase={colors.base}
          colorHigh={colors.high}
          autoAnimate={!reducedMotion}
          vignette={false}
        />
      )}
    </div>
  );
}
