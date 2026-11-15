"use client";

import { useEffect, useRef, type RefObject } from "react";

type EntryInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  pending?: boolean;
  label: string;
  placeholder?: string;
  submitLabel: string;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
};

// Auto-growing textarea with a send button. Enter sends; Shift+Enter is a new line.
export function EntryInput({ value, onChange, onSubmit, pending, label, placeholder, submitLabel, inputRef }: EntryInputProps) {
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? ownRef;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, [value, ref]);

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 transition-colors focus-within:border-fg">
      <label className="min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          maxLength={2000}
          placeholder={placeholder ?? label}
          enterKeyHint="send"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onSubmit();
            }
          }}
          className="block max-h-40 w-full resize-none bg-transparent px-2 py-2.5 text-base leading-snug outline-none placeholder:text-muted"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !value.trim()}
        aria-label={submitLabel}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fg text-surface transition-opacity disabled:opacity-30"
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
