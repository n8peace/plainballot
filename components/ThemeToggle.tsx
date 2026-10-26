'use client';

// Light / dark switch. Follows the system setting until the person taps; a tap is
// remembered, and choosing the same theme as the system clears the override so the
// site follows the system again. The inline script in app/layout.tsx applies a saved
// choice before first paint, so there's no flash of the wrong theme.

import { useEffect, useSyncExternalStore } from 'react';
import { THEME_COLOR, THEME_KEY, type Theme } from '@/lib/theme';

const systemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const savedTheme = (): Theme | null => {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
};

function apply(theme: Theme, override: boolean) {
  const root = document.documentElement;
  if (override) root.dataset.theme = theme;
  else delete root.dataset.theme;
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    // With an override, every theme-color tag carries the chosen color; otherwise each
    // goes back to its own media query's color.
    m.content = override ? THEME_COLOR[theme] : m.media.includes('dark') ? THEME_COLOR.dark : THEME_COLOR.light;
  }
}

// The effective theme is outside React (the <html> attribute and the system setting), so
// read it with useSyncExternalStore: re-render when the system setting or the switch changes.
const CHANGE = 'pb-theme-change';
function subscribe(cb: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', cb);
  window.addEventListener(CHANGE, cb);
  return () => { mq.removeEventListener('change', cb); window.removeEventListener(CHANGE, cb); };
}
const current = (): Theme => (document.documentElement.dataset.theme as Theme | undefined) ?? systemTheme();

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => null);

  useEffect(() => {
    const saved = savedTheme();
    if (saved) apply(saved, true); // the head script may run before theme-color tags exist
  }, []);

  const toggle = () => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark';
    const override = next !== systemTheme();
    try {
      if (override) localStorage.setItem(THEME_KEY, next);
      else localStorage.removeItem(THEME_KEY);
    } catch { /* storage blocked: the switch still works for this visit */ }
    apply(next, override);
    window.dispatchEvent(new Event(CHANGE));
  };

  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme-now={theme ?? undefined}
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun shows in dark mode (tap for light); moon shows in light mode (tap for dark). */}
      <svg className="tt-icon tt-sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
      </svg>
      <svg className="tt-icon tt-moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}
