import { useState, useEffect, useRef, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { logout, getDisplayName } from '../../lib/auth';
import { api } from '../../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ── Global styles for AppShell ────────────────────────────────────────────────

const SHELL_STYLES = `
  .immo-nav-link {
    text-decoration: none;
    transition: color 0.15s;
  }
  .immo-nav-link:hover {
    color: var(--color-text-primary) !important;
  }
  .immo-feedback-btn:hover {
    color: var(--color-text-primary) !important;
  }
  .immo-avatar-btn:hover {
    opacity: 0.85;
  }
  .immo-signout-btn:hover {
    background: var(--color-danger-bg) !important;
  }
  .immo-page-content {
    padding: 32px;
  }
  @media (min-width: 768px) {
    .immo-bottom-nav { display: none !important; }
  }
  @media (max-width: 767px) {
    .immo-desktop-nav { display: none !important; }
    .immo-page-content {
      padding: 16px;
      padding-bottom: 72px;
    }
  }
`;

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Properties',   icon: '🏠', to: '/properties'  },
  { label: 'My Portfolio', icon: '💼', to: '/portfolio'   },
  { label: 'Markets',      icon: '🗺', to: '/markets'     },
  { label: 'Strategy',     icon: '📊', to: '/strategy'    },
] as const;

// ── FeedbackModal ─────────────────────────────────────────────────────────────

