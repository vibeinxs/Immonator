import React from 'react';

const SHIMMER_KEYFRAMES = `
@keyframes immo-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
`;

interface LoadingStateProps {
  height?:       string | number;
  width?:        string | number;
  borderRadius?: string | number;
  className?:    string;
}

function toPx(v: string | number): string {
  return typeof v === 'number' ? `${v}px` : v;
}

/**
 * Shimmer skeleton placeholder — use in place of content while data loads.
 * Renders a grey gradient that sweeps left-to-right (1.5s loop).
 */
export function LoadingState({
  height       = 20,
  width        = '100%',
  borderRadius = 8,
  className,
}: LoadingStateProps) {
  return (
    <>
      <style>{SHIMMER_KEYFRAMES}</style>
      <div
        className={className}
        style={{
          height:         toPx(height),
          width:          toPx(width),
          borderRadius:   toPx(borderRadius),
          background:     [
            'linear-gradient(',
            '90deg,',
            'var(--color-bg-elevated) 25%,',
            'var(--color-bg-subtle)   50%,',
            'var(--color-bg-elevated) 75%',
            ')',
          ].join(' '),
          backgroundSize: '200% 100%',
          animation:      'immo-shimmer 1.5s ease-in-out infinite',
        }}
      />
    </>
  );
}

export default LoadingState;
