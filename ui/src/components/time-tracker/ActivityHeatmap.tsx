import { useMemo } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDuration } from '@/lib/format';

interface DayData {
  date: string;
  seconds: number;
}

interface ActivityHeatmapProps {
  data: DayData[];
  valueFormatter?: (value: number) => string;
}

const CELL_SIZE = 10;
const GAP = 2;
const STEP = CELL_SIZE + GAP;
const MONTH_LABEL_HEIGHT = 20;
const LEFT_PADDING = 30;

const DOW_LABELS = [
  { row: 0, label: 'Mon' },
  { row: 2, label: 'Wed' },
  { row: 4, label: 'Fri' },
];

export function ActivityHeatmap({ data, valueFormatter }: ActivityHeatmapProps) {
  const { grid, monthLabels, maxSeconds, totalWidth } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const isLeap = currentYear % 4 === 0 && (currentYear % 100 !== 0 || currentYear % 400 === 0);

    const daysInYear = isLeap ? 366 : 365;

    const monthDays: number[] = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Day of week for Jan 1 (UTC, computed once)
    const firstJanWeekday = new Date(Date.UTC(currentYear, 0, 1)).getUTCDay();
    // 0(Sun)..6(Sat)

    // Convert to Mon=0..Sun=6
    const firstJanRow = (firstJanWeekday + 6) % 7;

    const dayMap = new Map<string, number>();
    for (const d of data) {
      dayMap.set(d.date, (dayMap.get(d.date) ?? 0) + d.seconds);
    }

    const columns: {
      date: string;
      seconds: number;
      row: number;
    }[][] = [];

    const months: { label: string; col: number }[] = [];

    let colIdx = 0;
    let lastMonth = -1;
    let dayIndex = 0;

    // Number of padding days at the start so the grid begins on Monday
    const paddingStart = firstJanRow;

    const totalCells = paddingStart + daysInYear;
    const totalWeeks = Math.ceil(totalCells / 7);

    let currentMonth = 0;
    let dayOfMonth = 1;

    for (let week = 0; week < totalWeeks; week++) {
      const column: (typeof columns)[number] = [];

      for (let row = 0; row < 7; row++) {
        const globalIndex = week * 7 + row;

        if (globalIndex < paddingStart || dayIndex >= daysInYear) {
          column.push({
            date: '',
            seconds: 0,
            row,
          });
          continue;
        }

        const weekday = (firstJanWeekday + dayIndex) % 7;
        const normalizedRow = (weekday + 6) % 7;

        const iso = new Date(Date.UTC(currentYear, currentMonth, dayOfMonth))
          .toISOString()
          .slice(0, 10);

        column.push({
          date: iso,
          seconds: dayMap.get(iso) ?? 0,
          row: normalizedRow,
        });

        if (currentMonth !== lastMonth) {
          months.push({
            label: new Date(Date.UTC(currentYear, currentMonth, 1)).toLocaleDateString('en-US', {
              month: 'short',
            }),
            col: colIdx,
          });
          lastMonth = currentMonth;
        }

        dayIndex++;
        dayOfMonth++;

        // In strict index mode, index access may return undefined,
        // so use a fallback (??) or an explicit check.
        if (currentMonth < monthDays.length) {
          const daysInCurrentMonth = monthDays[currentMonth] ?? 31;

          if (dayOfMonth > daysInCurrentMonth) {
            currentMonth++;
            dayOfMonth = 1;
          }
        }
      }

      columns.push(column);
      colIdx++;
    }

    const maxSec = Math.max(...data.map((d) => d.seconds), 1);
    const totalWidth = LEFT_PADDING + columns.length * STEP + 10;

    return {
      grid: columns,
      monthLabels: months,
      maxSeconds: maxSec,
      totalWidth,
    };
  }, [data]);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${totalWidth} ${7 * STEP + MONTH_LABEL_HEIGHT}`}
        width="100%"
        height="auto"
        className="block overflow-visible"
      >
        {monthLabels.map((m, i) => (
          <text
            key={i}
            x={LEFT_PADDING + m.col * STEP}
            y={12}
            className="fill-muted-foreground text-[10px] font-medium"
          >
            {m.label}
          </text>
        ))}

        {DOW_LABELS.map(({ row, label }) => (
          <text
            key={label}
            x={0}
            y={row * STEP + MONTH_LABEL_HEIGHT + 9}
            className="fill-muted-foreground text-[9px]"
          >
            {label}
          </text>
        ))}

        {grid.map((column, colIdx) =>
          column.map((cell) => {
            if (!cell.date) return null;

            return (
              <Tooltip key={cell.date} delayDuration={0}>
                <TooltipTrigger asChild>
                  <rect
                    x={LEFT_PADDING + colIdx * STEP}
                    y={cell.row * STEP + MONTH_LABEL_HEIGHT}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={1.5}
                    fill={cell.seconds === 0 ? '#27272a' : undefined}
                    className={cell.seconds > 0 ? getHeatmapClass(cell.seconds, maxSeconds) : ''}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2 text-[11px]">
                  <div className="font-bold">
                    {cell.seconds > 0
                      ? valueFormatter
                        ? valueFormatter(cell.seconds)
                        : formatDuration(cell.seconds)
                      : 'No activity'}
                  </div>
                  <div className="text-muted-foreground capitalize">
                    {new Date(cell.date).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      weekday: 'short',
                    })}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }),
        )}
      </svg>
    </div>
  );
}

function getHeatmapClass(seconds: number, max: number): string {
  const ratio = seconds / max;
  if (ratio < 0.25) return 'fill-primary/40';
  if (ratio < 0.5) return 'fill-primary/65';
  if (ratio < 0.75) return 'fill-primary/85';
  return 'fill-primary';
}
