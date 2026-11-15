import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { DayHistory } from "@/components/daylog/day-history";
import { EmptyState } from "@/components/os/empty-state";
import { TodaySkeleton } from "@/components/os/skeletons";
import { getDaylogDay } from "@/lib/daylog/queries";
import { formatLongDate } from "@/lib/os/dates";

// One Day Log day: its full timeline.
export default function DaylogDayPage({ params, searchParams }: PageProps<"/os/daylog/[date]">) {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <DayData params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DayData({ params, searchParams }: Pick<PageProps<"/os/daylog/[date]">, "params" | "searchParams">) {
  const [{ date }, query] = await Promise.all([params, searchParams]);
  if (!z.iso.date().safeParse(date).success) notFound();
  const result = await getDaylogDay(date);
  if (!result) notFound();

  const { day, entries, pauses, tags, serverNow } = result;
  if (!day.started_at) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/os/daylog" className="font-mono text-xs text-muted hover:text-fg">
          ← Day Log
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{formatLongDate(day.day)}</h1>
        <div className="mt-8">
          <EmptyState title={day.status === "missed" ? "This day was missed." : "This day hasn't started yet."}>
            {day.status === "missed" ? "Nothing was written that day." : "Your first entry that day starts it."}
          </EmptyState>
        </div>
      </div>
    );
  }
  return (
    <DayHistory
      day={day}
      entries={entries}
      pauses={pauses}
      tags={tags}
      serverNow={serverNow}
      review={query.review === "1"}
    />
  );
}
