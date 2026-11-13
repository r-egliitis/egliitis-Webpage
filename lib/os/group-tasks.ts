import type { Task } from "@/types/database";

export type TodayGroups = {
  overdue: Task[];
  today: Task[];
  doing: Task[];
  noDate: Task[];
};

// Most urgent first: priority (1 = high), then due date, then oldest first.
export function compareTasks(a: Task, b: Task): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  return a.created_at < b.created_at ? -1 : 1;
}

/**
 * Splits open tasks into the Today screen's sections. Status beats date:
 * anything in progress is under Doing, whatever its due date. Tasks due after
 * today, and done tasks, are left out (they live on /os/tasks).
 */
export function groupTodayTasks(tasks: Task[], today: string): TodayGroups {
  const groups: TodayGroups = { overdue: [], today: [], doing: [], noDate: [] };

  for (const task of tasks) {
    if (task.status === "done") continue;
    if (task.status === "doing") groups.doing.push(task);
    else if (!task.due_date) groups.noDate.push(task);
    else if (task.due_date < today) groups.overdue.push(task);
    else if (task.due_date === today) groups.today.push(task);
  }

  groups.overdue.sort(compareTasks);
  groups.today.sort(compareTasks);
  groups.doing.sort(compareTasks);
  groups.noDate.sort(compareTasks);
  return groups;
}
