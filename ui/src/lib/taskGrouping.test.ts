import { describe, it, expect } from 'vitest';

import type { Task, Board, Column } from '@/api/types';
import { makeTask, makeBoard, makeColumn, makeLane } from '@/test/fixtures';

import { groupTasks } from './taskGrouping';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setup(tasks: Task[], boards: Board[], columns: Column[], boardId = 1) {
  return groupTasks(tasks, boards, { [boardId]: columns });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('groupTasks', () => {
  it('returns empty array for empty task list', () => {
    expect(groupTasks([], [], {})).toEqual([]);
  });

  it('groups tasks by board', () => {
    const board = makeBoard({ id: 1, lanes: [makeLane({ id: 10, boardId: 1 })] });
    const col = makeColumn({ id: 5, position: 1 });
    const task = makeTask({ id: 1, boardId: 1, laneId: 10, columnId: 5 });

    const groups = setup([task], [board], [col]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.board?.id).toBe(1);
    expect(groups[0]!.totalTasks).toBe(1);
  });

  it('groups tasks by lane within a board', () => {
    const board = makeBoard({
      id: 1,
      lanes: [makeLane({ id: 10, boardId: 1 }), makeLane({ id: 20, boardId: 1 })],
    });
    const col = makeColumn({ id: 5, position: 1 });
    const t1 = makeTask({ id: 1, boardId: 1, laneId: 10, columnId: 5 });
    const t2 = makeTask({ id: 2, boardId: 1, laneId: 20, columnId: 5 });

    const groups = setup([t1, t2], [board], [col]);
    expect(groups[0]!.laneGroups).toHaveLength(2);
  });

  it('groups tasks by column within a lane', () => {
    const board = makeBoard({ id: 1, lanes: [makeLane({ id: 10, boardId: 1 })] });
    const col1 = makeColumn({ id: 5, position: 1, name: 'Todo' });
    const col2 = makeColumn({ id: 6, position: 2, name: 'Done' });
    const t1 = makeTask({ id: 1, boardId: 1, laneId: 10, columnId: 5 });
    const t2 = makeTask({ id: 2, boardId: 1, laneId: 10, columnId: 6 });

    const groups = setup([t1, t2], [board], [col1, col2]);
    const laneGroup = groups[0]!.laneGroups[0]!;
    expect(laneGroup.columnGroups).toHaveLength(2);
    expect(laneGroup.columnGroups[0]!.column?.id).toBe(5);
    expect(laneGroup.columnGroups[1]!.column?.id).toBe(6);
  });

  it('sorts columns by position', () => {
    const board = makeBoard({ id: 1, lanes: [makeLane({ id: 10, boardId: 1 })] });
    const col1 = makeColumn({ id: 5, position: 2 });
    const col2 = makeColumn({ id: 6, position: 1 });
    const t1 = makeTask({ id: 1, boardId: 1, laneId: 10, columnId: 5 });
    const t2 = makeTask({ id: 2, boardId: 1, laneId: 10, columnId: 6 });

    const groups = setup([t1, t2], [board], [col1, col2]);
    const colGroups = groups[0]!.laneGroups[0]!.columnGroups;
    // col2 has position 1, should appear first
    expect(colGroups[0]!.column?.id).toBe(6);
    expect(colGroups[1]!.column?.id).toBe(5);
  });

  it('places tasks with unknown columnId in the null column group', () => {
    const board = makeBoard({ id: 1, lanes: [makeLane({ id: 10, boardId: 1 })] });
    const col = makeColumn({ id: 5, position: 1 });
    // columnId 99 does not exist in the column list
    const task = makeTask({ id: 1, boardId: 1, laneId: 10, columnId: 99 });

    const groups = setup([task], [board], [col]);
    const colGroups = groups[0]!.laneGroups[0]!.columnGroups;
    // The task lands in the "ungrouped" (null column) bucket
    const ungrouped = colGroups.find((cg) => cg.column === null);
    expect(ungrouped).toBeDefined();
    expect(ungrouped!.tasks[0]!.id).toBe(1);
  });

  it('handles tasks without boardId', () => {
    const task = makeTask({ id: 1, boardId: null, laneId: null, columnId: 5 });
    const groups = groupTasks([task], [], {});
    expect(groups).toHaveLength(1);
    expect(groups[0]!.board).toBe(null);
  });
});
