"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/container";
import { LanguageSwitch } from "@/components/language-switch";
import { useLanguage } from "@/components/language-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AsciiGlitchRipple } from "@/components/ui/ascii-glitch-ripple";
import { SpotlightNavbar } from "@/components/ui/spotlight-navbar";

const sectionIds = ["about", "background", "skills", "now", "contact"] as const;

// Index of the section in the middle of the viewport, or -1 (e.g. in the hero).
function useActiveSection() {
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActive(sectionIds.findIndex((id) => visible.has(id)));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

export function Header() {
  const { t } = useLanguage();
  const active = useActiveSection();

  const navItems = sectionIds.map((id) => ({ label: t.nav[id], href: `#${id}` }));

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        {/* Logo: the domain name, scrambles in a ripple on hover. */}
        <AsciiGlitchRipple
          href="#top"
          aria-label="egliitis"
          dur={500}
          className="text-lg font-bold tracking-tight"
        >
          egliitis
        </AsciiGlitchRipple>
        <SpotlightNavbar
          items={navItems}
          activeIndex={active}
          label={t.a11y.mainNav}
          className="hidden md:block"
        />
        <div className="flex items-center gap-4">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
