import { Suspense } from "react";
import { TodaySkeleton } from "@/components/os/skeletons";
import { TodayView } from "@/components/os/today-view";
import { todayInRiga } from "@/lib/os/dates";
import { getActiveProjects, getAreas, getOpenTasks } from "@/lib/os/queries";

// Today: the phone-first main screen.
export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <TodayData />
    </Suspense>
  );
}

async function TodayData() {
  const [tasks, areas, projects] = await Promise.all([getOpenTasks(), getAreas(), getActiveProjects()]);
  // After the queries above, which already opted this component out of prerendering.
  const today = todayInRiga();
  return <TodayView today={today} tasks={tasks} areas={areas} projects={projects} />;
}
