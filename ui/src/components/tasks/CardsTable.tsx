import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Text } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import type { Task, TaskMember } from '@/api/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CardColumnKey = 'id' | 'title' | 'column' | 'responsible' | 'members' | 'dueDate';

/**
 * Each entry is either a built-in column key or a custom ColumnDef<Task>.
 * This lets callers mix standard columns with one-off custom columns while
 * preserving exact insertion order.
 *
 * @example
 * columns={['id', 'title', branchStatusDef, 'column', 'responsible', 'members', 'dueDate', actionsDef]}
 */
export type ColumnConfig = CardColumnKey | ColumnDef<Task>;

const DEFAULT_COLUMNS: ColumnConfig[] = ['id', 'title', 'column', 'responsible', 'members'];

export interface CardsTableProps {
  tasks: Task[];
  /** Map of columnId → column name for display */
  columnMap?: Record<number, string>;
  /** Which columns to show and in what order (default: id, title, column, responsible, members) */
  columns?: ColumnConfig[];
  onRowClick?: (taskId: number) => void;
  className?: string;
  pageSize?: number;
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// Avatar helpers
// ---------------------------------------------------------------------------

function getAvatarSrc(member: TaskMember): string {
  return member.avatar_type === 3
    ? member.avatar_uploaded_url
    : member.avatar_initials_url;
}

// Single avatar with tooltip showing full name
function MemberAvatar({ member }: { member: TaskMember }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className="size-6 ring-2 ring-background cursor-default">
          <AvatarImage src={getAvatarSrc(member)} alt={member.fullName} />
          <AvatarFallback className="text-[9px]">{member.initials}</AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>{member.fullName}</TooltipContent>
    </Tooltip>
  );
}

// Overlapping avatar group (Avatar Group Count pattern) with a single tooltip
// listing every member's full name.
function MembersAvatarGroup({
  members,
  maxVisible = 3,
}: {
  members: TaskMember[];
  maxVisible?: number;
}) {
  if (members.length === 0) {
    return <Text variant="secondary" className="opacity-40">—</Text>;
  }

  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;
  const allNames = members.map((m) => m.fullName).join('\n');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex -space-x-1.5 w-fit cursor-default">
          {visible.map((m) => (
            <Avatar key={m.id} className="size-5 ring-2 ring-background">
              <AvatarImage src={getAvatarSrc(m)} alt={m.fullName} />
              <AvatarFallback className="text-[8px]">{m.initials}</AvatarFallback>
            </Avatar>
          ))}
          {overflow > 0 && (
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full ring-2 ring-background bg-muted text-[9px] font-medium text-muted-foreground">
              +{overflow}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-[220px] whitespace-pre-wrap">
        {allNames}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Built-in column definition factories
// ---------------------------------------------------------------------------

function makeIdColumn(): ColumnDef<Task> {
  return {
    id: 'id',
    accessorKey: 'id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <button
          className={cn(
            'flex items-center gap-1 font-mono text-[length:var(--ide-font-size-xs)]',
            'text-muted-foreground hover:text-foreground transition-colors group/id',
          )}
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(String(id));
            toast.success(`ID #${id} скопирован`);
          }}
          title="Копировать ID"
        >
          #{id}
          <Copy
            size={10}
            className="opacity-0 group-hover/id:opacity-60 transition-opacity shrink-0"
          />
        </button>
      );
    },
    size: 64,
  };
}

function makeTitleColumn(): ColumnDef<Task> {
  return {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => {
      const title = row.original.title;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Text
              variant="body"
              className="block w-full truncate cursor-default"
            >
              {title}
            </Text>
          </TooltipTrigger>
          <TooltipContent className="max-w-[320px] whitespace-normal break-words">
            {title}
          </TooltipContent>
        </Tooltip>
      );
    },
    // No explicit size → column takes all remaining space in table-fixed layout
  };
}

function makeColumnColumn(columnMap: Record<number, string>): ColumnDef<Task> {
  return {
    id: 'column',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Column" />,
    accessorFn: (row) => columnMap[row.columnId] ?? `#${row.columnId}`,
    cell: ({ row }) => {
      const name = columnMap[row.original.columnId] ?? `#${row.original.columnId}`;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Text variant="secondary" className="block truncate cursor-default">
              {name}
            </Text>
          </TooltipTrigger>
          <TooltipContent>{name}</TooltipContent>
        </Tooltip>
      );
    },
    enableSorting: true,
    sortingFn: (a, b) => {
      const nameA = columnMap[a.original.columnId] ?? '';
      const nameB = columnMap[b.original.columnId] ?? '';
      return nameA.localeCompare(nameB);
    },
    size: 100,
  };
}

function makeResponsibleColumn(): ColumnDef<Task> {
  return {
    id: 'responsible',
    header: () => <Text variant="secondary" className="font-medium">Responsible</Text>,
    cell: ({ row }) => {
      const responsible = row.original.participants?.find((p) => p.type === 2) ?? null;
      if (!responsible) {
        return <Text variant="secondary" className="opacity-40">—</Text>;
      }
      return <MemberAvatar member={responsible} />;
    },
    enableSorting: false,
    size: 90,
  };
}

function makeMembersColumn(): ColumnDef<Task> {
  return {
    id: 'members',
    header: () => <Text variant="secondary" className="font-medium">Members</Text>,
    cell: ({ row }) => {
      const members = (row.original.participants ?? []).filter((p) => p.type === 1);
      return <MembersAvatarGroup members={members} />;
    },
    enableSorting: false,
    size: 90,
  };
}

function makeDueDateColumn(): ColumnDef<Task> {
  return {
    id: 'dueDate',
    accessorKey: 'dueDate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Due" />,
    cell: ({ row }) => {
      const date = row.original.dueDate;
      if (!date) return <Text variant="secondary" className="opacity-40">—</Text>;
      return (
        <Text variant="secondary" className="tabular-nums whitespace-nowrap">
          {new Date(date).toLocaleDateString()}
        </Text>
      );
    },
    sortingFn: (a, b) => {
      const da = a.original.dueDate ? new Date(a.original.dueDate).getTime() : Infinity;
      const db = b.original.dueDate ? new Date(b.original.dueDate).getTime() : Infinity;
      return da - db;
    },
    size: 80,
  };
}

// ---------------------------------------------------------------------------
// Column resolution
// ---------------------------------------------------------------------------

function resolveColumns(
  configs: ColumnConfig[],
  columnMap: Record<number, string>,
): ColumnDef<Task>[] {
  return configs.map((config) => {
    if (typeof config !== 'string') return config as ColumnDef<Task>;

    switch (config) {
      case 'id':          return makeIdColumn();
      case 'title':       return makeTitleColumn();
      case 'column':      return makeColumnColumn(columnMap);
      case 'responsible': return makeResponsibleColumn();
      case 'members':     return makeMembersColumn();
      case 'dueDate':     return makeDueDateColumn();
    }
  });
}

// ---------------------------------------------------------------------------
// CardsTable
// ---------------------------------------------------------------------------

export function CardsTable({
  tasks,
  columnMap = {},
  columns = DEFAULT_COLUMNS,
  onRowClick,
  className,
  pageSize = 10,
  emptyMessage = 'No cards found',
}: CardsTableProps) {
  const columnDefs = useMemo(
    () => resolveColumns(columns, columnMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, columnMap],
  );

  return (
    <DataTable
      columns={columnDefs}
      data={tasks}
      onRowClick={onRowClick ? (row) => onRowClick(row.id) : undefined}
      className={cn('[&_tr]:group/row', className)}
      pageSize={pageSize}
      emptyMessage={emptyMessage}
    />
  );
}
