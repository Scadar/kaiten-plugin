import { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';

export interface LayoutProps {
  children: ReactNode;
  /** Optional secondary toolbar below the navigation tab bar */
  header?: ReactNode;
}

/**
 * Vertical layout for JetBrains tool window panel.
 * Icon tab bar at the top, optional page header, scrollable content below.
 */
export function Layout({ children, header }: LayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Navigation />
      {header && (
        <div className="flex shrink-0 items-center gap-1 border-b border-border bg-card/40 px-2 py-1 min-h-[30px]">
          {header}
        </div>
      )}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
