import { Suspense } from "react";
import { DaylogActive } from "@/components/daylog/daylog-active";
import { DaylogHome } from "@/components/daylog/daylog-home";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
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
  const monthParam = first(params.month) ?? "";
  const data = await getDaylogHome(MONTH.test(monthParam) ? monthParam : todayInRiga().slice(0, 7));
  const month = MONTH.test(monthParam) ? monthParam : data.today.slice(0, 7);

  if (data.active) {
    return <DaylogActive data={{ ...data, active: data.active }} month={month} slotParam={first(params.slot) ?? null} />;
  }
  return <DaylogHome data={data} month={month} />;
}
