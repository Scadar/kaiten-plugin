import * as React from 'react';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { bridge } from '@/bridge/JCEFBridge';
import { Button } from '@/components/ui/button';
import { ComboboxSelect } from '@/components/ui/combobox-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stack } from '@/components/ui/stack';

export interface CreateBranchDialogProps {
  taskId: number;
  branchPatterns: string[];
  onClose: () => void;
}

function buildBranchName(patterns: string[], taskId: number): string {
  const template = patterns[0] ?? 'task/ktn-{id}';
  return template.replace('{id}', String(taskId));
}

/**
 * Dialog for creating a Git branch named after a Kaiten task.
 * Pre-fills the branch name from the first configured branch pattern.
 * On success, the branch is created and checked out, triggering automatic time tracking.
 */
export function CreateBranchDialog({ taskId, branchPatterns, onClose }: CreateBranchDialogProps) {
  const [branchName, setBranchName] = React.useState(() => buildBranchName(branchPatterns, taskId));
  const [baseBranch, setBaseBranch] = React.useState('');
  const [branches, setBranches] = React.useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  // Load available branches on mount
  React.useEffect(() => {
    let cancelled = false;
    bridge
      .call('listBranches', undefined)
      .then(({ branches: list, current }) => {
        if (cancelled) return;
        setBranches(list);
        const preferred = ['master', 'main'].find((b) => list.includes(b));
        setBaseBranch(preferred ?? current ?? list[0] ?? '');
      })
      .catch(() => {
        if (cancelled) return;
        setBaseBranch('');
      })
      .finally(() => {
        if (!cancelled) setLoadingBranches(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    const name = branchName.trim();
    if (!name) {
      setError('Branch name cannot be empty.');
      return;
    }
    if (!baseBranch) {
      setError('Please select a base branch.');
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const result = await bridge.call('createBranch', { branchName: name, baseBranch });
      if ('error' in result) {
        setError(result.error);
      } else {
        toast.success(`Branch "${name}" created and checked out`);
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !creating) {
      void handleCreate();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm gap-0 p-0" onKeyDown={handleKeyDown}>
        <DialogHeader className="border-border shrink-0 border-b px-4 pt-4 pb-3">
          <DialogTitle className="text-sm font-semibold">Create Branch</DialogTitle>
          <DialogDescription>Create a Git branch for task #{taskId}</DialogDescription>
        </DialogHeader>

        {/* Form */}
        <Stack spacing="3" className="px-4 py-4">
          {/* Branch name */}
          <Stack spacing="1.5">
            <Label htmlFor="cb-branch-name" className="text-xs">
              Branch name
            </Label>
            <Input
              id="cb-branch-name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="font-mono text-xs"
              autoFocus
              disabled={creating}
            />
          </Stack>

          {/* Base branch */}
          <Stack spacing="1.5">
            <Label className="text-xs">Base branch</Label>
            {loadingBranches ? (
              <Stack direction="row" align="center" spacing="1.5" className="text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                <span className="text-xs">Loading branches…</span>
              </Stack>
            ) : branches.length > 0 ? (
              <ComboboxSelect
                options={branches.map((b) => ({ value: b, label: b }))}
                value={baseBranch || null}
                onChange={(v) => setBaseBranch(v ?? '')}
                searchPlaceholder="Search branches…"
                emptyText="No branches found"
                placeholder="Select base branch…"
              />
            ) : (
              <Input
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                placeholder="main"
                className="font-mono text-xs"
                disabled={creating}
              />
            )}
          </Stack>

          {/* Error */}
          {error && (
            <p className="text-destructive border-destructive/30 bg-destructive/5 rounded-md border px-3 py-2 text-xs">
              {error}
            </p>
          )}
        </Stack>

        {/* Actions */}
        <Stack
          direction="row"
          justify="end"
          spacing="2"
          className="border-border border-t px-4 py-3"
        >
          <Button variant="ghost" size="sm" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={creating || loadingBranches}>
            {creating && <Loader2 size={12} className="animate-spin" />}
            Create Branch
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
