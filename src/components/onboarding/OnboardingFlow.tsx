import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Storage helpers ──────────────────────────────────────────────────────────

// Versioned key — bump to "v2" to re-show onboarding after a major flow change.
const ONBOARDED_KEY = 'immonator:onboarding';

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) !== null;
}

function markOnboarded(): void {
  localStorage.setItem(ONBOARDED_KEY, `v1-complete:${Date.now()}`);
}

// ── Constants ────────────────────────────────────────────────────────────────

const FEATURES = [
  'Instant Ertragswert & Sachwert for any listing',
  'AI verdict: buy, analyse further, or avoid',
  'Negotiation brief before every offer',
] as const;

// ── Styles ───────────────────────────────────────────────────────────────────

const PAGE_STYLES = `
/* ── Overlay ──────────────────────────────────────────────────── */
.ob-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #0A0F1E;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

/* ── Close button ─────────────────────────────────────────────── */
.ob-close {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.07);
  border: none;
  color: var(--color-text-secondary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms, color 150ms;
}
.ob-close:hover {
  background: rgba(255,255,255,0.13);
  color: var(--color-text-primary);
}

/* ── Content fade wrapper ─────────────────────────────────────── */
.ob-content {
  width: 100%;
  max-width: 520px;
  opacity: 1;
  transition: opacity 200ms ease;
}
.ob-content.ob-fading { opacity: 0; }

/* ── Screen ───────────────────────────────────────────────────── */
.ob-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

/* ── Wordmark ─────────────────────────────────────────────────── */
.ob-wordmark {
  font-family: var(--font-display);
  font-size: 28px;
  color: var(--color-text-primary);
}

/* ── Headline ─────────────────────────────────────────────────── */
.ob-headline {
  font-family: var(--font-display);
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
}

/* ── Subtext ──────────────────────────────────────────────────── */
.ob-subtext {
  font-family: var(--font-body);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.65;
}

/* ── Feature lines (screen 1) ─────────────────────────────────── */
.ob-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 380px;
  margin: 4px 0;
}
.ob-feature-line {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--color-text-primary);
  text-align: left;
  opacity: 0;
  transition: opacity 300ms ease;
}
.ob-feature-line.ob-visible { opacity: 1; }
.ob-check { color: var(--color-success); }

/* ── Button fade wrapper (screen 1) ───────────────────────────── */
.ob-btn-wrap {
  opacity: 0;
  transition: opacity 300ms ease;
}
.ob-btn-wrap.ob-visible { opacity: 1; }

/* ── Primary button ───────────────────────────────────────────── */
.ob-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 52px;
  padding: 0 32px;
  background: var(--color-brand);
  color: #fff;
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: background 150ms ease;
  white-space: nowrap;
}
.ob-btn-primary:hover { background: var(--color-brand-hover); }

/* ── Ghost button ─────────────────────────────────────────────── */
.ob-btn-ghost {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-family: var(--font-body);
  font-size: 14px;
  cursor: pointer;
  padding: 6px;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 150ms;
}
.ob-btn-ghost:hover { color: var(--color-text-secondary); }

/* ── Actions stack ────────────────────────────────────────────── */
.ob-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* ── Progress dots ────────────────────────────────────────────── */
.ob-dots {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  align-items: center;
}
.ob-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted);
  transition: background 300ms ease, transform 300ms ease;
}
.ob-dot.ob-dot-on {
  background: var(--color-text-primary);
  transform: scale(1.15);
}

/* ── Screen 2: property card mockup ──────────────────────────── */
@keyframes s2CardIn     { from { opacity: 0 } to { opacity: 1 } }
@keyframes s2HeartPulse { 0% { transform: scale(1) } 50% { transform: scale(1.35) } 100% { transform: scale(1) } }
@keyframes s2BorderFlash {
  0%, 100% { border-color: var(--color-border); }
  50%       { border-color: var(--color-success); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success) 15%, transparent); }
}
@keyframes s2AnalysisIn { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }

.ob-s2-anim {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 320px;
}

.ob-mock-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px 12px 0 0;
  padding: 16px 18px;
  animation: s2CardIn 400ms ease both,
             s2BorderFlash 600ms ease 800ms both;
}
.ob-mock-card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ob-mock-prop-title {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 3px;
}
.ob-mock-prop-meta {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--color-text-secondary);
}
.ob-mock-heart {
  font-size: 22px;
  color: var(--color-text-muted);
  animation: s2HeartPulse 300ms ease 800ms both;
  transform-origin: center;
}

.ob-mock-analysis {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 12px 12px;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: s2AnalysisIn 400ms ease 1400ms both;
}
.ob-mock-verdict {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 5px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
}
.ob-mock-yield {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-success);
}

/* ── Screen 3: strategy mockup ────────────────────────────────── */
.ob-mock-strategy {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px 24px;
  width: 100%;
  max-width: 320px;
  text-align: left;
}
.ob-mock-strat-label {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 14px;
}
.ob-mock-strat-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  font-family: var(--font-body);
  font-size: 13px;
}
.ob-mock-strat-key { color: var(--color-text-secondary); }
.ob-mock-strat-val { font-family: var(--font-mono); color: var(--color-text-primary); }
.ob-mock-strat-divider {
  height: 1px;
  background: var(--color-border);
  margin: 12px 0;
}
.ob-mock-strat-match {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-text-secondary);
}
.ob-mock-strat-match strong { color: var(--color-brand); }
`;

