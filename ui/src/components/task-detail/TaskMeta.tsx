import { AlertTriangle, Calendar, Clock, Flag, Hash, Timer, User, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MetaRow } from '@/components/task-detail/MetaRow';
import { formatDate, formatDateTime, formatMinutes, PRIORITY_LABELS, CONDITION_LABELS } from '@/lib/format';
import type { TaskDetail } from '@/api/types';

export interface TaskMetaProps {
  task: Pick<
    TaskDetail,
    | 'assigneeId'
    | 'participants'
    | 'dueDate'
    | 'createdAt'
    | 'updatedAt'
    | 'childrenCount'
    | 'condition'
    | 'blocked'
    | 'blockReason'
    | 'priority'
    | 'spentTimeMinutes'
    | 'timeEstimateMinutes'
    | 'parentId'
  >;
}

/**
 * Meta information island: assignee, members, dates, subtask count, priority, time tracking.
 */
export function TaskMeta({ task }: TaskMetaProps) {
  const assignee = task.participants.find((p) => p.id === task.assigneeId);
  const members  = task.participants.filter((p) => p.id !== task.assigneeId);
  const priority = task.priority != null ? PRIORITY_LABELS[task.priority] : null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-1 shadow-island-sm">
      {task.blocked && (
        <MetaRow icon={<AlertTriangle size={12} className="text-destructive" />} label="Blocked">
          <span className="text-destructive">{task.blockReason || 'Yes'}</span>
        </MetaRow>
      )}

      {task.condition != null && (
        <MetaRow icon={<span className="text-xs">◉</span>} label="Condition">
          <span>{CONDITION_LABELS[task.condition] ?? String(task.condition)}</span>
        </MetaRow>
      )}

      {assignee && (
        <MetaRow icon={<User size={12} />} label="Assignee">
          <span>{assignee.fullName}</span>
        </MetaRow>
      )}

      {members.length > 0 && (
        <MetaRow icon={<Users size={12} />} label="Members">
          <span>{members.map((p) => p.fullName).join(', ')}</span>
        </MetaRow>
      )}

      {priority && task.priority !== 0 && (
        <MetaRow icon={<Flag size={12} />} label="Priority">
          <span className={priority.color}>{priority.label}</span>
        </MetaRow>
      )}

      {task.dueDate && (
        <MetaRow icon={<Calendar size={12} />} label="Due date">
          <span>{formatDate(task.dueDate)}</span>
        </MetaRow>
      )}

      {(task.spentTimeMinutes != null || task.timeEstimateMinutes != null) && (
        <MetaRow icon={<Timer size={12} />} label="Time">
          <span className="text-muted-foreground">
            {task.spentTimeMinutes != null && `spent ${formatMinutes(task.spentTimeMinutes)}`}
            {task.spentTimeMinutes != null && task.timeEstimateMinutes != null && ' · '}
            {task.timeEstimateMinutes != null && `est ${formatMinutes(task.timeEstimateMinutes)}`}
          </span>
        </MetaRow>
      )}

      {task.childrenCount > 0 && (
        <MetaRow icon={<Hash size={12} />} label="Subtasks">
          <span>{task.childrenCount}</span>
        </MetaRow>
      )}

      {task.parentId != null && (
        <MetaRow icon={<Hash size={12} />} label="Parent">
          <Badge variant="outline" size="xs" className="font-mono">
            #{task.parentId}
          </Badge>
        </MetaRow>
      )}

      {task.createdAt && (
        <MetaRow icon={<Clock size={12} />} label="Created">
          <span className="text-muted-foreground">{formatDateTime(task.createdAt)}</span>
        </MetaRow>
      )}

      {task.updatedAt && (
        <MetaRow icon={<Clock size={12} />} label="Updated">
          <span className="text-muted-foreground">{formatDateTime(task.updatedAt)}</span>
        </MetaRow>
      )}
    </div>
  );
}
