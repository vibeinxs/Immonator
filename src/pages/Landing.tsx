import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isLoggedIn } from '../lib/auth';

// ── Styles ───────────────────────────────────────────────────────────────────

const PAGE_STYLES = `
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Hero ──────────────────────────────────────────────────────── */
.lp-hero {
  position: relative;
  height: 100dvh;
  min-height: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  text-align: center;
  overflow: hidden;
  background: var(--color-bg-base);
}

.lp-wordmark {
  position: absolute;
  top: 32px;
  left: 40px;
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.lp-beta-pill {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 20px;
  background: var(--color-brand-subtle);
  color: var(--color-brand);
  border: 1px solid color-mix(in srgb, var(--color-brand) 40%, transparent);
}

.lp-hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-width: 720px;
}

.lp-headline {
  font-family: var(--font-display);
  font-size: 56px;
  font-weight: 400;
  line-height: 1.15;
  color: var(--color-text-primary);
  margin: 0;
}

.lp-subtext {
  font-family: var(--font-body);
  font-size: 20px;
  color: var(--color-text-secondary);
  max-width: 480px;
  line-height: 1.65;
  margin: 0;
}

.lp-cta-btn {
  display: inline-flex;
  align-items: center;
  height: 52px;
  padding: 0 32px;
  background: var(--color-brand);
  color: #fff;
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  text-decoration: none;
  transition: background 150ms ease;
}
.lp-cta-btn:hover { background: var(--color-brand-hover); }

.lp-hint {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--color-text-muted);
  margin: -8px 0 0;
}

.lp-scroll {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20px;
  color: var(--color-text-muted);
}

/* ── Entry animations ──────────────────────────────────────────── */
.anim-h  { opacity: 0; animation: fadeIn 600ms ease            forwards; }
.anim-s  { opacity: 0; animation: fadeIn 600ms 200ms ease      forwards; }
.anim-b  { opacity: 0; animation: fadeIn 600ms 600ms ease      forwards; }
.anim-sc { opacity: 0; animation: fadeIn 600ms 2000ms ease     forwards; }

/* ── Scroll-triggered ──────────────────────────────────────────── */
[data-animate] {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 400ms ease, transform 400ms ease;
}
[data-animate].visible {
  opacity: 1;
  transform: none;
}

/* ── Section wrappers ──────────────────────────────────────────── */
.lp-section {
  padding: 96px 40px;
  max-width: 1000px;
  margin: 0 auto;
  text-align: center;
}

.lp-section-title {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0 0 12px;
}

.lp-section-sub {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--color-text-muted);
  margin: 0 0 64px;
}

/* ── Output cards ──────────────────────────────────────────────── */
.lp-cards {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lp-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 540px;
}
.lp-card + .lp-card              { margin-top: -12px; }
.lp-card:nth-child(2)            { position: relative; z-index: 1; transform: rotate( 0.4deg); }
.lp-card:nth-child(3)            { position: relative; z-index: 2; transform: rotate(-0.3deg); }

.lp-verdict {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
  margin-bottom: 12px;
}

.lp-card-headline {
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 14px;
}

.lp-card-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.lp-card-col-item {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  text-align: left;
}

.lp-card-footer {
  margin-top: 14px;
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-text-muted);
  letter-spacing: 0.04em;
  text-align: left;
}

.lp-metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.lp-metric-cell {
  background: var(--color-bg-elevated);
  padding: 16px;
}

.lp-metric-label {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.lp-metric-value {
  font-family: var(--font-mono);
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.lp-chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lp-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.5;
  max-width: 85%;
}
.lp-bubble-user {
  background: var(--color-brand-subtle);
  color: var(--color-text-primary);
  align-self: flex-end;
  border-radius: 12px 12px 2px 12px;
}
.lp-bubble-ai {
  background: var(--color-bg-elevated);
  color: var(--color-text-secondary);
  align-self: flex-start;
  border-radius: 12px 12px 12px 2px;
}

/* ── Capability rows ───────────────────────────────────────────── */
.lp-cap-row {
  display: flex;
  align-items: center;
  gap: 64px;
  padding: 80px 40px;
  max-width: 1000px;
  margin: 0 auto;
}
.lp-cap-row.lp-reverse { flex-direction: row-reverse; }

.lp-cap-text  { flex: 1; }
.lp-cap-mock  { flex: 1; }

.lp-cap-icon {
  width: 40px;
  height: 40px;
  color: var(--color-brand);
  margin-bottom: 20px;
}

.lp-cap-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0 0 14px;
  line-height: 1.25;
}

.lp-cap-body {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--color-text-secondary);
  line-height: 1.65;
  margin: 0;
}

.lp-mockup {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px 24px;
}

.lp-mockup-label {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.lp-val-track {
  height: 8px;
  background: var(--color-bg-elevated);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  margin-bottom: 8px;
}
.lp-val-fill {
  position: absolute;
  inset: 0 12% 0 0;
  background: var(--color-brand);
  border-radius: 4px;
}
.lp-val-gap {
  position: absolute;
  inset: 0 0 0 88%;
  background: color-mix(in srgb, var(--color-danger) 60%, transparent);
  border-radius: 4px;
}
.lp-val-labels {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-text-muted);
}

.lp-kv-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  font-family: var(--font-body);
  font-size: 13px;
}
.lp-kv-key   { color: var(--color-text-muted); }
.lp-kv-value { font-family: var(--font-mono); color: var(--color-text-primary); }

/* ── Quote ─────────────────────────────────────────────────────── */
.lp-quote-wrap {
  padding: 80px 24px;
  text-align: center;
}
.lp-quote-mark {
  display: block;
  font-family: var(--font-display);
  font-size: 80px;
  line-height: 0.7;
  color: var(--color-brand);
  margin-bottom: 24px;
}
.lp-quote-text {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 22px;
  color: var(--color-text-primary);
  max-width: 600px;
  margin: 0 auto 20px;
  line-height: 1.55;
}
.lp-quote-attr {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-text-muted);
}

/* ── Final CTA ─────────────────────────────────────────────────── */
.lp-cta-wrap {
  padding: 96px 24px 80px;
  text-align: center;
}
.lp-cta-title {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 400;
  color: var(--color-text-primary);
  margin: 0 0 32px;
  line-height: 1.2;
}

/* ── Footer ────────────────────────────────────────────────────── */
.lp-footer {
  padding: 24px;
  text-align: center;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
}

/* ── Responsive ────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .lp-headline { font-size: 36px; }
  .lp-subtext  { font-size: 17px; }
  .lp-wordmark { left: 20px; top: 24px; }
  .lp-section  { padding: 64px 20px; }
  .lp-section-sub { margin-bottom: 40px; }
  .lp-cap-row, .lp-cap-row.lp-reverse { flex-direction: column; gap: 32px; padding: 48px 20px; }
  .lp-cap-mock { width: 100%; }
}
`;

