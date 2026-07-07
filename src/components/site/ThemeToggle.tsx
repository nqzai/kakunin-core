'use client';

import { useState, useLayoutEffect } from 'react';

/**
 * Theme toggle button for day/night mode.
 * Stores preference in localStorage. Default: light.
 * Applies `data-theme="dark"` to <html> when dark mode active.
 *
 * Pattern: lazy useState initializer reads localStorage (no effect needed).
 * useLayoutEffect only syncs the DOM (external system) — no setState inside.
 */
export function ThemeToggle() {
  // Lazy initializer runs once on client — reads localStorage directly.
  // Returns false on SSR (window undefined) to match server HTML.
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('theme') === 'dark';
  });

  // Effect only updates DOM (external system) — never calls setState.
  // This satisfies react-hooks/set-state-in-effect.
  useLayoutEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDark]);

  const toggle = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`${isDark ? 'Light' : 'Dark'} mode`}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m6.08 0l4.24-4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m6.08 0l4.24 4.24M23 12a11 11 0 11-22 0 11 11 0 0122 0z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
