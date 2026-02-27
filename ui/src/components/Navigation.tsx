import { Link, useMatchRoute } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Home, ListTodo, Settings, ScrollText, Timer, PackageSearch, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: 'Home',     to: '/',             icon: Home },
  { label: 'Tasks',   to: '/tasks',        icon: ListTodo },
  { label: 'Releases',to: '/releases',     icon: PackageSearch },
  { label: 'Time',    to: '/time-tracker', icon: Timer },
  { label: 'Settings',to: '/settings',     icon: Settings },
  { label: 'Logs',    to: '/logs',         icon: ScrollText },
];

/**
 * Islands-style navigation tab bar.
 *
 * - Active tab: filled rounded background (pill) with primary tint — no underline.
 * - Inactive tab: ghost with subtle hover background.
 * - At xs (≥300px) and above, labels appear next to icons.
 * - Tooltip always available for accessibility / ultra-narrow panels.
 */
export function Navigation() {
  const matchRoute = useMatchRoute();

  return (
    <nav
      className="flex shrink-0 items-center gap-1 bg-card px-2 py-2"
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const isActive = !!matchRoute({ to: item.to, fuzzy: item.to !== '/' });
        const Icon = item.icon;

        return (
          <Tooltip key={item.to} delayDuration={400}>
            <TooltipTrigger asChild>
              <Link
                to={item.to}
                aria-label={item.label}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-2 transition-all duration-150 select-none',
                  /* compact by default, expand on xs+ */
                  'h-7',
                  isActive
                    ? 'bg-primary/[0.12] text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.6}
                  aria-hidden="true"
                  className="shrink-0"
                />
                {/* Label shown when panel is wide enough */}
                <span className="hidden xs:inline text-sm leading-none font-medium">
                  {item.label}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

export type { NavItem };
