"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { scheduleDay, unscheduleDay } from "@/app/os/(private)/actions/daylog";
import { Sheet, SheetHeader } from "@/components/os/sheet";
import { formatLongDate } from "@/lib/os/dates";
import { monthGrid, monthLabel, shiftMonth } from "@/lib/daylog/time";
import { cn } from "@/lib/utils";
import type { DaylogDay } from "@/types/database";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_LABEL = {
  scheduled: "Scheduled",
  active: "Tracking now",
  ended: "Tracked",
  missed: "Missed",
} as const;

type CalendarProps = {
  month: string; // YYYY-MM
  today: string;
  days: DaylogDay[];
  onError: (message: string) => void;
};

function StatusMark({ status }: { status: DaylogDay["status"] | undefined }) {
  if (!status) return <span aria-hidden className="h-1.5 w-1.5" />;
  return (
    <span
      aria-hidden
      className={cn(
        "h-1.5 w-1.5 rounded-full",
        status === "scheduled" && "ring-1 ring-fg",
        status === "active" && "bg-accent",
        status === "ended" && "bg-fg",
        status === "missed" && "bg-muted/50",
      )}
    />
  );
}

// Monday-first month. Tap a future day to schedule it; tap a tracked day to open it.
export function DaylogCalendar({ month, today, days, onError }: CalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [year, monthNumber] = month.split("-").map(Number);
  const byDate = new Map(days.map((day) => [day.day, day]));
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<DaylogDay | null>(null);
  const [, startTransition] = useTransition();

  function goTo(offset: number) {
    const next = shiftMonth(year, monthNumber, offset);
    const value = `${next.year}-${String(next.month).padStart(2, "0")}`;
    router.replace(`${pathname}?month=${value}`, { scroll: false });
  }

  function schedule(date: string) {
    setPendingDate(date);
    startTransition(async () => {
      const result = await scheduleDay(date);
      setPendingDate(null);
      if (!result.ok) onError(result.error);
    });
  }

  function unschedule(day: DaylogDay) {
    setSelected(null);
    setPendingDate(day.day);
    startTransition(async () => {
      const result = await unscheduleDay(day.id);
      setPendingDate(null);
      if (!result.ok) onError(result.error);
    });
  }

  return (
    <section aria-label="Calendar">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{monthLabel(year, monthNumber)}</h2>
        <div className="flex gap-1">
          <button type="button" onClick={() => goTo(-1)} aria-label="Previous month" className="h-9 w-9 rounded-full text-muted hover:bg-fg/[0.06] hover:text-fg">
            ‹
          </button>
          <button type="button" onClick={() => goTo(1)} aria-label="Next month" className="h-9 w-9 rounded-full text-muted hover:bg-fg/[0.06] hover:text-fg">
            ›
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center font-mono text-[0.6875rem] uppercase tracking-wider text-muted">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthGrid(year, monthNumber).flat().map((date, index) => {
          if (!date) return <span key={`pad-${index}`} />;
          const day = byDate.get(date);
          const isPast = date < today;
          const label = `${formatLongDate(date)}${day ? `, ${STATUS_LABEL[day.status]}` : ""}`;
          const cellClass = cn(
            "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm transition-colors",
            date === today && "ring-1 ring-fg",
            isPast && !day ? "text-muted/50" : "hover:bg-fg/[0.06]",
            day?.status === "missed" && "text-muted",
            pendingDate === date && "animate-pulse",
          );
          const content = (
            <>
              <span>{Number(date.slice(8))}</span>
              <StatusMark status={day?.status} />
            </>
          );

          if (day && (day.status === "ended" || day.status === "active")) {
            return (
              <Link key={date} href={day.status === "active" ? "/os/daylog" : `/os/daylog/${date}`} aria-label={label} className={cellClass}>
                {content}
              </Link>
            );
          }
          return (
            <button
              key={date}
              type="button"
              aria-label={day ? label : `${label}. Tap to schedule`}
              disabled={(isPast && !day) || pendingDate !== null}
              onClick={() => (day ? setSelected(day) : schedule(date))}
              className={cellClass}
            >
              {content}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.6875rem] text-muted">
        {(["scheduled", "active", "ended", "missed"] as const).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <StatusMark status={status} />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </p>

      <Sheet open={selected !== null} label="Day" onClose={() => setSelected(null)}>
        {selected && (
          <div className="flex flex-col gap-4 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
            <SheetHeader title={formatLongDate(selected.day)} onClose={() => setSelected(null)} />
            {selected.status === "scheduled" ? (
              <>
                <p className="text-muted">
                  {selected.day === today
                    ? "Today is a Day Log day. Write your first entry to start it."
                    : "You'll get a reminder at 00:01 that day. Your first entry starts it."}
                </p>
                <button
                  type="button"
                  onClick={() => unschedule(selected)}
                  className="min-h-11 self-start rounded-full border border-line px-5 text-sm transition-colors hover:border-fg"
                >
                  Unschedule
                </button>
              </>
            ) : (
              <p className="text-muted">No entries were written that day, so it was marked missed.</p>
            )}
          </div>
        )}
      </Sheet>
    </section>
  );
}
