/**
 * Immonator Design System — single source of truth for all styling tokens.
 * These values mirror the CSS custom properties defined in src/index.css.
 * Use CSS variables in stylesheets; use this object in JS/TS logic (e.g.
 * chart configs, dynamic styles, tests).
 */

export const DESIGN = {
  // ── Colors ─────────────────────────────────────────────────────────────────

  colors: {
    // Backgrounds
    bgBase:     '#0A0F1E',
    bgSurface:  '#111827',
    bgElevated: '#1C2333',
    bgSubtle:   '#1E2A3A',

    // Text
    textPrimary:   '#F0F4F8',
    textSecondary: '#8A9BB0',
    textMuted:     '#4A5568',

    // Brand
    brand:       '#2E6BFF',
    brandHover:  '#1A56E8',
    brandSubtle: '#1A2E4A',

    // Status
    success:    '#10B981',
    successBg:  '#052E1C',
    warning:    '#F59E0B',
    warningBg:  '#2D1F00',
    danger:     '#EF4444',
    dangerBg:   '#2D0A0A',

    // Cool (teal — market temperature)
    cool:   '#0d9488',
    coolBg: '#042f2e',

    // Borders
    border:       '#1E2D40',
    borderStrong: '#2D3F55',
  },

  // ── Typography ──────────────────────────────────────────────────────────────

  fonts: {
    display: "'DM Serif Display', serif",
    body:    "'DM Sans', sans-serif",
    mono:    "'JetBrains Mono', monospace",
  },

  fontSizes: {
    xs:   '0.75rem',
    sm:   '0.875rem',
    base: '1rem',
    lg:   '1.125rem',
    xl:   '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
    '4xl': '2.5rem',
  },

  // ── Spacing (4px base grid) ─────────────────────────────────────────────────

  spacing: {
    1:  '4px',
    2:  '8px',
    3:  '12px',
    4:  '16px',
    6:  '24px',
    8:  '32px',
    12: '48px',
    16: '64px',
  },
} as const;

export type DesignTokens = typeof DESIGN;
