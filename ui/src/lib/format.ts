/** Shared formatting utilities used across UI components. */

// ─── Kaiten URLs ──────────────────────────────────────────────────────────────

export function buildKaitenUrl(
  serverUrl: string,
  spaceId: number | null,
  cardId: number,
): string | null {
  if (!serverUrl || !spaceId) return null;
  try {
    return `${new URL(serverUrl).origin}/space/${spaceId}/boards/card/${cardId}`;
  } catch {
    return null;
  }
}

// ─── Task meta ────────────────────────────────────────────────────────────────

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'None', color: 'text-muted-foreground' },
  1: { label: 'Low', color: 'text-blue-400' },
  2: { label: 'Medium', color: 'text-yellow-400' },
  3: { label: 'High', color: 'text-orange-400' },
  4: { label: 'Critical', color: 'text-red-500' },
};

export const CONDITION_LABELS: Record<number, string> = {
  1: 'Active',
  2: 'Done',
  3: 'Archived',
};

// ─── HTML ─────────────────────────────────────────────────────────────────────

export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return (doc.body.textContent ?? '').trim();
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

// ─── Time tracker ─────────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function aggregateDailySeconds(
  branchEntries: Record<string, { daily: { date: string; seconds: number }[] }>,
): { date: string; seconds: number }[] {
  const dayMap = new Map<string, number>();
  for (const data of Object.values(branchEntries)) {
    for (const day of data.daily) {
      dayMap.set(day.date, (dayMap.get(day.date) ?? 0) + day.seconds);
    }
  }
  return Array.from(dayMap.entries())
    .map(([date, seconds]) => ({ date, seconds }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}
