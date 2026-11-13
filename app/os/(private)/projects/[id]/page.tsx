import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ProjectDetail } from "@/components/os/project-detail";
import { TodaySkeleton } from "@/components/os/skeletons";
import { todayInRiga } from "@/lib/os/dates";
import { getActiveProjects, getAreas, getProject } from "@/lib/os/queries";

export default function ProjectPage({ params }: PageProps<"/os/projects/[id]">) {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <ProjectData params={params} />
    </Suspense>
  );
}

async function ProjectData({ params }: Pick<PageProps<"/os/projects/[id]">, "params">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [result, areas, projects] = await Promise.all([getProject(id), getAreas(), getActiveProjects()]);
  if (!result) notFound();

  return (
    <ProjectDetail
      project={result.project}
      tasks={result.tasks}
      areas={areas}
      projects={projects}
      today={todayInRiga()}
    />
  );
}
