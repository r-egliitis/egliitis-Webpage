"use client";

import Link from "next/link";
import { useState } from "react";
import { AreaDot } from "@/components/os/area-dot";
import { EmptyState } from "@/components/os/empty-state";
import { ProgressBar } from "@/components/os/progress-bar";
import { ProjectForm } from "@/components/os/project-form";
import { formatDayLabel } from "@/lib/os/dates";
import type { ProjectWithCounts } from "@/lib/os/queries";
import type { Area, Project } from "@/types/database";

const STATUS_LABEL = { active: "Active", paused: "Paused", done: "Done" } as const;

export function ProjectsView({ projects, areas, today }: { projects: ProjectWithCounts[]; areas: Area[]; today: string }) {
  const [editing, setEditing] = useState<Project | "new" | null>(null);

  // Areas in their sort order, then projects without an area.
  const groups = [
    ...areas.map((area) => ({ key: area.id, area, items: projects.filter((project) => project.area_id === area.id) })),
    { key: "none", area: null, items: projects.filter((project) => !project.area_id || !areas.some((area) => area.id === project.area_id)) },
  ].filter((group) => group.items.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Projects</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-5 text-sm font-medium text-surface transition-shadow hover:shadow-[0_0_28px_var(--glow)]"
        >
          New project
        </button>
      </div>

      {groups.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No projects yet.">Group related tasks into a project, like a thesis or a client job.</EmptyState>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.key} aria-label={group.area?.name ?? "No area"} className="mt-10">
          <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
            {group.area && <AreaDot color={group.area.color} />}
            {group.area?.name ?? "No area"}
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((project) => {
              const total = project.openCount + project.doneCount;
              const overdue = project.deadline !== null && project.deadline < today && project.status !== "done";
              return (
                <li key={project.id} className="relative rounded-2xl border border-line p-4 transition-[border-color,box-shadow] hover:border-fg hover:shadow-[0_0_24px_var(--glow-soft)]">
                  <div className="flex items-start justify-between gap-2">
                    {/* The link covers the whole card; the edit button sits above it. */}
                    <Link href={`/os/projects/${project.id}`} className="min-w-0 font-medium leading-snug after:absolute after:inset-0 after:rounded-2xl">
                      {project.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setEditing(project)}
                      className="relative z-10 shrink-0 rounded-full px-2 py-1 text-xs text-muted hover:bg-fg/[0.06] hover:text-fg"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs text-muted">
                    <span className={project.status === "active" ? "text-fg" : undefined}>{STATUS_LABEL[project.status]}</span>
                    {project.deadline && (
                      <span className={overdue ? "font-bold text-fg" : undefined}>Due {formatDayLabel(project.deadline, today)}</span>
                    )}
                  </p>
                  <div className="mt-4">
                    <ProgressBar done={project.doneCount} total={total} label={`${project.name} progress`} />
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted">
                    {total === 0 ? "No tasks yet" : `${project.doneCount} of ${total} done · ${project.openCount} open`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <ProjectForm project={editing} areas={areas} onClose={() => setEditing(null)} />
    </div>
  );
}
