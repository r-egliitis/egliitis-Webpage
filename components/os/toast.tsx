"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type ToastMessage = {
  id: number;
  text: string;
  tone?: "info" | "error";
  action?: { label: string; onClick: () => void };
};

// One message at a time. Phone: under the top bar. Desktop: bottom right.
export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, toast.tone === "error" ? 7000 : 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      role={toast?.tone === "error" ? "alert" : "status"}
      className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4 md:inset-x-auto md:top-auto md:right-6 md:bottom-6"
    >
      {toast && (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex max-w-md items-center gap-4 rounded-2xl border bg-surface px-4 py-3 text-sm shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
            toast.tone === "error" ? "border-accent" : "border-line",
          )}
        >
          <span className="min-w-0 flex-1 truncate">{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="shrink-0 font-medium underline decoration-line decoration-2 underline-offset-4 hover:decoration-fg"
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-muted hover:text-fg">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
