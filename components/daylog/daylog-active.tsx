"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteEntry, endDay, endPause, startPause, updateEntry, writeEntry } from "@/app/os/(private)/actions/daylog";
import { Composer, type ComposerSubmit } from "@/components/daylog/composer";
import { DaylogCalendar } from "@/components/daylog/daylog-calendar";
import { EntrySheet } from "@/components/daylog/entry-sheet";
import { EntryStack } from "@/components/daylog/entry-stack";
import { Sheet, SheetHeader } from "@/components/os/sheet";
import { Toast, type ToastMessage } from "@/components/os/toast";
import { toDayShape } from "@/lib/daylog/map";
import type { DaylogHome } from "@/lib/daylog/queries";
import {
  buildTimeline,
  composerSlot,
  earlierEmptySlots,
  effectivePauseEnd,
  openPause,
  slotFromParam,
  timelineCounts,
  unwrittenPause,
  type Slot,
  type TimelineEntry,
} from "@/lib/daylog/slots";

/** What the composer writes: a slot range, or the block of a pause. */
type Target = Slot & { kind?: "slot" | "pause" };
import { useDaylogTags } from "@/lib/daylog/use-tags";
import { formatTime } from "@/lib/daylog/time";
import { useClock } from "@/lib/daylog/use-clock";
import { useOptimisticEntries } from "@/lib/daylog/use-optimistic-entries";
import { formatLongDate } from "@/lib/os/dates";
import { cn } from "@/lib/utils";

type DaylogActiveProps = {
  data: DaylogHome & { active: NonNullable<DaylogHome["active"]> };
  month: string;
  /** ?slot= from a notification: focus that slot. */
  slotParam: string | null;
};

const secondaryClass =
  "rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-fg hover:text-fg";

