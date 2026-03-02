import { describe, it, expect } from 'vitest';

import {
  buildKaitenUrl,
  formatDuration,
  formatMinutes,
  formatDate,
  formatDateTime,
  formatRelativeDate,
  aggregateDailySeconds,
  PRIORITY_LABELS,
  CONDITION_LABELS,
} from './format';

// ─── buildKaitenUrl ────────────────────────────────────────────────────────────

describe('buildKaitenUrl', () => {
  it('builds a correct URL', () => {
    expect(buildKaitenUrl('https://example.kaiten.ru', 42, 100)).toBe(
      'https://example.kaiten.ru/space/42/boards/card/100',
    );
  });

  it('returns null when serverUrl is empty', () => {
    expect(buildKaitenUrl('', 1, 1)).toBe(null);
  });

  it('returns null when spaceId is null', () => {
    expect(buildKaitenUrl('https://example.kaiten.ru', null, 1)).toBe(null);
  });

  it('returns null for an invalid URL', () => {
    expect(buildKaitenUrl('not-a-url', 1, 1)).toBe(null);
  });

  it('strips the path from serverUrl (uses origin only)', () => {
    expect(buildKaitenUrl('https://example.kaiten.ru/extra/path', 1, 5)).toBe(
      'https://example.kaiten.ru/space/1/boards/card/5',
    );
  });
});

// ─── formatDuration ────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats seconds below 60', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats exact minutes', () => {
    expect(formatDuration(120)).toBe('2m');
  });

  it('formats hours + minutes', () => {
    expect(formatDuration(3700)).toBe('1h 1m');
  });

  it('formats whole hours without trailing minutes', () => {
    expect(formatDuration(7200)).toBe('2h');
  });
});

// ─── formatMinutes ────────────────────────────────────────────────────────────

describe('formatMinutes', () => {
  it('formats minutes below 60', () => {
    expect(formatMinutes(30)).toBe('30m');
  });

  it('formats exact hours', () => {
    expect(formatMinutes(60)).toBe('1h');
  });

  it('formats hours and remaining minutes', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
  });
});

// ─── aggregateDailySeconds ────────────────────────────────────────────────────

describe('aggregateDailySeconds', () => {
  it('returns empty array for empty input', () => {
    expect(aggregateDailySeconds({})).toEqual([]);
  });

  it('sums seconds from multiple branches for the same date', () => {
    const result = aggregateDailySeconds({
      branch1: { daily: [{ date: '2024-01-01', seconds: 100 }] },
      branch2: { daily: [{ date: '2024-01-01', seconds: 200 }] },
    });
    expect(result).toEqual([{ date: '2024-01-01', seconds: 300 }]);
  });

  it('keeps separate entries for different dates and sorts them', () => {
    const result = aggregateDailySeconds({
      branch: {
        daily: [
          { date: '2024-01-02', seconds: 50 },
          { date: '2024-01-01', seconds: 100 },
        ],
      },
    });
    expect(result).toEqual([
      { date: '2024-01-01', seconds: 100 },
      { date: '2024-01-02', seconds: 50 },
    ]);
  });
});

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns null for null input', () => {
    expect(formatDate(null)).toBe(null);
  });

  it('returns null for undefined input', () => {
    expect(formatDate(undefined)).toBe(null);
  });

  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2024-06-15T10:00:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

// ─── formatDateTime ───────────────────────────────────────────────────────────

describe('formatDateTime', () => {
  it('returns null for null input', () => {
    expect(formatDateTime(null)).toBe(null);
  });

  it('returns a non-empty string for a valid ISO date-time', () => {
    const result = formatDateTime('2024-06-15T14:30:00Z');
    expect(result).toBeTruthy();
  });
});

// ─── formatRelativeDate ────────────────────────────────────────────────────────

describe('formatRelativeDate', () => {
  it('returns empty string for null', () => {
    expect(formatRelativeDate(null)).toBe('');
  });

  it('returns "today" for today\'s date', () => {
    const today = new Date().toISOString();
    expect(formatRelativeDate(today)).toBe('today');
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe('PRIORITY_LABELS', () => {
  it('has entries for priorities 0-4', () => {
    for (let i = 0; i <= 4; i++) {
      expect(PRIORITY_LABELS[i]).toBeDefined();
    }
  });
});

describe('CONDITION_LABELS', () => {
  it('has labels for conditions 1, 2, 3', () => {
    expect(CONDITION_LABELS[1]).toBe('Active');
    expect(CONDITION_LABELS[2]).toBe('Done');
    expect(CONDITION_LABELS[3]).toBe('Archived');
  });
});
