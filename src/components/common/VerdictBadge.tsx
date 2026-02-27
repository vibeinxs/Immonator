import React from 'react';

export type Verdict =
  | 'strong_buy'
  | 'worth_analysing'
  | 'proceed_with_caution'
  | 'avoid';

interface VerdictConfig {
  label: string;
  color: string;
  bg: string;
}

const VERDICT_CONFIG: Record<Verdict, VerdictConfig> = {
  strong_buy: {
    label: 'Strong Buy',
    color: 'var(--color-success)',
    bg:    'var(--color-success-bg)',
  },
  worth_analysing: {
    label: 'Worth Analysing',
    color: 'var(--color-brand)',
    bg:    'var(--color-brand-subtle)',
  },
  proceed_with_caution: {
    label: 'Proceed with Caution',
    color: 'var(--color-warning)',
    bg:    'var(--color-warning-bg)',
  },
  avoid: {
    label: 'Avoid',
    color: 'var(--color-danger)',
    bg:    'var(--color-danger-bg)',
  },
};

interface VerdictBadgeProps {
  verdict: Verdict;
  className?: string;
}

export function VerdictBadge({ verdict, className }: VerdictBadgeProps) {
  const { label, color, bg } = VERDICT_CONFIG[verdict];

  return (
    <span
      className={className}
      style={{
        display:       'inline-block',
        borderRadius:  '6px',
        padding:       '4px 12px',
        fontSize:      'var(--text-xs)',
        fontWeight:    600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        fontFamily:    'var(--font-body)',
        color,
        backgroundColor: bg,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

export default VerdictBadge;
