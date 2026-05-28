export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "med" | "high";

export interface BoardTask {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface TasksBoardState {
  tasks: BoardTask[];
}

export const INITIAL_TASKS_BOARD_STATE: TasksBoardState = {
  tasks: [],
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "Pendiente",
  doing: "En curso",
  done: "Hecha",
};

export const STATUS_ORDER: TaskStatus[] = ["todo", "doing", "done"];

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Baja",
  med: "Media",
  high: "Alta",
};
