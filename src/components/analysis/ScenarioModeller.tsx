import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { api } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScenarioParams {
  purchase_price:          number;
  down_payment_pct:        number;
  interest_rate_pct:       number;
  loan_term_years:         number;
  monthly_rent:            number;
  vacancy_rate_pct:        number;
  management_cost_pct:     number;
  maintenance_cost_annual: number;
}

interface CalculatedMetrics {
  loan:       number;
  equity:     number;
  mortgage:   number;
  cashflow:   number;
  grossYield: number;
  netYield:   number;
  cashOnCash: number;
  dscr:       number;
  payback:    number | null;
}

interface AiCommentary {
  scenario_verdict:    string;
  one_line_summary:    string;
  cashflow_commentary: string;
  yield_commentary:    string;
  key_insight:         string;
  suggestion:          string;
}

interface SavedScenario {
  id:     string;
  name:   string;
  params: ScenarioParams;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** German closing costs: ~9.5% (Grunderwerbsteuer + Notar + Grundbuch + Makler) */
const CLOSING_COSTS_RATE = 0.095;

/** DSCR ≥ 1.25 → healthy; ≥ 1.0 → breakeven; < 1.0 → distressed */
const DSCR_GOOD_THRESHOLD = 1.25;
const DSCR_OK_THRESHOLD   = 1.0;

/** Cash-on-Cash ≥ 6% → strong; ≥ 3% → acceptable; < 3% → weak */
const COC_GOOD_THRESHOLD = 6;
const COC_OK_THRESHOLD   = 3;

// ── Styles ────────────────────────────────────────────────────────────────────

const STYLES = `
  @keyframes sm-pulse {
    0%, 100% { border-color: var(--color-border); }
    50%       { border-color: color-mix(in srgb, var(--color-brand) 40%, var(--color-border)); }
  }
  .sm-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  @media (max-width: 768px) {
    .sm-layout { grid-template-columns: 1fr; }
  }
  .sm-slider {
    -webkit-appearance: none;
    appearance:         none;
    width:              100%;
    height:             4px;
    border-radius:      2px;
    outline:            none;
    cursor:             pointer;
    margin:             0;
    background: linear-gradient(
      to right,
      var(--color-brand)       0%,
      var(--color-brand)       var(--pct, 0%),
      var(--color-bg-elevated) var(--pct, 0%),
      var(--color-bg-elevated) 100%
    );
  }
  .sm-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width:              16px;
    height:             16px;
    border-radius:      50%;
    background:         var(--color-brand);
    border:             2px solid var(--color-bg-base);
    cursor:             pointer;
    box-shadow:         0 1px 3px rgba(0,0,0,0.3);
  }
  .sm-slider::-moz-range-thumb {
    width:        16px;
    height:       16px;
    border-radius: 50%;
    background:   var(--color-brand);
    border:       2px solid var(--color-bg-base);
    cursor:       pointer;
    box-shadow:   0 1px 3px rgba(0,0,0,0.3);
  }
  .sm-ai-card {
    transition: border-color 300ms;
  }
  .sm-ai-card.loading {
    animation: sm-pulse 1.5s ease-in-out infinite;
  }
  .sm-btn-secondary {
    background:  transparent;
    border:      1px solid var(--color-border);
    border-radius: 8px;
    padding:     8px 14px;
    font-size:   13px;
    font-family: var(--font-body);
    color:       var(--color-text-secondary);
    cursor:      pointer;
    transition:  border-color 150ms, color 150ms;
    white-space: nowrap;
  }
  .sm-btn-secondary:hover {
    border-color: var(--color-border-strong);
    color:        var(--color-text-primary);
  }
  .sm-btn-primary {
    background:    var(--color-brand);
    border:        none;
    border-radius: 8px;
    padding:       8px 14px;
    font-size:     13px;
    font-family:   var(--font-body);
    color:         #fff;
    cursor:        pointer;
    transition:    opacity 150ms;
  }
  .sm-btn-primary:hover {
    opacity: 0.85;
  }
  .sm-advanced {
    display:        none;
    flex-direction: column;
    gap:            20px;
  }
  .sm-advanced.open { display: flex; }
  @media (min-width: 769px) {
    .sm-advanced              { display: flex !important; }
    .sm-advanced-toggle       { display: none !important; }
  }
  .sm-name-input {
    flex:          1;
    background:    var(--color-bg-elevated);
    border:        1px solid var(--color-border);
    border-radius: 8px;
    padding:       6px 10px;
    font-size:     13px;
    font-family:   var(--font-body);
    color:         var(--color-text-primary);
    outline:       none;
    transition:    border-color 150ms;
  }
  .sm-name-input:focus {
    border-color: var(--color-brand);
  }
  .sm-saved-item {
    display:       block;
    width:         100%;
    background:    none;
    border:        none;
    padding:       8px 12px;
    text-align:    left;
    font-size:     13px;
    font-family:   var(--font-body);
    color:         var(--color-text-primary);
    cursor:        pointer;
    border-radius: 6px;
    transition:    background 100ms;
  }
  .sm-saved-item:hover {
    background: var(--color-bg-subtle);
  }
`;

// ── Math ──────────────────────────────────────────────────────────────────────

function computeMetrics(p: ScenarioParams): CalculatedMetrics {
  const price       = p.purchase_price;
  const loan        = price * (1 - p.down_payment_pct / 100);
  const equity      = price * (p.down_payment_pct / 100) + price * CLOSING_COSTS_RATE;
  const r           = p.interest_rate_pct / 100 / 12;
  const n           = p.loan_term_years * 12;
  const mortgage    = r > 0
    ? loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    : loan / n;
  const effRent     = p.monthly_rent * (1 - p.vacancy_rate_pct / 100);
  const mgmtCost    = effRent * (p.management_cost_pct / 100);
  const maintMonthly = p.maintenance_cost_annual / 12;
  const cashflow    = effRent - mortgage - mgmtCost - maintMonthly;
  const grossYield  = (p.monthly_rent * 12) / price * 100;
  const netYield    = (effRent * 12 - mgmtCost * 12 - p.maintenance_cost_annual) / price * 100;
  const cashOnCash  = (cashflow * 12) / equity * 100;
  const dscr        = mortgage > 0 ? (effRent * 12) / (mortgage * 12) : 0;
  const payback     = cashflow > 0 ? equity / (cashflow * 12) : null;
  return { loan, equity, mortgage, cashflow, grossYield, netYield, cashOnCash, dscr, payback };
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtEur(n: number): string {
  return '\u20AC\u00A0' + Math.round(Math.abs(n)).toLocaleString('de-DE');
}

function fmtEurK(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10000) return `\u20AC\u00A0${(abs / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return fmtEur(n);
}

function fmtPct(n: number, decimals = 1): string {
  return n.toFixed(decimals) + '%';
}

function fmtCashflow(n: number): string {
  const sign = n >= 0 ? '+' : '\u2212';
  return `${sign}${fmtEur(Math.abs(n))}/mo`;
}

// ── Verdict config ────────────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  strong_buy:  { label: 'Strong Buy',  color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  buy:         { label: 'Buy',         color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  hold:        { label: 'Hold',        color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  sell:        { label: 'Sell',        color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
  strong_sell: { label: 'Strong Sell', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SliderRow({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label:      string;
  valueLabel: string;
  value:      number;
  min:        number;
  max:        number;
  step:       number;
  onChange:   (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{
          fontSize:      11,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color:         'var(--color-text-muted)',
          fontFamily:    'var(--font-body)',
        }}>
          {label}
        </span>
        <span style={{
          fontSize:   13,
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          color:      'var(--color-text-primary)',
        }}>
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        className="sm-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--pct': `${pct.toFixed(1)}%` } as React.CSSProperties}
      />
    </div>
  );
}

function MetricCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{
      background:   'var(--color-bg-elevated)',
      border:       '1px solid var(--color-border)',
      borderRadius: 10,
      padding:      '12px 14px',
    }}>
      <p style={{
        margin:        0,
        fontSize:      10,
        fontWeight:    500,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color:         'var(--color-text-muted)',
        fontFamily:    'var(--font-body)',
        marginBottom:  4,
      }}>
        {label}
      </p>
      <p style={{
        margin:     0,
        fontSize:   17,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        color:      color ?? 'var(--color-text-primary)',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          margin:     '4px 0 0',
          fontSize:   11,
          fontFamily: 'var(--font-body)',
          color:      'var(--color-text-muted)',
          lineHeight: 1.4,
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScenarioModeller({
  propertyId,
  askingPrice,
  monthlyRent,
}: {
  propertyId:   string;
  askingPrice:  number;
  monthlyRent:  number;
}) {
  const [params, setParams] = useState<ScenarioParams>(() => ({
    purchase_price:          askingPrice,
    down_payment_pct:        20,
    interest_rate_pct:       4.0,
    loan_term_years:         25,
    monthly_rent:            monthlyRent,
    vacancy_rate_pct:        5,
    management_cost_pct:     8,
    maintenance_cost_annual: 2000,
  }));

  const [aiCommentary,   setAiCommentary]   = useState<AiCommentary | null>(null);
  const [isLoadingAI,    setIsLoadingAI]    = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [showAdvanced,   setShowAdvanced]   = useState(false);
  const [isSaving,       setIsSaving]       = useState(false);
  const [scenarioName,   setScenarioName]   = useState('');
  const [saveConfirmed,  setSaveConfirmed]  = useState(false);
  const [showDropdown,   setShowDropdown]   = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Computed metrics (instant) ─────────────────────────────────────────────
  const metrics = useMemo(() => computeMetrics(params), [params]);

  // ── Load saved scenarios ───────────────────────────────────────────────────
  useEffect(() => {
    let ignore = false;
    api.get<SavedScenario[]>(`/api/analysis/scenario/${propertyId}`).then((res) => {
      if (!ignore && res.data) setSavedScenarios(res.data);
    });
    return () => { ignore = true; };
  }, [propertyId]);

  // ── Debounced AI commentary (500ms) ───────────────────────────────────────
  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(async () => {
      setIsLoadingAI(true);
      const res = await api.post<AiCommentary>(
        `/api/analysis/scenario/${propertyId}`,
        params,
      );
      if (!ignore) {
        if (res.data) setAiCommentary(res.data);
        setIsLoadingAI(false);
      }
    }, 500);
    return () => { ignore = true; clearTimeout(timer); };
    // params is an object; JSON.stringify used to detect value-level changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params), propertyId]);

  // ── Click-outside to close dropdown ───────────────────────────────────────
  useEffect(() => {
    if (!showDropdown) return;
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showDropdown]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const update = useCallback((key: keyof ScenarioParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    const name = scenarioName.trim() || 'Scenario';
    const res = await api.post<SavedScenario>(
      `/api/analysis/scenario/${propertyId}/save`,
      { name, params },
    );
    if (res.data) {
      setSavedScenarios(prev => [...prev, res.data!]);
      setIsSaving(false);
      setScenarioName('');
      setSaveConfirmed(true);
      setTimeout(() => setSaveConfirmed(false), 3000);
    }
  };

  const loadSaved = (s: SavedScenario) => {
    setParams(s.params);
    setShowDropdown(false);
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const downEur      = params.purchase_price * params.down_payment_pct / 100;
  const closingCosts = params.purchase_price * CLOSING_COSTS_RATE;

  const cashflowColor = metrics.cashflow >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
  const dscrColor = metrics.dscr >= DSCR_GOOD_THRESHOLD
    ? 'var(--color-success)'
    : metrics.dscr >= DSCR_OK_THRESHOLD
      ? 'var(--color-warning)'
      : 'var(--color-danger)';
  const cocColor = metrics.cashOnCash >= COC_GOOD_THRESHOLD
    ? 'var(--color-success)'
    : metrics.cashOnCash >= COC_OK_THRESHOLD
      ? 'var(--color-warning)'
      : 'var(--color-danger)';

  const verdictCfg = aiCommentary?.scenario_verdict
    ? (VERDICT_CONFIG[aiCommentary.scenario_verdict] ?? {
        label: aiCommentary.scenario_verdict,
        color: 'var(--color-text-secondary)',
        bg:    'var(--color-bg-elevated)',
      })
    : null;

  return (
    <div style={{
      background:   'var(--color-bg-surface)',
      border:       '1px solid var(--color-border)',
      borderRadius: 12,
      padding:      '20px 24px',
    }}>
      <style>{STYLES}</style>

      <h3 style={{
        margin:       '0 0 20px',
        fontSize:     16,
        fontWeight:   600,
        fontFamily:   'var(--font-body)',
        color:        'var(--color-text-primary)',
      }}>
        Scenario Modeller
      </h3>

      <div className="sm-layout">

        {/* ── LEFT: Sliders ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <SliderRow
            label="Purchase Price"
            valueLabel={fmtEur(params.purchase_price)}
            value={params.purchase_price}
            min={Math.floor(askingPrice * 0.7 / 5000) * 5000}
            max={Math.ceil(askingPrice  * 1.1 / 5000) * 5000}
            step={5000}
            onChange={(v) => update('purchase_price', v)}
          />
          <SliderRow
            label="Down Payment"
            valueLabel={`${params.down_payment_pct}% · ${fmtEurK(downEur)}`}
            value={params.down_payment_pct}
            min={10} max={40} step={5}
            onChange={(v) => update('down_payment_pct', v)}
          />
          <SliderRow
            label="Interest Rate"
            valueLabel={`${fmtPct(params.interest_rate_pct, 1)} p.a.`}
            value={params.interest_rate_pct}
            min={2.0} max={7.0} step={0.1}
            onChange={(v) => update('interest_rate_pct', v)}
          />
          <SliderRow
            label="Loan Term"
            valueLabel={`${params.loan_term_years} years`}
            value={params.loan_term_years}
            min={10} max={30} step={5}
            onChange={(v) => update('loan_term_years', v)}
          />
          <SliderRow
            label="Monthly Rent"
            valueLabel={`${fmtEur(params.monthly_rent)}/mo`}
            value={params.monthly_rent}
            min={Math.floor(monthlyRent * 0.7 / 50) * 50}
            max={Math.ceil(monthlyRent  * 1.5 / 50) * 50}
            step={50}
            onChange={(v) => update('monthly_rent', v)}
          />

          {/* Advanced toggle — visible on mobile only (CSS hides on desktop) */}
          <button
            className="sm-advanced-toggle sm-btn-secondary"
            onClick={() => setShowAdvanced(s => !s)}
            style={{ alignSelf: 'flex-start' }}
          >
            Advanced {showAdvanced ? '▴' : '▾'}
          </button>

          {/* Advanced sliders — always visible on desktop, toggle-controlled on mobile */}
          <div className={`sm-advanced${showAdvanced ? ' open' : ''}`}>
            <SliderRow
              label="Vacancy Rate"
              valueLabel={fmtPct(params.vacancy_rate_pct, 0)}
              value={params.vacancy_rate_pct}
              min={0} max={15} step={1}
              onChange={(v) => update('vacancy_rate_pct', v)}
            />
            <SliderRow
              label="Management Cost"
              valueLabel={`${fmtPct(params.management_cost_pct, 0)} of rent`}
              value={params.management_cost_pct}
              min={0} max={15} step={1}
              onChange={(v) => update('management_cost_pct', v)}
            />
            <SliderRow
              label="Maintenance"
              valueLabel={`${fmtEur(params.maintenance_cost_annual)}/yr`}
              value={params.maintenance_cost_annual}
              min={0} max={10000} step={500}
              onChange={(v) => update('maintenance_cost_annual', v)}
            />
          </div>

        </div>

        {/* ── RIGHT: Results ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Hero: Monthly Cashflow */}
          <div style={{
            background:   'var(--color-bg-elevated)',
            border:       '1px solid var(--color-border)',
            borderRadius: 12,
            padding:      '16px 20px',
          }}>
            <p style={{
              margin:        0,
              fontSize:      10,
              fontWeight:    500,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color:         'var(--color-text-muted)',
              fontFamily:    'var(--font-body)',
              marginBottom:  8,
            }}>
              Monthly Cashflow
            </p>
            <p style={{
              margin:     0,
              fontSize:   40,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color:      cashflowColor,
              lineHeight: 1,
            }}>
              {fmtCashflow(metrics.cashflow)}
            </p>
          </div>

          {/* 2×2 metric grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <MetricCard label="Gross Yield"  value={fmtPct(metrics.grossYield)} />
            <MetricCard label="Net Yield"    value={fmtPct(metrics.netYield)} />
            <MetricCard label="DSCR"         value={metrics.dscr.toFixed(2)}    color={dscrColor} />
            <MetricCard label="Cash-on-Cash" value={fmtPct(metrics.cashOnCash)} color={cocColor} />
          </div>

          {/* Equity + Payback */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <MetricCard
              label="Total Equity Needed"
              value={fmtEur(metrics.equity)}
              sub={`Down ${fmtEurK(downEur)} + Costs ${fmtEurK(closingCosts)}`}
            />
            <MetricCard
              label="Payback Period"
              value={metrics.payback !== null ? `${metrics.payback.toFixed(1)} years` : 'Negative cashflow'}
              color={metrics.payback === null ? 'var(--color-danger)' : undefined}
            />
          </div>

          {/* AI Commentary */}
          <div
            className={`sm-ai-card${isLoadingAI ? ' loading' : ''}`}
            style={{
              background:   'var(--color-bg-elevated)',
              border:       '1px solid var(--color-border)',
              borderRadius: 12,
              padding:      '14px 16px',
            }}
          >
            {aiCommentary && !isLoadingAI ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <p style={{
                    margin:     0,
                    fontSize:   16,
                    fontWeight: 600,
                    fontFamily: 'var(--font-body)',
                    color:      'var(--color-text-primary)',
                    lineHeight: 1.4,
                    flex:       1,
                  }}>
                    {aiCommentary.one_line_summary}
                  </p>
                  {verdictCfg && (
                    <span style={{
                      padding:       '3px 10px',
                      borderRadius:  6,
                      fontSize:      11,
                      fontWeight:    600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontFamily:    'var(--font-body)',
                      color:         verdictCfg.color,
                      background:    verdictCfg.bg,
                      border:        `1px solid color-mix(in srgb, ${verdictCfg.color} 25%, transparent)`,
                      whiteSpace:    'nowrap',
                      flexShrink:    0,
                    }}>
                      {verdictCfg.label}
                    </span>
                  )}
                </div>

                {[
                  aiCommentary.cashflow_commentary,
                  aiCommentary.yield_commentary,
                  aiCommentary.key_insight,
                ].map((text, i) => text && (
                  <p key={i} style={{
                    margin:     0,
                    fontSize:   14,
                    fontFamily: 'var(--font-body)',
                    color:      'var(--color-text-muted)',
                    lineHeight: 1.55,
                  }}>
                    {text}
                  </p>
                ))}

                {aiCommentary.suggestion && (
                  <p style={{
                    margin:     0,
                    fontSize:   13,
                    fontStyle:  'italic',
                    fontFamily: 'var(--font-body)',
                    color:      'var(--color-brand)',
                    lineHeight: 1.5,
                  }}>
                    {aiCommentary.suggestion}
                  </p>
                )}
              </div>
            ) : (
              <p style={{
                margin:     0,
                fontSize:   13,
                fontFamily: 'var(--font-body)',
                color:      'var(--color-text-muted)',
              }}>
                {isLoadingAI
                  ? 'Analysing scenario\u2026'
                  : 'Adjust the sliders to generate AI commentary.'}
              </p>
            )}
          </div>

        </div>
      </div>

      {/* ── Bottom row: Save + Load ── */}
      <div style={{ marginTop: 20, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>

        {saveConfirmed ? (
          <span style={{
            fontSize:   13,
            fontFamily: 'var(--font-body)',
            color:      'var(--color-success)',
          }}>
            ✓ Saved
          </span>
        ) : isSaving ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              className="sm-name-input"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Scenario name…"
            />
            <button className="sm-btn-primary" onClick={handleSave}>
              Save
            </button>
            <button
              className="sm-btn-secondary"
              onClick={() => { setIsSaving(false); setScenarioName(''); }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button className="sm-btn-secondary" onClick={() => setIsSaving(true)}>
            Save This Scenario
          </button>
        )}

        {savedScenarios.length > 0 && !isSaving && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="sm-btn-secondary"
              onClick={() => setShowDropdown(s => !s)}
            >
              Saved Scenarios {showDropdown ? '▴' : '▾'}
            </button>
            {showDropdown && (
              <div style={{
                position:     'absolute',
                bottom:       'calc(100% + 4px)',
                left:         0,
                background:   'var(--color-bg-surface)',
                border:       '1px solid var(--color-border)',
                borderRadius: 8,
                padding:      4,
                minWidth:     180,
                zIndex:       50,
                boxShadow:    '0 4px 12px rgba(0,0,0,0.3)',
              }}>
                {savedScenarios.map((s) => (
                  <button
                    key={s.id}
                    className="sm-saved-item"
                    onClick={() => loadSaved(s)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default ScenarioModeller;
