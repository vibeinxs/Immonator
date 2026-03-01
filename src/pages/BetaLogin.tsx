import { useState, type FormEvent, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { setDisplayName } from '../lib/auth';
import { OnboardingFlow, isOnboarded } from '../components/onboarding/OnboardingFlow';

const TOKEN_KEY = 'immo_token';
const USER_ID_KEY = 'immo_user_id';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/* ── Keyframe injection ───────────────────────────────────────────────────── */
const FLOAT_KEYFRAMES = `
@keyframes immo-float {
  0%   { transform: translateY(0px) rotate(-1deg); }
  50%  { transform: translateY(-14px) rotate(1deg); }
  100% { transform: translateY(0px) rotate(-1deg); }
}
@keyframes immo-float-b {
  0%   { transform: translateY(0px) rotate(2deg); }
  50%  { transform: translateY(-10px) rotate(-1.5deg); }
  100% { transform: translateY(0px) rotate(2deg); }
}
@keyframes immo-float-c {
  0%   { transform: translateY(-6px) rotate(-0.5deg); }
  50%  { transform: translateY(6px) rotate(1deg); }
  100% { transform: translateY(-6px) rotate(-0.5deg); }
}
@keyframes immo-dot-fade {
  0%,100% { opacity: 0.35; }
  50%      { opacity: 0.6; }
}
`;

function InjectStyles() {
  return <style>{FLOAT_KEYFRAMES}</style>;
}

/* ── Decorative mock cards ────────────────────────────────────────────────── */
function AnalysisCard({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: '14px',
        padding: '20px 22px',
        width: '280px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'var(--color-brand-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>🏠</div>
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Prenzlauer Berg
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Berlin · 72 m²
          </div>
        </div>
        <span style={{
          marginLeft: 'auto',
          background: 'var(--color-success-bg)',
          color: 'var(--color-success)',
          fontSize: 'var(--text-xs)', fontWeight: 600,
          padding: '2px 8px', borderRadius: 6,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>Strong Buy</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Fair Value', value: '€485,000' },
          { label: 'Ask Price', value: '€460,000' },
          { label: 'Gross Yield', value: '4.8%' },
          { label: 'Score', value: '87 / 100' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'var(--color-bg-surface)',
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{
              fontSize: 'var(--text-base)', fontWeight: 700,
              fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)',
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function YieldCard({ style }: { style?: CSSProperties }) {
  const bars = [62, 78, 55, 91, 84, 70, 88];
  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: '14px',
        padding: '18px 20px',
        width: '240px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        ...style,
      }}
    >
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Yield Trend · 7d
      </div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-success)', marginBottom: 14 }}>
        +4.8%
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 48 }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            flex: 1, borderRadius: 4,
            background: i === bars.length - 1 ? 'var(--color-brand)' : 'var(--color-brand-subtle)',
            height: `${h}%`,
          }} />
        ))}
      </div>
    </div>
  );
}

