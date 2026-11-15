"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { deleteEntry, updateEntry, writeEntry } from "@/app/os/(private)/actions/daylog";
import { EntrySheet } from "@/components/daylog/entry-sheet";
import { EntryStack } from "@/components/daylog/entry-stack";
import { ReviewView } from "@/components/daylog/review-view";
import { DayStatsView } from "@/components/daylog/day-stats";
import { ExportButtons } from "@/components/daylog/export-buttons";
import { dayToText } from "@/lib/daylog/export";
import { dayStats } from "@/lib/daylog/stats";
import { Toast, type ToastMessage } from "@/components/os/toast";
import { cn } from "@/lib/utils";
import { toDayShape } from "@/lib/daylog/map";
import { buildTimeline, effectivePauseEnd, timelineCounts, type Slot, type TimelineEntry } from "@/lib/daylog/slots";
import type { PauseRow } from "@/lib/daylog/map";
import { durationLabel, formatTime } from "@/lib/daylog/time";
import { useOptimisticEntries } from "@/lib/daylog/use-optimistic-entries";
import { useDaylogTags } from "@/lib/daylog/use-tags";
import { formatLongDate } from "@/lib/os/dates";
import type { DaylogDay, DaylogTag } from "@/types/database";

type DayHistoryProps = {
  day: DaylogDay;
  entries: TimelineEntry[];
  pauses: PauseRow[];
  tags: DaylogTag[];
  serverNow: number;
  /** Open in tag-review mode (after End day, or ?review=1). */
  review?: boolean;
};

// A past (or the running) day as one timeline. Gaps can still be filled in.
export function DayHistory({ day, entries: serverEntries, pauses: pauseRows, tags: serverTags, serverNow, review = false }: DayHistoryProps) {
  const [reviewing, setReviewing] = useState(review);
  const shape = useMemo(() => toDayShape(day)!, [day]);
  const { entries, run, error, clearError } = useOptimisticEntries(serverEntries);
  const pauses = useMemo(
    () => pauseRows.map((pause) => ({ id: pause.id, start: pause.start, end: effectivePauseEnd(pause, serverNow) })),
    [pauseRows, serverNow],
  );
  const items = useMemo(() => buildTimeline(shape, entries, serverNow, pauses), [shape, entries, serverNow, pauses]);
  const counts = timelineCounts(items);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const showError = useCallback((text: string) => setToast({ id: Date.now(), text, tone: "error" }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const { tags, createTagLocal, tagsReady } = useDaylogTags(serverTags, showError);
  const [editing, setEditing] = useState<{ entry: TimelineEntry; isNew: boolean } | null>(null);
  const live = day.status === "active";
  const taggingMode = day.settings_snapshot?.tagging_mode ?? "while_writing";
  const stats = useMemo(() => dayStats(shape, items, pauses, serverNow), [shape, items, pauses, serverNow]);
  const text = useMemo(() => dayToText(day.day, items, stats, tags), [day.day, items, stats, tags]);

  function fill(slot: Slot, kind: "slot" | "pause" = "slot") {
    setEditing({
      isNew: true,
      entry: { id: crypto.randomUUID(), kind, start: slot.start, end: slot.end, body: "", skipped: false, tagIds: [] },
    });
  }

  function save(entry: TimelineEntry, body: string, tagIds: string[]) {
    if (editing?.isNew) {
      void run({ type: "add", entry: { ...entry, body, tagIds } }, async () => {
        await tagsReady(tagIds);
        return writeEntry({
          kind: entry.kind === "pause" ? "pause" : "slot",
          id: entry.id,
          dayId: day.id,
          startAt: new Date(entry.start).toISOString(),
          endAt: new Date(entry.end).toISOString(),
          body,
          tagIds,
        });
      });
      return;
    }
    void run({ type: "patch", id: entry.id, patch: { body, tagIds } }, async () => {
      await tagsReady(tagIds);
      return updateEntry({ id: entry.id, body, tagIds });
    });
  }

  function remove(entry: TimelineEntry) {
    void run({ type: "remove", id: entry.id }, () => deleteEntry(entry.id));
  }

  function setTags(entry: TimelineEntry, tagIds: string[]) {
    void run({ type: "patch", id: entry.id, patch: { tagIds } }, async () => {
      await tagsReady(tagIds);
      return updateEntry({ id: entry.id, body: entry.body ?? "", tagIds });
    });
  }

  const end = shape.endedAt ?? serverNow;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/os/daylog" className="font-mono text-xs text-muted hover:text-fg">
        ← Day Log
      </Link>
      <header className="mt-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{formatLongDate(day.day)}</h1>
        <p className="mt-2 font-mono text-xs text-muted">
          {formatTime(shape.startedAt)}–{shape.endedAt ? formatTime(shape.endedAt) : "now"} · {durationLabel(end - shape.startedAt)} ·{" "}
          {counts.filled} {counts.filled === 1 ? "entry" : "entries"}
          {counts.empty > 0 && ` · ${counts.empty} empty`}
          {day.end_reason === "auto" && " · ended automatically"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {live && (
            <Link href="/os/daylog" className="rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted hover:border-fg hover:text-fg">
              Back to the live log
            </Link>
          )}
          {taggingMode !== "off" && (
            <button
              type="button"
              aria-pressed={reviewing}
              onClick={() => setReviewing((value) => !value)}
              className={cn(
                "rounded-full border px-3 py-1.5 font-mono text-xs transition-colors",
                reviewing ? "border-fg bg-fg text-surface" : "border-line text-muted hover:border-fg hover:text-fg",
              )}
            >
              {reviewing ? "Done reviewing" : "Review tags"}
            </button>
          )}
          <ExportButtons day={day.day} text={text} />
        </div>
      </header>

      {!reviewing && (
        <div className="mt-6">
          <DayStatsView stats={stats} tags={tags} />
        </div>
      )}

      <div className="mt-8">
        {reviewing ? (
          <ReviewView entries={entries} tags={tags} onSetTags={setTags} onCreateTag={createTagLocal} />
        ) : (
          <EntryStack
            items={items}
            tags={tags}
            composerRange={null}
            onFill={fill}
            onOpen={(entry) => setEditing({ entry, isNew: false })}
          />
        )}
      </div>

      <EntrySheet
        entry={editing?.entry ?? null}
        isNew={editing?.isNew}
        tags={tags}
        showTags={taggingMode !== "off"}
        onClose={() => setEditing(null)}
        onSave={save}
        onDelete={remove}
        onCreateTag={createTagLocal}
      />
      <Toast toast={error ? { id: 0, text: error, tone: "error" } : toast} onDismiss={error ? clearError : dismissToast} />
    </div>
  );
}
