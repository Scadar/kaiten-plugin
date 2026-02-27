import { ReactNode } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/card';

export interface LayoutProps {
  children: ReactNode;
  /** Optional secondary toolbar rendered as an island below the navigation bar */
  header?: ReactNode;
}

/**
 * Islands-style vertical layout for JetBrains tool window panel.
 *
 * Structure:
 *   ┌─────────────────┐  ← Navigation (island tab bar, bg-card)
 *   [ toolbar island  ]  ← Optional page toolbar (island card, sticky)
 *   │                 │
 *   │   scrollable    │  ← Content area (bg-background)
 *   │   content       │
 *   └─────────────────┘
 */
export function Layout({ children, header }: LayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Navigation />

      {header && (
        <Card
          variant="island"
          className="shrink-0 mb-0 flex items-center gap-1.5 px-3 py-1.5 min-h-[38px]"
        >
          {header}
        </Card>
      )}

      <main className="flex-1 overflow-y-auto min-h-0">
        {children}
      </main>
    </div>
  );
}
