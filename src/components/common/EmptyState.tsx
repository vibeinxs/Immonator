import React from 'react';

interface EmptyStateProps {
  icon:          string;
  title:         string;
  description?:  string;
  actionLabel?:  string;
  onAction?:     () => void;
  className?:    string;
}

/**
 * Centered empty-state card.
 * Pass an emoji for `icon` (e.g. "🏠", "📊", "🔍").
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border:          '1px solid var(--color-border)',
        borderRadius:    '12px',
        padding:         '48px 24px',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        textAlign:       'center',
        gap:             '12px',
      }}
    >
      {/* Icon */}
      <span
        style={{
          fontSize:  '40px',
          lineHeight: 1,
          color:     'var(--color-text-muted)',
        }}
      >
        {icon}
      </span>

      {/* Title */}
      <h3
        style={{
          margin:     0,
          fontSize:   '16px',
          fontWeight: 600,
          color:      'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          style={{
            margin:     0,
            fontSize:   '14px',
            lineHeight: 1.6,
            color:      'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            maxWidth:   '320px',
          }}
        >
          {description}
        </p>
      )}

      {/* Action button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop:       '8px',
            padding:         '10px 24px',
            backgroundColor: 'var(--color-brand)',
            color:           '#fff',
            border:          'none',
            borderRadius:    '8px',
            fontSize:        '14px',
            fontWeight:      500,
            fontFamily:      'var(--font-body)',
            cursor:          'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