export function DaylogActive({ data, month, slotParam }: DaylogActiveProps) {
  const router = useRouter();
  const { day } = data.active;
  const shape = useMemo(() => toDayShape(day)!, [day]);
  const now = useClock(data.serverNow);
  const { entries, run, error, clearError } = useOptimisticEntries(data.active.entries);
  // A timer pause counts as ended once its time is up (the server closes it within a minute).
  const pauses = useMemo(
    () => data.active.pauses.map((pause) => ({ id: pause.id, start: pause.start, end: effectivePauseEnd(pause, now) })),
    [data.active.pauses, now],
  );
  const items = useMemo(() => buildTimeline(shape, entries, now, pauses), [shape, entries, now, pauses]);
  const [picked, setPicked] = useState<Target | null>(() => slotFromParam(items, slotParam));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const runningPause = openPause(items);
  const pausedBlock = unwrittenPause(items);
  const pauseMode = day.settings_snapshot?.pause_mode ?? "button";
  const pauseRow = runningPause ? data.active.pauses.find((pause) => pause.id === runningPause.pauseId) : null;

  // A picked gap (or paused block) that has since been filled falls back to the default target.
  const pickedStillOpen =
    picked &&
    items.some(
      (item) => (item.type === "empty" || item.type === "current" || (item.type === "paused" && !item.open)) && item.slot.start === picked.start,
    );
  // While paused: no composer. After a pause: write the paused block first. Otherwise the latest slot.
  const defaultTarget: Target | null = runningPause
    ? null
    : pausedBlock
      ? { ...pausedBlock.slot, kind: "pause" }
      : composerSlot(items, false);
  const target = runningPause ? null : ((pickedStillOpen ? picked : null) ?? defaultTarget);
  const backfilling = Boolean(pickedStillOpen && picked && target && picked.start !== defaultTarget?.start);
  // Multi-slot: earlier empty slots the entry also covers (hidden from the stack meanwhile).
  const [extend, setExtend] = useState<{ target: number; extra: number }>({ target: 0, extra: 0 });
  const earlier =
    target && target.kind !== "pause" && day.settings_snapshot?.multi_slot_entries !== false ? earlierEmptySlots(items, target) : [];
  const extra = target && extend.target === target.start ? Math.min(extend.extra, earlier.length) : 0;
  const composerStart = extra > 0 ? earlier[extra - 1].start : target?.start;
  const counts = timelineCounts(items);

  // Keep both devices in sync: refresh when the tab comes back and every minute.
  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && router.refresh();
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  // Start at the bottom, like a chat. A notification link focuses the input.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
    if (slotParam) inputRef.current?.focus();
  }, [slotParam]);

  const showError = useCallback((text: string) => setToast({ id: Date.now(), text, tone: "error" }), []);
  const { tags, createTagLocal, tagsReady } = useDaylogTags(data.tags, showError);
  const taggingMode = day.settings_snapshot?.tagging_mode ?? "while_writing";

  const submit = useCallback(
    (entry: ComposerSubmit) => {
      const id = crypto.randomUUID();
      setPicked(null);
      void run(
        {
          type: "add",
          entry: { id, kind: entry.kind, start: entry.start, end: entry.end, body: entry.body, skipped: false, tagIds: entry.tagIds },
        },
        async () => {
          await tagsReady(entry.tagIds);
          return writeEntry({
            kind: entry.kind,
            id,
            dayId: day.id,
            startAt: new Date(entry.start).toISOString(),
            endAt: new Date(entry.end).toISOString(),
            body: entry.body,
            tagIds: entry.tagIds,
          });
        },
      );
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
    },
    [day.id, run, tagsReady],
  );

  const [editing, setEditing] = useState<TimelineEntry | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, startEnding] = useTransition();

  function endTheDay() {
    if (!confirmEnd) return setConfirmEnd(true);
    setConfirmEnd(false);
    startEnding(async () => {
      const result = await endDay(day.id);
      if (!result.ok) return setToast({ id: Date.now(), text: result.error, tone: "error" });
      // Tag during review: go straight to the day's review screen.
      if (taggingMode === "review" || taggingMode === "both") router.push(`/os/daylog/${day.day}?review=1`);
    });
  }

  function saveEntry(entry: TimelineEntry, body: string, tagIds: string[]) {
    void run({ type: "patch", id: entry.id, patch: { body, tagIds } }, async () => {
      await tagsReady(tagIds);
      return updateEntry({ id: entry.id, body, tagIds });
    });
  }

  function removeEntry(entry: TimelineEntry) {
    void run({ type: "remove", id: entry.id }, () => deleteEntry(entry.id));
  }

  function fill(slot: Slot, kind: "slot" | "pause" = "slot") {
    setPicked({ ...slot, kind });
    inputRef.current?.focus();
  }

  const [pausing, startPausing] = useTransition();
  function pause() {
    startPausing(async () => {
      const minutes = pauseMode === "timer" ? (day.settings_snapshot?.pause_timer_minutes ?? 90) : null;
      const result = await startPause(day.id, minutes);
      if (!result.ok) showError(result.error);
    });
  }
  function resume() {
    if (!runningPause) return;
    startPausing(async () => {
      const result = await endPause(runningPause.pauseId);
      if (!result.ok) showError(result.error);
      else requestAnimationFrame(() => inputRef.current?.focus());
    });
  }

  const errorToast: ToastMessage | null = error ? { id: 0, text: error, tone: "error" } : null;

  return (
    // Bottom padding keeps the last entry clear of the composer on phones.
    <div className="mx-auto max-w-2xl pb-48 md:pb-0">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{formatLongDate(day.day)}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Day Log</h1>
            <p className="mt-1 text-sm text-muted">
              Started {formatTime(shape.startedAt)} · {counts.filled} {counts.filled === 1 ? "entry" : "entries"}
              {counts.empty > 0 && ` · ${counts.empty} to fill in`}
            </p>
          </div>
        </div>
        <nav aria-label="Day Log" className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setCalendarOpen(true)} className={secondaryClass}>
            Calendar
          </button>
          <Link href={`/os/daylog/${day.day}`} className={secondaryClass}>
            History
          </Link>
          <Link href="/os/daylog/settings" className={secondaryClass}>
            Settings
          </Link>
          <Link href="/os/daylog/setup" className={secondaryClass}>
            Setup
          </Link>
          {pauseMode !== "off" && !runningPause && (
            <button type="button" onClick={pause} disabled={pausing} className={secondaryClass}>
              {pauseMode === "timer" ? `Pause ${day.settings_snapshot?.pause_timer_minutes ?? 90} min` : "Pause"}
            </button>
          )}
          <button
            type="button"
            onClick={endTheDay}
            onBlur={() => setConfirmEnd(false)}
            disabled={ending}
            className={cn(secondaryClass, "ml-auto", confirmEnd && "border-accent text-fg")}
          >
            {ending ? "Ending…" : confirmEnd ? "Tap again to end the day" : "End day"}
          </button>
        </nav>
      </header>

      {data.active.quiet && !runningPause && (
        <p role="status" className="mt-6 rounded-2xl border border-line px-4 py-3 text-sm">
          <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" />
          Pings are paused until you write something.
        </p>
      )}

      <div className="mt-8">
        <EntryStack
          items={items}
          tags={tags}
          composerRange={target && composerStart !== undefined ? { start: composerStart, end: target.end } : null}
          onFill={fill}
          onOpen={setEditing}
        />
      </div>
      <div ref={bottomRef} />

      {runningPause && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2 md:sticky md:inset-x-auto md:bottom-0 md:mt-6 md:px-0 md:pb-6">
          <div
            role="status"
            className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-3xl border border-line bg-surface/95 p-3 pl-5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-md"
          >
            <p className="text-sm">
              Paused since {formatTime(runningPause.pausedAt)}
              {pauseRow?.resumeAt && <span className="text-muted"> · resumes {formatTime(pauseRow.resumeAt)}</span>}
              <span className="block text-xs text-muted">No pings until you resume.</span>
            </p>
            <button
              type="button"
              onClick={resume}
              disabled={pausing}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-fg px-5 text-sm font-medium text-surface transition-opacity disabled:opacity-50"
            >
              {pausing ? "Resuming…" : "Resume"}
            </button>
          </div>
        </div>
      )}

      {target && (
        // Phone: pinned above the tab bar. Desktop: sticks to the bottom of the column.
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2 md:sticky md:inset-x-auto md:bottom-0 md:mt-6 md:px-0 md:pb-6">
          <div className="mx-auto max-w-2xl">
            <Composer
              key={target.start}
              target={target}
              earlier={earlier}
              extra={extra}
              onExtraChange={(value) => setExtend({ target: target.start, extra: value })}
              tags={tags}
              showTags={taggingMode === "while_writing" || taggingMode === "both"}
              onCreateTag={createTagLocal}
              backfilling={backfilling}
              now={now}
              onSubmit={submit}
              onCancelBackfill={() => setPicked(null)}
              inputRef={inputRef}
            />
          </div>
        </div>
      )}

      <Sheet open={calendarOpen} label="Calendar" onClose={() => setCalendarOpen(false)}>
        <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
          <SheetHeader title="Calendar" onClose={() => setCalendarOpen(false)} />
          <div className="mt-4">
            <DaylogCalendar
              month={month}
              today={data.today}
              days={data.days}
              onError={(text) => setToast({ id: Date.now(), text, tone: "error" })}
            />
          </div>
        </div>
      </Sheet>
      <EntrySheet
        entry={editing}
        tags={tags}
        showTags={taggingMode !== "off"}
        onClose={() => setEditing(null)}
        onSave={saveEntry}
        onDelete={removeEntry}
        onCreateTag={createTagLocal}
      />
      <Toast toast={errorToast ?? toast} onDismiss={error ? clearError : dismissToast} />
    </div>
  );
}
