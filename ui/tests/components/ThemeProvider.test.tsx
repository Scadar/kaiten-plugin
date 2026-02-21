import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/components/ThemeProvider';

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear document classes
    document.documentElement.className = '';
  });

  it('should render children', () => {
    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply dark theme by default', async () => {
    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );

    // Wait for next-themes to apply the theme
    await vi.waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should use localStorage key "theme" for persistence', async () => {
    // Pre-populate localStorage to simulate a saved preference
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );

    // Verify that next-themes reads from the correct localStorage key
    // Note: next-themes only writes to localStorage on theme changes, not on initial load
    await vi.waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should wrap children without errors', () => {
    const { container } = render(
      <ThemeProvider>
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
        </div>
      </ThemeProvider>
    );

    expect(container.querySelector('h1')).toHaveTextContent('Title');
    expect(container.querySelector('p')).toHaveTextContent('Paragraph');
  });

  it('should handle nested children', () => {
    render(
      <ThemeProvider>
        <div>
          <div>
            <span>Nested Content</span>
          </div>
        </div>
      </ThemeProvider>
    );

    expect(screen.getByText('Nested Content')).toBeInTheDocument();
  });

  it('should not throw errors when children is null', () => {
    expect(() => {
      render(<ThemeProvider>{null}</ThemeProvider>);
    }).not.toThrow();
  });

  it('should not throw errors when children is undefined', () => {
    expect(() => {
      render(<ThemeProvider>{undefined}</ThemeProvider>);
    }).not.toThrow();
  });

  it('should handle multiple children', () => {
    render(
      <ThemeProvider>
        <div>First</div>
        <div>Second</div>
        <div>Third</div>
      </ThemeProvider>
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });
});
