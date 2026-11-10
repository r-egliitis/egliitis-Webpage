"use client";

import { useLanguage } from "@/components/language-provider";
import { Section } from "@/components/section";
import { AsciiGlitchRipple } from "@/components/ui/ascii-glitch-ripple";
import { ArtIcon, BusinessIcon, CodeIcon } from "@/components/ui/icons";

const iconMap = {
  business: BusinessIcon,
  code: CodeIcon,
  art: ArtIcon,
};

export function Background() {
  const { t } = useLanguage();

  return (
    <Section id="background" heading={t.background.heading}>
      <p className="text-lg text-muted">{t.background.intro}</p>
      {/* Timeline, newest first. The accent dots are one of the few uses of #FF0B55. */}
      <ol className="relative mt-10 flex max-w-[62ch] flex-col gap-12 border-l border-line pl-8">
        {t.background.items.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <li key={item.icon} className="relative">
              <span
                aria-hidden
                className="absolute -left-[37px] top-1.5 h-[9px] w-[9px] rounded-full bg-accent ring-4 ring-surface"
              />
              <div className="flex items-center gap-2 font-mono text-xs text-muted">
                <Icon width={14} height={14} />
                <span>{item.years}</span>
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">{item.school}</h3>
              {item.icon === "code" ? (
                // The programming entry scrambles in a ripple on hover.
                <AsciiGlitchRipple
                  as="p"
                  className="mt-2 cursor-default select-text font-mono leading-relaxed"
                >
                  {item.field}
                </AsciiGlitchRipple>
              ) : (
                <p className="mt-2 leading-relaxed">{item.field}</p>
              )}
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{item.detail}</p>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
