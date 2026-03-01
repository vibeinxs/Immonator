import React, { useState, useEffect } from 'react';

const TOAST_STYLES = `
@keyframes immo-toast-slide-up {
  from { opacity: 0; transform: translate(-50%, 100%); }
  to   { opacity: 1; transform: translate(-50%, 0);   }
}
@keyframes immo-toast-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
`;

export interface ToastProps {
  /** Content to display — can be a string or JSX with coloured spans. */
  message:   React.ReactNode;
  /** Called when the toast finishes dismissing. */
  onDone:    () => void;
  /** Optional click handler (e.g. scroll-to-tab). Adds pointer cursor. */
  onClick?:  () => void;
  /** Auto-dismiss delay in ms (default 4000). */
  duration?: number;
}

/**
 * Slide-up toast notification, bottom-centre of the viewport.
 *
 * Mount it with a changing `key` prop to reset the auto-dismiss timer
 * when you want to replace the message mid-session.
 *
 * @example
 * {toastVisible && (
 *   <Toast key={toastKey} message={toastContent} onDone={() => setToastVisible(false)} />
 * )}
 */
export function Toast({ message, onDone, onClick, duration = 4000 }: ToastProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeAt = duration - 200;
    const t1 = setTimeout(() => setFading(true), fadeAt > 0 ? fadeAt : duration);
    const t2 = setTimeout(onDone, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [duration, onDone]);

  return (
    <>
      <style>{TOAST_STYLES}</style>
      <div
        role="status"
        aria-live="polite"
        onClick={onClick}
        style={{
          position:        'fixed',
          bottom:          32,
          left:            '50%',
          zIndex:          999,
          backgroundColor: 'var(--color-bg-elevated)',
          border:          '1px solid var(--color-border)',
          borderRadius:    10,
          padding:         '12px 20px',
          minWidth:        280,
          fontSize:        13,
          fontFamily:      'var(--font-body)',
          color:           'var(--color-text-primary)',
          boxShadow:       '0 8px 32px rgba(0,0,0,0.45)',
          textAlign:       'center',
          whiteSpace:      'nowrap',
          cursor:          onClick ? 'pointer' : 'default',
          animation:       fading
            ? 'immo-toast-fade-out 200ms ease forwards'
            : 'immo-toast-slide-up 300ms ease',
        }}
      >
        {message}
      </div>
    </>
  );
}

export default Toast;
