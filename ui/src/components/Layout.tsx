import { type ReactNode } from 'react';

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
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      <Navigation />

      {header && (
        <Card
          variant="island"
          className="mb-0 flex min-h-[38px] shrink-0 items-center gap-1.5 px-3 py-1.5"
        >
          {header}
        </Card>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
