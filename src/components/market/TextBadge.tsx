import React from 'react';

// Generic badge lookup — values come from the API as underscore_strings.
const BADGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  // buyer_seller_balance
  sellers_market: { label: 'Sellers Market', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'    },
  balanced:       { label: 'Balanced',       color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  buyers_market:  { label: 'Buyers Market',  color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  // price_level
  undervalued:    { label: 'Undervalued',    color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  fair_value:     { label: 'Fair Value',     color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  overvalued:     { label: 'Overvalued',     color: 'var(--color-warning)', bg: 'var(--color-warning-bg)'  },
  high:           { label: 'High',           color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
  // price_trend
  rising_fast:    { label: 'Rising Fast',    color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
  rising:         { label: 'Rising',         color: 'var(--color-warning)', bg: 'var(--color-warning-bg)'  },
  stable:         { label: 'Stable',         color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  declining:      { label: 'Declining',      color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  // yield_assessment
  excellent:      { label: 'Excellent',      color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  above_average:  { label: 'Above Average',  color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  average:        { label: 'Average',        color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  below_average:  { label: 'Below Average',  color: 'var(--color-warning)', bg: 'var(--color-warning-bg)'  },
  poor:           { label: 'Poor',           color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
};

function capitalize(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function TextBadge({ value }: { value: string }) {
  const cfg   = BADGE_CONFIG[value];
  const color = cfg?.color ?? 'var(--color-text-secondary)';
  const bg    = cfg?.bg    ?? 'var(--color-bg-elevated)';
  const label = cfg?.label ?? capitalize(value);
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
