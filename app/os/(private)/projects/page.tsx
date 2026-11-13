import { Suspense } from "react";
import { ProjectsView } from "@/components/os/projects-view";
import { ListSkeleton } from "@/components/os/skeletons";
import { todayInRiga } from "@/lib/os/dates";
import { getAreas, getProjectsWithCounts } from "@/lib/os/queries";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <ProjectsData />
    </Suspense>
  );
}

async function ProjectsData() {
  const [projects, areas] = await Promise.all([getProjectsWithCounts(), getAreas()]);
  return <ProjectsView projects={projects} areas={areas} today={todayInRiga()} />;
}
