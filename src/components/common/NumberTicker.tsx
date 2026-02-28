import React, { useEffect, useRef, useState } from 'react';

interface NumberTickerProps {
  value:     number;
  prefix?:   string;
  suffix?:   string;
  decimals?: number;
  className?: string;
}

const DURATION_MS = 800;

/** Cubic ease-out: fast start, slow finish. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a number from 0 → value on first mount (and whenever value changes).
 * Uses JetBrains Mono for consistent financial-number rendering.
 *
 * Example: <NumberTicker value={1234.56} prefix="€" decimals={2} />
 *          → displays "€1,234.56" counting up from "€0.00"
 */
export function NumberTicker({
  value,
  prefix   = '',
  suffix   = '',
  decimals = 0,
  className,
}: NumberTickerProps) {
  const [displayed, setDisplayed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef       = useRef<number | null>(null);

  useEffect(() => {
    // Cancel any in-progress animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    startTimeRef.current = null;

    const animate = (ts: number) => {
      if (startTimeRef.current === null) startTimeRef.current = ts;

      const elapsed  = ts - startTimeRef.current;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      const eased    = easeOut(progress);

      setDisplayed(eased * value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayed(value);  // snap to exact final value
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  const formatted = displayed.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span
      className={className}
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default NumberTicker;
