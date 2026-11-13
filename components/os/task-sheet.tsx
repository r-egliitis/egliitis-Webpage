"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { fieldClass, labelClass, Sheet, SheetHeader } from "@/components/os/sheet";
import { cn } from "@/lib/utils";
import type { TaskUpdateInput } from "@/lib/os/schemas";
import type { Area, Priority, Project, Task, TaskStatus } from "@/types/database";

type TaskSheetProps = {
  task: Task | null;
  areas: Area[];
  projects: Project[];
  onClose: () => void;
  onSave: (input: TaskUpdateInput & { id: string }) => void;
  onDelete: (task: Task) => void;
};

export function TaskSheet({ task, ...props }: TaskSheetProps) {
  return (
    <Sheet open={task !== null} label="Edit task" onClose={props.onClose}>
      {/* Keyed by id so the form resets for each task. */}
      {task && <TaskForm key={task.id} task={task} {...props} />}
    </Sheet>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={labelClass}>{label}</legend>
      <div className="mt-1.5 flex rounded-xl border border-line p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 flex-1 rounded-lg text-sm transition-colors",
              value === option.value ? "bg-fg text-surface" : "text-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function TaskForm({ task, areas, projects, onClose, onSave, onDelete }: Omit<TaskSheetProps, "task"> & { task: Task }) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [areaId, setAreaId] = useState(task.area_id ?? "");
  const [projectId, setProjectId] = useState(task.project_id ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // A project archived since the task was linked still shows in the picker.
  const projectOptions = projects.some((project) => project.id === task.project_id) || !task.project_id
    ? projects
    : [...projects, { id: task.project_id, name: "(archived project)" } as Project];

  function chooseProject(id: string) {
    setProjectId(id);
    // Default: a task takes its project's area. It can still be changed after.
    const project = projects.find((candidate) => candidate.id === id);
    if (project?.area_id) setAreaId(project.area_id);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({
      id: task.id,
      title: title.trim(),
      notes: notes.trim() || null,
      areaId: areaId || null,
      projectId: projectId || null,
      dueDate: dueDate || null,
      priority,
      status,
    });
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
      <SheetHeader title="Edit task" onClose={onClose} />

      <label className={labelClass}>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={300} className={fieldClass} />
      </label>

      <label className={labelClass}>
        Notes
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={5000} className={cn(fieldClass, "resize-y")} />
      </label>

      <Segmented
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: "todo", label: "To do" },
          { value: "doing", label: "Doing" },
          { value: "done", label: "Done" },
        ]}
      />

      <Segmented
        label="Priority"
        value={priority}
        onChange={setPriority}
        options={[
          { value: 1, label: "High" },
          { value: 2, label: "Normal" },
          { value: 3, label: "Low" },
        ]}
      />

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
          Project
          <select value={projectId} onChange={(event) => chooseProject(event.target.value)} className={fieldClass}>
            <option value="">None</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Due date
        <div className="flex gap-2">
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={fieldClass} />
          {dueDate && (
            <button type="button" onClick={() => setDueDate("")} className="mt-1.5 shrink-0 rounded-xl border border-line px-3 text-sm normal-case tracking-normal text-muted hover:border-fg hover:text-fg">
              Clear
            </button>
          )}
        </div>
      </label>

      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (!confirmDelete) return setConfirmDelete(true);
            onDelete(task);
            onClose();
          }}
          onBlur={() => setConfirmDelete(false)}
          className={cn(
            "min-h-11 rounded-full px-4 text-sm transition-colors",
            confirmDelete ? "bg-accent font-medium text-[#f0eee9]" : "text-muted hover:text-fg",
          )}
        >
          {confirmDelete ? "Tap again to delete" : "Delete"}
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-6 text-sm font-medium text-surface transition-[box-shadow,opacity] hover:shadow-[0_0_28px_var(--glow)] disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </form>
  );
}
