import React, { useState, useEffect, useRef } from 'react';
import { api }           from '../../lib/api';
import { SectionCard }   from '../common/SectionCard';
import { LockedButton }  from '../common/LockedButton';
import { VerdictBadge, type Verdict } from '../common/VerdictBadge';

// ── Types ─────────────────────────────────────────────────────────────────────

type RiskLevel        = 'low' | 'medium' | 'high';
type FairPriceStatus  = 'fairly_priced' | 'overvalued' | 'undervalued';
type RecommendedAction = 'buy_now' | 'negotiate_then_buy' | 'watch_and_wait' | 'pass';

interface RiskItem {
  description: string;
  severity:    RiskLevel;
  mitigation:  string;
}

interface FinancingScenario {
  label:            'Conservative' | 'Moderate' | 'Aggressive';
  recommended_ltv:  number;
  monthly_payment:  number;
  monthly_cashflow: number;
  equity_needed:    number;
  is_recommended?:  boolean;
}

interface HiddenCost {
  item:           string;
  estimated_cost: number;
}

interface DeepAnalysisData {
  status: 'not_generated' | 'ready';

  // Exec Summary
  verdict?:      Verdict;
  headline?:     string;
  key_insight?:  string;
  bottom_line?:  string;

  // Property Assessment
  strengths?:           string[];
  weaknesses?:          string[];
  hidden_costs?:        HiddenCost[];
  condition_analysis?:  string;

  // Valuation
  avg_valuation?:        number;
  asking_price?:         number;
  is_fairly_priced?:     FairPriceStatus;
  valuation_commentary?: string[];

  // Investment Case
  bull_case?:               string;
  base_case?:               string;
  bear_case?:               string;
  value_add_opportunities?: string[];

  // Risk
  overall_risk_level?: RiskLevel;
  deal_breakers?:      string[];
  risks?:              RiskItem[];

  // Financing
  financing_scenarios?:  FinancingScenario[];
  kfw_programs?:         string[];
  financing_commentary?: string;

  // Market
  city_market_summary?:   string;
  neighbourhood_outlook?: string;
  price_trend?:           string;
  macro_risk_factors?:    string[];

  // Action
  recommended_action?:      RecommendedAction;
  recommended_offer_price?: number;
  due_diligence_checklist?: string[];
  next_steps?:              string[];

  generated_at?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  'Calculating valuations...',
  'Assessing investment case...',
  'Evaluating risks...',
  'Generating recommendations...',
] as const;

/** 0→85% fake progress over 15 s, updated every 200 ms */
const TICK_MS          = 200;
const MAX_FAKE_PROG    = 85;
const PROG_PER_TICK    = MAX_FAKE_PROG / (15_000 / TICK_MS);

