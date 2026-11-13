"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Native <dialog>: a bottom sheet on phones, a centred modal on desktop.
// Escape and the backdrop close it via the dialog's own close event.
export function Sheet({
  open,
  label,
  onClose,
  children,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      aria-label={label}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-line bg-surface p-0 text-fg",
        "backdrop:bg-black/50 backdrop:backdrop-blur-[2px]",
        "md:m-auto md:max-w-lg md:rounded-3xl",
      )}
    >
      {children}
    </dialog>
  );
}

export const fieldClass =
  "mt-1.5 block w-full rounded-xl border border-line bg-transparent px-3 py-2.5 text-base text-fg outline-none transition-[border-color] focus:border-fg";
export const labelClass = "block font-mono text-xs uppercase tracking-[0.15em] text-muted";

export function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <>
      <div aria-hidden className="mx-auto -mt-2 h-1 w-10 rounded-full bg-line md:hidden" />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full text-xl text-muted hover:text-fg">
          ×
        </button>
      </div>
    </>
  );
}
