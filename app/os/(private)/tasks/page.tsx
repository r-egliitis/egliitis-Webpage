import { Suspense } from "react";
import { ListSkeleton } from "@/components/os/skeletons";
import { TaskFilters } from "@/components/os/task-filters";
import { TaskTable } from "@/components/os/task-table";
import { todayInRiga } from "@/lib/os/dates";
import { getActiveProjects, getAreas, getTasks } from "@/lib/os/queries";
import { taskFilters } from "@/lib/os/schemas";

// Tasks: the full list, built for planning on a PC.
export default function TasksPage({ searchParams }: PageProps<"/os/tasks">) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tasks</h1>
      <Suspense fallback={<ListSkeleton />}>
        <TasksData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TasksData({ searchParams }: Pick<PageProps<"/os/tasks">, "searchParams">) {
  const raw = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const filters = taskFilters.parse(
    Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, first(value)])),
  );

  const [tasks, areas, projects] = await Promise.all([getTasks(filters), getAreas(), getActiveProjects()]);
  const today = todayInRiga();
  const filtered = Boolean(filters.area || filters.project || filters.status || filters.priority);

  return (
    <>
      <div className="mt-6">
        <TaskFilters areas={areas} projects={projects} />
      </div>
      <div className="mt-6">
        <TaskTable tasks={tasks} areas={areas} projects={projects} today={today} filtered={filtered} />
      </div>
    </>
  );
}
