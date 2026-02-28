/**
 * Generic DataTable component following the shadcn/ui Data Table pattern.
 * https://ui.shadcn.com/docs/components/data-table
 *
 * Features: sorting, column filters, column visibility, row selection, pagination.
 */
import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type Table as TanTable,
  type Column,
} from '@tanstack/react-table';
import { ChevronDown, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// DataTableColumnHeader — sortable header cell (re-export for column defs)
// ---------------------------------------------------------------------------

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <Text variant="secondary" className={cn('font-medium', className)}>{title}</Text>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-auto p-0 font-medium text-muted-foreground hover:text-foreground text-[length:var(--ide-font-size-sm)] -ml-1 px-1', className)}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {title}
      <span className="ml-1 opacity-60">
        {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
      </span>
    </Button>
  );
}

// ---------------------------------------------------------------------------
// DataTableViewOptions — column visibility toggle (dropdown)
// ---------------------------------------------------------------------------

export function DataTableViewOptions<TData>({ table }: { table: TanTable<TData> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto">
          Columns <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((col) => col.getCanHide())
          .map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              className="capitalize"
              checked={col.getIsVisible()}
              onCheckedChange={(value) => col.toggleVisibility(value)}
            >
              {col.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// DataTablePagination
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function DataTablePagination<TData>({
  table,
  pageIndex,
  pageSize,
  setPagination,
}: {
  table: TanTable<TData>;
  pageIndex: number;
  pageSize: number;
  setPagination: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>;
}) {
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = Math.ceil(totalRows / pageSize) || 1;
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);

  // Derive disabled state directly from React state (avoids TanStack Table
  // getCanPreviousPage/getCanNextPage stale-closure issues with controlled state)
  const isFirstPage = pageIndex === 0;
  const isLastPage  = pageIndex >= pageCount - 1;

  const goTo = (idx: number) =>
    setPagination((prev) => ({ ...prev, pageIndex: idx }));

  return (
    <Stack direction="row" align="center" className="px-2 py-2 w-full justify-between">
      {/* Left: page size selector + row range */}
      <Stack direction="row" align="center" spacing="2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="xs" className="gap-1 text-muted-foreground">
              {pageSize}
              <ChevronDown size={11} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-20 min-w-0">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <DropdownMenuCheckboxItem
                key={size}
                checked={pageSize === size}
                onCheckedChange={() =>
                  setPagination({ pageIndex: 0, pageSize: size })
                }
              >
                {size}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Text variant="dimmed">
          {totalRows === 0 ? '0' : `${from}–${to}`} / {totalRows}
        </Text>
      </Stack>

      <Stack direction="row" align="center" spacing="2">
        {/* Page indicator */}
        <Text variant="dimmed">
          {pageIndex + 1} / {pageCount}
        </Text>

        {/* Navigation buttons */}
        <Stack direction="row" align="center" spacing="2">
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => goTo(0)}
            disabled={isFirstPage}
          >
            <ChevronsLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => goTo(pageIndex - 1)}
            disabled={isFirstPage}
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => goTo(pageIndex + 1)}
            disabled={isLastPage}
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => goTo(pageCount - 1)}
            disabled={isLastPage}
          >
            <ChevronsRight size={14} />
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// DataTable — main generic component
// ---------------------------------------------------------------------------

export type DataTableProps<TData, TValue = unknown> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Called when a body row is clicked */
  onRowClick?: (row: TData) => void;
  /** Extra CSS class for the wrapper */
  className?: string;
  /** Page size for pagination (default: 50, set 0 to disable pagination) */
  pageSize?: number;
  /** Show the column-visibility toggle toolbar */
  showViewOptions?: boolean;
  /** Message shown when data is empty */
  emptyMessage?: string;
}

export function DataTable<TData, TValue = unknown>({
  columns,
  data,
  onRowClick,
  className,
  pageSize = 10,
  showViewOptions = false,
  emptyMessage = 'No results.',
}: DataTableProps<TData, TValue>) {
  const [sorting,          setSorting]          = React.useState<SortingState>([]);
  const [columnFilters,    setColumnFilters]    = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection,     setRowSelection]     = React.useState<RowSelectionState>({});
  const [pagination,       setPagination]       = React.useState({ pageIndex: 0, pageSize });

  const enablePagination = pageSize > 0;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(enablePagination && { pagination }),
    },
    enableRowSelection: true,
    onSortingChange:          setSorting,
    onColumnFiltersChange:    setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange:     setRowSelection,
    ...(enablePagination && {
      onPaginationChange:    setPagination,
      getPaginationRowModel: getPaginationRowModel(),
    }),
    getCoreRowModel:       getCoreRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
  });

  return (
    <Stack className={cn('w-full', className)}>
      {/* Optional toolbar: column visibility */}
      {showViewOptions && (
        <Stack direction="row" align="center" justify="end" className="py-4">
          <DataTableViewOptions table={table} />
        </Stack>
      )}

      {/* Table inside the card container — no extra border needed */}
      <div className="overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    onRowClick && 'cursor-pointer',
                    row.getIsSelected() && 'bg-muted'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <DataTablePagination
          table={table}
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          setPagination={setPagination}
        />
      )}
    </Stack>
  );
}
