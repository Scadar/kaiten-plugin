import { create } from 'zustand';

export type LogEntryType = 'request' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: LogEntryType;
  url: string;
  status?: number;
  duration?: number;
  message: string;
  retryCount?: number;
  stack?: string;
  params?: Record<string, unknown>;
}

export interface LogStoreState {
  entries: LogEntry[];
}

export interface LogStoreActions {
  addEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
}

export type LogStore = LogStoreState & LogStoreActions;

const MAX_ENTRIES = 500;

export const useLogStore = create<LogStore>((set) => ({
  entries: [],

  addEntry: (entry) => {
    set((state) => {
      const newEntry: LogEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      };
      const entries = [newEntry, ...state.entries];
      return { entries: entries.slice(0, MAX_ENTRIES) };
    });
  },

  clear: () => set({ entries: [] }),
}));
