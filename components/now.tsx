"use client";

import { useLanguage } from "@/components/language-provider";
import { Section } from "@/components/section";
import { mailto } from "@/content/links";

export function Now() {
  const { t } = useLanguage();

  return (
    <Section id="now" heading={t.now.heading}>
      {/* Always a dark card, in both themes, with a slow white glow: "in the works". */}
      <div className="relative isolate max-w-[46rem] overflow-hidden rounded-2xl border border-white/10 bg-card p-8 text-[#f0eee9] sm:p-12">
        <div aria-hidden className="now-glow" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-[#bdb9b3]">{t.now.label}</p>
          <p className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 font-mono text-xs">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            {t.now.status}
          </p>
        </div>
        <h3 className="mt-8 max-w-[24ch] text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {t.now.title}
        </h3>
        <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-[#bdb9b3]">
          {t.now.body}
        </p>
        <a
          href={mailto(t.now.emailSubject)}
          className="mt-8 inline-block font-medium underline decoration-accent decoration-2 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-white"
        >
          {t.now.link}
        </a>
      </div>
    </Section>
  );
}
