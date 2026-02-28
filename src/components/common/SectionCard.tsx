import React, { useState } from 'react';

interface SectionCardProps {
  title:        string;
  subtitle?:    string;
  children:     React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?:   string;
}

export function SectionCard({
  title,
  subtitle,
  children,
  collapsible  = false,
  defaultOpen  = true,
  className,
}: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [headerHovered, setHeaderHovered] = useState(false);

  const handleToggle = () => {
    if (collapsible) setIsOpen(prev => !prev);
  };

  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border:          '1px solid var(--color-border)',
        borderRadius:    '12px',
      }}
    >
      {/* ── Header ── */}
      <div
        onClick={handleToggle}
        onMouseEnter={() => collapsible && setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
        style={{
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          padding:         '20px 24px',
          cursor:          collapsible ? 'pointer' : 'default',
          userSelect:      'none',
          borderRadius:    isOpen ? '12px 12px 0 0' : '12px',
          backgroundColor: collapsible && headerHovered
            ? 'var(--color-bg-elevated)'
            : 'transparent',
          transition:      'background-color 150ms ease',
        }}
      >
        <div>
          <h3
            style={{
              margin:     0,
              fontSize:   '16px',
              fontWeight: 600,
              lineHeight: 1.3,
              color:      'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {title}
          </h3>

          {subtitle && (
            <p
              style={{
                margin:     '3px 0 0',
                fontSize:   '13px',
                color:      'var(--color-text-secondary)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Chevron — only when collapsible */}
        {collapsible && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              flexShrink: 0,
              marginLeft: '12px',
              color:      'var(--color-text-muted)',
              transform:  isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 300ms ease',
            }}
          >
            <path
              d="M3 6l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* ── Collapsible body ── */}
      <div
        style={{
          maxHeight:  isOpen ? '4000px' : '0',
          overflow:   'hidden',
          transition: 'max-height 300ms ease',
        }}
      >
        {/* Divider shown only when the header text + content are separated */}
        {isOpen && (
          <div
            style={{
              height:          '1px',
              backgroundColor: 'var(--color-border)',
              margin:          '0 24px',
            }}
          />
        )}
        <div style={{ padding: '20px 24px 24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default SectionCard;
