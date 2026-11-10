"use client";

import { useLanguage } from "@/components/language-provider";
import { Section } from "@/components/section";
import { HighlightGrid } from "@/components/ui/highlight-grid";

export function Skills() {
  const { t } = useLanguage();

  return (
    <Section id="skills" heading={t.skills.heading}>
      <p className="text-lg text-muted">{t.skills.intro}</p>
      <HighlightGrid rows={t.skills.rows} className="mt-10" />
    </Section>
  );
}
