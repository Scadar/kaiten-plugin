import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FallbackUI } from '@/components/FallbackUI';

describe('FallbackUI', () => {
  // Save and restore window.location
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location.reload
    delete (window as any).location;
    window.location = { ...originalLocation, reload: vi.fn() };
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render with default title and message', () => {
      render(<FallbackUI />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    });

    it('should render with custom title and message', () => {
      render(
        <FallbackUI
          title="Custom Error Title"
          message="Custom error message"
        />
      );

      expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should render error icon', () => {
      const { container } = render(<FallbackUI />);

      // Check for SVG circle (error icon)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.querySelector('circle')).toBeInTheDocument();
    });

    it('should render retry and reset buttons', () => {
      render(<FallbackUI />);

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Reset Application')).toBeInTheDocument();
    });

    it('should render help text', () => {
      render(<FallbackUI />);

      expect(screen.getByText(/If the problem persists/)).toBeInTheDocument();
    });
  });

  describe('Error Details (Development Mode)', () => {
    const originalEnv = import.meta.env.DEV;

    beforeEach(() => {
      // Force development mode
      import.meta.env.DEV = true;
    });

    afterEach(() => {
      import.meta.env.DEV = originalEnv;
    });

    it('should show technical details toggle in dev mode with error', () => {
      const error = new Error('Test error message');
      render(<FallbackUI error={error} />);

      expect(screen.getByText(/Technical Details/)).toBeInTheDocument();
    });

    it('should not show technical details toggle without error', () => {
      render(<FallbackUI />);

      expect(screen.queryByText(/Technical Details/)).not.toBeInTheDocument();
    });

    it('should toggle error details when clicked', async () => {
      const user = userEvent.setup();
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n  at Test (test.ts:1:1)';

      render(<FallbackUI error={error} />);

      // Initially collapsed
      expect(screen.queryByText('Error Message:')).not.toBeInTheDocument();

      // Click to expand
      await user.click(screen.getByText(/Technical Details/));

      // Now expanded
      expect(screen.getByText('Error Message:')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('Stack Trace:')).toBeInTheDocument();
      expect(screen.getByText(/at Test/)).toBeInTheDocument();

      // Click to collapse
      await user.click(screen.getByText(/Technical Details/));

      // Collapsed again
      expect(screen.queryByText('Error Message:')).not.toBeInTheDocument();
    });

    it('should show error message in details', async () => {
      const user = userEvent.setup();
      const error = new Error('Detailed test error');

      render(<FallbackUI error={error} />);

      await user.click(screen.getByText(/Technical Details/));

      expect(screen.getByText('Detailed test error')).toBeInTheDocument();
    });

    it('should show stack trace when available', async () => {
      const user = userEvent.setup();
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at Component (file.tsx:10:15)';

      render(<FallbackUI error={error} />);

      await user.click(screen.getByText(/Technical Details/));

      expect(screen.getByText(/at Component/)).toBeInTheDocument();
    });

    it('should not crash with error without stack trace', async () => {
      const user = userEvent.setup();
      const error = new Error('Test error');
      delete error.stack;

      render(<FallbackUI error={error} />);

      await user.click(screen.getByText(/Technical Details/));

      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.queryByText('Stack Trace:')).not.toBeInTheDocument();
    });
  });

  describe('Retry Action', () => {
    it('should call onRetry callback when retry button clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn().mockResolvedValue(undefined);

      render(<FallbackUI onRetry={onRetry} />);

      await user.click(screen.getByText('Try Again'));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should reload page when retry clicked without onRetry callback', async () => {
      const user = userEvent.setup();

      render(<FallbackUI />);

      await user.click(screen.getByText('Try Again'));

      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    it('should show loading state during retry', async () => {
      const user = userEvent.setup();
      let resolveRetry: () => void;
      const onRetry = vi.fn(() => new Promise<void>((resolve) => {
        resolveRetry = resolve;
      }));

      render(<FallbackUI onRetry={onRetry} />);

      const retryButton = screen.getByText('Try Again');

      // Click retry
      await user.click(retryButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Retrying...')).toBeInTheDocument();
      });

      // Button should be disabled - find button by role
      const disabledButton = screen.getByRole('button', { name: /retrying/i });
      expect(disabledButton).toBeDisabled();

      // Resolve retry
      resolveRetry!();

      // Should return to normal state
      await waitFor(() => {
        expect(screen.queryByText('Retrying...')).not.toBeInTheDocument();
      });
    });

    it('should handle retry errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));

      render(<FallbackUI onRetry={onRetry} />);

      await user.click(screen.getByText('Try Again'));

      // Should log error but not crash
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Retry failed:', expect.any(Error));
      });

      // Should return to normal state
      expect(screen.getByText('Try Again')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should disable retry button while retrying', async () => {
      const user = userEvent.setup();
      let resolveRetry: () => void;
      const onRetry = vi.fn(() => new Promise<void>((resolve) => {
        resolveRetry = resolve;
      }));

      render(<FallbackUI onRetry={onRetry} />);

      const retryButton = screen.getByText('Try Again');

      // Click retry
      await user.click(retryButton);

      // Button should be disabled - find button by role
      await waitFor(() => {
        const retryingButton = screen.getByRole('button', { name: /retrying/i });
        expect(retryingButton).toBeDisabled();
      });

      resolveRetry!();
    });
  });

  describe('Reset Action', () => {
    it('should call onReset callback when reset button clicked', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();

      render(<FallbackUI onReset={onReset} />);

      await user.click(screen.getByText('Reset Application'));

      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('should reload page when reset clicked without onReset callback', async () => {
      const user = userEvent.setup();

      render(<FallbackUI />);

      await user.click(screen.getByText('Reset Application'));

      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling and Accessibility', () => {
    it('should apply dark theme classes', () => {
      const { container } = render(<FallbackUI />);

      // Check for dark theme background class
      const mainContainer = container.querySelector('.bg-background');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have proper button styling', () => {
      render(<FallbackUI />);

      const retryButton = screen.getByText('Try Again');

      // Check for primary button styling
      expect(retryButton).toHaveClass('bg-primary');
      expect(retryButton).toHaveClass('text-primary-foreground');

    });

    it('should have responsive layout', () => {
      const { container } = render(<FallbackUI />);

      const wrapper = container.querySelector('.max-w-md');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null error gracefully', () => {
      render(<FallbackUI error={null} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText(/Technical Details/)).not.toBeInTheDocument();
    });

    it('should handle undefined error gracefully', () => {
      render(<FallbackUI error={undefined} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText(/Technical Details/)).not.toBeInTheDocument();
    });

    it('should handle error with very long message', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new Error(longMessage);

      render(<FallbackUI error={error} />);

      // Should render without crashing
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle custom title and message with special characters', () => {
      const title = "Error: <script>alert('xss')</script>";
      const message = 'Message with "quotes" and other special characters';

      render(
        <FallbackUI
          title={title}
          message={message}
        />
      );

      // Should escape special characters (React does this automatically)
      expect(screen.getByText(/Error:.*script/)).toBeInTheDocument();
      expect(screen.getByText(/Message with.*quotes/)).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work with both custom callbacks', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn().mockResolvedValue(undefined);
      const onReset = vi.fn();

      render(<FallbackUI onRetry={onRetry} onReset={onReset} />);

      await user.click(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);

      await user.click(screen.getByText('Reset Application'));
      expect(onReset).toHaveBeenCalledTimes(1);

      // window.location.reload should not be called
      expect(window.location.reload).not.toHaveBeenCalled();
    });

    it('should render all sections together', () => {
      const error = new Error('Test error');

      render(
        <FallbackUI
          error={error}
          title="Custom Title"
          message="Custom message"
        />
      );

      // Check all major sections are present
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom message')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Reset Application')).toBeInTheDocument();
      expect(screen.getByText(/If the problem persists/)).toBeInTheDocument();
    });
  });
});
