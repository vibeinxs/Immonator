import React, { useState, useEffect } from 'react';

const HINT_STYLES = `
@keyframes immo-hint-fade-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-4px); }
}
`;

interface ContextHintProps {
  hintId:   string;
  headline: string;
  body:     string;
  position?: 'top' | 'bottom';
}

export function ContextHint({ hintId, headline, body }: ContextHintProps) {
  const storageKey = `immo_hint_${hintId}_dismissed`;

  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });
  const [fading, setFading] = useState(false);

  // Keep timer ref so we can clear on unmount
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (dismissed) return null;

  function handleDismiss() {
    setFading(true);
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, 'true'); } catch { /* ignore */ }
      setDismissed(true);
    }, 200);
  }

  return (
    <>
      <style>{HINT_STYLES}</style>
      <div
        role="note"
        style={{
          backgroundColor: 'var(--color-brand-subtle)',
          borderLeft:      '3px solid var(--color-brand)',
          borderRadius:    '8px',
          padding:         '12px 16px',
          display:         'flex',
          alignItems:      'flex-start',
          gap:             '12px',
          animation:       fading ? 'immo-hint-fade-out 200ms ease forwards' : undefined,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize:      '13px',
              fontWeight:    600,
              color:         'var(--color-brand)',
              fontFamily:    'var(--font-body)',
              marginBottom:  '2px',
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize:   '13px',
              color:      'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.5,
            }}
          >
            {body}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss hint"
          style={{
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            color:       'var(--color-text-muted)',
            fontSize:    '18px',
            lineHeight:  1,
            padding:     '0 2px',
            flexShrink:  0,
            marginTop:   '-1px',
          }}
        >
          ×
        </button>
      </div>
    </>
  );
}

export default ContextHint;
