"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Area, Project } from "@/types/database";

const selectClass =
  "h-9 rounded-full border border-line bg-surface px-3 text-sm text-fg outline-none transition-colors hover:border-fg focus:border-fg";

function Select({
  label,
  name,
  value,
  onChange,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(name, event.target.value)} className={selectClass}>
        {children}
      </select>
    </label>
  );
}

// Filters live in the URL; changing one re-runs the query on the server.
export function TaskFilters({ areas, projects }: { areas: Area[]; projects: Project[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function set(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  const value = (name: string) => searchParams.get(name) ?? "";
  const showCompleted = value("completed") === "1";
  const anyFilter = ["area", "project", "status", "priority", "completed", "sort"].some((name) => value(name));

  return (
    <div className={cn("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")}>
      <Select label="Area" name="area" value={value("area")} onChange={set}>
        <option value="">All areas</option>
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </Select>
      <Select label="Project" name="project" value={value("project")} onChange={set}>
        <option value="">All projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
      <Select label="Status" name="status" value={value("status")} onChange={set}>
        <option value="">Open</option>
        <option value="todo">To do</option>
        <option value="doing">Doing</option>
        <option value="done">Done (7 days)</option>
      </Select>
      <Select label="Priority" name="priority" value={value("priority")} onChange={set}>
        <option value="">Any priority</option>
        <option value="1">High</option>
        <option value="2">Normal</option>
        <option value="3">Low</option>
      </Select>
      <Select label="Sort" name="sort" value={value("sort")} onChange={set}>
        <option value="">Sort: due date</option>
        <option value="priority">Sort: priority</option>
      </Select>
      <button
        type="button"
        aria-pressed={showCompleted}
        onClick={() => set("completed", showCompleted ? "" : "1")}
        className={cn(
          "h-9 rounded-full border px-3 text-sm transition-colors",
          showCompleted ? "border-fg bg-fg text-surface" : "border-line text-muted hover:border-fg hover:text-fg",
        )}
      >
        Show completed
      </button>
      {anyFilter && (
        <button
          type="button"
          onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
          className="h-9 px-2 text-sm text-muted underline decoration-line underline-offset-4 hover:text-fg"
        >
          Reset
        </button>
      )}
    </div>
  );
}
