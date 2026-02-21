import { Link, useMatchRoute } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Home, ListTodo, LayoutDashboard, Settings, type LucideIcon } from 'lucide-react';

/**
 * Navigation item definition
 */
interface NavItem {
  /**
   * Display label for the navigation link
   */
  label: string;

  /**
   * Route path (must match a route defined in routes/)
   */
  to: string;

  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon;

  /**
   * Optional description for tooltips or accessibility
   */
  description?: string;
}

/**
 * Default navigation items for the Kaiten plugin.
 *
 * These represent the main sections of the application.
 * Additional routes can be added as they are implemented.
 */
const defaultNavItems: NavItem[] = [
  {
    label: 'Home',
    to: '/',
    icon: Home,
    description: 'Dashboard and project overview',
  },
  {
    label: 'Tasks',
    to: '/tasks',
    icon: ListTodo,
    description: 'View and manage Kaiten tasks',
  },
  {
    label: 'Boards',
    to: '/boards',
    icon: LayoutDashboard,
    description: 'View Kaiten boards',
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    description: 'Plugin configuration',
  },
];

export interface NavigationProps {
  /**
   * Custom navigation items to display
   * @default defaultNavItems
   */
  items?: NavItem[];

  /**
   * Orientation of the navigation
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal';

  /**
   * Whether to show labels alongside icons
   * @default true
   */
  showLabels?: boolean;

  /**
   * Custom className for the navigation container
   */
  className?: string;
}

/**
 * Navigation component with route links and active state.
 *
 * Provides navigation between different sections of the application using
 * TanStack Router's Link component. Automatically highlights the active route
 * and supports both vertical and horizontal layouts.
 *
 * @example
 * ```tsx
 * // Vertical navigation (default, for sidebar)
 * <Navigation />
 *
 * // Horizontal navigation (for toolbar)
 * <Navigation orientation="horizontal" />
 *
 * // Icon-only navigation
 * <Navigation showLabels={false} />
 *
 * // Custom items
 * <Navigation items={[
 *   { label: 'Custom', to: '/custom', icon: Home }
 * ]} />
 * ```
 */
export function Navigation({
  items = defaultNavItems,
  orientation = 'vertical',
  showLabels = true,
  className,
}: NavigationProps) {
  const matchRoute = useMatchRoute();

  return (
    <nav
      className={cn(
        'flex gap-1',
        orientation === 'vertical' ? 'flex-col' : 'flex-row items-center',
        className
      )}
      aria-label="Main navigation"
    >
      {items.map((item) => {
        // Check if this route is currently active
        const isActive = matchRoute({ to: item.to, fuzzy: false });
        const Icon = item.icon;

        return (
          <Button
            key={item.to}
            variant="ghost"
            size={showLabels ? 'default' : 'icon'}
            asChild
            className={cn(
              'justify-start',
              orientation === 'horizontal' && 'flex-shrink-0',
              isActive && 'bg-accent text-accent-foreground'
            )}
            title={item.description || item.label}
          >
            <Link to={item.to}>
              <Icon className="h-4 w-4" />
              {showLabels && <span>{item.label}</span>}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

/**
 * Navigation item component for custom navigation layouts.
 *
 * Use this component when you need more control over individual nav items
 * while maintaining consistent styling and active state detection.
 *
 * @example
 * ```tsx
 * <div className="flex flex-col gap-2">
 *   <NavigationItem to="/" icon={Home} label="Home" />
 *   <NavigationItem to="/tasks" icon={ListTodo} label="Tasks" />
 * </div>
 * ```
 */
export function NavigationItem({
  to,
  icon: Icon,
  label,
  description,
  className,
}: Omit<NavItem, 'label'> & { label?: string; className?: string }) {
  const matchRoute = useMatchRoute();
  const isActive = matchRoute({ to, fuzzy: false });

  return (
    <Button
      variant="ghost"
      size={label ? 'default' : 'icon'}
      asChild
      className={cn(
        'justify-start',
        isActive && 'bg-accent text-accent-foreground',
        className
      )}
      title={description || label}
    >
      <Link to={to}>
        <Icon className="h-4 w-4" />
        {label && <span>{label}</span>}
      </Link>
    </Button>
  );
}

/**
 * Type export for use in other components
 */
export type { NavItem };
