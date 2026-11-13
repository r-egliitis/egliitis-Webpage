import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </div>
  );
}
