/**
 * Factory functions for TanStack Table column definitions used in releases.tsx.
 * Extracting them here makes them independently testable and reusable.
 */

import { type ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Check, ExternalLink, GitBranch, Star, X } from 'lucide-react';

import type { Task } from '@/api/types';
import { buildKaitenUrl } from '@/lib/format';
import { cn } from '@/lib/utils';

// ─── External link column ─────────────────────────────────────────────────────

export interface ExternalLinkColumnOptions {
  serverUrl: string;
  spaceId: number | null;
}

export function makeExternalLinkColumn({
  serverUrl,
  spaceId,
}: ExternalLinkColumnOptions): ColumnDef<Task> {
  return {
    id: 'actions',
    enableHiding: false,
    enableSorting: false,
    header: undefined,
    cell: ({ row }) => {
      const url = buildKaitenUrl(serverUrl, spaceId, row.original.id);
      if (!url) return null;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-primary opacity-0 transition-all group-hover/row:opacity-100"
          title="Open in Kaiten"
        >
          <ExternalLink size={11} />
        </a>
      );
    },
    size: 24,
  };
}

// ─── Active-star column ───────────────────────────────────────────────────────

export interface ActiveStarColumnOptions {
  activeCardId: number | null;
  onSetActive: (id: number) => void;
}

export function makeActiveStarColumn({
  activeCardId,
  onSetActive,
}: ActiveStarColumnOptions): ColumnDef<Task> {
  return {
    id: 'active',
    enableHiding: false,
    enableSorting: false,
    header: () => (
      <span title="Mark as active release">
        <Star size={11} className="text-muted-foreground/50" />
      </span>
    ),
    cell: ({ row }) => {
      const isActive = row.original.id === activeCardId;
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetActive(row.original.id);
          }}
          title={isActive ? 'Remove as active release' : 'Set as active release'}
          className={cn(
            'flex items-center justify-center transition-colors',
            isActive
              ? 'text-primary'
              : 'text-muted-foreground hover:text-primary opacity-20 group-hover/row:opacity-60 hover:!opacity-100',
          )}
        >
          {isActive ? <Star size={12} fill="currentColor" /> : <Star size={12} />}
        </button>
      );
    },
    size: 28,
  };
}

// ─── Branch-status column ─────────────────────────────────────────────────────

export interface BranchStatusColumnOptions {
  releaseBranch: string | null;
  branchPatterns: string[];
  branchResults: Record<string, boolean> | undefined;
  isLoading: boolean;
  error: Error | null;
}

export function makeBranchStatusColumn({
  releaseBranch,
  branchPatterns,
  branchResults,
  isLoading,
  error,
}: BranchStatusColumnOptions): ColumnDef<Task> {
  return {
    id: 'branchStatus',
    enableHiding: false,
    enableSorting: false,
    header: () => <GitBranch size={12} className="text-muted-foreground" />,
    cell: ({ row }) => {
      if (!releaseBranch) {
        return <span className="text-muted-foreground text-xs opacity-30">—</span>;
      }
      if (isLoading) {
        return <span className="text-muted-foreground text-xs opacity-40">…</span>;
      }
      if (error) {
        return (
          <AlertCircle
            size={12}
            className="text-destructive opacity-60"
            aria-label={error.message}
          />
        );
      }
      const candidates = branchPatterns.map((p) => p.replace('{id}', String(row.original.id)));
      const matchedBranch = candidates.find((b) => branchResults?.[b] === true);
      return matchedBranch ? (
        <Check
          size={12}
          className="text-green-500"
          aria-label={`${matchedBranch} is in the release branch`}
        />
      ) : (
        <X
          size={12}
          className="text-muted-foreground opacity-50"
          aria-label={`Not found: ${candidates.join(', ')}`}
        />
      );
    },
    size: 36,
  };
}
