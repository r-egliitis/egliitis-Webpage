"use client";

import { Container } from "@/components/container";
import { HeroWaves } from "@/components/hero-waves";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { MorphText } from "@/components/ui/morph-text";

export function Hero() {
  const { t } = useLanguage();
  const fields = t.hero.headline.split(" × ");

  return (
    <section id="top" className="pt-16 sm:pt-24">
      {/* Read in order of importance: who (name), backed by credentials,
          then what (title), why (subline), and finally the action (buttons). */}
      <Container className="flex flex-col items-center text-center">
        <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.hero.name}</p>
        <div className="mt-3 flex max-w-[52ch] flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-xs leading-relaxed text-muted">
          <span>{t.hero.label}</span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            {t.hero.location}
          </span>
        </div>

        {/* The morph is decorative; this is the heading screen readers get. */}
        <h1 className="sr-only">{t.hero.headline}</h1>
        <MorphText words={fields} staticText={t.hero.headline} className="mt-8 sm:mt-10" />

        <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-muted sm:text-xl">
          {t.hero.subline}
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-3 sm:mt-14">
          <Button href="#contact">{t.hero.primaryButton}</Button>
          <Button href="#about" variant="secondary">
            {t.hero.secondaryButton}
          </Button>
        </div>
      </Container>

      {/* TODO: add /public/photo.jpg somewhere in the hero when it's ready. */}
      <div className="mt-12 sm:mt-16">
        <HeroWaves />
      </div>
    </section>
  );
}
