import { useState, useEffect, useRef, useCallback } from "react";
import { INITIAL_TASKS_BOARD_STATE, type TasksBoardState, type BoardTask, type TaskStatus, type TaskPriority } from "@/data/tasksBoardData";

const API_URL = "/api/tasks-board";

export interface TasksBoardMeta {
  lastEditedBy: string;
  lastEditedByEmail: string;
  lastEditedByOrg: string;
  lastEditedAt: string;
}

export function useTasksBoardApi() {
  const [state, setStateInner] = useState<TasksBoardState>(INITIAL_TASKS_BOARD_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TasksBoardMeta | null>(null);
  const initialLoadDone = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingCount = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API_URL, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.meta) setMeta(data.meta);
        if (data.state && typeof data.state === "object") {
          setStateInner(merge(data.state));
        }
      } catch (err) {
        console.error("Failed to load tasks board:", err);
        setError("Failed to load from server");
      } finally {
        if (!cancelled) {
          initialLoadDone.current = true;
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function saveToServer(next: TasksBoardState) {
    try {
      savingCount.current++;
      setSaving(true);
      const res = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ state: next }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      if (result.meta) setMeta(result.meta);
      setLastSaved(new Date());
      setError(null);
    } catch (err: any) {
      console.error("Failed to save tasks board:", err);
      setError(err.message || "Failed to save");
    } finally {
      savingCount.current--;
      if (savingCount.current <= 0) {
        savingCount.current = 0;
        setSaving(false);
      }
    }
  }

  const scheduleSave = useCallback((next: TasksBoardState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (initialLoadDone.current) saveToServer(next);
    }, 500);
  }, []);

  const setState = useCallback((updater: TasksBoardState | ((prev: TasksBoardState) => TasksBoardState)) => {
    setStateInner(prev => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const addTask = useCallback((partial: Partial<BoardTask>) => {
    const now = new Date().toISOString();
    const t: BoardTask = {
      id: crypto.randomUUID(),
      title: partial.title || "Nueva tarea",
      notes: partial.notes || "",
      status: (partial.status as TaskStatus) || "todo",
      priority: (partial.priority as TaskPriority) || "med",
      assignee: partial.assignee || "",
      dueDate: partial.dueDate || "",
      createdAt: now,
      updatedAt: now,
      sourceKey: partial.sourceKey,
      sourceType: partial.sourceType,
      unmatched: partial.unmatched,
    };
    setState(prev => ({ ...prev, tasks: [...prev.tasks, t] }));
    return t;
  }, [setState]);

  const updateTask = useCallback((id: string, patch: Partial<BoardTask>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t),
    }));
  }, [setState]);

  const deleteTask = useCallback((id: string) => {
    setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  }, [setState]);

  return { state, setState, loading, saving, lastSaved, error, meta, addTask, updateTask, deleteTask };
}

function merge(persisted: any): TasksBoardState {
  const tasks: BoardTask[] = Array.isArray(persisted?.tasks)
    ? persisted.tasks.map((t: any) => ({
        id: typeof t?.id === "string" ? t.id : crypto.randomUUID(),
        title: typeof t?.title === "string" ? t.title : "",
        notes: typeof t?.notes === "string" ? t.notes : "",
        status: ["todo", "doing", "done"].includes(t?.status) ? t.status : "todo",
        priority: ["low", "med", "high"].includes(t?.priority) ? t.priority : "med",
        assignee: typeof t?.assignee === "string" ? t.assignee : "",
        dueDate: typeof t?.dueDate === "string" ? t.dueDate : "",
        createdAt: typeof t?.createdAt === "string" ? t.createdAt : new Date().toISOString(),
        updatedAt: typeof t?.updatedAt === "string" ? t.updatedAt : new Date().toISOString(),
        linkedBudgetItem: t?.linkedBudgetItem && typeof t.linkedBudgetItem === "object" && typeof t.linkedBudgetItem.id === "string"
          ? {
              id: t.linkedBudgetItem.id,
              label: typeof t.linkedBudgetItem.label === "string" ? t.linkedBudgetItem.label : "",
              evento: typeof t.linkedBudgetItem.evento === "string" ? t.linkedBudgetItem.evento : undefined,
              area: typeof t.linkedBudgetItem.area === "string" ? t.linkedBudgetItem.area : undefined,
              centroCosto: typeof t.linkedBudgetItem.centroCosto === "string" ? t.linkedBudgetItem.centroCosto : undefined,
            }
          : undefined,
        sourceKey: typeof t?.sourceKey === "string" ? t.sourceKey : undefined,
        sourceType: typeof t?.sourceType === "string" ? t.sourceType : undefined,
        unmatched: typeof t?.unmatched === "boolean" ? t.unmatched : undefined,
      }))
    : [];
  return { tasks };
}
