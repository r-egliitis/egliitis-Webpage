"use client";

import { useState, useTransition, type FormEvent } from "react";
import { saveProject, setProjectArchived } from "@/app/os/(private)/actions/projects";
import { fieldClass, labelClass, Sheet, SheetHeader } from "@/components/os/sheet";
import { Segmented } from "@/components/os/task-sheet";
import { cn } from "@/lib/utils";
import type { Area, Project, ProjectStatus } from "@/types/database";

type ProjectFormProps = {
  /** null = closed, "new" = create, a project = edit. */
  project: Project | "new" | null;
  areas: Area[];
  defaultAreaId?: string | null;
  onClose: () => void;
  /** Called after archiving (e.g. to leave the detail page). */
  onArchived?: () => void;
};

export function ProjectForm({ project, ...props }: ProjectFormProps) {
  const key = project === "new" ? "new" : project?.id;
  return (
    <Sheet open={project !== null} label={project === "new" ? "New project" : "Edit project"} onClose={props.onClose}>
      {project && <ProjectFields key={key} project={project === "new" ? null : project} {...props} />}
    </Sheet>
  );
}

function ProjectFields({
  project,
  areas,
  defaultAreaId = null,
  onClose,
  onArchived,
}: Omit<ProjectFormProps, "project"> & { project: Project | null }) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [areaId, setAreaId] = useState(project?.area_id ?? defaultAreaId ?? "");
  const [deadline, setDeadline] = useState(project?.deadline ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveProject({
        id: project?.id,
        name,
        description: description || null,
        areaId: areaId || null,
        deadline: deadline || null,
        status,
      });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  function archive() {
    if (!project) return;
    setError(null);
    startTransition(async () => {
      const result = await setProjectArchived(project.id, true);
      if (!result.ok) return setError(result.error);
      onClose();
      onArchived?.();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
      <SheetHeader title={project ? "Edit project" : "New project"} onClose={onClose} />

      <label className={labelClass}>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} autoFocus={!project} className={fieldClass} />
      </label>

      <label className={labelClass}>
        Description
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={5000} className={cn(fieldClass, "resize-y")} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          Area
          <select value={areaId} onChange={(event) => setAreaId(event.target.value)} className={fieldClass}>
            <option value="">None</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Deadline
          <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={fieldClass} />
        </label>
      </div>

      <Segmented
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: "active", label: "Active" },
          { value: "paused", label: "Paused" },
          { value: "done", label: "Done" },
        ]}
      />

      {error && (
        <p role="alert" className="text-sm">
          <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" />
          {error}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        {project ? (
          <button type="button" onClick={archive} disabled={pending} className="min-h-11 rounded-full px-4 text-sm text-muted hover:text-fg">
            Archive
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-6 text-sm font-medium text-surface transition-[box-shadow,opacity] hover:shadow-[0_0_28px_var(--glow)] disabled:opacity-40"
        >
          {pending ? "Saving…" : project ? "Save" : "Create project"}
        </button>
      </div>
    </form>
  );
}
