/**
 * Pure functions for grouping tasks into a Board → Lane → Column hierarchy.
 * Used by TaskList.tsx to build the accordion-based task view.
 */

import type { Task, Board, Column, Lane } from '@/api/types';

// ─── Grouping types ────────────────────────────────────────────────────────────

export interface ColumnGroup {
  column: Column | null;
  tasks: Task[];
}

export interface LaneGroup {
  lane: Lane | null;
  columnGroups: ColumnGroup[];
  totalTasks: number;
}

export interface BoardGroup {
  board: Board | null;
  laneGroups: LaneGroup[];
  totalTasks: number;
}

// ─── groupTasks ────────────────────────────────────────────────────────────────

/**
 * Groups a flat list of tasks into a Board → Lane → Column hierarchy.
 *
 * - Tasks without a boardId are grouped under a `null` board.
 * - Tasks with an unknown columnId land in a `null` column (ungrouped).
 * - Columns within each lane are sorted by their `position` field.
 */
export function groupTasks(
  tasks: Task[],
  boards: Board[],
  columnsByBoard: Record<number, Column[]>,
): BoardGroup[] {
  const boardMap = new Map<number, Board>(boards.map((b) => [b.id, b]));

  const tasksByBoard = new Map<number | null, Task[]>();
  for (const task of tasks) {
    const bid = task.boardId;
    if (!tasksByBoard.has(bid)) tasksByBoard.set(bid, []);
    tasksByBoard.get(bid)!.push(task);
  }

  const boardGroups: BoardGroup[] = [];

  for (const [boardId, boardTasks] of tasksByBoard) {
    const board = boardId !== null ? (boardMap.get(boardId) ?? null) : null;
    const laneMap = new Map<number, Lane>(board?.lanes.map((l) => [l.id, l]) ?? []);
    const columns = boardId !== null ? (columnsByBoard[boardId] ?? []) : [];
    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

    const tasksByLane = new Map<number | null, Task[]>();
    for (const task of boardTasks) {
      const lid = task.laneId;
      if (!tasksByLane.has(lid)) tasksByLane.set(lid, []);
      tasksByLane.get(lid)!.push(task);
    }

    const laneGroups: LaneGroup[] = [];

    for (const [laneId, laneTasks] of tasksByLane) {
      const lane = laneId !== null ? (laneMap.get(laneId) ?? null) : null;
      const columnGroups: ColumnGroup[] = [];

      if (sortedColumns.length > 0) {
        const tasksByColumn = new Map<number, Task[]>();
        for (const col of sortedColumns) tasksByColumn.set(col.id, []);
        const ungrouped: Task[] = [];

        for (const task of laneTasks) {
          const bucket = tasksByColumn.get(task.columnId);
          if (bucket !== undefined) bucket.push(task);
          else ungrouped.push(task);
        }

        for (const col of sortedColumns) {
          const colTasks = tasksByColumn.get(col.id) ?? [];
          if (colTasks.length > 0) columnGroups.push({ column: col, tasks: colTasks });
        }
        if (ungrouped.length > 0) columnGroups.push({ column: null, tasks: ungrouped });
      } else {
        columnGroups.push({ column: null, tasks: laneTasks });
      }

      laneGroups.push({ lane, columnGroups, totalTasks: laneTasks.length });
    }

    boardGroups.push({ board, laneGroups, totalTasks: boardTasks.length });
  }

  return boardGroups;
}
