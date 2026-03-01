import React from 'react';
import { type MarketTemperature } from './types';

const TEMP_CONFIG: Record<MarketTemperature, { label: string; color: string; bg: string }> = {
  hot:     { label: 'Hot',     color: 'var(--color-danger)',         bg: 'var(--color-danger-bg)'    },
  warm:    { label: 'Warm',    color: 'var(--color-warning)',        bg: 'var(--color-warning-bg)'   },
  neutral: { label: 'Neutral', color: 'var(--color-brand)',          bg: 'var(--color-brand-subtle)' },
  cool:    { label: 'Cool',    color: 'var(--color-text-secondary)', bg: 'var(--color-bg-elevated)'  },
  cold:    { label: 'Cold',    color: 'var(--color-text-muted)',     bg: 'var(--color-bg-subtle)'    },
};

export function TemperatureBadge({ temp }: { temp: MarketTemperature }) {
  const { label, color, bg } = TEMP_CONFIG[temp];
  return (
    <span style={{
      display:         'inline-block',
      padding:         '4px 12px',
      borderRadius:    6,
      fontSize:        12,
      fontWeight:      600,
      letterSpacing:   '0.05em',
      textTransform:   'uppercase',
      fontFamily:      'var(--font-body)',
      color,
      backgroundColor: bg,
      border:          `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
    }}>
      {label}
    </span>
  );
}
