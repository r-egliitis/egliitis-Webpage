"use client";

import { useState } from "react";

const buttonClass =
  "rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-fg hover:text-fg";

// Copy the day's plain text, or download it as daylog-YYYY-MM-DD.txt.
export function ExportButtons({ day, text }: { day: string; text: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Couldn't copy; use Download");
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `daylog-${day}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(null);
  }

  return (
    <span className="flex items-center gap-2">
      <button type="button" onClick={copy} className={buttonClass}>
        Copy as text
      </button>
      <button type="button" onClick={download} className={buttonClass}>
        Download .txt
      </button>
      {status && (
        <span role="status" className="font-mono text-xs text-muted">
          {status}
        </span>
      )}
    </span>
  );
}
