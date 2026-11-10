import type { ReactNode } from "react";
import { Container } from "@/components/container";

// Heading in a left column, content on the right (stacked on small screens).
export function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="pb-16 sm:pb-20">
      {/* A hairline between sections keeps the rhythm even. */}
      <Container>
        <div className="grid gap-8 border-t border-line pt-16 sm:pt-20 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-14">
          <h2 className="flex items-start gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            <span aria-hidden className="mt-[0.45em] h-2 w-2 shrink-0 rounded-full bg-accent" />
            {heading}
          </h2>
          <div className="min-w-0">{children}</div>
        </div>
      </Container>
    </section>
  );
}
