import React, { useState } from 'react';
import { WaitlistModal } from './WaitlistModal';

// PHASE 4: Replace with real feature gating after Stripe integration.
// Until then, all "pro" features render this locked state + waitlist flow.

interface LockedButtonProps {
  label:        string;
  featureName:  string;
  icon?:        React.ReactNode;
  className?:   string;
}

export function LockedButton({ label, featureName, icon, className }: LockedButtonProps) {
  const [hovered,   setHovered]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        className={className}
        style={{ position: 'relative', display: 'inline-block' }}
      >
        <button
          onClick={() => setModalOpen(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display:         'inline-flex',
            alignItems:      'center',
            gap:             '8px',
            padding:         '10px 20px',
            backgroundColor: 'var(--color-bg-elevated)',
            border:          `1px solid ${hovered ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
            borderRadius:    '8px',
            color:           hovered
              ? 'var(--color-text-primary)'
              : 'var(--color-text-secondary)',
            fontSize:        '14px',
            fontWeight:      500,
            fontFamily:      'var(--font-body)',
            cursor:          'pointer',
            transition:      'border-color 150ms ease, color 150ms ease',
          }}
        >
          {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
          <span>🔒</span>
          <span>{label}</span>
        </button>

        {/* Tooltip */}
        {hovered && (
          <div
            role="tooltip"
            style={{
              position:        'absolute',
              bottom:          'calc(100% + 8px)',
              left:            '50%',
              transform:       'translateX(-50%)',
              whiteSpace:      'nowrap',
              backgroundColor: 'var(--color-bg-elevated)',
              border:          '1px solid var(--color-border-strong)',
              borderRadius:    '6px',
              padding:         '6px 12px',
              fontSize:        '12px',
              color:           'var(--color-text-secondary)',
              fontFamily:      'var(--font-body)',
              pointerEvents:   'none',
              zIndex:          50,
            }}
          >
            Available in Pro plan
          </div>
        )}
      </div>

      <WaitlistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        featureName={featureName}
      />
    </>
  );
}

export default LockedButton;
