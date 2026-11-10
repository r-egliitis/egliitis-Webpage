"use client";

// Adapted from VengeanceUI "spotlight-navbar":
// - uses motion/react (same library as framer-motion, already installed)
// - links scroll to their sections (no preventDefault)
// - the active item is controlled by the parent (scroll position); -1 = none
// - glow colours come from CSS variables in globals.css (.spotlight-nav)

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
}

export interface SpotlightNavbarProps {
  items: NavItem[];
  activeIndex: number;
  label?: string;
  className?: string;
  onItemClick?: (item: NavItem, index: number) => void;
}

export function SpotlightNavbar({
  items,
  activeIndex,
  label,
  className,
  onItemClick,
}: SpotlightNavbarProps) {
  const navRef = useRef<HTMLElement>(null);
  const [hovering, setHovering] = useState(false);

  // Current "light" positions, animated imperatively.
  const spotlightX = useRef(0);
  const ambienceX = useRef(0);

  // The spotlight follows the cursor and springs back to the active item.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - nav.getBoundingClientRect().left;
      setHovering(true);
      spotlightX.current = x;
      nav.style.setProperty("--spotlight-x", `${x}px`);
    };

    const handleMouseLeave = () => {
      setHovering(false);
      const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
      if (!activeItem) return;
      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const targetX = itemRect.left - navRect.left + itemRect.width / 2;
      animate(spotlightX.current, targetX, {
        type: "spring",
        stiffness: 200,
        damping: 20,
        onUpdate: (v) => {
          spotlightX.current = v;
          nav.style.setProperty("--spotlight-x", `${v}px`);
        },
      });
    };

    nav.addEventListener("mousemove", handleMouseMove);
    nav.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      nav.removeEventListener("mousemove", handleMouseMove);
      nav.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeIndex]);

  // The ambience line under the active item glides to it when it changes.
  // Labels change width when the language switches, so re-measure then too.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
    if (!activeItem) return;
    const navRect = nav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const targetX = itemRect.left - navRect.left + itemRect.width / 2;
    const controls = animate(ambienceX.current, targetX, {
      type: "spring",
      stiffness: 200,
      damping: 20,
      onUpdate: (v) => {
        ambienceX.current = v;
        nav.style.setProperty("--ambience-x", `${v}px`);
      },
    });
    return () => controls.stop();
  }, [activeIndex, items]);

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={cn(
        "spotlight-nav spotlight-nav-bg glass-border spotlight-nav-shadow",
        "relative h-11 overflow-hidden rounded-full",
        className,
      )}
    >
      <ul className="relative z-10 flex h-full items-center gap-0 px-2">
        {items.map((item, idx) => (
          <li key={item.href} className="relative flex h-full items-center justify-center">
            <a
              href={item.href}
              data-index={idx}
              aria-current={activeIndex === idx ? "location" : undefined}
              onClick={() => onItemClick?.(item, idx)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200",
                activeIndex === idx ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      {/* 1. Spotlight that follows the cursor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300"
        style={{
          opacity: hovering ? 1 : 0,
          background:
            "radial-gradient(120px circle at var(--spotlight-x) 100%, var(--spotlight-color) 0%, transparent 50%)",
        }}
      />

      {/* 2. Glow line under the active item */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 z-[2] h-[2px] w-full transition-opacity duration-300"
        style={{
          opacity: activeIndex >= 0 ? 1 : 0,
          background:
            "radial-gradient(60px circle at var(--ambience-x) 0%, var(--ambience-color) 0%, transparent 100%)",
        }}
      />
    </nav>
  );
}
