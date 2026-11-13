"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { setProjectArchived } from "@/app/os/(private)/actions/projects";
import { createTask, deleteTask, setTaskStatus, updateTask } from "@/app/os/(private)/actions/tasks";
import { AreaDot } from "@/components/os/area-dot";
import { EmptyState } from "@/components/os/empty-state";
import { ProgressBar } from "@/components/os/progress-bar";
import { ProjectForm } from "@/components/os/project-form";
import { QuickAdd, type QuickAddInput } from "@/components/os/quick-add";
import { TaskItem } from "@/components/os/task-item";
import { TaskSection } from "@/components/os/task-section";
import { TaskSheet } from "@/components/os/task-sheet";
import { Toast } from "@/components/os/toast";
import { formatDayLabel } from "@/lib/os/dates";
import { compareTasks } from "@/lib/os/group-tasks";
import type { TaskUpdateInput } from "@/lib/os/schemas";
import { draftTask, statusPatch, updatePatch, useOptimisticTasks } from "@/lib/os/use-optimistic-tasks";
import type { Area, Project, Task } from "@/types/database";

const STATUS_LABEL = { active: "Active", paused: "Paused", done: "Done" } as const;

type ProjectDetailProps = {
  project: Project;
  tasks: Task[];
  areas: Area[];
  projects: Project[];
  today: string;
};

export function ProjectDetail({ project, tasks: serverTasks, areas, projects, today }: ProjectDetailProps) {
  const router = useRouter();
  const { tasks, run, error, clearError } = useOptimisticTasks(serverTasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [restoring, startRestore] = useTransition();

  const area = areas.find((candidate) => candidate.id === project.area_id);
  const areaById = useMemo(() => new Map(areas.map((candidate) => [candidate.id, candidate])), [areas]);
  const open = tasks.filter((task) => task.status !== "done").sort(compareTasks);
  const done = tasks.filter((task) => task.status === "done");
  // Pickers include this project even when it's archived.
  const pickerProjects = projects.some((candidate) => candidate.id === project.id) ? projects : [...projects, project];

  function toggle(task: Task) {
    const status = task.status === "done" ? "todo" : "done";
    void run({ type: "patch", ids: [task.id], patch: statusPatch(status) }, () => setTaskStatus(task.id, status));
  }

  function add(input: QuickAddInput) {
    const areaId = input.areaId ?? project.area_id;
    const task = draftTask({ id: input.id, title: input.title, area_id: areaId, due_date: input.dueDate, project_id: project.id });
    void run({ type: "add", task }, () => createTask({ ...input, areaId, projectId: project.id }));
  }

  function save(input: TaskUpdateInput & { id: string }) {
    void run({ type: "patch", ids: [input.id], patch: updatePatch(input) }, () => updateTask(input));
  }

  function remove(task: Task) {
    void run({ type: "remove", id: task.id }, () => deleteTask(task.id));
  }

  const renderTask = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      today={today}
      area={task.area_id && task.area_id !== project.area_id ? areaById.get(task.area_id) : undefined}
      onToggle={toggle}
      onOpen={setEditingTask}
    />
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/os/projects" className="font-mono text-xs text-muted hover:text-fg">
        ← Projects
      </Link>

      {project.archived_at && (
        <div role="status" className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm">
          <span>This project is archived.</span>
          <button
            type="button"
            disabled={restoring}
            onClick={() => startRestore(async () => void (await setProjectArchived(project.id, false)))}
            className="font-medium underline decoration-line decoration-2 underline-offset-4 hover:decoration-fg"
          >
            Restore
          </button>
        </div>
      )}

      <header className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-bold tracking-tight sm:text-4xl">{project.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
            <span className="text-fg">{STATUS_LABEL[project.status]}</span>
            {area && (
              <span className="flex items-center gap-1.5">
                <AreaDot color={area.color} />
                {area.name}
              </span>
            )}
            {project.deadline && <span>Due {formatDayLabel(project.deadline, today)}</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingProject(true)}
          className="shrink-0 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-fg"
        >
          Edit
        </button>
      </header>

      {project.description && <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">{project.description}</p>}

      <div className="mt-6">
        <ProgressBar done={done.length} total={tasks.length} label="Project progress" />
        <p className="mt-2 font-mono text-xs text-muted">
          {tasks.length === 0 ? "No tasks yet" : `${done.length} of ${tasks.length} done`}
        </p>
      </div>

      <div className="mt-8">
        <QuickAdd
          areas={areas}
          today={today}
          defaultAreaId={project.area_id}
          dueTodayByDefault={false}
          placeholder="Add a task to this project…"
          onAdd={add}
        />
      </div>

      {tasks.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No tasks in this project yet.">Break it into the next few concrete steps.</EmptyState>
        </div>
      )}

      <TaskSection title="Open" count={open.length}>
        {open.map(renderTask)}
      </TaskSection>
      <TaskSection title="Done" count={done.length}>
        {done.map(renderTask)}
      </TaskSection>

      <TaskSheet
        task={editingTask}
        areas={areas}
        projects={pickerProjects}
        onClose={() => setEditingTask(null)}
        onSave={save}
        onDelete={remove}
      />
      <ProjectForm
        project={editingProject ? project : null}
        areas={areas}
        onClose={() => setEditingProject(false)}
        onArchived={() => router.push("/os/projects")}
      />
      <Toast toast={error ? { id: 0, text: error, tone: "error" } : null} onDismiss={clearError} />
    </div>
  );
}
