import type { ReactNode } from "react";

export function TaskSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section aria-label={title} className="mt-8">
      <h2 className="flex items-baseline gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {title}
        <span className="text-fg">{count}</span>
      </h2>
      <ul className="mt-2">{children}</ul>
    </section>
  );
}
