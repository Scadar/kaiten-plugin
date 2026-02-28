import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface UserAvatarProps {
  name: string;
}

export function UserAvatar({ name }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Avatar className="shadow-island-sm h-6 w-6 shrink-0">
      <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
