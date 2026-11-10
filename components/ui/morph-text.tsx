"use client";

// Adapted from VengeanceUI "morph-text":
// - no Google Fonts @import: it inherits the site font
// - fills its container width instead of a fixed 14ch minimum, so long
//   Latvian words fit on phones
// - decorative (aria-hidden); the caller renders the real heading text
// - with reduced motion, a static line replaces the morph (see globals.css)

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface MorphTextProps {
  words: string[];
  /** Static text shown instead of the morph when motion is reduced. */
  staticText: string;
  /** Duration (ms) each word is shown. */
  interval?: number;
  fontSize?: string;
  className?: string;
}

export function MorphText({
  words,
  staticText,
  interval = 1000,
  // 16vw keeps the longest word ("Tehnoloģijas", ~4.6em wide) inside a phone screen.
  fontSize = "clamp(2.75rem, 16vw, 7.5rem)",
  className,
}: MorphTextProps) {
  // Unique ID so multiple instances don't share filter IDs.
  const filterId = `morph-threshold-${useId().replace(/:/g, "")}`;
  const wordDuration = interval / 1000;
  const totalDuration = wordDuration * words.length;

  return (
    <div aria-hidden className={cn("relative flex w-full flex-col items-center", className)}>
      <svg
        focusable="false"
        style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
      >
        <defs>
          <filter id={filterId}>
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div
        className="relative w-full select-none font-bold tracking-tight"
        style={{ fontSize, filter: `url(#${filterId})` }}
      >
        <div className="morph-word-rotator relative flex w-full items-center justify-center" style={{ height: "1.2em" }}>
          {words.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="absolute"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                opacity: 0,
                whiteSpace: "nowrap",
                animationName: "morph-word-rotate",
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
                animationFillMode: "both",
                animationDelay: `${i * wordDuration}s`,
                animationDuration: `${totalDuration}s`,
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      <p className="morph-static text-center text-[clamp(2rem,6vw,4.5rem)] font-bold leading-tight tracking-tight">
        {staticText}
      </p>

      <style>{`
        @keyframes morph-word-rotate {
          0% {
            opacity: 0;
            filter: blur(20px);
            transform: translate(-50%, -50%) scale(0.8);
          }
          5% {
            opacity: 0.5;
            filter: blur(10px);
          }
          15%, 35% {
            opacity: 1;
            filter: blur(0px);
            transform: translate(-50%, -50%) scale(1);
          }
          45% {
            opacity: 0.5;
            filter: blur(10px);
          }
          50%, 100% {
            opacity: 0;
            filter: blur(20px);
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
      `}</style>
    </div>
  );
}
