import { ReactNode, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface LayoutProps {
  /**
   * Content to render in the sidebar
   */
  sidebar?: ReactNode;

  /**
   * Content to render in the main content area
   */
  children: ReactNode;

  /**
   * Optional toolbar content to render above the main area
   */
  toolbar?: ReactNode;

  /**
   * Initial sidebar width in pixels
   * @default 240
   */
  initialSidebarWidth?: number;

  /**
   * Minimum sidebar width in pixels
   * @default 160
   */
  minSidebarWidth?: number;

  /**
   * Maximum sidebar width in pixels
   * @default 480
   */
  maxSidebarWidth?: number;

  /**
   * Whether the sidebar is initially collapsed
   * @default false
   */
  initialCollapsed?: boolean;
}

/**
 * Main layout component with resizable sidebar and content area.
 *
 * Inspired by KaitenMainPanel's JSplitPane layout pattern:
 * - Resizable sidebar on the left for filters/navigation
 * - Main content area on the right
 * - Optional toolbar at the top
 * - Smooth resize handle with visual feedback
 *
 * @example
 * ```tsx
 * <Layout
 *   sidebar={<FiltersPanel />}
 *   toolbar={<Toolbar />}
 * >
 *   <MainContent />
 * </Layout>
 * ```
 */
export function Layout({
  sidebar,
  children,
  toolbar,
  initialSidebarWidth = 240,
  minSidebarWidth = 160,
  maxSidebarWidth = 480,
  initialCollapsed = false,
}: LayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(
    initialCollapsed ? minSidebarWidth : initialSidebarWidth
  );
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const newWidth = e.clientX;
      if (newWidth >= minSidebarWidth && newWidth <= maxSidebarWidth) {
        setSidebarWidth(newWidth);
        if (isCollapsed && newWidth > minSidebarWidth + 20) {
          setIsCollapsed(false);
        }
      }
    },
    [minSidebarWidth, maxSidebarWidth, isCollapsed]
  );

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
    setSidebarWidth((prev) =>
      prev > minSidebarWidth ? minSidebarWidth : initialSidebarWidth
    );
  }, [minSidebarWidth, initialSidebarWidth]);

  // Add/remove mouse event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Toolbar */}
      {toolbar && (
        <div className="flex-shrink-0 border-b border-border bg-card">
          {toolbar}
        </div>
      )}

      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebar && (
          <aside
            style={{ width: `${sidebarWidth}px` }}
            className={cn(
              'flex-shrink-0 border-r border-border bg-card transition-all',
              isCollapsed && 'overflow-hidden'
            )}
          >
            <div className="h-full overflow-y-auto">
              {sidebar}
            </div>
          </aside>
        )}

        {/* Resize handle */}
        {sidebar && (
          <div
            onMouseDown={handleMouseDown}
            onClick={toggleSidebar}
            className={cn(
              'group relative w-1 flex-shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary/50',
              isResizing && 'bg-primary'
            )}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
          >
            {/* Visual indicator on hover */}
            <div
              className={cn(
                'absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100',
                isResizing && 'opacity-100'
              )}
            />
          </div>
        )}

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