// ── Icons ────────────────────────────────────────────────────────────────────

function ScaleIcon() {
  return (
    <svg className="lp-cap-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="20" y1="6" x2="20" y2="34" />
      <line x1="10" y1="12" x2="30" y2="12" />
      <path d="M7 12 C5 16 5 24 10 24 C15 24 15 16 13 12" />
      <path d="M27 12 C25 16 25 24 30 24 C35 24 35 16 33 12" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg className="lp-cap-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="20" r="14" />
      <line x1="20" y1="8"  x2="20" y2="13" />
      <line x1="20" y1="27" x2="20" y2="32" />
      <line x1="8"  y1="20" x2="13" y2="20" />
      <line x1="27" y1="20" x2="32" y2="20" />
      <polygon points="20,13 22,20 20,27 18,20" fill="currentColor" opacity="0.25" stroke="none" />
      <circle cx="20" cy="20" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg className="lp-cap-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 24 C6 21 10 19 14 21 L18 23 C20 24 22 24 24 23 L28 21 C32 19 36 21 36 24" />
      <path d="M4 24 C4 28 8 31 12 30 L18 27 C20 26 22 26 24 27 L28 30 C32 31 36 28 36 24" />
      <line x1="18" y1="23" x2="18" y2="27" />
      <line x1="24" y1="23" x2="24" y2="27" />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn()) navigate('/properties', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-animate]');
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.15 },
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{PAGE_STYLES}</style>

      {/* ─── SECTION 1: HERO ──────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-wordmark">
          Immonator <span className="lp-beta-pill">BETA</span>
        </div>

        <div className="lp-hero-content">
          <h1 className="lp-headline anim-h">
            Know exactly what a property<br />
            is worth before you offer.
          </h1>
          <p className="lp-subtext anim-s">
            Immonator analyses every German property listing using
            official valuation methods and AI — in seconds.
          </p>
          <a href="/beta-login" className="lp-cta-btn anim-b">
            Get Early Access →
          </a>
          <p className="lp-hint anim-b">Invite only · No credit card needed</p>
        </div>

        <div className="lp-scroll anim-sc">↓</div>
      </section>

      {/* ─── SECTION 2: THE OUTPUT ────────────────────────────────────── */}
      <div className="lp-section">
        <h2 className="lp-section-title" data-animate>This is what you get.</h2>
        <p className="lp-section-sub" data-animate>For every property you save.</p>

        <div className="lp-cards">
          {/* Card 1 — Compact analysis */}
          <div className="lp-card" data-animate style={{ transitionDelay: '0ms' }}>
            <div className="lp-verdict">Strong Buy</div>
            <p className="lp-card-headline">12% below valuation · 5.8% gross yield</p>
            <div className="lp-card-cols">
              <div>
                <div className="lp-card-col-item">✓ Altbau charm, strong rental history</div>
                <div className="lp-card-col-item">✓ Below Bodenrichtwert</div>
              </div>
              <div>
                <div className="lp-card-col-item">⚠ Heating upgrade needed</div>
                <div className="lp-card-col-item">⚠ Renovation estimate €15,000</div>
              </div>
            </div>
            <div className="lp-card-footer">Immonator AI · Instant analysis</div>
          </div>

          {/* Card 2 — Numbers */}
          <div className="lp-card" data-animate style={{ transitionDelay: '150ms' }}>
            <div className="lp-metric-grid">
              <div className="lp-metric-cell">
                <div className="lp-metric-label">Ertragswert</div>
                <div className="lp-metric-value">€261,000</div>
              </div>
              <div className="lp-metric-cell">
                <div className="lp-metric-label">Sachwert</div>
                <div className="lp-metric-value">€274,000</div>
              </div>
              <div className="lp-metric-cell">
                <div className="lp-metric-label">Gross Yield</div>
                <div className="lp-metric-value" style={{ color: 'var(--color-success)' }}>5.8%</div>
              </div>
              <div className="lp-metric-cell">
                <div className="lp-metric-label">Recommended Offer</div>
                <div className="lp-metric-value">€255,000</div>
              </div>
            </div>
          </div>

          {/* Card 3 — Chat */}
          <div className="lp-card" data-animate style={{ transitionDelay: '300ms' }}>
            <div className="lp-chat">
              <div className="lp-bubble lp-bubble-user">Should I offer below asking?</div>
              <div className="lp-bubble lp-bubble-ai">
                Yes. Listed 52 days, one price reduction. Valuation gap is 11%.
                Open at €255,000, walk away at €272,000.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: CAPABILITIES ──────────────────────────────────── */}

      {/* A — Valuation */}
      <div className="lp-cap-row" data-animate>
        <div className="lp-cap-text">
          <ScaleIcon />
          <h3 className="lp-cap-title">Every property, valued three ways.</h3>
          <p className="lp-cap-body">
            Ertragswert, Sachwert, and Vergleichswert — the same methods
            German Gutachter use. Calculated instantly.
          </p>
        </div>
        <div className="lp-cap-mock">
          <div className="lp-mockup">
            <div className="lp-mockup-label">Valuation vs Asking Price</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 10 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Asking <strong style={{ color: 'var(--color-text-primary)' }}>€320,000</strong></span>
              <span style={{ color: 'var(--color-danger)', fontSize: 12 }}>+12% over value</span>
            </div>
            <div className="lp-val-track">
              <div className="lp-val-fill" />
              <div className="lp-val-gap" />
            </div>
            <div className="lp-val-labels">
              <span>Valuation €285,000</span>
              <span>Asking €320,000</span>
            </div>
          </div>
        </div>
      </div>

      {/* B — Strategy */}
      <div className="lp-cap-row lp-reverse" data-animate>
        <div className="lp-cap-text">
          <CompassIcon />
          <h3 className="lp-cap-title">A strategy built around your budget.</h3>
          <p className="lp-cap-body">
            Tell us your equity and goals. We show you which cities,
            property types, and yield thresholds to target.
          </p>
        </div>
        <div className="lp-cap-mock">
          <div className="lp-mockup">
            <div className="lp-mockup-label">Your Strategy</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 12 }}>
              Target: <strong>Leipzig</strong>
            </div>
            {[
              ['Min yield',   '5.5%'],
              ['Max price',   '€320,000'],
              ['Hold period', '5–10 years'],
            ].map(([key, val]) => (
              <div key={key} className="lp-kv-row">
                <span className="lp-kv-key">{key}</span>
                <span className="lp-kv-value">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* C — Negotiation */}
      <div className="lp-cap-row" data-animate>
        <div className="lp-cap-text">
          <HandshakeIcon />
          <h3 className="lp-cap-title">Walk in knowing your number.</h3>
          <p className="lp-cap-body">
            Before every offer, get a negotiation brief with your opening
            price, walk-away price, and talking points in German.
          </p>
        </div>
        <div className="lp-cap-mock">
          <div className="lp-mockup">
            <div className="lp-mockup-label">Negotiation Brief</div>
            <div style={{ marginBottom: 14 }}>
              <div className="lp-kv-row" style={{ alignItems: 'baseline' }}>
                <span className="lp-kv-key" style={{ fontSize: 13 }}>Opening offer</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--color-success)' }}>€255,000</span>
              </div>
              <div className="lp-kv-row" style={{ alignItems: 'baseline' }}>
                <span className="lp-kv-key" style={{ fontSize: 13 }}>Walk-away price</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--color-danger)' }}>€272,000</span>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              "Listed 52 days. Lead with maintenance costs."
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 4: QUOTE ─────────────────────────────────────────── */}
      <div className="lp-quote-wrap" data-animate>
        <span className="lp-quote-mark">"</span>
        <p className="lp-quote-text">
          I used to spend a weekend running numbers on one property.
          Now I know if it's worth pursuing in five minutes.
        </p>
        <p className="lp-quote-attr">— Beta tester, private investor, Berlin</p>
      </div>

      {/* ─── SECTION 5: FINAL CTA ─────────────────────────────────────── */}
      <div className="lp-cta-wrap" data-animate>
        <h2 className="lp-cta-title">
          Ready to analyse your<br />first property?
        </h2>
        <a href="/beta-login" className="lp-cta-btn">
          Enter Your Beta Code →
        </a>
      </div>

      {/* ─── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        Immonator · Built for German real estate investors · Beta
      </footer>
    </>
  );
}
