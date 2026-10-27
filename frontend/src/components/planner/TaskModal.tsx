import { useState } from "react";
import { Plus, X } from "lucide-react";

import {
  PLANNER_CATEGORY_COLOR_ORDER,
  PLANNER_CATEGORY_META,
  PLANNER_PRIORITY_META,
  PLANNER_STATUS_META,
} from "../../utils/plannerColors";
import { formatMinuteOfDay } from "../../utils/plannerDates";
import { usePlannerStore } from "../../store/plannerStore";
import type { PlannerCategoryColor, PlannerPriority, PlannerStatus, PlannerTask } from "../../services/plannerApi";
import { PLANNER_PRIORITIES, PLANNER_STATUSES } from "../../services/plannerApi";

// Create/edit modal for a single planner task, shared by all three
// screens (Dashboard quick-add, Week grid slot-click, Month tile
// "+ task"). Editing is just the same form pre-filled plus a Delete
// button -- there's no second "edit task" component.
export default function TaskModal({
  onClose,
  onSaved,
  onDeleted,
  initialDate,
  initialMinute,
  task,
}: {
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
  initialDate: string; // YYYY-MM-DD, used only when creating
  initialMinute?: number | null;
  task?: PlannerTask | null;
}) {
  const categories = usePlannerStore((s) => s.categories);
  const addCategory = usePlannerStore((s) => s.addCategory);
  const addTask = usePlannerStore((s) => s.addTask);
  const editTask = usePlannerStore((s) => s.editTask);
  const removeTask = usePlannerStore((s) => s.removeTask);

  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(task?.category?.id ?? null);
  const [priority, setPriority] = useState<PlannerPriority>(task?.priority ?? "medium");
  const [status, setStatus] = useState<PlannerStatus>(task?.status ?? "todo");
  const [dueDate, setDueDate] = useState(task?.due_date ?? initialDate);
  const [scheduled, setScheduled] = useState(task ? task.start_minute !== null : initialMinute != null);
  const [startMinute, setStartMinute] = useState<number>(task?.start_minute ?? initialMinute ?? 9 * 60);
  const [durationMinutes, setDurationMinutes] = useState<number>(task?.duration_minutes ?? 60);

  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState<PlannerCategoryColor>("lavender");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const created = await addCategory({ name: newCategoryName.trim(), color: newCategoryColor });
    setCategoryId(created.id);
    setNewCategoryName("");
    setNewCategoryOpen(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Give this task a title.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && task) {
        await editTask(task.id, {
          status,
          title: title.trim(),
          description: description.trim() || null,
          category_id: categoryId,
          clear_category: categoryId === null,
          priority,
          due_date: dueDate,
          start_minute: scheduled ? startMinute : null,
          clear_start: !scheduled,
          duration_minutes: scheduled ? durationMinutes : null,
        });
      } else {
        await addTask({
          title: title.trim(),
          description: description.trim() || null,
          category_id: categoryId,
          priority,
          due_date: dueDate,
          start_minute: scheduled ? startMinute : null,
          duration_minutes: scheduled ? durationMinutes : null,
        });
      }
      onSaved();
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Couldn't save this task — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setSubmitting(true);
    try {
      await removeTask(task.id);
      onDeleted?.();
    } catch {
      setError("Couldn't delete this task — please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-nexus-border bg-nexus-surface shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-nexus-border">
          <h2 className="font-display font-semibold">{isEditing ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="text-nexus-muted hover:text-nexus-text">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
            className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm outline-none focus:border-nexus-accentDim"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Notes (optional)"
            className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm outline-none focus:border-nexus-accentDim resize-none"
          />

          <div>
            <p className="text-xs font-medium text-nexus-muted mb-1.5">Priority</p>
            <div className="flex gap-2">
              {PLANNER_PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                    priority === p ? PLANNER_PRIORITY_META[p].chipClass : "border-nexus-border text-nexus-muted hover:text-nexus-text"
                  }`}
                >
                  {PLANNER_PRIORITY_META[p].label}
                </button>
              ))}
            </div>
          </div>

          {isEditing && (
            <div>
              <p className="text-xs font-medium text-nexus-muted mb-1.5">Status</p>
              <div className="flex gap-2">
                {PLANNER_STATUSES.map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatus(st)}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      status === st ? "border-nexus-accent bg-nexus-accent/10 text-nexus-accent" : "border-nexus-border text-nexus-muted hover:text-nexus-text"
                    }`}
                  >
                    {PLANNER_STATUS_META[st].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-nexus-muted mb-1.5">Category</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryId(null)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  categoryId === null ? "border-nexus-text text-nexus-text" : "border-nexus-border text-nexus-muted hover:text-nexus-text"
                }`}
              >
                None
              </button>
              {categories.map((c) => {
                const meta = PLANNER_CATEGORY_META[c.color] ?? PLANNER_CATEGORY_META.slate;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      categoryId === c.id ? meta.chipClass : "border-nexus-border text-nexus-muted hover:text-nexus-text"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                    {c.name}
                  </button>
                );
              })}
              <button
                onClick={() => setNewCategoryOpen((v) => !v)}
                className="flex items-center gap-1 rounded-full border border-dashed border-nexus-border px-2.5 py-1 text-xs text-nexus-muted hover:text-nexus-text"
              >
                <Plus size={12} /> New
              </button>
            </div>

            {newCategoryOpen && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-nexus-border bg-nexus-bg p-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <div className="flex gap-1">
                  {PLANNER_CATEGORY_COLOR_ORDER.filter((c) => c !== "slate").map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewCategoryColor(c)}
                      className={`h-5 w-5 rounded-full ${PLANNER_CATEGORY_META[c].dotClass} ${
                        newCategoryColor === c ? "ring-2 ring-nexus-text ring-offset-1 ring-offset-nexus-bg" : ""
                      }`}
                      aria-label={c}
                    />
                  ))}
                </div>
                <button onClick={handleCreateCategory} className="text-xs font-medium text-nexus-accent hover:text-nexus-data">
                  Add
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-nexus-muted mb-1.5">Date</p>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-nexus-border bg-nexus-bg px-3 py-2 text-sm outline-none focus:border-nexus-accentDim"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-nexus-muted">
            <input type="checkbox" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
            Schedule a time (otherwise shows in "No time")
          </label>

          {scheduled && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium text-nexus-muted mb-1.5">Start — {formatMinuteOfDay(startMinute)}</p>
                <input
                  type="range"
                  min={0}
                  max={1425}
                  step={15}
                  value={startMinute}
                  onChange={(e) => setStartMinute(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-nexus-muted mb-1.5">Duration — {durationMinutes} min</p>
                <input
                  type="range"
                  min={15}
                  max={240}
                  step={15}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-nexus-bad">{error}</p>}

          <div className="flex gap-2 pt-1">
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="rounded-lg border border-nexus-bad/40 px-3 py-2 text-sm font-medium text-nexus-bad hover:bg-nexus-bad/10 disabled:opacity-50 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-lg bg-nexus-accent py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving…" : isEditing ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
