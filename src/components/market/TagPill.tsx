import React from 'react';

type TagPillVariant = 'neutral' | 'success' | 'danger';

const VARIANT_MAP: Record<TagPillVariant, { color: string; bg: string; border: string }> = {
  neutral: { color: 'var(--color-text-secondary)', bg: 'var(--color-bg-elevated)', border: 'var(--color-border)'  },
  success: { color: 'var(--color-success)',         bg: 'var(--color-success-bg)',  border: 'var(--color-success)' },
  danger:  { color: 'var(--color-danger)',          bg: 'var(--color-danger-bg)',   border: 'var(--color-danger)'  },
};

export function TagPill({ label, variant = 'neutral' }: { label: string; variant?: TagPillVariant }) {
  const { color, bg, border } = VARIANT_MAP[variant];
  return (
    <span style={{
      display:         'inline-block',
      padding:         '6px 14px',
      borderRadius:    20,
      fontSize:        13,
      fontFamily:      'var(--font-body)',
      color,
      backgroundColor: bg,
      border:          `1px solid color-mix(in srgb, ${border} 40%, transparent)`,
    }}>
      {label}
    </span>
  );
}