const ACTION_CONFIG: Record<RecommendedAction, { label: string; color: string; bg: string }> = {
  buy_now:            { label: 'Buy Now',              color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  negotiate_then_buy: { label: 'Negotiate Then Buy',   color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  watch_and_wait:     { label: 'Watch & Wait',         color: 'var(--color-warning)', bg: 'var(--color-warning-bg)'  },
  pass:               { label: 'Pass',                 color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
};

const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low Risk',    color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  medium: { label: 'Medium Risk', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  high:   { label: 'High Risk',   color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
};

const SEVERITY_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  medium: { label: 'Medium', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  high:   { label: 'High',   color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
};

const FAIR_PRICE_CONFIG: Record<FairPriceStatus, { label: string; color: string; bg: string }> = {
  fairly_priced: { label: 'Fairly Priced', color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  overvalued:    { label: 'Overvalued',    color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
  undervalued:   { label: 'Undervalued',   color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
};

// ── Styles ────────────────────────────────────────────────────────────────────

const DAR_STYLES = `
@keyframes immo-deep-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);    }
}
.dar-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.dar-three-col {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.dar-risk-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-body);
}
.dar-risk-table th,
.dar-risk-table td {
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--color-border);
}
.dar-risk-table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-muted);
}
.dar-risk-table td { font-size: 13px; color: var(--color-text-secondary); }
.dar-risk-table tr:last-child td { border-bottom: none; }
@media (max-width: 600px) {
  .dar-two-col   { grid-template-columns: 1fr; }
  .dar-three-col { grid-template-columns: 1fr; }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return `€ ${n.toLocaleString('de-DE')}`;
}

// ── Small shared components ───────────────────────────────────────────────────

function BadgePill({
  label,
  color,
  bg,
  large = false,
}: {
  label: string;
  color: string;
  bg:    string;
  large?: boolean;
}) {
  return (
    <span
      style={{
        display:       'inline-block',
        padding:       large ? '6px 18px' : '3px 10px',
        borderRadius:  6,
        fontSize:      large ? 13 : 11,
        fontWeight:    600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        fontFamily:    'var(--font-body)',
        color,
        backgroundColor: bg,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: RiskLevel }) {
  const { label, color, bg } = SEVERITY_CONFIG[severity];
  return <BadgePill label={label} color={color} bg={bg} />;
}

// ── Cycling loading text ──────────────────────────────────────────────────────

function CyclingSteps() {
  const [index,   setIndex]   = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % LOADING_STEPS.length);
        setVisible(true);
      }, 250);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <span
      style={{
        opacity:    visible ? 1 : 0,
        transition: 'opacity 250ms ease',
        fontSize:   13,
        fontFamily: 'var(--font-body)',
        color:      'var(--color-text-muted)',
      }}
    >
      {LOADING_STEPS[index]}
    </span>
  );
}

// ── Due-diligence checklist ───────────────────────────────────────────────────

function DueDiligenceChecklist({
  propertyId,
  items,
}: {
  propertyId: string;
  items:      string[];
}) {
  const key = `immo_dd_${propertyId}`;

  const [checked, setChecked] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch {
      return new Set();
    }
  });

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  const done = checked.size;
  const total = items.length;

  return (
    <div>
      {total > 0 && (
        <p style={{
          margin:     '0 0 10px',
          fontSize:   12,
          fontFamily: 'var(--font-body)',
          color:      'var(--color-text-muted)',
        }}>
          {done}/{total} completed
        </p>
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => {
          const isChecked = checked.has(i);
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input
                type="checkbox"
                id={`dar-dd-${propertyId}-${i}`}
                checked={isChecked}
                onChange={() => toggle(i)}
                style={{ marginTop: 3, accentColor: 'var(--color-brand)', flexShrink: 0, cursor: 'pointer' }}
              />
              <label
                htmlFor={`dar-dd-${propertyId}-${i}`}
                style={{
                  fontSize:       14,
                  fontFamily:     'var(--font-body)',
                  color:          isChecked ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                  lineHeight:     1.5,
                  cursor:         'pointer',
                  textDecoration: isChecked ? 'line-through' : 'none',
                  transition:     'color 150ms, text-decoration 150ms',
                }}
              >
                {item}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── State A — Not yet generated ───────────────────────────────────────────────

function NotYetGenerated({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <button
        onClick={onStart}
        style={{
          display:      'block',
          width:        '100%',
          height:       48,
          background:   'var(--color-brand)',
          color:        '#fff',
          border:       'none',
          borderRadius: 10,
          fontSize:     14,
          fontWeight:   600,
          fontFamily:   'var(--font-body)',
          cursor:       'pointer',
          transition:   'background 150ms',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-brand)'; }}
      >
        Run Deep Analysis
      </button>
      <p style={{
        margin:     0,
        fontSize:   13,
        color:      'var(--color-text-muted)',
        fontFamily: 'var(--font-body)',
        textAlign:  'center',
      }}>
        Takes 10–20 seconds · Results saved for 24 hours
      </p>
    </div>
  );
}

// ── State B — Running ─────────────────────────────────────────────────────────

function AnalysisRunning({ progress }: { progress: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{
        margin:     0,
        fontSize:   14,
        fontWeight: 500,
        color:      'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
      }}>
        Immonator is analysing...
      </p>

      {/* Fake progress bar */}
      <div style={{
        width:        '100%',
        height:       6,
        borderRadius: 3,
        background:   'var(--color-bg-elevated)',
        overflow:     'hidden',
      }}>
        <div
          style={{
            width:        `${progress}%`,
            height:       '100%',
            borderRadius: 3,
            background:   progress >= 100 ? 'var(--color-success)' : 'var(--color-brand)',
            transition:   'width 200ms ease, background 300ms ease',
          }}
        />
      </div>

      {/* Cycling step description */}
      <CyclingSteps />
    </div>
  );
}

// ── Report sections ───────────────────────────────────────────────────────────

function Section1_ExecSummary({ d }: { d: DeepAnalysisData }) {
  return (
    <SectionCard title="Executive Summary" collapsible defaultOpen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {d.verdict && (
          <div>
            <VerdictBadge verdict={d.verdict} />
          </div>
        )}

        {d.headline && (
          <h2 style={{
            margin:     0,
            fontFamily: 'var(--font-display)',
            fontSize:   28,
            fontWeight: 400,
            lineHeight: 1.25,
            color:      'var(--color-text-primary)',
          }}>
            {d.headline}
          </h2>
        )}

        {d.key_insight && (
          <div style={{
            background:   'var(--color-bg-elevated)',
            borderRadius: 8,
            padding:      '14px 16px',
            fontSize:     14,
            fontFamily:   'var(--font-body)',
            lineHeight:   1.65,
            color:        'var(--color-text-secondary)',
          }}>
            {d.key_insight}
          </div>
        )}

        {d.bottom_line && (
          <p style={{
            margin:     0,
            fontSize:   14,
            fontStyle:  'italic',
            fontFamily: 'var(--font-body)',
            color:      'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}>
            If this were my money: {d.bottom_line}
          </p>
        )}
      </div>
    </SectionCard>
  );
}

function Section2_PropertyAssessment({ d }: { d: DeepAnalysisData }) {
  const strengths  = d.strengths  ?? [];
  const weaknesses = d.weaknesses ?? [];
  const costs      = d.hidden_costs ?? [];

  return (
    <SectionCard title="Property Assessment" collapsible defaultOpen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Strengths / Weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="dar-two-col">
            <div>
              <p style={labelStyle}>Strengths</p>
              <ul style={listStyle}>
                {strengths.map((s, i) => (
                  <li key={i} style={listItemStyle}>
                    <span style={{ color: 'var(--color-success)', flexShrink: 0 }}>✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={labelStyle}>Weaknesses</p>
              <ul style={listStyle}>
                {weaknesses.map((w, i) => (
                  <li key={i} style={listItemStyle}>
                    <span style={{ color: 'var(--color-danger)', flexShrink: 0 }}>✗</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Hidden costs table */}
        {costs.length > 0 && (
          <div>
            <p style={labelStyle}>Hidden &amp; Additional Costs</p>
            <div style={{
              border:       '1px solid var(--color-border)',
              borderRadius: 8,
              overflow:     'hidden',
            }}>
              {costs.map(({ item, estimated_cost }, i) => (
                <div
                  key={i}
                  style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                    gap:            12,
                    padding:        '10px 14px',
                    borderBottom:   i < costs.length - 1 ? '1px solid var(--color-border)' : 'none',
                    background:     i % 2 === 1 ? 'var(--color-bg-elevated)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
                    {item}
                  </span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                    {fmtPrice(estimated_cost)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Condition analysis */}
        {d.condition_analysis && (
          <p style={{
            margin:     0,
            fontSize:   14,
            fontFamily: 'var(--font-body)',
            lineHeight: 1.65,
            color:      'var(--color-text-secondary)',
          }}>
            {d.condition_analysis}
          </p>
        )}
      </div>
    </SectionCard>
  );
}

function Section3_Valuation({ d }: { d: DeepAnalysisData }) {
  const commentary = d.valuation_commentary ?? [];
  const asking     = d.asking_price;
  const avg        = d.avg_valuation;

  // Bar geometry
  let fillPct = 100, gapPct = 0, gapColor = 'var(--color-warning)';
  if (asking && avg) {
    if (asking > avg) {
      fillPct  = (avg / asking) * 100;
      gapPct   = 100 - fillPct;
      gapColor = gapPct > 15 ? 'var(--color-danger)' : 'var(--color-warning)';
    } else {
      fillPct = 100; gapPct = 0; // undervalued — full bar
    }
  }

  const pctDiff = asking && avg
    ? ((asking - avg) / avg) * 100
    : null;

  return (
    <SectionCard title="Valuation Analysis" collapsible defaultOpen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Price gap bar */}
        {asking && avg && (
          <div>
            {/* Bar */}
            <div style={{
              width:        '100%',
              height:       10,
              borderRadius: 5,
              background:   'var(--color-bg-elevated)',
              overflow:     'hidden',
              display:      'flex',
            }}>
              {/* Filled portion */}
              <div style={{
                width:        `${fillPct}%`,
                height:       '100%',
                background:   'var(--color-text-muted)',
                flexShrink:   0,
              }} />
              {/* Striped gap */}
              {gapPct > 0 && (
                <div style={{
                  width:    `${gapPct}%`,
                  height:   '100%',
                  flexShrink: 0,
                  background: `repeating-linear-gradient(
                    45deg,
                    ${gapColor},
                    ${gapColor} 2px,
                    transparent 2px,
                    transparent 7px
                  )`,
                }} />
              )}
            </div>

            {/* Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                Avg Valuation: {fmtPrice(avg)}
              </span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: pctDiff && pctDiff > 0 ? gapColor : 'var(--color-success)' }}>
                Asking: {fmtPrice(asking)}{' '}
                {pctDiff !== null && `(${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(1)}%)`}
              </span>
            </div>
          </div>
        )}

        {/* Fair-price badge */}
        {d.is_fairly_priced && (() => {
          const { label, color, bg } = FAIR_PRICE_CONFIG[d.is_fairly_priced];
          return <BadgePill label={label} color={color} bg={bg} large />;
        })()}

        {/* Commentary */}
        {commentary.map((para, i) => (
          <p key={i} style={{
            margin:     0,
            fontSize:   14,
            fontFamily: 'var(--font-body)',
            lineHeight: 1.65,
            color:      'var(--color-text-secondary)',
          }}>
            {para}
          </p>
        ))}
      </div>
    </SectionCard>
  );
}

function Section4_InvestmentCase({ d }: { d: DeepAnalysisData }) {
  const cases: { key: 'bull_case' | 'base_case' | 'bear_case'; label: string; color: string; bg: string; border: string; strong?: boolean }[] = [
    {
      key:    'bull_case',
      label:  'Bull Case',
      color:  'var(--color-success)',
      bg:     'var(--color-success-bg)',
      border: 'var(--color-border)',
    },
    {
      key:    'base_case',
      label:  'Base Case',
      color:  'var(--color-brand)',
      bg:     'var(--color-brand-subtle)',
      border: 'var(--color-brand)',
      strong: true,
    },
    {
      key:    'bear_case',
      label:  'Bear Case',
      color:  'var(--color-warning)',
      bg:     'var(--color-warning-bg)',
      border: 'var(--color-border)',
    },
  ];

  const opps = d.value_add_opportunities ?? [];

  return (
    <SectionCard title="Investment Case" collapsible defaultOpen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div className="dar-three-col">
          {cases.map(({ key, label, color, bg, border, strong }) => {
            const text = d[key];
            if (!text) return null;
            return (
              <div
                key={key}
                style={{
                  background:   bg,
                  border:       `${strong ? '2px' : '1px'} solid ${border}`,
                  borderRadius: 10,
                  padding:      '14px 16px',
                  position:     'relative',
                }}
              >
                {strong && (
                  <span style={{
                    position:      'absolute',
                    top:           -1,
                    right:         10,
                    background:    'var(--color-brand)',
                    color:         '#fff',
                    fontSize:      10,
                    fontWeight:    700,
                    fontFamily:    'var(--font-body)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding:       '2px 7px',
                    borderRadius:  '0 0 5px 5px',
                  }}>
                    Base
                  </span>
                )}
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color, fontFamily: 'var(--font-body)' }}>
                  {label}
                </p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                  {text}
                </p>
              </div>
            );
          })}
        </div>

        {opps.length > 0 && (
          <div>
            <p style={labelStyle}>Value-Add Opportunities</p>
            <ul style={listStyle}>
              {opps.map((opp, i) => (
                <li key={i} style={listItemStyle}>
                  <span style={{ color: 'var(--color-brand)', flexShrink: 0 }}>›</span>
                  {opp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function Section5_Risks({ d }: { d: DeepAnalysisData }) {
  const risks      = d.risks       ?? [];
  const breakers   = d.deal_breakers ?? [];

  return (
    <SectionCard title="Risk Analysis" collapsible defaultOpen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Overall risk level */}
        {d.overall_risk_level && (() => {
          const { label, color, bg } = RISK_LEVEL_CONFIG[d.overall_risk_level];
          return <BadgePill label={label} color={color} bg={bg} large />;
        })()}

        {/* Deal breakers alert */}
        {breakers.length > 0 && (
          <div style={{
            background:   'var(--color-danger-bg)',
            border:       '1px solid var(--color-danger)',
            borderRadius: 8,
            padding:      '12px 16px',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--color-danger)', fontFamily: 'var(--font-body)' }}>
              ⚠ Deal Breakers Found
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {breakers.map((b, i) => (
                <li key={i} style={{ fontSize: 13, color: 'var(--color-danger)', fontFamily: 'var(--font-body)', lineHeight: 1.5, paddingLeft: 12, borderLeft: '2px solid var(--color-danger)' }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk table */}
        {risks.length > 0 && (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <table className="dar-risk-table">
              <thead>
                <tr style={{ background: 'var(--color-bg-elevated)' }}>
                  <th>Risk</th>
                  <th style={{ width: 90 }}>Severity</th>
                  <th>Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r, i) => (
                  <tr key={i}>
                    <td>{r.description}</td>
                    <td><SeverityBadge severity={r.severity} /></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{r.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function Section6_Financing({ d }: { d: DeepAnalysisData }) {
  const scenarios = d.financing_scenarios ?? [];
  const kfw       = d.kfw_programs        ?? [];

  return (
    <SectionCard title="Financing" collapsible defaultOpen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Three financing scenario cards */}
        {scenarios.length > 0 && (
          <div className="dar-three-col">
            {scenarios.map((sc) => {
              const isPos = sc.monthly_cashflow >= 0;
              return (
                <div
                  key={sc.label}
                  style={{
                    background:   'var(--color-bg-elevated)',
                    border:       sc.is_recommended
                      ? '2px solid var(--color-brand)'
                      : '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding:      '14px 16px',
                    position:     'relative',
                  }}
                >
                  {sc.is_recommended && (
                    <span style={{
                      position:      'absolute',
                      top:           -1,
                      right:         10,
                      background:    'var(--color-brand)',
                      color:         '#fff',
                      fontSize:      10,
                      fontWeight:    700,
                      fontFamily:    'var(--font-body)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding:       '2px 7px',
                      borderRadius:  '0 0 5px 5px',
                    }}>
                      Recommended
                    </span>
                  )}

                  <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                    {sc.label}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <FinancingRow label="LTV" value={`${sc.recommended_ltv}%`} />
                    <FinancingRow label="Monthly Payment" value={fmtPrice(sc.monthly_payment)} mono />
                    <FinancingRow
                      label="Monthly Cashflow"
                      value={fmtPrice(sc.monthly_cashflow)}
                      mono
                      color={isPos ? 'var(--color-success)' : 'var(--color-danger)'}
                    />
                    <FinancingRow label="Equity Needed" value={fmtPrice(sc.equity_needed)} mono />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* KfW programs */}
        {kfw.length > 0 && (
          <div>
            <p style={labelStyle}>Eligible KfW Programs</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {kfw.map((prog) => (
                <span
                  key={prog}
                  style={{
                    background:   'var(--color-bg-elevated)',
                    border:       '1px solid var(--color-border-strong)',
                    borderRadius: 20,
                    padding:      '4px 12px',
                    fontSize:     12,
                    fontFamily:   'var(--font-body)',
                    color:        'var(--color-text-secondary)',
                  }}
                >
                  {prog}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Commentary */}
        {d.financing_commentary && (
          <p style={{ margin: 0, fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
            {d.financing_commentary}
          </p>
        )}
      </div>
    </SectionCard>
  );
}

function FinancingRow({
  label,
  value,
  mono  = false,
  color = 'var(--color-text-primary)',
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', fontWeight: 500, color }}>{value}</span>
    </div>
  );
}

function Section7_Market({ d }: { d: DeepAnalysisData }) {
  const macros = d.macro_risk_factors ?? [];

  return (
    <SectionCard title="Market Context" collapsible defaultOpen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[d.city_market_summary, d.neighbourhood_outlook, d.price_trend]
          .filter(Boolean)
          .map((para, i) => (
            <p key={i} style={{ margin: 0, fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.65, color: 'var(--color-text-secondary)' }}>
              {para}
            </p>
          ))}

        {macros.length > 0 && (
          <div>
            <p style={labelStyle}>Macro Risk Factors</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {macros.map((m) => (
                <span
                  key={m}
                  style={{
                    background:   'var(--color-warning-bg)',
                    border:       '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
                    borderRadius: 20,
                    padding:      '4px 12px',
                    fontSize:     12,
                    fontFamily:   'var(--font-body)',
                    color:        'var(--color-warning)',
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function Section8_Action({
  d,
  propertyId,
}: {
  d:          DeepAnalysisData;
  propertyId: string;
}) {
  const ddItems  = d.due_diligence_checklist ?? [];
  const steps    = d.next_steps              ?? [];

  return (
    <SectionCard title="Recommended Action" collapsible defaultOpen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Action badge */}
        {d.recommended_action && (() => {
          const { label, color, bg } = ACTION_CONFIG[d.recommended_action];
          return <BadgePill label={label} color={color} bg={bg} large />;
        })()}

        {/* Recommended offer price */}
        {d.recommended_offer_price && (
          <div>
            <p style={{ margin: '0 0 4px', ...labelStyle }}>Recommended Offer</p>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize:   32,
              color:      'var(--color-success)',
              lineHeight: 1.1,
            }}>
              {fmtPrice(d.recommended_offer_price)}
            </span>
          </div>
        )}

        {/* Due diligence checklist */}
        {ddItems.length > 0 && (
          <div>
            <p style={labelStyle}>Due Diligence Checklist</p>
            <DueDiligenceChecklist propertyId={propertyId} items={ddItems} />
          </div>
        )}

        {/* Next steps */}
        {steps.length > 0 && (
          <div>
            <p style={labelStyle}>Next Steps</p>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map((step, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{
                    flexShrink:    0,
                    width:         22,
                    height:        22,
                    borderRadius:  '50%',
                    background:    'var(--color-brand-subtle)',
                    border:        '1px solid var(--color-brand)',
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent: 'center',
                    fontSize:       11,
                    fontWeight:     700,
                    color:          'var(--color-brand)',
                    fontFamily:     'var(--font-body)',
                    marginTop:      2,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ── State C — Loaded report ───────────────────────────────────────────────────

function AnalysisLoaded({
  data,
  propertyId,
}: {
  data:       DeepAnalysisData;
  propertyId: string;
}) {
  const sections = [
    <Section1_ExecSummary      key="s1" d={data} />,
    <Section2_PropertyAssessment key="s2" d={data} />,
    <Section3_Valuation        key="s3" d={data} />,
    <Section4_InvestmentCase   key="s4" d={data} />,
    <Section5_Risks            key="s5" d={data} />,
    <Section6_Financing        key="s6" d={data} />,
    <Section7_Market           key="s7" d={data} />,
    <Section8_Action           key="s8" d={data} propertyId={propertyId} />,
  ];

  return (
    <div>
      {/* PDF download — top right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <LockedButton label="Download PDF" featureName="PDF Export" />
      </div>

      {/* Stagger-faded sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sections.map((section, i) => (
          <div
            key={i}
            style={{
              opacity:         0,
              animation:       'immo-deep-fade-in 400ms ease forwards',
              animationDelay:  `${i * 100}ms`,
              animationFillMode: 'both',
            }}
          >
            {section}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared micro-styles (avoids repetition in section bodies) ─────────────────

const labelStyle: React.CSSProperties = {
  margin:        0,
  fontSize:      11,
  fontWeight:    600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color:         'var(--color-text-muted)',
  fontFamily:    'var(--font-body)',
  marginBottom:  8,
};

const listStyle: React.CSSProperties = {
  margin:        0,
  padding:       0,
  listStyle:     'none',
  display:       'flex',
  flexDirection: 'column',
  gap:           7,
};

const listItemStyle: React.CSSProperties = {
  display:    'flex',
  gap:        8,
  fontSize:   14,
  lineHeight: 1.5,
  fontFamily: 'var(--font-body)',
  color:      'var(--color-text-secondary)',
};

// ── Main export ───────────────────────────────────────────────────────────────

export function DeepAnalysisReport({ propertyId }: { propertyId: string }) {
  type FetchState = 'idle' | 'running' | 'ready' | 'error';

  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [report,     setReport]     = useState<DeepAnalysisData | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [progress,   setProgress]   = useState(0);
  const initialised = useRef(false);

  // ── Initial GET to check if report already exists ──
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    api.get<DeepAnalysisData>(`/api/analysis/deep/${propertyId}`).then((res) => {
      if (res.data?.status === 'ready') {
        setReport(res.data);
        setFetchState('ready');
      }
      // If not_generated or error, stay idle (show button)
    });
  }, [propertyId]);

  // ── Fake progress + polling (while running) ────────────────────────────────
  useEffect(() => {
    if (fetchState !== 'running') return;

    let cancelled = false;

    const progressId = setInterval(() => {
      if (cancelled) return;
      setProgress((p) => Math.min(p + PROG_PER_TICK, MAX_FAKE_PROG));
    }, TICK_MS);

    const pollId = setInterval(async () => {
      const res = await api.get<DeepAnalysisData>(`/api/analysis/deep/${propertyId}`);
      if (cancelled) return;

      if (res.error) {
        clearInterval(progressId);
        clearInterval(pollId);
        setErrorMsg(res.error);
        setFetchState('error');
        return;
      }

      if (res.data?.status === 'ready') {
        clearInterval(progressId);
        clearInterval(pollId);
        setProgress(100);
        setTimeout(() => {
          if (cancelled) return;
          setReport(res.data!);
          setFetchState('ready');
        }, 500);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(progressId);
      clearInterval(pollId);
    };
  }, [fetchState, propertyId]);

  // ── Button handler ─────────────────────────────────────────────────────────
  async function handleStart() {
    setProgress(0);
    setFetchState('running');

    const res = await api.post(`/api/analysis/deep/${propertyId}`, {});
    if (res.error) {
      setErrorMsg(res.error);
      setFetchState('error');
    }
    // On success, polling useEffect handles the rest
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{DAR_STYLES}</style>

      {fetchState === 'idle' && (
        <NotYetGenerated onStart={handleStart} />
      )}

      {fetchState === 'running' && (
        <AnalysisRunning progress={progress} />
      )}

      {fetchState === 'ready' && report && (
        <AnalysisLoaded data={report} propertyId={propertyId} />
      )}

      {fetchState === 'error' && (
        <div style={{
          background:   'var(--color-danger-bg)',
          border:       '1px solid var(--color-danger)',
          borderRadius: 10,
          padding:      '14px 20px',
          display:      'flex',
          justifyContent: 'space-between',
          alignItems:   'center',
          gap:          16,
        }}>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-danger)' }}>
            {errorMsg ?? 'Analysis failed. Please try again.'}
          </span>
          <button
            onClick={() => { setErrorMsg(null); setFetchState('idle'); }}
            style={{
              background:   'none',
              border:       '1px solid var(--color-danger)',
              borderRadius: 6,
              padding:      '5px 12px',
              fontSize:     12,
              fontFamily:   'var(--font-body)',
              color:        'var(--color-danger)',
              cursor:       'pointer',
              flexShrink:   0,
            }}
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
}

export default DeepAnalysisReport;
