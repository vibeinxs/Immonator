import React, { useState, useEffect, useRef } from 'react';
import { useNavigate }   from 'react-router-dom';
import { api }           from '../lib/api';
import { MetricCard }    from '../components/common/MetricCard';
import { EmptyState }    from '../components/common/EmptyState';
import { ContextHint }   from '../components/common/ContextHint';
import { VerdictBadge }  from '../components/common/VerdictBadge';
import { LoadingState }  from '../components/common/LoadingState';
import { Toast }         from '../components/common/Toast';
import { AnalysisChat }  from '../components/chat/AnalysisChat';
import type { Verdict }  from '../components/common/VerdictBadge';

// ── Types ──────────────────────────────────────────────────────────────────────

type RiskStyle = 'conservative' | 'balanced' | 'growth';
type Goal      = 'cashflow' | 'appreciation' | 'both';

interface WizardForm {
  equity:          string;
  monthlyIncome:   string;
  monthlyExpenses: string;
  riskStyle:       RiskStyle | '';
  holdPeriod:      string;
  goal:            Goal | '';
  minYield:        number;
  cities:          string[];
  propertyTypes:   string[];
}

interface UserProfile {
  equity?:           number;
  monthly_income?:   number;
  monthly_expenses?: number;
  risk_style?:       string;
  hold_period?:      string;
  goal?:             string;
  min_yield?:        number;
  cities?:           string[];
  property_types?:   string[];
}