// ── Component ────────────────────────────────────────────────────────────────

export function OnboardingFlow({
  displayName,
  onDone,
}: {
  displayName?: string;
  onDone: () => void;
}) {
  const navigate    = useNavigate();
  const contentRef  = useRef<HTMLDivElement>(null);
  const timers      = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [screen, setScreen]       = useState<1 | 2 | 3>(1);
  const [fading, setFading]       = useState(false);
  const [lineShown, setLineShown] = useState([false, false, false]);
  const [btnShown, setBtnShown]   = useState(false);

  // Clear all pending timers on unmount
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Esc to skip
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') skip(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus first button after each screen's fade-in completes
  useEffect(() => {
    const id = setTimeout(() => {
      contentRef.current?.querySelector<HTMLElement>('button')?.focus();
    }, 260);
    return () => clearTimeout(id);
  }, [screen]);

  // Screen 1: staggered feature lines
  useEffect(() => {
    if (screen !== 1) return;
    setLineShown([false, false, false]);
    setBtnShown(false);
    const t1 = setTimeout(() => setLineShown(p => [true,  p[1],  p[2]]),  300);
    const t2 = setTimeout(() => setLineShown(p => [p[0],  true,  p[2]]),  600);
    const t3 = setTimeout(() => setLineShown(p => [p[0],  p[1],  true]),  900);
    const t4 = setTimeout(() => setBtnShown(true),                        1200);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [screen]);

  function addTimer(id: ReturnType<typeof setTimeout>) {
    timers.current.push(id);
  }

  function goTo(next: 1 | 2 | 3) {
    setFading(true);
    addTimer(setTimeout(() => setScreen(next), 200));
    addTimer(setTimeout(() => setFading(false), 250));
  }

  function finish(path: string) {
    markOnboarded();
    setFading(true);
    addTimer(setTimeout(() => navigate(path), 250));
  }

  function skip() {
    markOnboarded();
    setFading(true);
    addTimer(setTimeout(() => onDone(), 250));
  }

  return (
    <>
      <style>{PAGE_STYLES}</style>

      <div className="ob-overlay">
        <button className="ob-close" onClick={skip} aria-label="Skip onboarding">×</button>

        <div ref={contentRef} className={`ob-content${fading ? ' ob-fading' : ''}`}>

          {/* ─── SCREEN 1: WELCOME ──────────────────────────────── */}
          {screen === 1 && (
            <div className="ob-screen">
              <div className="ob-wordmark">Immonator</div>

              <h1 className="ob-headline" style={{ fontSize: 40 }}>
                {`Welcome, ${displayName ?? 'there'}.`}
              </h1>

              <p className="ob-subtext" style={{ fontSize: 20 }}>
                You have early access to Germany's AI property analyst.
              </p>

              <div className="ob-features">
                {FEATURES.map((feat, i) => (
                  <div key={feat} className={`ob-feature-line${lineShown[i] ? ' ob-visible' : ''}`}>
                    <span className="ob-check">✓</span>
                    {feat}
                  </div>
                ))}
              </div>

              <div className={`ob-btn-wrap${btnShown ? ' ob-visible' : ''}`}>
                <button className="ob-btn-primary" onClick={() => goTo(2)}>
                  Let's go →
                </button>
              </div>
            </div>
          )}

          {/* ─── SCREEN 2: THE ONE THING TO DO ──────────────────── */}
          {screen === 2 && (
            <div className="ob-screen">
              <h2 className="ob-headline" style={{ fontSize: 36 }}>
                Start by saving a property.
              </h2>

              <p className="ob-subtext" style={{ fontSize: 18, maxWidth: 440 }}>
                When you save any property, Immonator automatically
                analyses it and gives you an instant verdict.
                No setup. No waiting. Just save.
              </p>

              <div className="ob-s2-anim">
                <div className="ob-mock-card">
                  <div className="ob-mock-card-body">
                    <div>
                      <div className="ob-mock-prop-title">2-Zimmer Altbauwohnung</div>
                      <div className="ob-mock-prop-meta">€285,000 · Leipzig</div>
                    </div>
                    <div className="ob-mock-heart">♡</div>
                  </div>
                </div>
                <div className="ob-mock-analysis">
                  <span className="ob-mock-verdict">Strong Buy</span>
                  <span className="ob-mock-yield">5.8% yield</span>
                </div>
              </div>

              <div className="ob-actions">
                <button className="ob-btn-primary" onClick={() => finish('/properties')}>
                  Browse Properties →
                </button>
                <button className="ob-btn-ghost" onClick={() => finish('/properties')}>
                  I'll explore on my own
                </button>
              </div>
            </div>
          )}

          {/* ─── SCREEN 3: OPTIONAL STRATEGY ────────────────────── */}
          {screen === 3 && (
            <div className="ob-screen">
              <h2 className="ob-headline" style={{ fontSize: 32 }}>
                Get a strategy tailored to your budget.
              </h2>

              <p className="ob-subtext" style={{ fontSize: 18, maxWidth: 440 }}>
                Tell us your available equity and investment goals.
                We'll show you which cities and property types to target
                — and filter the listings that match.
              </p>

              <div className="ob-mock-strategy">
                <div className="ob-mock-strat-label">Your Strategy</div>
                <div className="ob-mock-strat-row">
                  <span className="ob-mock-strat-key">Target cities</span>
                  <span className="ob-mock-strat-val">Leipzig, Dresden, Halle</span>
                </div>
                <div className="ob-mock-strat-row">
                  <span className="ob-mock-strat-key">Min yield</span>
                  <span className="ob-mock-strat-val">5.5%</span>
                </div>
                <div className="ob-mock-strat-row">
                  <span className="ob-mock-strat-key">Max price</span>
                  <span className="ob-mock-strat-val">€320,000</span>
                </div>
                <div className="ob-mock-strat-divider" />
                <div className="ob-mock-strat-match">
                  Matching properties: <strong>12</strong> ←
                </div>
              </div>

              <div className="ob-actions">
                <button className="ob-btn-primary" onClick={() => finish('/strategy')}>
                  Set Up My Strategy
                </button>
                <button className="ob-btn-ghost" onClick={() => finish('/properties')}>
                  I'll do this later
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Progress dots */}
        <div className="ob-dots">
          {([1, 2, 3] as const).map(n => (
            <span key={n} className={`ob-dot${screen >= n ? ' ob-dot-on' : ''}`} />
          ))}
        </div>
      </div>
    </>
  );
}
