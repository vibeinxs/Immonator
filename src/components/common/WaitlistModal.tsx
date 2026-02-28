import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';

const MODAL_KEYFRAMES = `
@keyframes immo-modal-in {
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1);    }
}
`;

interface WaitlistModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  featureName: string;
}

export function WaitlistModal({ isOpen, onClose, featureName }: WaitlistModalProps) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setLoading(false);
      setSuccess(false);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    const { error: apiError } = await api.post('/api/waitlist', {
      email:   email.trim(),
      feature: featureName,
    });

    setLoading(false);
    if (apiError) {
      setError(apiError);
    } else {
      setSuccess(true);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{MODAL_KEYFRAMES}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:        'fixed',
          inset:           0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter:  'blur(4px)',
          zIndex:          100,
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-modal-title"
        style={{
          position:        'fixed',
          top:             '50%',
          left:            '50%',
          transform:       'translate(-50%, -50%)',
          backgroundColor: 'var(--color-bg-elevated)',
          border:          '1px solid var(--color-border-strong)',
          borderRadius:    '16px',
          padding:         '32px',
          width:           'min(440px, calc(100vw - 32px))',
          zIndex:          101,
          animation:       'immo-modal-in 200ms ease',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position:        'absolute',
            top:             '16px',
            right:           '16px',
            background:      'none',
            border:          'none',
            color:           'var(--color-text-muted)',
            fontSize:        '22px',
            lineHeight:      1,
            padding:         '4px 8px',
            cursor:          'pointer',
          }}
        >
          ×
        </button>

        {success ? (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p
              style={{
                fontSize:   '36px',
                margin:     '0 0 16px',
                color:      'var(--color-success)',
              }}
            >
              ✓
            </p>
            <h2
              style={{
                margin:     '0 0 8px',
                fontSize:   '20px',
                fontWeight: 600,
                color:      'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              You're on the list!
            </h2>
            <p
              style={{
                margin:     0,
                fontSize:   '14px',
                color:      'var(--color-text-secondary)',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.6,
              }}
            >
              We'll notify you when <strong>{featureName}</strong> is available.
            </p>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h2
              id="waitlist-modal-title"
              style={{
                margin:     '0 0 8px',
                fontSize:   '22px',
                fontWeight: 400,
                color:      'var(--color-text-primary)',
                fontFamily: 'var(--font-display)',
              }}
            >
              Unlock {featureName}
            </h2>
            <p
              style={{
                margin:     '0 0 24px',
                fontSize:   '14px',
                color:      'var(--color-text-secondary)',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.6,
              }}
            >
              Join the waitlist and be first to know when this feature launches.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  display:         'block',
                  width:           '100%',
                  padding:         '12px 16px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border:          `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  borderRadius:    '8px',
                  color:           'var(--color-text-primary)',
                  fontSize:        '15px',
                  fontFamily:      'var(--font-body)',
                  outline:         'none',
                  marginBottom:    error ? '8px' : '12px',
                  boxSizing:       'border-box',
                }}
              />

              {error && (
                <p
                  style={{
                    margin:     '0 0 12px',
                    fontSize:   '12px',
                    color:      'var(--color-danger)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  display:         'block',
                  width:           '100%',
                  padding:         '13px',
                  backgroundColor: 'var(--color-brand)',
                  color:           '#fff',
                  border:          'none',
                  borderRadius:    '8px',
                  fontSize:        '15px',
                  fontWeight:      600,
                  fontFamily:      'var(--font-body)',
                  cursor:          loading ? 'not-allowed' : 'pointer',
                  opacity:         loading || !email.trim() ? 0.6 : 1,
                  transition:      'opacity 150ms ease',
                }}
              >
                {loading ? 'Joining…' : 'Join Waitlist'}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}

export default WaitlistModal;
