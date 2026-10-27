import { create } from "zustand";

import {
  createPlannerCategory,
  createPlannerTask,
  deletePlannerCategory,
  deletePlannerTask,
  fetchPlannerCategories,
  fetchPlannerSettings,
  reschedulePlannerTask,
  updatePlannerSettings,
  updatePlannerTask,
  type PlannerCategory,
  type PlannerCategoryCreate,
  type PlannerReschedule,
  type PlannerSettings,
  type PlannerSettingsUpdate,
  type PlannerTask,
  type PlannerTaskCreate,
  type PlannerTaskUpdate,
} from "../services/plannerApi";

// Study Planner store (2026-10-07). Holds only the two things genuinely
// shared across all three screens -- the category list and the per-user
// settings (week_start, heatmap_measure). Tasks/habits/overviews are NOT
// cached here: each screen's own day/week/month overview endpoint already
// returns exactly the shape that screen needs, so the task/habit CRUD
// helpers below just call the API and let the calling screen refetch its
// own overview afterward -- no second source of truth to keep in sync.
interface PlannerState {
  categories: PlannerCategory[];
  categoriesLoaded: boolean;
  settings: PlannerSettings;
  settingsLoaded: boolean;

  loadCategories: () => Promise<void>;
  addCategory: (payload: PlannerCategoryCreate) => Promise<PlannerCategory>;
  removeCategory: (categoryId: number) => Promise<void>;

  loadSettings: () => Promise<void>;
  saveSettings: (payload: PlannerSettingsUpdate) => Promise<void>;

  addTask: (payload: PlannerTaskCreate) => Promise<PlannerTask>;
  editTask: (taskId: number, payload: PlannerTaskUpdate) => Promise<PlannerTask>;
  removeTask: (taskId: number) => Promise<void>;
  rescheduleTask: (taskId: number, payload: PlannerReschedule) => Promise<PlannerTask>;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  categories: [],
  categoriesLoaded: false,
  settings: { week_start: 1, heatmap_measure: "hours" },
  settingsLoaded: false,

  loadCategories: async () => {
    const categories = await fetchPlannerCategories();
    set({ categories, categoriesLoaded: true });
  },

  addCategory: async (payload) => {
    const category = await createPlannerCategory(payload);
    set({ categories: [...get().categories, category] });
    return category;
  },

  removeCategory: async (categoryId) => {
    await deletePlannerCategory(categoryId);
    set({ categories: get().categories.filter((c) => c.id !== categoryId) });
  },

  loadSettings: async () => {
    const settings = await fetchPlannerSettings();
    set({ settings, settingsLoaded: true });
  },

  saveSettings: async (payload) => {
    const settings = await updatePlannerSettings(payload);
    set({ settings });
  },

  addTask: (payload) => createPlannerTask(payload),
  editTask: (taskId, payload) => updatePlannerTask(taskId, payload),
  removeTask: (taskId) => deletePlannerTask(taskId),
  rescheduleTask: (taskId, payload) => reschedulePlannerTask(taskId, payload),
}));
