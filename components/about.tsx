"use client";

import { useLanguage } from "@/components/language-provider";
import { Section } from "@/components/section";

export function About() {
  const { t } = useLanguage();

  return (
    <Section id="about" heading={t.about.heading}>
      <div className="flex max-w-[62ch] flex-col gap-5 text-lg leading-relaxed">
        {t.about.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <h3 className="mt-12 font-mono text-xs text-muted">{t.about.interestsLabel}</h3>
      <ul className="mt-4 flex flex-wrap gap-2">
        {t.about.interests.map((interest) => (
          <li
            key={interest}
            className="rounded-full border border-line px-4 py-2 text-sm text-muted"
          >
            {interest}
          </li>
        ))}
      </ul>
    </Section>
  );
}
