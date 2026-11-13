"use client";

import { useEffect } from "react";

export default function OsError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="max-w-md py-10">
      <h1 className="text-2xl font-bold tracking-tight">Couldn&apos;t load this.</h1>
      <p className="mt-2 text-muted">
        The data didn&apos;t come through. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-5 text-sm font-medium text-surface transition-shadow hover:shadow-[0_0_28px_var(--glow)]"
      >
        Try again
      </button>
    </div>
  );
}
