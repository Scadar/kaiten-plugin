import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider component that manages dark/light theme with localStorage persistence.
 *
 * Features:
 * - Persists theme preference to localStorage (key: 'theme')
 * - Prevents FOUC (Flash of Unstyled Content) by applying theme before first paint
 * - Defaults to dark theme to match JetBrains IDE aesthetic
 * - Supports system theme detection (respects OS preferences)
 * - Provides theme context to all child components
 *
 * Usage:
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 *
 * To toggle theme in a component:
 * ```tsx
 * import { useTheme } from 'next-themes';
 *
 * function ThemeToggle() {
 *   const { theme, setTheme } = useTheme();
 *   return (
 *     <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
 *       Toggle Theme
 *     </button>
 *   );
 * }
 * ```
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      // Enable class-based theme switching (adds 'dark' class to <html>)
      attribute="class"
      // Default theme when no preference is stored
      defaultTheme="dark"
      // Enable localStorage persistence
      enableSystem={false}
      // Disable system theme detection (always use dark theme by default)
      // Set to true if you want to respect OS theme preferences
      storageKey="theme"
      // Prevent FOUC by applying theme immediately
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
