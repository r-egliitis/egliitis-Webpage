"use client";

import Link from "next/link";
import { useCallback, useState, useTransition } from "react";
import { scheduleDay } from "@/app/os/(private)/actions/daylog";
import { DaylogCalendar } from "@/components/daylog/daylog-calendar";
import { OpeningComposer } from "@/components/daylog/opening-composer";
import { Toast, type ToastMessage } from "@/components/os/toast";
import { formatDayLabel, formatLongDate } from "@/lib/os/dates";
import type { DaylogHome as HomeData } from "@/lib/daylog/queries";

const cardClass = "rounded-2xl border border-line p-5";

// No day running: today's status, the calendar and recent days.
export function DaylogHome({ data, month }: { data: HomeData; month: string }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pending, startTransition] = useTransition();
  const showError = useCallback((text: string) => setToast({ id: Date.now(), text, tone: "error" }), []);
  const dismiss = useCallback(() => setToast(null), []);
  const todayDay = data.todayDay;

  function trackToday() {
    startTransition(async () => {
      const result = await scheduleDay(data.today);
      if (!result.ok) showError(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{formatLongDate(data.today)}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Day Log</h1>
        </div>
        <Link
          href="/os/daylog/setup"
          className="rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-fg hover:text-fg"
        >
          Setup
        </Link>
      </header>

      <section aria-label="Today" className={`mt-8 ${cardClass}`}>
        {todayDay?.status === "scheduled" ? (
          <>
            <h2 className="font-medium">Today is a Day Log day.</h2>
            <p className="mt-1 text-sm text-muted">Write what you did until now. That starts the day.</p>
            <div className="mt-4">
              <OpeningComposer dayId={todayDay.id} onError={showError} />
            </div>
          </>
        ) : todayDay?.status === "ended" ? (
          <>
            <h2 className="font-medium">Today&apos;s log is done.</h2>
            <Link href={`/os/daylog/${data.today}`} className="mt-3 inline-block text-sm underline decoration-line decoration-2 underline-offset-4 hover:decoration-fg">
              Open today&apos;s log
            </Link>
          </>
        ) : (
          <>
            <h2 className="font-medium">Not tracking today.</h2>
            <p className="mt-1 text-sm text-muted">Schedule a day in the calendar, or start right now.</p>
            <button
              type="button"
              onClick={trackToday}
              disabled={pending}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-5 text-sm font-medium text-surface transition-[box-shadow,opacity] hover:shadow-[0_0_28px_var(--glow)] disabled:opacity-50"
            >
              Track today
            </button>
          </>
        )}
      </section>

      <div className={`mt-6 ${cardClass}`}>
        <DaylogCalendar month={month} today={data.today} days={data.days} onError={showError} />
      </div>

      {data.recent.length > 0 && (
        <section aria-label="Recent days" className="mt-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Recent days</h2>
          <ul className="mt-2">
            {data.recent.map((day) => (
              <li key={day.id} className="border-b border-line last:border-b-0">
                <Link href={`/os/daylog/${day.day}`} className="flex items-center justify-between py-3 hover:text-fg">
                  <span>{formatLongDate(day.day)}</span>
                  <span className="font-mono text-xs text-muted">{formatDayLabel(day.day, data.today)} ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
