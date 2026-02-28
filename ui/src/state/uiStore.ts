/**
 * Zustand store for UI preferences that survive page navigation.
 *
 * - closedAccordionIds — set of accordion item IDs explicitly collapsed by the user
 * - tasksViewMode      — last selected view mode on the Tasks page
 * - releasesActiveTab  — last active tab on the Releases page
 *
 * Persisted to localStorage.
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TasksViewMode = 'table' | 'list' | 'kanban';
export type ReleasesTab = 'list' | 'active';

export interface UIStoreState {
  /** Accordion item values that the user has explicitly collapsed */
  closedAccordionIds: string[];
  /** Last selected view mode on the Tasks page */
  tasksViewMode: TasksViewMode;
  /** Whether to render the list view as a flat list (no board/lane/column grouping) */
  tasksListNoGrouping: boolean;
  /** Last active tab on the Releases page */
  releasesActiveTab: ReleasesTab;
}

export interface UIStoreActions {
  setClosedAccordionIds: (ids: string[]) => void;
  setTasksViewMode: (mode: TasksViewMode) => void;
  setTasksListNoGrouping: (value: boolean) => void;
  setReleasesActiveTab: (tab: ReleasesTab) => void;
}

export type UIStore = UIStoreState & UIStoreActions;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const LS_KEY = 'kaiten:ui';

function loadState(): Partial<UIStoreState> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Partial<UIStoreState>;
  } catch {
    // ignore
  }
  return {};
}

function persist(state: UIStoreState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const saved = loadState();

export const useUIStore = create<UIStore>((set, get) => ({
  closedAccordionIds:  saved.closedAccordionIds ?? [],
  tasksViewMode:       saved.tasksViewMode ?? 'table',
  tasksListNoGrouping: saved.tasksListNoGrouping ?? false,
  releasesActiveTab:   saved.releasesActiveTab ?? 'list',

  setClosedAccordionIds: (ids) => {
    const next = { ...get(), closedAccordionIds: ids };
    persist(next);
    set({ closedAccordionIds: ids });
  },

  setTasksViewMode: (mode) => {
    const next = { ...get(), tasksViewMode: mode };
    persist(next);
    set({ tasksViewMode: mode });
  },

  setTasksListNoGrouping: (value) => {
    const next = { ...get(), tasksListNoGrouping: value };
    persist(next);
    set({ tasksListNoGrouping: value });
  },

  setReleasesActiveTab: (tab) => {
    const next = { ...get(), releasesActiveTab: tab };
    persist(next);
    set({ releasesActiveTab: tab });
  },
}));
