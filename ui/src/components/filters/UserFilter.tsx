import type { User } from '@/api/types';
import { FilterSection } from '@/components/filters/FilterSection';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboboxSelect } from '@/components/ui/combobox-select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Stack } from '@/components/ui/stack';

export interface UserFilterProps {
  users: User[] | undefined;
  isLoading: boolean;
  selectedUserId: number | null;
  filterAsMember: boolean;
  filterAsResponsible: boolean;
  filterLogic: 'OR' | 'AND';
  onSelectUser: (userId: number | null) => void;
  onSetFilterAsMember: (enabled: boolean) => void;
  onSetFilterAsResponsible: (enabled: boolean) => void;
  onSetFilterLogic: (logic: 'OR' | 'AND') => void;
}

export function UserFilter({
  users,
  isLoading,
  selectedUserId,
  filterAsMember,
  filterAsResponsible,
  filterLogic,
  onSelectUser,
  onSetFilterAsMember,
  onSetFilterAsResponsible,
  onSetFilterLogic,
}: UserFilterProps) {
  const bothRolesSelected = filterAsMember && filterAsResponsible;

  return (
    <FilterSection title="User" defaultOpen={false}>
      <Stack spacing="2">
        {isLoading ? (
          <p className="text-muted-foreground text-xs">Loading...</p>
        ) : !users?.length ? (
          <p className="text-muted-foreground text-xs">No users</p>
        ) : (
          <ComboboxSelect
            options={users.map((u) => ({ value: String(u.id), label: u.name }))}
            value={selectedUserId !== null ? String(selectedUserId) : null}
            onChange={(val) => onSelectUser(val ? Number(val) : null)}
            placeholder="Select user..."
            searchPlaceholder="Search users..."
            emptyText="No users found."
          />
        )}

        {selectedUserId !== null && (
          <>
            <Separator />
            <Stack spacing="1">
              <Stack
                direction="row"
                align="center"
                spacing="2"
                className="hover:bg-accent/40 cursor-pointer rounded-md px-1.5 py-1 transition-colors"
                onClick={() => onSetFilterAsMember(!filterAsMember)}
              >
                <Checkbox
                  id="filter-member"
                  checked={filterAsMember}
                  onCheckedChange={(c) => onSetFilterAsMember(c === true)}
                />
                <Label htmlFor="filter-member" className="cursor-pointer text-xs font-normal">
                  Member
                </Label>
              </Stack>
              <Stack
                direction="row"
                align="center"
                spacing="2"
                className="hover:bg-accent/40 cursor-pointer rounded-md px-1.5 py-1 transition-colors"
                onClick={() => onSetFilterAsResponsible(!filterAsResponsible)}
              >
                <Checkbox
                  id="filter-responsible"
                  checked={filterAsResponsible}
                  onCheckedChange={(c) => onSetFilterAsResponsible(c === true)}
                />
                <Label htmlFor="filter-responsible" className="cursor-pointer text-xs font-normal">
                  Responsible
                </Label>
              </Stack>
            </Stack>

            {bothRolesSelected && (
              <>
                <Separator />
                <RadioGroup
                  value={filterLogic}
                  onValueChange={(val) => onSetFilterLogic(val as 'OR' | 'AND')}
                  className="gap-1 pl-1"
                >
                  <Stack direction="row" align="center" spacing="2">
                    <RadioGroupItem value="OR" id="logic-or" />
                    <Label htmlFor="logic-or" className="cursor-pointer text-xs font-normal">
                      OR — any role
                    </Label>
                  </Stack>
                  <Stack direction="row" align="center" spacing="2">
                    <RadioGroupItem value="AND" id="logic-and" />
                    <Label htmlFor="logic-and" className="cursor-pointer text-xs font-normal">
                      AND — both roles
                    </Label>
                  </Stack>
                </RadioGroup>
              </>
            )}
          </>
        )}
      </Stack>
    </FilterSection>
  );
}
