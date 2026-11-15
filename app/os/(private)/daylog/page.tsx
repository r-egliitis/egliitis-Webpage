import { Suspense } from "react";
import { DaylogHome } from "@/components/daylog/daylog-home";
import { TodaySkeleton } from "@/components/os/skeletons";
import { getDaylogHome } from "@/lib/daylog/queries";
import { todayInRiga } from "@/lib/os/dates";

// Day Log: the running day's log, or (no day running) the calendar.
export default function DaylogPage({ searchParams }: PageProps<"/os/daylog">) {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <DaylogData searchParams={searchParams} />
    </Suspense>
  );
}

async function DaylogData({ searchParams }: Pick<PageProps<"/os/daylog">, "searchParams">) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const monthParam = first(params.month);
  const data = await getDaylogHome(/^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam ?? "") ? monthParam! : todayInRiga().slice(0, 7));
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam ?? "") ? monthParam! : data.today.slice(0, 7);

  if (data.active) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Day Log</h1>
        <p className="mt-2 text-muted">Today is running. The log view arrives in the next step.</p>
      </div>
    );
  }
  return <DaylogHome data={data} month={month} />;
}
