import { useEffect, type ReactNode } from 'react';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

import { bridge } from '@/bridge/JCEFBridge';
import type { IdeTheme } from '@/bridge/types';

interface ThemeProviderProps {
  children: ReactNode;
}

function applyIdeTheme(theme: IdeTheme) {
  const root = document.documentElement;

  // Toggle dark/light class so Tailwind's dark: variants work correctly
  root.classList.toggle('dark', theme.isDark);

  // Override every CSS variable with the real IDE color.
  // Inline styles beat :root and .dark rules in the cascade.
  const vars: Record<string, string> = {
    '--background': theme.background,
    '--foreground': theme.foreground,
    '--card': theme.card,
    '--card-foreground': theme.cardForeground,
    '--popover': theme.popover,
    '--popover-foreground': theme.popoverForeground,
    '--primary': theme.primary,
    '--primary-foreground': theme.primaryForeground,
    '--secondary': theme.secondary,
    '--secondary-foreground': theme.secondaryForeground,
    '--muted': theme.muted,
    '--muted-foreground': theme.mutedForeground,
    '--accent': theme.accent,
    '--accent-foreground': theme.accentForeground,
    '--border': theme.border,
    '--input': theme.input,
    '--ring': theme.ring,
    '--destructive': theme.destructive,
    '--destructive-foreground': theme.destructiveForeground,
    '--radius': theme.radius,
    '--ide-font-size': theme.fontSize,
    '--ide-font-size-sm': theme.fontSizeSm,
    '--ide-font-size-xs': theme.fontSizeXs,
  };

  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }

  // Apply IDE system font so the plugin feels native
  if (theme.fontFamily) {
    document.body.style.fontFamily = `${theme.fontFamily}, -apple-system, 'Segoe UI', system-ui, sans-serif`;
  }
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    // Fetch the current IDE theme as soon as the bridge handshake completes
    bridge
      .ready()
      .then(() => bridge.call('getIdeTheme', undefined))
      .then(applyIdeTheme)
      .catch(() => {
        // Running outside the IDE (Vite dev server) — keep CSS-defined defaults
      });

    // Keep in sync when the user switches the IDE Look-and-Feel at runtime
    return bridge.on('theme:changed', applyIdeTheme);
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
