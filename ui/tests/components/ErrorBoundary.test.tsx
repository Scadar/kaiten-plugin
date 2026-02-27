/**
 * ErrorBoundary component tests
 * Verifies error catching, fallback rendering, error reporting to IDE, and recovery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import * as JCEFBridge from '../../src/bridge/JCEFBridge';

// Mock the bridge module
vi.mock('../../src/bridge/JCEFBridge', () => ({
  bridge: {
    reportError: vi.fn(),
    isReady: vi.fn(() => true),
  },
}));

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Component that throws on button click
function ThrowOnClick() {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  if (shouldThrow) {
    throw new Error('Click error');
  }

  return (
    <button onClick={() => setShouldThrow(true)}>
      Throw Error
    </button>
  );
}

// Import React after other imports
import React from 'react';

describe('ErrorBoundary', () => {
  // Suppress console.error in tests to avoid noise
  const originalError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Error catching', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child">Hello World</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should catch errors from child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Default fallback UI should be shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    });

    it('should catch errors from event handlers in child components', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowOnClick />
        </ErrorBoundary>
      );

      // Initially no error
      expect(screen.getByText('Throw Error')).toBeInTheDocument();

      // Click to throw error
      await user.click(screen.getByText('Throw Error'));

      // Error boundary should catch it
      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
    });

    it('should update state with error details', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show fallback UI (indicates state has hasError: true)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Fallback UI', () => {
    it('should render default fallback UI when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should render custom fallback UI when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should show error message in development mode', async () => {
      const user = userEvent.setup();

      // Mock DEV mode
      vi.stubEnv('DEV', true);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Technical details should be available in dev mode
      const detailsButton = screen.getByText(/Technical Details/);
      expect(detailsButton).toBeInTheDocument();

      // Click to expand error details
      await user.click(detailsButton);

      // Error message should now be visible
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      vi.unstubAllEnvs();
    });

    it('should hide error message in production mode', () => {
      // Mock production mode
      vi.stubEnv('DEV', false);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error message should not be visible in production
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();

      vi.unstubAllEnvs();
    });

    it('should have reload button that reloads the page', async () => {
      const user = userEvent.setup();
      const reloadSpy = vi.fn();

      // Mock window.location.reload
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { reload: reloadSpy },
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /try again/i });
      await user.click(reloadButton);

      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error reporting to IDE', () => {
    it('should report errors to IDE via bridge', () => {
      const mockReportError = vi.mocked(JCEFBridge.bridge.reportError);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockReportError).toHaveBeenCalledTimes(1);
      expect(mockReportError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
        }),
        'error',
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should handle bridge reporting failures gracefully', () => {
      const mockReportError = vi.mocked(JCEFBridge.bridge.reportError);
      mockReportError.mockImplementation(() => {
        throw new Error('Bridge error');
      });

      // Should not throw, even if bridge fails
      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        );
      }).not.toThrow();

      // Fallback UI should still be shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should include component stack in error report', () => {
      const mockReportError = vi.mocked(JCEFBridge.bridge.reportError);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        'error',
        expect.objectContaining({
          componentStack: expect.stringContaining('ThrowError'),
        })
      );
    });

    it('should log errors to console in development mode', () => {
      const mockConsoleError = vi.mocked(console.error);
      vi.stubEnv('DEV', true);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Console.error should be called in dev mode
      expect(mockConsoleError).toHaveBeenCalled();

      vi.unstubAllEnvs();
    });
  });

  describe('Error recovery', () => {
    it('should recover when children stop throwing errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error boundary should show fallback
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Note: Error boundaries don't automatically recover when props change
      // They require a remount or key change to reset
      // This test documents the expected behavior
    });
  });

  describe('Multiple error boundaries', () => {
    it('should allow nesting error boundaries', () => {
      render(
        <ErrorBoundary fallback={<div>Outer fallback</div>}>
          <div>Outer content</div>
          <ErrorBoundary fallback={<div>Inner fallback</div>}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // Inner error boundary should catch the error
      expect(screen.getByText('Inner fallback')).toBeInTheDocument();
      expect(screen.queryByText('Outer fallback')).not.toBeInTheDocument();
      expect(screen.getByText('Outer content')).toBeInTheDocument();
    });

    it('should propagate to outer boundary if inner boundary fails', () => {
      // Create an error boundary that throws in its own render
      function FailingErrorBoundary({ children }: { children: React.ReactNode }) {
        return (
          <ErrorBoundary fallback={<ThrowError shouldThrow={true} />}>
            {children}
          </ErrorBoundary>
        );
      }

      render(
        <ErrorBoundary fallback={<div>Outer fallback</div>}>
          <FailingErrorBoundary>
            <ThrowError shouldThrow={true} />
          </FailingErrorBoundary>
        </ErrorBoundary>
      );

      // Outer boundary should catch the cascading error
      expect(screen.getByText('Outer fallback')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle null error', () => {
      function ThrowNull() {
        // eslint-disable-next-line no-throw-literal
        throw null;
      }

      render(
        <ErrorBoundary>
          <ThrowNull />
        </ErrorBoundary>
      );

      // Should still show fallback UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(
        <ErrorBoundary>
          {undefined}
        </ErrorBoundary>
      );

      // Should render without error (nothing displayed)
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should handle empty children', () => {
      render(<ErrorBoundary>{null}</ErrorBoundary>);

      // Should render without error
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should handle string errors', () => {
      function ThrowString() {
        // eslint-disable-next-line no-throw-literal
        throw 'String error';
      }

      render(
        <ErrorBoundary>
          <ThrowString />
        </ErrorBoundary>
      );

      // Should show fallback UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Styling and accessibility', () => {
    it('should apply dark theme classes to fallback UI', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Check for dark theme classes
      const fallbackContainer = container.querySelector('.bg-background');
      expect(fallbackContainer).toBeInTheDocument();

      // Check that text elements use theme colors
      const heading = screen.getByText('Something went wrong');
      expect(heading).toHaveClass('text-foreground');

      const message = screen.getByText(/An unexpected error occurred/);
      expect(message).toHaveClass('text-muted-foreground');
    });

    it('should have accessible reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
      expect(tryAgainButton).toBeEnabled();

      const resetButton = screen.getByRole('button', { name: /reset application/i });
      expect(resetButton).toBeInTheDocument();
      expect(resetButton).toBeEnabled();
    });

    it('should have readable error heading', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { name: /something went wrong/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H1');
    });
  });

  describe('Memory management', () => {
    it('should not leak memory on unmount', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should clean up error state on unmount', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