interface StrategyData {
  recommended_approach?: string;
  summary?:              string;
  target_yield?:         number;
  max_price?:            number;
  investment_timeline?:  string;
  target_cities?: Array<{
    name:         string;
    reason:       string;
    yield_range?: string;
  }>;
  key_criteria?:  string[];
  financing?: Array<{
    type:            string;
    ltv:             number;
    down_payment:    number;
    monthly_payment: number;
    equity_required: number;
    recommended?:    boolean;
  }>;
  matching_properties?: Array<{
    id:                string;
    title?:            string;
    city?:             string;
    gross_yield?:      number;
    compact_analysis?: { verdict?: Verdict };
  }>;
  matching_count?: number;
  top_city?:       string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CITIES = [
  'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne',
  'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Other',
] as const;

const PROPERTY_TYPES = ['Apartment', 'House', 'Multi-family', 'Commercial'] as const;

const HOLD_PERIODS = ['1–3 years', '3–5 years', '5–10 years', '10+ years'] as const;

const RISK_OPTIONS = [
  { key: 'conservative' as RiskStyle, emoji: '🛡', label: 'Conservative',   desc: 'Lower risk, stable cashflow, proven markets' },
  { key: 'balanced'     as RiskStyle, emoji: '⚖', label: 'Balanced',       desc: 'Mix of yield and appreciation, moderate risk' },
  { key: 'growth'       as RiskStyle, emoji: '🚀', label: 'Growth-Focused', desc: 'Higher potential return, more risk tolerance' },
];

const GOAL_OPTIONS = [
  { key: 'cashflow'     as Goal, emoji: '💰', label: 'Monthly cashflow', desc: 'Regular income each month' },
  { key: 'appreciation' as Goal, emoji: '📈', label: 'Appreciation',     desc: 'Property value growth over time' },
  { key: 'both'         as Goal, emoji: '🎯', label: 'Both',             desc: 'Balance of income and growth' },
];

const INITIAL_FORM: WizardForm = {
  equity:          '',
  monthlyIncome:   '',
  monthlyExpenses: '',
  riskStyle:       '',
  holdPeriod:      '',
  goal:            '',
  minYield:        5.0,
  cities:          [],
  propertyTypes:   [],
};

const TOTAL_STEPS = 5;

// ── Styles ────────────────────────────────────────────────────────────────────

const PAGE_STYLES = `
@keyframes immo-strategy-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes immo-wizard-step-in {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes immo-banner-slide-down {
  from { opacity: 0; transform: translateY(-100%); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes immo-banner-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
.strategy-page {
  animation: immo-strategy-fade-in 300ms ease forwards;
}
.wizard-step-content {
  animation: immo-wizard-step-in 220ms ease forwards;
}
.strategy-option-card {
  cursor: pointer;
  transition: border-color 150ms, background-color 150ms;
}
.strategy-option-card:hover {
  border-color: var(--color-brand) !important;
}
.strategy-pill {
  cursor: pointer;
  transition: background-color 150ms, color 150ms, border-color 150ms;
}
.strategy-pill:hover {
  border-color: var(--color-brand) !important;
}
input[type="range"].strategy-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--color-border-strong);
  outline: none;
  cursor: pointer;
}
input[type="range"].strategy-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-brand);
  cursor: pointer;
  box-shadow: 0 0 0 3px rgba(46,107,255,0.2);
}
input[type="range"].strategy-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-brand);
  cursor: pointer;
  border: none;
}
.strategy-money-input:focus {
  outline: none;
  border-color: var(--color-brand) !important;
  box-shadow: 0 0 0 3px rgba(46,107,255,0.15);
}
@media (max-width: 768px) {
  .strategy-metrics-grid   { grid-template-columns: 1fr !important; }
  .strategy-criteria-grid  { grid-template-columns: 1fr !important; }
  .strategy-financing-wrap { overflow-x: auto; }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(n?: number): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `€${Math.round(n / 1_000)}K`;
  return '€' + Math.round(n).toLocaleString('de-DE');
}

function fmtEurFull(n?: number): string {
  if (n == null) return '—';
  return '€' + Math.round(n).toLocaleString('de-DE');
}

function capitalize(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function profileToForm(profile: UserProfile | null): WizardForm {
  if (!profile) return { ...INITIAL_FORM };
  return {
    equity:          profile.equity          ? String(profile.equity)          : '',
    monthlyIncome:   profile.monthly_income  ? String(profile.monthly_income)  : '',
    monthlyExpenses: profile.monthly_expenses ? String(profile.monthly_expenses) : '',
    riskStyle:       (profile.risk_style as RiskStyle) || '',
    holdPeriod:      profile.hold_period     || '',
    goal:            (profile.goal as Goal)  || '',
    minYield:        profile.min_yield       ?? 5.0,
    cities:          profile.cities          ?? [],
    propertyTypes:   profile.property_types  ?? [],
  };
}

function formToPayload(form: WizardForm) {
  return {
    equity:           parseFloat(form.equity)          || 0,
    monthly_income:   parseFloat(form.monthlyIncome)   || 0,
    monthly_expenses: parseFloat(form.monthlyExpenses) || 0,
    risk_style:       form.riskStyle,
    hold_period:      form.holdPeriod,
    goal:             form.goal,
    min_yield:        form.minYield,
    cities:           form.cities,
    property_types:   form.propertyTypes,
  };
}

// ── Money Input ───────────────────────────────────────────────────────────────

function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  label,
}: {
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  label?:       string;
}) {
  return (
    <div>
      {label && (
        <p style={{
          margin:        '0 0 8px',
          fontSize:      12,
          fontWeight:    500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color:         'var(--color-text-secondary)',
          fontFamily:    'var(--font-body)',
        }}>
          {label}
        </p>
      )}
      <div
        className="strategy-money-input"
        style={{
          display:      'flex',
          alignItems:   'center',
          height:       64,
          border:       '1px solid var(--color-border-strong)',
          borderRadius: 10,
          overflow:     'hidden',
          backgroundColor: 'var(--color-bg-elevated)',
          transition:   'border-color 150ms, box-shadow 150ms',
        }}
      >
        <span style={{
          padding:    '0 16px',
          fontSize:   26,
          fontFamily: 'var(--font-mono)',
          color:      'var(--color-text-muted)',
          flexShrink: 0,
          userSelect: 'none',
        }}>
          €
        </span>
        <input
          type="number"
          min="0"
          step="1000"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex:        1,
            height:      '100%',
            border:      'none',
            background:  'transparent',
            fontSize:    26,
            fontFamily:  'var(--font-mono)',
            fontWeight:  500,
            color:       'var(--color-text-primary)',
            outline:     'none',
            padding:     '0 16px 0 0',
            minWidth:    0,
          }}
        />
      </div>
    </div>
  );
}

// ── Option Card ───────────────────────────────────────────────────────────────

function OptionCard({
  emoji,
  label,
  desc,
  selected,
  onClick,
}: {
  emoji:    string;
  label:    string;
  desc:     string;
  selected: boolean;
  onClick:  () => void;
}) {
  return (
    <div
      className="strategy-option-card"
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      style={{
        display:         'flex',
        alignItems:      'flex-start',
        gap:             14,
        padding:         '16px 18px',
        borderRadius:    10,
        border:          `2px solid ${selected ? 'var(--color-brand)' : 'var(--color-border)'}`,
        backgroundColor: selected ? 'var(--color-brand-subtle)' : 'var(--color-bg-elevated)',
      }}
    >
      <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{emoji}</span>
      <div>
        <div style={{
          fontSize:   15,
          fontWeight: 600,
          color:      'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
          marginBottom: 3,
        }}>
          {label}
        </div>
        <div style={{
          fontSize:   13,
          color:      'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
          lineHeight: 1.5,
        }}>
          {desc}
        </div>
      </div>
    </div>
  );
}

// ── Wizard Shell ──────────────────────────────────────────────────────────────

function WizardShell({
  step,
  onClose,
  onBack,
  onNext,
  nextLabel,
  canProceed,
  generating,
  children,
}: {
  step:       number;
  onClose:    () => void;
  onBack?:    () => void;
  onNext:     () => void;
  nextLabel?: string;
  canProceed: boolean;
  generating?: boolean;
  children:   React.ReactNode;
}) {
  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      zIndex:          300,
      backgroundColor: 'var(--color-bg-base)',
      display:         'flex',
      flexDirection:   'column',
      overflowY:       'auto',
    }}>
      {/* Progress bar + close */}
      <div style={{
        position:        'sticky',
        top:             0,
        zIndex:          10,
        backgroundColor: 'var(--color-bg-base)',
        borderBottom:    '1px solid var(--color-border)',
      }}>
        {/* Progress track */}
        <div style={{ height: 3, backgroundColor: 'var(--color-bg-elevated)' }}>
          <div style={{
            height:          '100%',
            width:           `${(step / TOTAL_STEPS) * 100}%`,
            backgroundColor: 'var(--color-brand)',
            transition:      'width 350ms ease',
          }} />
        </div>
        {/* Top bar: step label + close */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '14px 24px',
        }}>
          <span style={{
            fontSize:   12,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color:      'var(--color-text-muted)',
            fontFamily: 'var(--font-body)',
          }}>
            Step {step} of {TOTAL_STEPS}
          </span>
          <button
            onClick={onClose}
            aria-label="Close wizard"
            style={{
              background:   'none',
              border:       '1px solid var(--color-border)',
              borderRadius: 6,
              padding:      '4px 10px',
              cursor:       'pointer',
              fontSize:     16,
              color:        'var(--color-text-muted)',
              lineHeight:   1.4,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Step content — centered */}
      <div style={{
        flex:           1,
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'center',
        padding:        '40px 24px',
      }}>
        <div
          key={step}
          className="wizard-step-content"
          style={{ width: '100%', maxWidth: 520 }}
        >
          {children}

          {/* Navigation buttons */}
          <div style={{
            display:        'flex',
            gap:            10,
            marginTop:      32,
            justifyContent: onBack ? 'space-between' : 'flex-end',
          }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  padding:         '12px 20px',
                  backgroundColor: 'transparent',
                  border:          '1px solid var(--color-border)',
                  borderRadius:    8,
                  fontSize:        14,
                  fontWeight:      500,
                  fontFamily:      'var(--font-body)',
                  color:           'var(--color-text-secondary)',
                  cursor:          'pointer',
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={onNext}
              disabled={!canProceed || generating}
              style={{
                flex:            onBack ? 1 : undefined,
                padding:         '12px 28px',
                backgroundColor: !canProceed || generating ? 'var(--color-bg-elevated)' : 'var(--color-brand)',
                color:           !canProceed || generating ? 'var(--color-text-muted)' : '#fff',
                border:          'none',
                borderRadius:    8,
                fontSize:        15,
                fontWeight:      500,
                fontFamily:      'var(--font-body)',
                cursor:          !canProceed || generating ? 'default' : 'pointer',
                whiteSpace:      'nowrap',
              }}
            >
              {generating
                ? 'Immonator is building your strategy…'
                : (nextLabel ?? 'Continue →')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step label style ──────────────────────────────────────────────────────────

const STEP_HEADLINE_STYLE: React.CSSProperties = {
  margin:     '0 0 8px',
  fontSize:   28,
  fontFamily: 'var(--font-display)',
  fontWeight: 400,
  color:      'var(--color-text-primary)',
  lineHeight: 1.2,
};

const STEP_HELPER_STYLE: React.CSSProperties = {
  margin:     '0 0 24px',
  fontSize:   14,
  color:      'var(--color-text-secondary)',
  fontFamily: 'var(--font-body)',
  lineHeight: 1.5,
};

const STEP_LABEL_STYLE: React.CSSProperties = {
  margin:        '0 0 12px',
  fontSize:      13,
  fontWeight:    600,
  color:         'var(--color-text-secondary)',
  fontFamily:    'var(--font-body)',
  letterSpacing: '0.03em',
};

// ── Strategy Banner ───────────────────────────────────────────────────────────

function StrategyBanner({
  strategy,
  onDismiss,
  onViewMatches,
}: {
  strategy:     StrategyData;
  onDismiss:    () => void;
  onViewMatches: () => void;
}) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 4600);
    const t2 = setTimeout(onDismiss, 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);

  const count = strategy.matching_count;
  const city  = strategy.top_city;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position:        'fixed',
        top:             56,
        left:            0,
        right:           0,
        zIndex:          200,
        backgroundColor: 'var(--color-success-bg)',
        borderBottom:    '1px solid var(--color-success)',
        padding:         '12px 24px',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             16,
        animation:       fading
          ? 'immo-banner-fade-out 400ms ease forwards'
          : 'immo-banner-slide-down 350ms ease forwards',
      }}
    >
      <span style={{
        fontSize:   14,
        fontFamily: 'var(--font-body)',
        color:      'var(--color-success)',
        fontWeight: 500,
      }}>
        ✓ Your strategy is ready.
        {count != null && city && ` ${count} matching ${count === 1 ? 'property' : 'properties'} found in ${city}.`}
      </span>
      <button
        onClick={onViewMatches}
        style={{
          padding:         '6px 14px',
          backgroundColor: 'transparent',
          color:           'var(--color-success)',
          border:          '1px solid var(--color-success)',
          borderRadius:    6,
          fontSize:        13,
          fontWeight:      500,
          fontFamily:      'var(--font-body)',
          cursor:          'pointer',
        }}
      >
        View Matches →
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position:   'absolute',
          right:      16,
          background: 'none',
          border:     'none',
          cursor:     'pointer',
          fontSize:   18,
          color:      'var(--color-success)',
          lineHeight: 1,
          padding:    '0 4px',
        }}
      >
        ×
      </button>
    </div>
  );
}

// ── Strategy View (State B) ───────────────────────────────────────────────────

function StrategyView({
  strategy,
  onEditProfile,
  navigate,
}: {
  strategy:      StrategyData;
  onEditProfile: () => void;
  navigate:      (path: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Summary Card ─────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'var(--color-bg-surface)',
        border:          '1px solid var(--color-border)',
        borderRadius:    12,
        padding:         '24px',
        display:         'flex',
        justifyContent:  'space-between',
        alignItems:      'flex-start',
        gap:             16,
        flexWrap:        'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {strategy.recommended_approach && (
            <span style={{
              display:         'inline-block',
              padding:         '5px 14px',
              borderRadius:    8,
              fontSize:        12,
              fontWeight:      700,
              letterSpacing:   '0.05em',
              textTransform:   'uppercase',
              backgroundColor: 'var(--color-brand-subtle)',
              color:           'var(--color-brand)',
              border:          '1px solid color-mix(in srgb, var(--color-brand) 30%, transparent)',
              fontFamily:      'var(--font-body)',
              marginBottom:    14,
            }}>
              {capitalize(strategy.recommended_approach)}
            </span>
          )}
          {strategy.summary && (
            <p style={{
              margin:     0,
              fontSize:   15,
              lineHeight: 1.7,
              color:      'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}>
              {strategy.summary}
            </p>
          )}
        </div>
        <button
          onClick={onEditProfile}
          style={{
            flexShrink:      0,
            padding:         '9px 18px',
            backgroundColor: 'transparent',
            color:           'var(--color-text-secondary)',
            border:          '1px solid var(--color-border)',
            borderRadius:    8,
            fontSize:        13,
            fontWeight:      500,
            fontFamily:      'var(--font-body)',
            cursor:          'pointer',
          }}
        >
          Edit Profile
        </button>
      </div>

      {/* ── Metrics Row ──────────────────────────────────────────────────── */}
      <div
        className="strategy-metrics-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
      >
        <MetricCard
          label="Target Yield"
          value={strategy.target_yield != null ? `${strategy.target_yield.toFixed(1)}%` : '—'}
          isMonospace
          color="success"
        />
        <MetricCard
          label="Max Price"
          value={fmtEur(strategy.max_price)}
          isMonospace
        />
        <MetricCard
          label="Investment Timeline"
          value={strategy.investment_timeline ?? '—'}
        />
      </div>

      {/* ── Target Cities ────────────────────────────────────────────────── */}
      {strategy.target_cities && strategy.target_cities.length > 0 && (
        <div>
          <p style={{
            margin:        '0 0 12px',
            fontSize:      11,
            fontWeight:    600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         'var(--color-text-muted)',
            fontFamily:    'var(--font-body)',
          }}>
            Target Cities
          </p>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {strategy.target_cities.map(c => (
              <div
                key={c.name}
                style={{
                  flexShrink:      0,
                  minWidth:        160,
                  padding:         '18px 20px',
                  backgroundColor: 'var(--color-bg-surface)',
                  border:          '1px solid var(--color-border)',
                  borderRadius:    12,
                }}
              >
                <div style={{
                  fontSize:   22,
                  fontFamily: 'var(--font-display)',
                  color:      'var(--color-text-primary)',
                  marginBottom: 6,
                }}>
                  {c.name}
                </div>
                <div style={{
                  fontSize:   12,
                  color:      'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)',
                  lineHeight: 1.5,
                  marginBottom: c.yield_range ? 8 : 0,
                }}>
                  {c.reason}
                </div>
                {c.yield_range && (
                  <div style={{
                    fontSize:   12,
                    fontFamily: 'var(--font-mono)',
                    color:      'var(--color-success)',
                    fontWeight: 500,
                  }}>
                    {c.yield_range} yield
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Key Criteria ─────────────────────────────────────────────────── */}
      {strategy.key_criteria && strategy.key_criteria.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border:          '1px solid var(--color-border)',
          borderRadius:    12,
          padding:         '20px 24px',
        }}>
          <p style={{
            margin:        '0 0 14px',
            fontSize:      14,
            fontWeight:    600,
            color:         'var(--color-text-primary)',
            fontFamily:    'var(--font-body)',
          }}>
            Key Criteria
          </p>
          <div
            className="strategy-criteria-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
          >
            {strategy.key_criteria.map((criterion, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{
                  color:      'var(--color-success)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize:   14,
                  flexShrink: 0,
                  marginTop:  1,
                }}>
                  ✓
                </span>
                <span style={{
                  fontSize:   13,
                  color:      'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)',
                  lineHeight: 1.5,
                }}>
                  {criterion}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Financing Structure ───────────────────────────────────────────── */}
      {strategy.financing && strategy.financing.length > 0 && (
        <div>
          <p style={{
            margin:        '0 0 12px',
            fontSize:      11,
            fontWeight:    600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         'var(--color-text-muted)',
            fontFamily:    'var(--font-body)',
          }}>
            Financing Structure
          </p>
          <div
            className="strategy-financing-wrap"
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border:          '1px solid var(--color-border)',
              borderRadius:    12,
              overflow:        'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', minWidth: 520 }}>
              <thead>
                <tr>
                  {['Type', 'LTV', 'Down Payment', 'Monthly Payment', 'Equity Required'].map(col => (
                    <th key={col} style={{
                      padding:         '10px 16px',
                      textAlign:       'left',
                      fontSize:        10,
                      fontWeight:      600,
                      letterSpacing:   '0.08em',
                      textTransform:   'uppercase',
                      color:           'var(--color-text-muted)',
                      borderBottom:    '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-bg-elevated)',
                      whiteSpace:      'nowrap',
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {strategy.financing.map((row, i) => {
                  const isLast      = i === strategy.financing!.length - 1;
                  const highlighted = row.recommended;
                  return (
                    <tr key={row.type} style={{
                      backgroundColor: highlighted ? 'var(--color-brand-subtle)' : undefined,
                    }}>
                      <td style={{
                        padding:      '13px 16px',
                        borderBottom: isLast ? undefined : '1px solid var(--color-border)',
                        fontWeight:   600,
                        fontSize:     13,
                        color:        highlighted ? 'var(--color-brand)' : 'var(--color-text-primary)',
                        textTransform: 'capitalize',
                      }}>
                        {row.type}
                        {highlighted && (
                          <span style={{
                            marginLeft:      6,
                            fontSize:        10,
                            fontWeight:      700,
                            letterSpacing:   '0.06em',
                            textTransform:   'uppercase',
                            backgroundColor: 'var(--color-brand)',
                            color:           '#fff',
                            padding:         '1px 6px',
                            borderRadius:    4,
                          }}>
                            Rec.
                          </span>
                        )}
                      </td>
                      <td style={{
                        padding:      '13px 16px',
                        borderBottom: isLast ? undefined : '1px solid var(--color-border)',
                        fontSize:     13,
                        fontFamily:   'var(--font-mono)',
                        color:        'var(--color-text-secondary)',
                      }}>
                        {row.ltv}%
                      </td>
                      <td style={{
                        padding:      '13px 16px',
                        borderBottom: isLast ? undefined : '1px solid var(--color-border)',
                        fontSize:     13,
                        fontFamily:   'var(--font-mono)',
                        color:        'var(--color-text-primary)',
                      }}>
                        {fmtEurFull(row.down_payment)}
                      </td>
                      <td style={{
                        padding:      '13px 16px',
                        borderBottom: isLast ? undefined : '1px solid var(--color-border)',
                        fontSize:     13,
                        fontFamily:   'var(--font-mono)',
                        color:        'var(--color-text-primary)',
                      }}>
                        {fmtEurFull(row.monthly_payment)}/mo
                      </td>
                      <td style={{
                        padding:      '13px 16px',
                        borderBottom: isLast ? undefined : '1px solid var(--color-border)',
                        fontSize:     13,
                        fontFamily:   'var(--font-mono)',
                        color:        'var(--color-text-primary)',
                      }}>
                        {fmtEurFull(row.equity_required)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Top Matching Properties ───────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{
            margin:     0,
            fontSize:   14,
            fontWeight: 600,
            color:      'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
          }}>
            Properties matching your strategy
          </p>
          {(strategy.matching_properties?.length ?? 0) > 0 && (
            <button
              onClick={() => navigate('/properties')}
              style={{
                padding:         '6px 14px',
                backgroundColor: 'transparent',
                color:           'var(--color-brand)',
                border:          '1px solid var(--color-brand)',
                borderRadius:    6,
                fontSize:        12,
                fontWeight:      500,
                fontFamily:      'var(--font-body)',
                cursor:          'pointer',
                whiteSpace:      'nowrap',
              }}
            >
              View All Matches →
            </button>
          )}
        </div>

        <ContextHint
          hintId="strategy-matches-tip"
          headline="See your matches"
          body="Scroll down — these properties from our database match your budget and yield requirements."
        />

        {strategy.matching_properties && strategy.matching_properties.length > 0 ? (
          <div style={{
            marginTop:       12,
            backgroundColor: 'var(--color-bg-surface)',
            border:          '1px solid var(--color-border)',
            borderRadius:    12,
            overflow:        'hidden',
          }}>
            {strategy.matching_properties.slice(0, 5).map((prop, i) => {
              const isLast = i === Math.min(4, (strategy.matching_properties?.length ?? 1) - 1);
              return (
                <div
                  key={prop.id}
                  onClick={() => navigate(`/properties/${prop.id}`)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          12,
                    padding:      '14px 16px',
                    borderBottom: isLast ? undefined : '1px solid var(--color-border)',
                    cursor:       'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize:     13,
                      fontWeight:   500,
                      color:        'var(--color-text-primary)',
                      fontFamily:   'var(--font-body)',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace:   'nowrap',
                      marginBottom: 2,
                    }}>
                      {prop.title ?? 'Untitled Property'}
                    </div>
                    {prop.city && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                        {prop.city}
                      </div>
                    )}
                  </div>
                  {prop.gross_yield != null && (
                    <span style={{
                      fontSize:   12,
                      fontFamily: 'var(--font-mono)',
                      color:      prop.gross_yield >= 6 ? 'var(--color-success)' : 'var(--color-warning)',
                      fontWeight: 500,
                      flexShrink: 0,
                    }}>
                      {prop.gross_yield.toFixed(2)}%
                    </span>
                  )}
                  {prop.compact_analysis?.verdict && (
                    <VerdictBadge verdict={prop.compact_analysis.verdict} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <EmptyState
              icon="🔍"
              title="No matches found yet."
              description="We're building the database. Check back soon as new listings are added daily."
            />
          </div>
        )}
      </div>

      {/* ── Analysis Chat ─────────────────────────────────────────────────── */}
      <AnalysisChat contextType="general" title="your strategy" />
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

export function Strategy() {
  const navigate = useNavigate();

  const [loading,    setLoading]    = useState(true);
  const [profile,    setProfile]    = useState<UserProfile | null>(null);
  const [strategy,   setStrategy]   = useState<StrategyData | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [form,       setForm]       = useState<WizardForm>(INITIAL_FORM);
  const [generating, setGenerating] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [toast,      setToast]      = useState<{ key: number; message: string } | null>(null);
  const toastKeyRef = useRef(0);

  // ── Fetch on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<UserProfile>('/api/users/profile'),
      api.get<StrategyData>('/api/strategy'),
    ]).then(([profileRes, strategyRes]) => {
      if (cancelled) return;
      if (profileRes.data)  setProfile(profileRes.data);
      if (strategyRes.data) setStrategy(strategyRes.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ── Toast helper ────────────────────────────────────────────────────────
  function showToast(message: string) {
    toastKeyRef.current += 1;
    setToast({ key: toastKeyRef.current, message });
  }

  // ── Open wizard (fresh or pre-filled from profile) ──────────────────────
  function openWizard(prefill = false) {
    setForm(prefill && profile ? profileToForm(profile) : { ...INITIAL_FORM });
    setWizardStep(1);
    setShowWizard(true);
  }

  // ── Generate strategy ───────────────────────────────────────────────────
  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    const result = await api.post<StrategyData>('/api/strategy/generate', formToPayload(form));
    setGenerating(false);
    if (result.data) {
      setStrategy(result.data);
      setShowWizard(false);
      setShowBanner(true);
    } else {
      showToast(result.error ?? 'Failed to generate strategy. Please try again.');
    }
  }

  // ── Step can-proceed logic ──────────────────────────────────────────────
  const canProceed: Record<number, boolean> = {
    1: form.equity.trim() !== '' && parseFloat(form.equity) > 0,
    2: form.monthlyIncome.trim() !== '' && form.monthlyExpenses.trim() !== '',
    3: form.riskStyle !== '' && form.holdPeriod !== '',
    4: form.goal !== '',
    5: form.cities.length > 0,
  };

  // ── Wizard navigation ───────────────────────────────────────────────────
  function wizardNext() {
    if (wizardStep < TOTAL_STEPS) setWizardStep(s => s + 1);
    else handleGenerate();
  }
  function wizardBack() {
    if (wizardStep > 1) setWizardStep(s => s - 1);
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <LoadingState height={44} width="280px" />
          <div style={{ marginTop: 10 }}>
            <LoadingState height={18} width="420px" />
          </div>
        </div>
        <LoadingState height={110} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[0, 1, 2].map(i => <LoadingState key={i} height={96} />)}
        </div>
        <LoadingState height={240} />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{PAGE_STYLES}</style>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div
        className="strategy-page"
        style={{ padding: '40px 24px', maxWidth: 900, margin: '0 auto' }}
      >
        {strategy ? (
          /* STATE B — Strategy exists */
          <StrategyView
            strategy={strategy}
            onEditProfile={() => openWizard(true)}
            navigate={navigate}
          />
        ) : (
          /* STATE A — No profile/strategy yet */
          <div style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            textAlign:      'center',
            maxWidth:       520,
            margin:         '0 auto',
            paddingTop:     32,
          }}>
            <h1 style={{
              margin:     '0 0 16px',
              fontSize:   36,
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color:      'var(--color-text-primary)',
              lineHeight: 1.2,
            }}>
              What should you be buying?
            </h1>
            <p style={{
              margin:     '0 0 36px',
              fontSize:   18,
              lineHeight: 1.6,
              color:      'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}>
              Answer 5 quick questions about your budget and goals. Immonator will tell you which German cities to target, what yield to require, and show matching properties.
            </p>
            <button
              onClick={() => openWizard(false)}
              style={{
                width:           '100%',
                padding:         '16px',
                backgroundColor: 'var(--color-brand)',
                color:           '#fff',
                border:          'none',
                borderRadius:    10,
                fontSize:        16,
                fontWeight:      600,
                fontFamily:      'var(--font-body)',
                cursor:          'pointer',
                marginBottom:    24,
              }}
            >
              Build My Strategy →
            </button>
            <p style={{
              margin:     0,
              fontSize:   13,
              color:      'var(--color-text-muted)',
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.02em',
            }}>
              Target cities · Yield thresholds · Financing structure
            </p>
          </div>
        )}
      </div>

      {/* ── Wizard Overlay ────────────────────────────────────────────────── */}
      {showWizard && (
        <WizardShell
          step={wizardStep}
          onClose={() => setShowWizard(false)}
          onBack={wizardStep > 1 ? wizardBack : undefined}
          onNext={wizardNext}
          nextLabel={wizardStep === TOTAL_STEPS ? 'Generate My Strategy →' : undefined}
          canProceed={canProceed[wizardStep] ?? false}
          generating={generating && wizardStep === TOTAL_STEPS}
        >
          {/* ── Step 1: Capital ────────────────────────────────────────── */}
          {wizardStep === 1 && (
            <div>
              <h2 style={STEP_HEADLINE_STYLE}>How much equity do you have available?</h2>
              <p style={STEP_HELPER_STYLE}>This is your down payment + closing costs budget</p>
              <MoneyInput
                value={form.equity}
                onChange={v => setForm(f => ({ ...f, equity: v }))}
                placeholder="50000"
              />
              <p style={{
                marginTop:  14,
                fontSize:   12,
                color:      'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.5,
              }}>
                Your data stays private and is only used to generate your personal strategy.
              </p>
            </div>
          )}

          {/* ── Step 2: Income ─────────────────────────────────────────── */}
          {wizardStep === 2 && (
            <div>
              <h2 style={STEP_HEADLINE_STYLE}>Your monthly finances</h2>
              <p style={STEP_HELPER_STYLE}>Used to calculate your maximum mortgage payment</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <MoneyInput
                  label="Monthly income after tax"
                  value={form.monthlyIncome}
                  onChange={v => setForm(f => ({ ...f, monthlyIncome: v }))}
                  placeholder="4000"
                />
                <MoneyInput
                  label="Monthly expenses (excl. housing)"
                  value={form.monthlyExpenses}
                  onChange={v => setForm(f => ({ ...f, monthlyExpenses: v }))}
                  placeholder="2000"
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Risk & Timeline ────────────────────────────────── */}
          {wizardStep === 3 && (
            <div>
              <h2 style={STEP_HEADLINE_STYLE}>What's your investment style?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {RISK_OPTIONS.map(opt => (
                  <OptionCard
                    key={opt.key}
                    emoji={opt.emoji}
                    label={opt.label}
                    desc={opt.desc}
                    selected={form.riskStyle === opt.key}
                    onClick={() => setForm(f => ({ ...f, riskStyle: opt.key }))}
                  />
                ))}
              </div>

              <p style={STEP_LABEL_STYLE}>How long do you plan to hold?</p>
              <div style={{
                display:      'flex',
                borderRadius: 8,
                border:       '1px solid var(--color-border)',
                overflow:     'hidden',
              }}>
                {HOLD_PERIODS.map((period, i) => {
                  const selected = form.holdPeriod === period;
                  return (
                    <button
                      key={period}
                      onClick={() => setForm(f => ({ ...f, holdPeriod: period }))}
                      style={{
                        flex:            1,
                        padding:         '11px 6px',
                        border:          'none',
                        borderLeft:      i > 0 ? '1px solid var(--color-border)' : 'none',
                        backgroundColor: selected ? 'var(--color-brand)' : 'var(--color-bg-elevated)',
                        color:           selected ? '#fff' : 'var(--color-text-secondary)',
                        cursor:          'pointer',
                        fontSize:        12,
                        fontWeight:      selected ? 600 : 400,
                        fontFamily:      'var(--font-body)',
                        transition:      'background-color 150ms, color 150ms',
                        whiteSpace:      'nowrap',
                      }}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: Goals ──────────────────────────────────────────── */}
          {wizardStep === 4 && (
            <div>
              <h2 style={STEP_HEADLINE_STYLE}>What matters most to you?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {GOAL_OPTIONS.map(opt => (
                  <OptionCard
                    key={opt.key}
                    emoji={opt.emoji}
                    label={opt.label}
                    desc={opt.desc}
                    selected={form.goal === opt.key}
                    onClick={() => setForm(f => ({ ...f, goal: opt.key }))}
                  />
                ))}
              </div>

              <p style={STEP_LABEL_STYLE}>Minimum acceptable gross yield:</p>
              <input
                type="range"
                min={3.0}
                max={10.0}
                step={0.5}
                value={form.minYield}
                onChange={e => setForm(f => ({ ...f, minYield: parseFloat(e.target.value) }))}
                className="strategy-slider"
              />
              <p style={{
                marginTop:  10,
                fontSize:   16,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color:      'var(--color-brand)',
                textAlign:  'center',
              }}>
                {form.minYield.toFixed(1)}% minimum
              </p>
            </div>
          )}

          {/* ── Step 5: Preferences ────────────────────────────────────── */}
          {wizardStep === 5 && (
            <div>
              <h2 style={STEP_HEADLINE_STYLE}>Where do you want to invest?</h2>
              <p style={STEP_LABEL_STYLE}>Select all that apply</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
                {CITIES.map(city => {
                  const selected = form.cities.includes(city);
                  return (
                    <button
                      key={city}
                      className="strategy-pill"
                      onClick={() => setForm(f => ({
                        ...f,
                        cities: selected
                          ? f.cities.filter(c => c !== city)
                          : [...f.cities, city],
                      }))}
                      style={{
                        padding:         '8px 18px',
                        borderRadius:    20,
                        border:          `1px solid ${selected ? 'var(--color-brand)' : 'var(--color-border)'}`,
                        backgroundColor: selected ? 'var(--color-brand)' : 'var(--color-bg-elevated)',
                        color:           selected ? '#fff' : 'var(--color-text-secondary)',
                        cursor:          'pointer',
                        fontSize:        13,
                        fontFamily:      'var(--font-body)',
                      }}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>

              <p style={STEP_LABEL_STYLE}>Property types:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PROPERTY_TYPES.map(type => {
                  const selected = form.propertyTypes.includes(type);
                  return (
                    <button
                      key={type}
                      className="strategy-pill"
                      onClick={() => setForm(f => ({
                        ...f,
                        propertyTypes: selected
                          ? f.propertyTypes.filter(t => t !== type)
                          : [...f.propertyTypes, type],
                      }))}
                      style={{
                        padding:         '8px 18px',
                        borderRadius:    20,
                        border:          `1px solid ${selected ? 'var(--color-brand)' : 'var(--color-border)'}`,
                        backgroundColor: selected ? 'var(--color-brand)' : 'var(--color-bg-elevated)',
                        color:           selected ? '#fff' : 'var(--color-text-secondary)',
                        cursor:          'pointer',
                        fontSize:        13,
                        fontFamily:      'var(--font-body)',
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </WizardShell>
      )}

      {/* ── Strategy Banner (shown once after generation) ─────────────────── */}
      {showBanner && strategy && (
        <StrategyBanner
          strategy={strategy}
          onDismiss={() => setShowBanner(false)}
          onViewMatches={() => { setShowBanner(false); navigate('/properties'); }}
        />
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast key={toast.key} message={toast.message} onDone={() => setToast(null)} />
      )}
    </>
  );
}

export default Strategy;
