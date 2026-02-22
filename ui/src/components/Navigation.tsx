import { Link, useMatchRoute } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Home, ListTodo, LayoutDashboard, Settings, ScrollText, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Tasks', to: '/tasks', icon: ListTodo },
  { label: 'Boards', to: '/boards', icon: LayoutDashboard },
  { label: 'Settings', to: '/settings', icon: Settings },
  { label: 'Logs', to: '/logs', icon: ScrollText },
];

/**
 * Compact icon tab bar for JetBrains tool window.
 * Icons with tooltips; active tab has a bottom border indicator.
 */
export function Navigation() {
  const matchRoute = useMatchRoute();

  return (
    <nav
      className="flex shrink-0 items-center border-b border-border bg-card h-9"
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
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center transition-colors',
                  'hover:bg-accent/50',
                  isActive
                    ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:content-['']"
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label={item.label}
              >
                <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

export type { NavItem };
