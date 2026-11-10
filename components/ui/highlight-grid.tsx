"use client";

// Adapted from VengeanceUI "highlight-grid":
// - one row per category, the category name as a quiet first cell
// - cells wrap on small screens instead of a fixed 760px-wide grid
// - the highlight is a theme-aware glow (white in dark, ink in light)
// - cells are real lists, the sliding highlight is decorative (aria-hidden)

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface HighlightRow {
  label: string;
  items: string[];
}

export interface HighlightGridProps {
  rows: HighlightRow[];
  /** Highlight transition duration in ms. */
  transitionDuration?: number;
  className?: string;
}

export function HighlightGrid({
  rows,
  transitionDuration = 250,
  className,
}: HighlightGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());
  const activeRef = useRef<string | null>(null);
  const [active, setActive] = useState<string>(
    rows[0]?.items[0] ? `0-0` : "",
  );

  const moveTo = useCallback((key: string, instant = false) => {
    const grid = gridRef.current;
    const highlight = highlightRef.current;
    const el = cellRefs.current.get(key);
    if (!grid || !highlight || !el) return;

    const rect = el.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    if (instant) highlight.style.transitionDuration = "0s";
    highlight.style.opacity = "1";
    highlight.style.transform = `translate(${rect.left - gridRect.left}px, ${rect.top - gridRect.top}px)`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
    activeRef.current = key;
    if (instant) {
      requestAnimationFrame(() => {
        highlight.style.transitionDuration = `${transitionDuration}ms`;
      });
    }
  }, [transitionDuration]);

  // Park on the first cell, and keep the highlight aligned when the layout
  // changes (resize, wrapping, or a language switch changing cell widths).
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const realign = () => moveTo(activeRef.current ?? "0-0", true);
    const raf = requestAnimationFrame(realign);
    const observer = new ResizeObserver(realign);
    observer.observe(grid);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [rows, moveTo]);

  return (
    <div ref={gridRef} className={cn("relative w-full border-l border-t border-line", className)}>
      <div
        ref={highlightRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-0 bg-fg opacity-0"
        style={{
          boxShadow: "0 0 28px 2px var(--glow), 0 0 80px 8px var(--glow-soft)",
          transitionProperty: "transform, width, height, opacity",
          transitionDuration: `${transitionDuration}ms`,
          transitionTimingFunction: "ease",
        }}
      />

      {rows.map((row, r) => (
        <div key={row.label} className="flex flex-col sm:flex-row">
          <h3 className="relative z-[1] flex shrink-0 items-center border-b border-r border-line px-4 py-3 font-mono text-xs text-muted sm:w-40">
            {row.label}
          </h3>
          <ul className="flex flex-1 flex-wrap">
            {row.items.map((item, c) => {
              const key = `${r}-${c}`;
              const isActive = active === key;
              return (
                <li
                  key={item}
                  ref={(el) => {
                    if (el) cellRefs.current.set(key, el);
                    else cellRefs.current.delete(key);
                  }}
                  onMouseEnter={() => {
                    setActive(key);
                    moveTo(key);
                  }}
                  className="flex flex-auto items-center justify-center border-b border-r border-line px-4 py-4 text-center"
                >
                  <span
                    className={cn(
                      "relative z-[2] select-none whitespace-nowrap font-mono text-[13px] uppercase transition-colors duration-200",
                      isActive ? "text-surface" : "text-muted",
                    )}
                  >
                    ( {item} )
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
