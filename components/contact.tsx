"use client";

import { Container } from "@/components/container";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { GithubIcon, InstagramIcon, LinkedinIcon } from "@/components/ui/icons";
import { links, mailto } from "@/content/links";

// Icons only show once their URL is set in content/links.ts.
const iconLinks = [
  { label: "GitHub", href: links.github, Icon: GithubIcon },
  { label: "LinkedIn", href: links.linkedin, Icon: LinkedinIcon },
  { label: "Instagram", href: links.instagram, Icon: InstagramIcon },
];

export function Contact() {
  const { t } = useLanguage();

  return (
    <section id="contact">
      <Container>
        <div className="border-t border-line pt-16 sm:pt-20">
          <h2 className="max-w-[16ch] text-[clamp(2.5rem,6vw,4.75rem)] font-bold leading-[1.02] tracking-tight">
            {t.contact.heading}
          </h2>
          <p className="mt-8 max-w-[52ch] text-lg leading-relaxed text-muted">
            {t.contact.body}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button href={mailto(t.contact.emailSubject)}>{t.contact.mainButton}</Button>
            {links.linkedin && (
              <Button href={links.linkedin} variant="secondary" target="_blank" rel="noopener">
                {t.contact.linkedinButton}
              </Button>
            )}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a
              href={mailto(t.contact.emailSubject)}
              className="font-mono text-base text-fg underline decoration-line decoration-2 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-accent sm:text-lg"
            >
              {links.email}
            </a>
            <div className="flex gap-2">
              {iconLinks.map(
                ({ label, href, Icon }) =>
                  href && (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener"
                      aria-label={label}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition-[color,border-color,box-shadow] hover:border-accent hover:text-fg hover:shadow-[0_0_20px_rgba(255,11,85,0.35)]"
                    >
                      <Icon />
                    </a>
                  ),
              )}
            </div>
          </div>
        </div>
      </Container>
      <Container className="mt-20">
        <footer className="flex flex-col gap-2 border-t border-line py-8 font-mono text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{t.contact.footer}</p>
          <p>{t.contact.footerNote}</p>
        </footer>
      </Container>
    </section>
  );
}
