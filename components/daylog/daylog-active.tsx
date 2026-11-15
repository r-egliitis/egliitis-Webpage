"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { writeEntry } from "@/app/os/(private)/actions/daylog";
import { Composer, type ComposerSubmit } from "@/components/daylog/composer";
import { DaylogCalendar } from "@/components/daylog/daylog-calendar";
import { EntryStack } from "@/components/daylog/entry-stack";
import { Sheet, SheetHeader } from "@/components/os/sheet";
import { Toast, type ToastMessage } from "@/components/os/toast";
import { toDayShape } from "@/lib/daylog/map";
import type { DaylogHome } from "@/lib/daylog/queries";
import { buildTimeline, composerSlot, earlierEmptySlots, slotFromParam, timelineCounts, type Slot } from "@/lib/daylog/slots";
import { formatTime } from "@/lib/daylog/time";
import { useClock } from "@/lib/daylog/use-clock";
import { useOptimisticEntries } from "@/lib/daylog/use-optimistic-entries";
import { formatLongDate } from "@/lib/os/dates";

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
  const items = useMemo(() => buildTimeline(shape, entries, now), [shape, entries, now]);
  const [picked, setPicked] = useState<Slot | null>(() => slotFromParam(items, slotParam));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // A picked gap that has since been filled falls back to the latest slot.
  const pickedStillEmpty = picked && items.some((item) => (item.type === "empty" || item.type === "current") && item.slot.start === picked.start);
  const target = (pickedStillEmpty ? picked : null) ?? composerSlot(items, false);
  const backfilling = Boolean(pickedStillEmpty && picked && target && picked.start !== composerSlot(items, false)?.start);
  // Multi-slot: earlier empty slots the entry also covers (hidden from the stack meanwhile).
  const [extend, setExtend] = useState<{ target: number; extra: number }>({ target: 0, extra: 0 });
  const earlier = target && day.settings_snapshot?.multi_slot_entries !== false ? earlierEmptySlots(items, target) : [];
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

  const submit = useCallback(
    (entry: ComposerSubmit) => {
      const id = crypto.randomUUID();
      setPicked(null);
      void run(
        {
          type: "add",
          entry: { id, kind: "slot", start: entry.start, end: entry.end, body: entry.body, skipped: false, tagIds: entry.tagIds },
        },
        () =>
          writeEntry({
            kind: "slot",
            id,
            dayId: day.id,
            startAt: new Date(entry.start).toISOString(),
            endAt: new Date(entry.end).toISOString(),
            body: entry.body,
            tagIds: entry.tagIds,
          }),
      );
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
    },
    [day.id, run],
  );

  function fill(slot: Slot) {
    setPicked(slot);
    inputRef.current?.focus();
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
          <Link href="/os/daylog/setup" className={secondaryClass}>
            Setup
          </Link>
        </nav>
      </header>

      <div className="mt-8">
        <EntryStack
          items={items}
          tags={data.tags}
          composerRange={target && composerStart !== undefined ? { start: composerStart, end: target.end } : null}
          onFill={fill}
        />
      </div>
      <div ref={bottomRef} />

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
      <Toast toast={errorToast ?? toast} onDismiss={error ? clearError : dismissToast} />
    </div>
  );
}
