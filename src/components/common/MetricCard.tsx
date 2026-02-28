import React from 'react';

type MetricColor = 'default' | 'success' | 'warning' | 'danger' | 'brand';

interface MetricCardProps {
  label:       string;
  value:       string | number;
  context?:    string;
  isMonospace?: boolean;
  color?:      MetricColor;
  className?:  string;
}

const COLOR_MAP: Record<MetricColor, string> = {
  default: 'var(--color-text-secondary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger:  'var(--color-danger)',
  brand:   'var(--color-brand)',
};

export function MetricCard({
  label,
  value,
  context,
  isMonospace = false,
  color       = 'default',
  className,
}: MetricCardProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border:          '1px solid var(--color-border)',
        borderRadius:    '12px',
        padding:         '20px',
      }}
    >
      {/* Label */}
      <p
        style={{
          margin:        0,
          fontSize:      '11px',
          fontWeight:    500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:         'var(--color-text-secondary)',
          fontFamily:    'var(--font-body)',
        }}
      >
        {label}
      </p>

      {/* Value */}
      <p
        style={{
          margin:     '8px 0 0',
          fontSize:   '32px',
          fontWeight: isMonospace ? 500 : 400,
          lineHeight: 1.1,
          color:      'var(--color-text-primary)',
          fontFamily: isMonospace ? 'var(--font-mono)' : 'var(--font-display)',
        }}
      >
        {value}
      </p>

      {/* Context */}
      {context && (
        <p
          style={{
            margin:     '6px 0 0',
            fontSize:   '12px',
            lineHeight: 1.5,
            color:      COLOR_MAP[color],
            fontFamily: 'var(--font-body)',
          }}
        >
          {context}
        </p>
      )}
    </div>
  );
}

export default MetricCard;
