import Link from "next/link";
import { Suspense } from "react";
import { CompareView } from "@/components/daylog/compare-view";
import { ListSkeleton } from "@/components/os/skeletons";
import { getCompareData } from "@/lib/daylog/queries";

const RANGES = new Set([7, 30, 90]);

// Compare tracked days: side by side, and time per tag across a range.
export default function DaylogComparePage({ searchParams }: PageProps<"/os/daylog/compare">) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/os/daylog" className="font-mono text-xs text-muted hover:text-fg">
        ← Day Log
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Compare</h1>
      <Suspense fallback={<div className="mt-8"><ListSkeleton rows={5} /></div>}>
        <CompareData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CompareData({ searchParams }: Pick<PageProps<"/os/daylog/compare">, "searchParams">) {
  const raw = Number((await searchParams).range);
  const range = RANGES.has(raw) ? raw : 30;
  const { days, tags, today } = await getCompareData(range);
  // Keyed by range so the day selection resets when the range changes.
  return <CompareView key={range} days={days} tags={tags} today={today} range={range} />;
}