function ChatBubbleCard({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: '14px',
        padding: '16px 18px',
        width: '260px',
        boxShadow: '0 16px 36px rgba(0,0,0,0.4)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--color-brand)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13,
        }}>🤖</div>
        <div style={{
          background: 'var(--color-bg-surface)', borderRadius: '10px 10px 10px 2px',
          padding: '8px 12px',
          fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', lineHeight: 1.5,
        }}>
          The ask price is <strong>6% below fair value</strong>. Strong negotiation position.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <div style={{
          background: 'var(--color-brand-subtle)', borderRadius: '10px 10px 2px 10px',
          padding: '8px 12px',
          fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5,
          maxWidth: '80%',
        }}>
          What should I offer?
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--color-bg-subtle)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13,
        }}>👤</div>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export function BetaLogin() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState<string | undefined>();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError('Please enter your beta access code.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/beta-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), name: name.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.message ?? 'Invalid code. Check your invite and try again.');
        return;
      }
      localStorage.setItem(TOKEN_KEY, body.token);
      localStorage.setItem(USER_ID_KEY, body.user_id ?? body.userId ?? '');
      const resolvedName = body.display_name ?? body.name ?? name.trim();
      setDisplayName(resolvedName);
      if (body.is_new_user && !isOnboarded()) {
        setOnboardingName(resolvedName || undefined);
        setShowOnboarding(true);
        return;
      }
      navigate('/properties', { replace: true });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const hasError = error.length > 0;

  return (
    <>
      <InjectStyles />
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        fontFamily: 'var(--font-body)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          maxWidth: 1040,
          width: '100%',
          gap: 64,
          alignItems: 'center',
        }}
          className="beta-login-grid"
        >
          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <div>
            {/* Wordmark + BETA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.01em',
              }}>Immonator</span>
              <span style={{
                background: 'var(--color-brand-subtle)',
                color: 'var(--color-brand)',
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid var(--color-brand)',
              }}>BETA</span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 44,
              lineHeight: 1.15,
              color: 'var(--color-text-primary)',
              margin: '0 0 18px',
              letterSpacing: '-0.02em',
            }}>
              German Real Estate<br />
              Analysis, Powered by AI
            </h1>

            {/* Subheading */}
            <p style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
              margin: '0 0 28px',
              maxWidth: 420,
            }}>
              Valuations, investment strategy, and negotiation briefs — in seconds, not weeks.
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
              {['⚡ Instant Valuation', '📊 AI Strategy', '🤝 Negotiation Briefs'].map((pill) => (
                <span key={pill} style={{
                  background: 'var(--color-brand-subtle)',
                  color: 'var(--color-brand)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  padding: '6px 14px',
                  borderRadius: 100,
                  border: '1px solid color-mix(in srgb, var(--color-brand) 30%, transparent)',
                }}>{pill}</span>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Code input */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 8,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}>
                  Beta Access Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(''); }}
                  placeholder="e.g. IMMO-ABCD"
                  autoComplete="off"
                  autoFocus
                  style={{
                    width: '100%',
                    height: 52,
                    background: 'var(--color-bg-surface)',
                    border: `1.5px solid ${hasError ? 'var(--color-danger)' : 'var(--color-border-strong)'}`,
                    borderRadius: 10,
                    padding: '0 16px',
                    fontSize: 'var(--text-base)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    letterSpacing: '0.05em',
                  }}
                />
              </div>

              {/* Name input */}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                style={{
                  width: '100%',
                  height: 44,
                  background: 'var(--color-bg-surface)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 10,
                  padding: '0 16px',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />

              {/* Error message */}
              {hasError && (
                <p style={{
                  margin: 0,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-danger)',
                }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 48,
                  background: loading ? 'var(--color-brand-subtle)' : 'var(--color-brand)',
                  color: loading ? 'var(--color-brand)' : '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s, opacity 0.15s',
                  letterSpacing: '0.01em',
                  marginTop: 4,
                }}
              >
                {loading ? 'Checking…' : 'Get Started →'}
              </button>
            </form>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
          <div
            className="beta-login-right"
            style={{
              position: 'relative',
              height: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Dot grid background */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle, var(--color-border-strong) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              borderRadius: 20,
              animation: 'immo-dot-fade 4s ease-in-out infinite',
            }} />

            {/* Floating cards */}
            <AnalysisCard style={{
              position: 'absolute',
              top: 30, left: '50%', transform: 'translateX(-50%)',
              animation: 'immo-float 6s ease-in-out infinite',
            }} />
            <YieldCard style={{
              position: 'absolute',
              bottom: 60, left: 20,
              animation: 'immo-float-b 7s ease-in-out infinite',
            }} />
            <ChatBubbleCard style={{
              position: 'absolute',
              bottom: 20, right: 0,
              animation: 'immo-float-c 8s ease-in-out infinite',
            }} />
          </div>
        </div>
      </div>

      {/* Responsive: hide right column on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .beta-login-grid {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }
          .beta-login-right {
            display: none !important;
          }
        }
      `}</style>

      {showOnboarding && (
        <OnboardingFlow
          displayName={onboardingName}
          onDone={() => navigate('/properties', { replace: true })}
        />
      )}
    </>
  );
}

export default BetaLogin;
