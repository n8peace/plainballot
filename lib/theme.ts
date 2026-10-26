// Shared by the theme switch (components/ThemeToggle.tsx) and the no-flash head script.

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'pb-theme';
export const THEME_COLOR: Record<Theme, string> = { light: '#ffffff', dark: '#131313' };

/** Runs in <head> before first paint: applies a saved choice, or nothing (system default). */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;
