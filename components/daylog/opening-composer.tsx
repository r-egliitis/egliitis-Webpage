"use client";

import { useState, useTransition, type FormEvent } from "react";
import { writeEntry } from "@/app/os/(private)/actions/daylog";
import { EntryInput } from "@/components/daylog/entry-input";

// The first entry of a scheduled day: "what did you do until now". It is
// stamped with the server's time and starts the day.
export function OpeningComposer({ dayId, onError }: { dayId: string; onError: (message: string) => void }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = body.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const result = await writeEntry({ kind: "opening", dayId, body: text, tagIds: [] });
      if (result.ok) setBody("");
      else onError(result.error);
    });
  }

  return (
    <form onSubmit={submit}>
      <EntryInput
        value={body}
        onChange={setBody}
        onSubmit={submit}
        pending={pending}
        label="What did you do until now?"
        placeholder="Woke up, coffee, …"
        submitLabel="Start the day"
      />
    </form>
  );
}