type FeedbackType = 'Bug' | 'Suggestion' | 'General' | 'Rating';

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [type, setType]           = useState<FeedbackType>('General');
  const [message, setMessage]     = useState('');
  const [rating, setRating]       = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  async function handleSend() {
    setLoading(true);
    setError('');
    const result = await api.post('/api/feedback', {
      type,
      message,
      ...(type === 'Rating' ? { rating } : {}),
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setTimeout(onClose, 2000);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        aria-label="Close"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          pointerEvents: 'none',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 16,
            padding: '28px 32px',
            width: '100%', maxWidth: 440,
            pointerEvents: 'all',
            fontFamily: 'var(--font-body)',
          }}
        >
          {success ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12, color: 'var(--color-success)' }}>✓</div>
              <p style={{
                margin: 0, fontFamily: 'var(--font-body)',
                color: 'var(--color-success)', fontSize: 'var(--text-base)', fontWeight: 500,
              }}>
                Thanks! We read every message.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 20,
              }}>
                <h2
                  id="feedback-title"
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 400,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  How can we improve?
                </h2>
                <button
                  onClick={onClose}
                  aria-label="Close feedback modal"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', fontSize: 22, lineHeight: 1,
                    padding: '2px 6px', borderRadius: 4,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  ×
                </button>
              </div>

              {/* Type pills */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {(['Bug', 'Suggestion', 'General', 'Rating'] as FeedbackType[]).map((t) => {
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 100,
                        border: `1px solid ${active ? 'var(--color-brand)' : 'var(--color-border-strong)'}`,
                        background: active ? 'var(--color-brand-subtle)' : 'transparent',
                        color: active ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                        fontSize: 'var(--text-sm)',
                        fontFamily: 'var(--font-body)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>

              {/* Textarea */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-text-primary)',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: type === 'Rating' ? 16 : 20,
                  display: 'block',
                }}
              />

              {/* Star rating — visible only when "Rating" selected */}
              {type === 'Rating' && (
                <div
                  role="group"
                  aria-label="Star rating"
                  style={{ display: 'flex', gap: 4, marginBottom: 20 }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverStar(star)}
                      onMouseLeave={() => setHoverStar(0)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 28, padding: '0 2px', lineHeight: 1,
                        color: star <= (hoverStar || rating)
                          ? 'var(--color-warning)'
                          : 'var(--color-border-strong)',
                        transition: 'color 0.1s',
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <p style={{
                  margin: '0 0 12px',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-danger)',
                }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleSend}
                disabled={loading}
                style={{
                  width: '100%', height: 44,
                  background: loading ? 'var(--color-brand-subtle)' : 'var(--color-brand)',
                  color: loading ? 'var(--color-brand)' : '#fff',
                  border: 'none', borderRadius: 8,
                  fontSize: 'var(--text-sm)', fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {loading ? 'Sending…' : 'Send Feedback'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── UserMenu ──────────────────────────────────────────────────────────────────

function UserMenu() {
  const displayName = getDisplayName();
  const initials    = getInitials(displayName);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="User menu"
        aria-expanded={open}
        className="immo-avatar-btn"
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--color-brand-subtle)',
          border: '1.5px solid var(--color-brand)',
          color: 'var(--color-brand)',
          fontSize: 'var(--text-sm)', fontWeight: 700,
          fontFamily: 'var(--font-body)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'opacity 0.15s',
          flexShrink: 0,
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 42, right: 0,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 10,
            padding: '8px 0',
            minWidth: 190,
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            zIndex: 200,
          }}
        >
          <div style={{
            padding: '8px 14px 10px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              marginBottom: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Signed in as
            </div>
            <div style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}>
              {displayName ?? 'Beta User'}
            </div>
          </div>
          <button
            role="menuitem"
            className="immo-signout-btn"
            onClick={() => { setOpen(false); logout(); }}
            style={{
              width: '100%', textAlign: 'left',
              background: 'none', border: 'none',
              padding: '8px 14px',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ── TopNav ────────────────────────────────────────────────────────────────────

function TopNav({ onFeedback }: { onFeedback: () => void }) {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 56,
      background: 'var(--color-bg-surface)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
    }}>
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.01em',
        }}>
          Immonator
        </span>
        <span style={{
          background: 'var(--color-brand-subtle)',
          color: 'var(--color-brand)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '2px 7px',
          borderRadius: 5,
          border: '1px solid var(--color-brand)',
          lineHeight: 1.5,
        }}>
          BETA
        </span>
      </div>

      {/* Desktop nav — centered */}
      <nav
        className="immo-desktop-nav"
        aria-label="Main navigation"
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        {NAV_ITEMS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            className="immo-nav-link"
            style={({ isActive }) => ({
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: isActive ? 'var(--color-brand)' : 'var(--color-text-secondary)',
              borderBottom: isActive
                ? '2px solid var(--color-brand)'
                : '2px solid transparent',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right side controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginLeft: 'auto', flexShrink: 0,
      }}>
        <button
          onClick={onFeedback}
          className="immo-feedback-btn"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 7,
            padding: '5px 12px',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'color 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          💬 Feedback
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

// ── BottomNav ─────────────────────────────────────────────────────────────────

function BottomNav() {
  return (
    <nav
      className="immo-bottom-nav"
      aria-label="Mobile navigation"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        height: 56,
        background: 'var(--color-bg-surface)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
      }}
    >
      {NAV_ITEMS.map(({ label, icon, to }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            textDecoration: 'none',
          }}
        >
          {({ isActive }) => (
            <>
              <span style={{
                fontSize: 22,
                lineHeight: 1,
                opacity: isActive ? 1 : 0.4,
                transition: 'opacity 0.15s',
              }}>
                {icon}
              </span>
              {isActive && (
                <span style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--color-brand)',
                  fontFamily: 'var(--font-body)',
                }}>
                  {label}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: ReactNode }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <style>{SHELL_STYLES}</style>

      <TopNav onFeedback={() => setFeedbackOpen(true)} />

      <main style={{ paddingTop: 56, minHeight: '100vh' }}>
        <div
          className="immo-page-content"
          style={{ maxWidth: 1280, margin: '0 auto' }}
        >
          {children}
        </div>
      </main>

      <BottomNav />

      {feedbackOpen && (
        <FeedbackModal onClose={() => setFeedbackOpen(false)} />
      )}
    </>
  );
}
