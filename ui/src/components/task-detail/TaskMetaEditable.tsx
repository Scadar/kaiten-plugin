import * as React from 'react';

import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Flag,
  Hash,
  Loader2,
  Pencil,
  Timer,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

import type { TaskDetail, TaskMember } from '@/api/types';
import { MetaRow } from '@/components/task-detail/MetaRow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComboboxSelect } from '@/components/ui/combobox-select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTags } from '@/hooks/queries/useTagQueries';
import { useUsers } from '@/hooks/queries/useUserQueries';
import { useSettings } from '@/hooks/useSettings';
import {
  formatDate,
  formatDateTime,
  formatMinutes,
  PRIORITY_LABELS,
  CONDITION_LABELS,
} from '@/lib/format';

// ── Avatar helpers ─────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => (s[0] ?? '').toUpperCase())
    .join('');
}

const AVATAR_COLORS = [
  '#4f46e5',
  '#7c3aed',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
] as const;

function avatarBg(seed: number | string): string {
  let n: number;
  if (typeof seed === 'number') {
    n = seed;
  } else {
    n = 0;
    for (let i = 0; i < seed.length; i++) {
      n += seed.charCodeAt(i);
    }
  }
  return AVATAR_COLORS[Math.abs(n) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
}

function resolveAvatarUrl(url: string | null | undefined, serverUrl: string): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${serverUrl.replace(/\/$/, '')}${url}`;
  return null;
}

function MemberAvatar({
  member,
  serverUrl,
  size = 20,
}: {
  member: TaskMember;
  serverUrl: string;
  size?: number;
}) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const rawUrl = member.avatar_type === 3 ? member.avatar_uploaded_url : member.avatar_initials_url;
  const imgUrl = resolveAvatarUrl(rawUrl, serverUrl);
  const showImg = !imgFailed && !!imgUrl;
  const bg = avatarBg(member.id);

  return (
    <div
      title={member.fullName}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        backgroundColor: showImg ? undefined : bg,
      }}
    >
      {imgUrl !== null && !imgFailed ? (
        <img
          src={imgUrl}
          alt={member.fullName}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        member.initials || getInitials(member.fullName)
      )}
    </div>
  );
}

function NameAvatar({ name, userId, size = 20 }: { name: string; userId?: number; size?: number }) {
  return (
    <div
      title={name}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        backgroundColor: avatarBg(userId ?? name),
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function MembersGroup({ members, serverUrl }: { members: TaskMember[]; serverUrl: string }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {members.map((m) => (
        <div key={m.id} className="flex items-center gap-1.5">
          <MemberAvatar member={m} serverUrl={serverUrl} size={18} />
          <span className="text-sm">{m.fullName}</span>
        </div>
      ))}
    </div>
  );
}

// ── AssigneeField ──────────────────────────────────────────────────────────────

function AssigneeField({
  assigneeId,
  participants,
  serverUrl,
  onSave,
}: {
  assigneeId: number | null;
  participants: TaskMember[];
  serverUrl: string;
  onSave: (id: number | null) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const { data: users = [] } = useUsers();
  const options = users.map((u) => ({ value: String(u.id), label: u.name }));
  const current = assigneeId !== null ? String(assigneeId) : null;
  const assigneeName = users.find((u) => u.id === assigneeId)?.name;
  const assigneeMember = participants.find((p) => p.id === assigneeId);

  async function handleChange(val: string | null) {
    setOpen(false);
    await onSave(val !== null ? Number(val) : null);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="group/field hover:border-border/60 hover:bg-accent/30 flex min-w-0 cursor-pointer items-center gap-1.5 rounded border border-transparent px-0.5 text-sm transition-colors"
          title="Click to change assignee"
        >
          {assigneeId !== null &&
            assigneeName &&
            (assigneeMember ? (
              <MemberAvatar member={assigneeMember} serverUrl={serverUrl} size={18} />
            ) : (
              <NameAvatar name={assigneeName} userId={assigneeId} size={18} />
            ))}
          {assigneeName ?? <span className="text-muted-foreground italic">Unassigned</span>}
          <Pencil
            size={10}
            className="text-muted-foreground/0 group-hover/field:text-muted-foreground/60 shrink-0 transition-colors duration-100"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <ComboboxSelect
          options={options}
          value={current}
          onChange={(val) => void handleChange(val)}
          placeholder="Unassigned"
          searchPlaceholder="Search users..."
        />
      </PopoverContent>
    </Popover>
  );
}

// ── DueDateField ───────────────────────────────────────────────────────────────

function DueDateField({
  dueDate,
  onSave,
}: {
  dueDate: string | null;
  onSave: (date: string | null) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(dueDate?.slice(0, 10) ?? '');
  React.useEffect(() => {
    if (!open) setDraft(dueDate?.slice(0, 10) ?? '');
  }, [dueDate, open]);
  async function handleSave() {
    setOpen(false);
    await onSave(draft || null);
  }
  async function handleClear() {
    setOpen(false);
    await onSave(null);
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="group/field hover:border-border/60 hover:bg-accent/30 flex min-w-0 cursor-pointer items-center gap-1 rounded border border-transparent px-0.5 text-sm transition-colors"
          title="Click to change due date"
        >
          {dueDate ? (
            formatDate(dueDate)
          ) : (
            <span className="text-muted-foreground italic">No due date</span>
          )}
          <Pencil
            size={10}
            className="text-muted-foreground/0 group-hover/field:text-muted-foreground/60 shrink-0 transition-colors duration-100"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 space-y-2 p-3">
        <Input
          type="date"
          size="sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSave();
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        <div className="flex gap-1.5">
          <Button size="sm" className="h-6 flex-1 gap-1 text-xs" onClick={() => void handleSave()}>
            <Check size={11} /> Save
          </Button>
          {dueDate && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={() => void handleClear()}
            >
              <X size={11} /> Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── TagsField ──────────────────────────────────────────────────────────────────

function TagsField({
  tags,
  spaceId,
  onSave,
}: {
  tags: TaskDetail['tags'];
  spaceId: number | null;
  onSave: (ids: number[]) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string[]>(tags.map((t) => String(t.id)));
  const { data: allTags = [] } = useTags(spaceId);
  const options = allTags.map((t) => ({ value: String(t.id), label: t.name }));
  React.useEffect(() => {
    if (!open) setPending(tags.map((t) => String(t.id)));
  }, [tags, open]);
  async function handleClose() {
    setOpen(false);
    await onSave(pending.map(Number));
  }
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (!o) void handleClose();
        else setOpen(true);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="group/field hover:border-border/60 hover:bg-accent/30 flex min-w-0 cursor-pointer flex-wrap items-center gap-1 rounded border border-transparent px-0.5 transition-colors"
          title="Click to edit tags"
        >
          {tags.length > 0 ? (
            tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                size="xs"
                className="font-normal"
                style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
              >
                {tag.name}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-sm italic">No tags</span>
          )}
          <Pencil
            size={10}
            className="text-muted-foreground/0 group-hover/field:text-muted-foreground/60 shrink-0 transition-colors duration-100"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <ComboboxSelect
          multiple
          options={options}
          value={pending}
          onChange={setPending}
          placeholder="No tags"
          searchPlaceholder="Search tags..."
        />
      </PopoverContent>
    </Popover>
  );
}

// ── TaskMetaEditable ───────────────────────────────────────────────────────────

export interface TaskMetaEditableProps {
  task: Pick<
    TaskDetail,
    | 'assigneeId'
    | 'participants'
    | 'dueDate'
    | 'tags'
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
    | 'spaceId'
  >;
  onUpdateAssignee: (userId: number | null) => Promise<void>;
  onUpdateDueDate: (date: string | null) => Promise<void>;
  onUpdateTags: (tagIds: number[]) => Promise<void>;
  isSaving?: boolean;
}

export function TaskMetaEditable({
  task,
  onUpdateAssignee,
  onUpdateDueDate,
  onUpdateTags,
  isSaving,
}: TaskMetaEditableProps) {
  const { serverUrl } = useSettings();
  const responsible = task.participants.filter((p) => p.type === 2);
  const members = task.participants.filter((p) => p.type === 1);
  const priority = task.priority !== null ? PRIORITY_LABELS[task.priority] : null;

  return (
    <div className="border-border bg-card shadow-island-sm rounded-lg border px-3 py-1">
      {task.blocked && (
        <MetaRow icon={<AlertTriangle size={12} className="text-destructive" />} label="Blocked">
          <span className="text-destructive">{task.blockReason ?? 'Yes'}</span>
        </MetaRow>
      )}
      {task.condition !== null && (
        <MetaRow icon={<span className="text-xs">o</span>} label="Condition">
          <span>{CONDITION_LABELS[task.condition] ?? String(task.condition)}</span>
        </MetaRow>
      )}
      <MetaRow icon={<User size={12} />} label="Assignee">
        <div className="flex items-center gap-1">
          <AssigneeField
            assigneeId={task.assigneeId}
            participants={task.participants}
            serverUrl={serverUrl}
            onSave={onUpdateAssignee}
          />
          {isSaving && <Loader2 size={11} className="text-muted-foreground animate-spin" />}
        </div>
      </MetaRow>
      {responsible.length > 0 && (
        <MetaRow icon={<UserCheck size={12} />} label="Responsible">
          <MembersGroup members={responsible} serverUrl={serverUrl} />
        </MetaRow>
      )}
      {members.length > 0 && (
        <MetaRow icon={<Users size={12} />} label="Members">
          <MembersGroup members={members} serverUrl={serverUrl} />
        </MetaRow>
      )}
      {priority && task.priority !== 0 && (
        <MetaRow icon={<Flag size={12} />} label="Priority">
          <span className={priority.color}>{priority.label}</span>
        </MetaRow>
      )}
      <MetaRow icon={<Calendar size={12} />} label="Due date">
        <DueDateField dueDate={task.dueDate} onSave={onUpdateDueDate} />
      </MetaRow>
      <MetaRow icon={<span className="text-xs">#</span>} label="Tags">
        <TagsField tags={task.tags} spaceId={task.spaceId} onSave={onUpdateTags} />
      </MetaRow>
      {(task.spentTimeMinutes !== null || task.timeEstimateMinutes !== null) && (
        <MetaRow icon={<Timer size={12} />} label="Time">
          <span className="text-muted-foreground">
            {task.spentTimeMinutes !== null && `spent ${formatMinutes(task.spentTimeMinutes)}`}
            {task.spentTimeMinutes !== null && task.timeEstimateMinutes !== null && ' - '}
            {task.timeEstimateMinutes !== null && `est ${formatMinutes(task.timeEstimateMinutes)}`}
          </span>
        </MetaRow>
      )}
      {task.childrenCount > 0 && (
        <MetaRow icon={<Hash size={12} />} label="Subtasks">
          <span>{task.childrenCount}</span>
        </MetaRow>
      )}
      {task.parentId !== null && (
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
