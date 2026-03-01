import React, { useState, useEffect, useRef } from 'react';
import { useNavigate }    from 'react-router-dom';
import { api }            from '../lib/api';
import { MetricCard }     from '../components/common/MetricCard';
import { SectionCard }    from '../components/common/SectionCard';
import { EmptyState }     from '../components/common/EmptyState';
import { ContextHint }    from '../components/common/ContextHint';
import { VerdictBadge }   from '../components/common/VerdictBadge';
import { LoadingState }   from '../components/common/LoadingState';
import { Toast }          from '../components/common/Toast';
import type { Verdict }   from '../components/common/VerdictBadge';

// ── Types ──────────────────────────────────────────────────────────────────────

type PortfolioStatus =
  | 'watching'
  | 'analysing'
  | 'negotiating'
  | 'purchased'
  | 'rejected';

interface PortfolioEntry {
  id:                string;
  title?:            string;
  city?:             string;
  status:            PortfolioStatus;
  price?:            number;
  gross_yield?:      number;
  days_listed?:      number;
  valuation?:        number;
  compact_analysis?: {
    verdict?:          Verdict;
    one_line_summary?: string;
  };
}

interface PortfolioAnalysis {
  report?:   string;
  created_at?: string;
  rankings?: Array<{
    property_id: string;
    rank:        number;
    reasoning:   string;
    priority:    string;
  }>;
}

interface PortfolioData {
  properties:          PortfolioEntry[];
  portfolio_analysis?: PortfolioAnalysis;
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** ~20% down payment + 9.5% closing costs (Grunderwerbsteuer + Notar + Makler) */
const EQUITY_RATE = 0.295;

const STATUS_TABS = [
  'all', 'watching', 'analysing', 'negotiating', 'purchased', 'rejected',
] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_CONFIG: Record<PortfolioStatus, { label: string; color: string; bg: string }> = {
  watching:    { label: 'Watching',    color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  analysing:   { label: 'Analysing',   color: 'var(--color-warning)', bg: 'var(--color-warning-bg)'  },
  negotiating: { label: 'Negotiating', color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  purchased:   { label: 'Purchased',   color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  rejected:    { label: 'Rejected',    color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
};

// ── Styles ────────────────────────────────────────────────────────────────────

const PAGE_STYLES = `
@keyframes immo-portfolio-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.portfolio-page {
  animation: immo-portfolio-fade-in 300ms ease forwards;
}
.portfolio-table-row td {
  background-color: transparent;
  transition: background-color 120ms;
}
.portfolio-table-row:hover td {
  background-color: var(--color-bg-subtle);
}
.portfolio-table-row {
  cursor: pointer;
}
@media (max-width: 768px) {
  .portfolio-stats-grid  { grid-template-columns: 1fr 1fr !important; }
  .portfolio-header      { flex-direction: column !important; gap: 12px !important; align-items: flex-start !important; }
  .portfolio-table-wrap  { display: none !important; }
  .portfolio-cards-wrap  { display: block !important; }
}
@media (min-width: 769px) {
  .portfolio-cards-wrap  { display: none; }
  .portfolio-table-wrap  { display: block; }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(n?: number): string {
  if (!n) return '—';
  return '€' + Math.round(n).toLocaleString('de-DE');
}

function daysAgo(isoDate?: string): number | null {
  if (!isoDate) return null;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

function gapPercent(price?: number, valuation?: number): number | null {
  if (!price || !valuation || valuation === 0) return null;
  return ((price - valuation) / valuation) * 100;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PortfolioStatus }) {
  const { label, color, bg } = STATUS_CONFIG[status];
  return (
    <span style={{
      display:         'inline-block',
      borderRadius:    6,
      padding:         '3px 10px',
      fontSize:        11,
      fontWeight:      600,
      letterSpacing:   '0.05em',
      textTransform:   'uppercase',
      fontFamily:      'var(--font-body)',
      color,
      backgroundColor: bg,
      border:          `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      whiteSpace:      'nowrap',
    }}>
      {label}
    </span>
  );
}

function YieldCell({ value }: { value?: number }) {
  if (value == null) return <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>—</span>;
  const color = value >= 6 ? 'var(--color-success)' : value >= 4 ? 'var(--color-warning)' : 'var(--color-danger)';
  return (
    <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
      {value.toFixed(2)}%
    </span>
  );
}

function GapCell({ price, valuation }: { price?: number; valuation?: number }) {
  const gap = gapPercent(price, valuation);
  if (gap === null) return <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>—</span>;
  const color = gap < 0
    ? 'var(--color-success)'
    : gap > 10 ? 'var(--color-danger)' : 'var(--color-warning)';
  return (
    <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
      {gap < 0 ? '' : '+'}{gap.toFixed(1)}%
    </span>
  );
}

// ── Actions dropdown ──────────────────────────────────────────────────────────

function ActionsMenu({
  propertyId,
  currentStatus,
  onStatusChange,
  onRemove,
}: {
  propertyId:     string;
  currentStatus:  PortfolioStatus;
  onStatusChange: (id: string, status: PortfolioStatus) => void;
  onRemove:       (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const otherStatuses = (Object.keys(STATUS_CONFIG) as PortfolioStatus[]).filter(
    s => s !== currentStatus,
  );

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
        aria-label="Property actions"
        style={{
          background:   'none',
          border:       '1px solid var(--color-border)',
          borderRadius: 6,
          padding:      '4px 8px',
          cursor:       'pointer',
          color:        'var(--color-text-muted)',
          fontSize:     16,
          lineHeight:   1,
          letterSpacing: 1,
        }}
      >
        ···
      </button>

      {open && (
        <div style={{
          position:        'absolute',
          right:           0,
          top:             'calc(100% + 4px)',
          zIndex:          200,
          backgroundColor: 'var(--color-bg-elevated)',
          border:          '1px solid var(--color-border)',
          borderRadius:    8,
          minWidth:        160,
          boxShadow:       '0 8px 24px rgba(0,0,0,0.35)',
          overflow:        'hidden',
        }}>
          <div style={{
            padding:       '6px 12px 4px',
            fontSize:      10,
            fontWeight:    600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         'var(--color-text-muted)',
            fontFamily:    'var(--font-body)',
          }}>
            Change Status
          </div>

          {otherStatuses.map(s => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); onStatusChange(propertyId, s); setOpen(false); }}
              style={{
                display:    'block',
                width:      '100%',
                textAlign:  'left',
                padding:    '8px 12px',
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                fontSize:   13,
                color:      'var(--color-text-secondary)',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-subtle)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}

          <div style={{ height: 1, backgroundColor: 'var(--color-border)', margin: '4px 0' }} />

          <button
            onClick={(e) => { e.stopPropagation(); onRemove(propertyId); setOpen(false); }}
            style={{
              display:    'block',
              width:      '100%',
              textAlign:  'left',
              padding:    '8px 12px',
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              fontSize:   13,
              color:      'var(--color-danger)',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ── PortfolioAnalysisReport ───────────────────────────────────────────────────

function PortfolioAnalysisReport({ analysis }: { analysis: PortfolioAnalysis }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {analysis.report && (
        <p style={{
          margin:     0,
          fontSize:   14,
          lineHeight: 1.7,
          color:      'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
          whiteSpace: 'pre-wrap',
        }}>
          {analysis.report}
        </p>
      )}

      {analysis.rankings && analysis.rankings.length > 0 && (
        <div>
          <p style={{
            margin:        '0 0 10px',
            fontSize:      11,
            fontWeight:    500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         'var(--color-text-secondary)',
            fontFamily:    'var(--font-body)',
          }}>
            Priority Ranking
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {analysis.rankings.map(r => (
              <div
                key={r.property_id}
                style={{
                  display:         'flex',
                  alignItems:      'flex-start',
                  gap:             12,
                  padding:         '12px 14px',
                  backgroundColor: 'var(--color-bg-elevated)',
                  borderRadius:    8,
                  border:          '1px solid var(--color-border)',
                }}
              >
                <span style={{
                  flexShrink:      0,
                  width:           24,
                  height:          24,
                  borderRadius:    '50%',
                  backgroundColor: 'var(--color-brand)',
                  color:           '#fff',
                  fontSize:        11,
                  fontWeight:      700,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  fontFamily:      'var(--font-mono)',
                }}>
                  {r.rank}
                </span>
                <div>
                  <span style={{
                    display:         'inline-block',
                    padding:         '2px 8px',
                    borderRadius:    4,
                    fontSize:        10,
                    fontWeight:      600,
                    textTransform:   'uppercase',
                    letterSpacing:   '0.06em',
                    backgroundColor: 'var(--color-brand-subtle)',
                    color:           'var(--color-brand)',
                    fontFamily:      'var(--font-body)',
                    marginBottom:    4,
                  }}>
                    {r.priority}
                  </span>
                  <p style={{
                    margin:     0,
                    fontSize:   13,
                    lineHeight: 1.5,
                    color:      'var(--color-text-secondary)',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {r.reasoning}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared table cell style ───────────────────────────────────────────────────

function cellStyle(isLast: boolean): React.CSSProperties {
  return {
    padding:      '14px 16px',
    borderBottom: isLast ? undefined : '1px solid var(--color-border)',
  };
}

// ── Main Page Component ───────────────────────────────────────────────────────

export function Portfolio() {
  const navigate = useNavigate();

  const [data,       setData]       = useState<PortfolioData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [analysing,  setAnalysing]  = useState(false);
  const [activeTab,  setActiveTab]  = useState<StatusTab>('all');
  const [toast,      setToast]      = useState<{ key: number; message: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const toastKeyRef = useRef(0);

  // ── Fetch ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await api.get<PortfolioData>('/api/portfolio');
      if (cancelled) return;
      if (result.data) setData(result.data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Toast helper ────────────────────────────────────────────────────────
  function showToast(message: string) {
    toastKeyRef.current += 1;
    setToast({ key: toastKeyRef.current, message });
  }

  // ── Derived values ──────────────────────────────────────────────────────
  const properties = data?.properties ?? [];
  const totalEquity = properties.reduce((sum, p) => sum + (p.price ?? 0) * EQUITY_RATE, 0);
  const totalCapital = properties.reduce((sum, p) => sum + (p.price ?? 0), 0);

  const yieldProps = properties.filter(p => p.gross_yield != null);
  const avgYield = yieldProps.length
    ? yieldProps.reduce((sum, p) => sum + (p.gross_yield ?? 0), 0) / yieldProps.length
    : null;
  const bestYield = properties.reduce<PortfolioEntry | null>((best, p) => {
    if (!best || (p.gross_yield ?? 0) > (best.gross_yield ?? 0)) return p;
    return best;
  }, null);

  const filtered = activeTab === 'all'
    ? properties
    : properties.filter(p => p.status === activeTab);

  const lastAnalysedDays = daysAgo(data?.portfolio_analysis?.created_at);

  // ── Actions ─────────────────────────────────────────────────────────────
  async function handleAnalysePortfolio() {
    if (analysing) return;
    setAnalysing(true);
    const result = await api.post<PortfolioAnalysis>('/api/analysis/portfolio', {});
    setAnalysing(false);
    if (result.data) {
      setData(prev => prev ? { ...prev, portfolio_analysis: result.data! } : prev);
      showToast('Portfolio analysis complete.');
    } else {
      showToast(result.error ?? 'Analysis failed. Please try again.');
    }
  }

  async function handleStatusChange(id: string, newStatus: PortfolioStatus) {
    const snapshot = data?.properties ?? [];
    setData(d => d
      ? { ...d, properties: d.properties.map(p => p.id === id ? { ...p, status: newStatus } : p) }
      : d,
    );
    const result = await api.patch(`/api/portfolio/${id}/status`, { status: newStatus });
    if (result.error) {
      setData(d => d ? { ...d, properties: snapshot } : d);
      showToast('Failed to update status.');
    } else {
      showToast('Status updated.');
    }
  }

  async function handleRemove(id: string) {
    const snapshot = data?.properties ?? [];
    setRemovingId(id);
    const result = await api.delete(`/api/portfolio/${id}`);
    setRemovingId(null);
    if (result.error) {
      showToast('Failed to remove property.');
    } else {
      setData(d => d ? { ...d, properties: d.properties.filter(p => p.id !== id) } : d);
      showToast('Property removed from portfolio.');
    }
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <LoadingState height={36} width="220px" />
          <div style={{ marginTop: 8 }}>
            <LoadingState height={18} width="340px" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[0, 1, 2, 3].map(i => <LoadingState key={i} height={96} />)}
        </div>
        <LoadingState height={280} />
      </div>
    );
  }

  // ── Empty portfolio ──────────────────────────────────────────────────────
  if (properties.length === 0) {
    return (
      <>
        <style>{PAGE_STYLES}</style>
        <div
          className="portfolio-page"
          style={{ padding: '32px 24px', maxWidth: 800, margin: '0 auto' }}
        >
          <h1 style={{
            margin:     '0 0 40px',
            fontSize:   32,
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            color:      'var(--color-text-primary)',
          }}>
            My Portfolio
          </h1>
          <EmptyState
            icon="🔖"
            title="Your portfolio is empty."
            description="Save a property to get an instant AI verdict — strong buy, worth analysing, or avoid. Takes one click."
            actionLabel="Browse Properties →"
            onAction={() => navigate('/properties')}
          />
          <p style={{
            marginTop:  12,
            textAlign:  'center',
            fontSize:   12,
            color:      'var(--color-text-muted)',
            fontFamily: 'var(--font-body)',
          }}>
            Properties you save appear here with AI analysis
          </p>
        </div>
        {toast && (
          <Toast key={toast.key} message={toast.message} onDone={() => setToast(null)} />
        )}
      </>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div
        className="portfolio-page"
        style={{
          padding:       '32px 24px',
          maxWidth:      1200,
          margin:        '0 auto',
          display:       'flex',
          flexDirection: 'column',
          gap:           24,
        }}
      >

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div
          className="portfolio-header"
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <div>
            <h1 style={{
              margin:     0,
              fontSize:   32,
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              color:      'var(--color-text-primary)',
              lineHeight: 1.2,
            }}>
              My Portfolio
            </h1>
            <p style={{
              margin:     '6px 0 0',
              fontSize:   14,
              color:      'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}>
              {properties.length} {properties.length === 1 ? 'property' : 'properties'} · Est. equity required: {fmtEur(totalEquity)}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {data?.portfolio_analysis && lastAnalysedDays !== null && (
              <p style={{
                margin:     0,
                fontSize:   12,
                color:      'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
              }}>
                Last analysed {lastAnalysedDays === 0 ? 'today' : `${lastAnalysedDays} day${lastAnalysedDays !== 1 ? 's' : ''} ago`}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Primary "Analyse Portfolio" button — shown when no analysis exists */}
              {!data?.portfolio_analysis && (
                <button
                  onClick={handleAnalysePortfolio}
                  disabled={analysing || properties.length < 2}
                  title={properties.length < 2 ? 'Add at least 2 properties to analyse your portfolio' : undefined}
                  style={{
                    padding:         '9px 20px',
                    backgroundColor: analysing || properties.length < 2
                      ? 'var(--color-bg-elevated)'
                      : 'var(--color-brand)',
                    color:           analysing || properties.length < 2
                      ? 'var(--color-text-muted)'
                      : '#fff',
                    border:          'none',
                    borderRadius:    8,
                    fontSize:        14,
                    fontWeight:      500,
                    fontFamily:      'var(--font-body)',
                    cursor:          analysing || properties.length < 2 ? 'default' : 'pointer',
                    whiteSpace:      'nowrap',
                  }}
                >
                  {analysing ? 'Immonator is reviewing your portfolio…' : 'Analyse Portfolio'}
                </button>
              )}

              {/* Ghost "Re-analyse" button — shown when analysis exists */}
              {data?.portfolio_analysis && (
                <button
                  onClick={handleAnalysePortfolio}
                  disabled={analysing}
                  style={{
                    padding:         '9px 16px',
                    backgroundColor: 'transparent',
                    color:           analysing ? 'var(--color-text-muted)' : 'var(--color-brand)',
                    border:          `1px solid ${analysing ? 'var(--color-border)' : 'var(--color-brand)'}`,
                    borderRadius:    8,
                    fontSize:        14,
                    fontWeight:      500,
                    fontFamily:      'var(--font-body)',
                    cursor:          analysing ? 'default' : 'pointer',
                    whiteSpace:      'nowrap',
                  }}
                >
                  {analysing ? 'Analysing…' : 'Re-analyse'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats Row ────────────────────────────────────────────────────── */}
        <div
          className="portfolio-stats-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
        >
          <MetricCard
            label="Properties Watching"
            value={properties.filter(p => p.status === 'watching').length}
            color="brand"
          />
          <MetricCard
            label="Avg Gross Yield"
            value={avgYield != null ? `${avgYield.toFixed(2)}%` : '—'}
            isMonospace
            color={
              avgYield == null ? 'default'
              : avgYield >= 6  ? 'success'
              : avgYield >= 4  ? 'warning'
              :                  'danger'
            }
          />
          <MetricCard
            label="Best Yield Property"
            value={bestYield?.title ?? bestYield?.city ?? '—'}
            context={bestYield?.gross_yield != null ? `${bestYield.gross_yield.toFixed(2)}% gross yield` : undefined}
            color="success"
          />
          <MetricCard
            label="Total Capital Est."
            value={fmtEur(totalCapital)}
            isMonospace
          />
        </div>

        {/* ── Portfolio Analysis Section ───────────────────────────────────── */}
        <SectionCard title="Portfolio Analysis" collapsible defaultOpen={false}>
          <ContextHint
            hintId="portfolio-analysis-tip"
            headline="Compare your shortlist"
            body="Analyse your portfolio to see which properties to prioritise and how to deploy your capital."
          />
          <div style={{ marginTop: 16 }}>
            {data?.portfolio_analysis ? (
              <PortfolioAnalysisReport analysis={data.portfolio_analysis} />
            ) : (
              <>
                <EmptyState
                  icon="📊"
                  title="Compare your shortlist."
                  description="Immonator ranks your saved properties and tells you which to prioritise and in what order to buy."
                  actionLabel={properties.length >= 2 ? 'Analyse My Portfolio' : undefined}
                  onAction={properties.length >= 2 ? handleAnalysePortfolio : undefined}
                />
                {properties.length < 2 && (
                  <p style={{
                    marginTop:  8,
                    textAlign:  'center',
                    fontSize:   12,
                    color:      'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)',
                  }}>
                    Add at least 2 properties to enable portfolio analysis
                  </p>
                )}
              </>
            )}
          </div>
        </SectionCard>

        {/* ── Status Filter Tabs ───────────────────────────────────────────── */}
        <div style={{
          display:      'flex',
          borderBottom: '1px solid var(--color-border)',
          overflowX:    'auto',
          gap:          0,
        }}>
          {STATUS_TABS.map(tab => {
            const count = tab === 'all'
              ? properties.length
              : properties.filter(p => p.status === tab).length;
            const label = tab === 'all'
              ? 'All'
              : STATUS_CONFIG[tab as PortfolioStatus].label;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding:      '10px 16px',
                  background:   'none',
                  border:       'none',
                  borderBottom: isActive ? '2px solid var(--color-brand)' : '2px solid transparent',
                  cursor:       'pointer',
                  fontSize:     13,
                  fontWeight:   isActive ? 600 : 400,
                  fontFamily:   'var(--font-body)',
                  color:        isActive ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                  whiteSpace:   'nowrap',
                  marginBottom: '-1px',
                  transition:   'color 150ms, border-color 150ms',
                }}
              >
                {label}{count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>

        {/* ── Filtered empty state ─────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <div style={{
            padding:         '40px 24px',
            textAlign:       'center',
            backgroundColor: 'var(--color-bg-surface)',
            border:          '1px solid var(--color-border)',
            borderRadius:    12,
            color:           'var(--color-text-muted)',
            fontSize:        14,
            fontFamily:      'var(--font-body)',
          }}>
            No properties with status "{activeTab === 'all' ? 'all' : STATUS_CONFIG[activeTab as PortfolioStatus].label}"
          </div>
        )}

        {/* ── Property Table (desktop) ─────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="portfolio-table-wrap">
            <div style={{
              backgroundColor: 'var(--color-bg-surface)',
              border:          '1px solid var(--color-border)',
              borderRadius:    12,
              overflow:        'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)' }}>
                <thead>
                  <tr>
                    {['Property', 'Status', 'Asking Price', 'AI Verdict', 'Gross Yield', 'Days Listed', 'Gap %', ''].map(col => (
                      <th key={col} style={{
                        padding:         '12px 16px',
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
                  {filtered.map((prop, idx) => {
                    const isLast = idx === filtered.length - 1;
                    return (
                      <tr
                        key={prop.id}
                        className="portfolio-table-row"
                        onClick={() => navigate(`/properties/${prop.id}`)}
                        style={{ opacity: removingId === prop.id ? 0.4 : 1, transition: 'opacity 200ms' }}
                      >
                        <td style={cellStyle(isLast)}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                            {prop.title ?? 'Untitled Property'}
                          </div>
                          {prop.city && (
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                              {prop.city}
                            </div>
                          )}
                        </td>
                        <td style={cellStyle(isLast)}>
                          <StatusBadge status={prop.status} />
                        </td>
                        <td style={{ ...cellStyle(isLast), fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                          {fmtEur(prop.price)}
                        </td>
                        <td style={cellStyle(isLast)}>
                          {prop.compact_analysis?.verdict
                            ? <VerdictBadge verdict={prop.compact_analysis.verdict} />
                            : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>
                          }
                        </td>
                        <td style={cellStyle(isLast)}>
                          <YieldCell value={prop.gross_yield} />
                        </td>
                        <td style={{ ...cellStyle(isLast), fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {prop.days_listed != null ? prop.days_listed : '—'}
                        </td>
                        <td style={cellStyle(isLast)}>
                          <GapCell price={prop.price} valuation={prop.valuation} />
                        </td>
                        <td style={cellStyle(isLast)} onClick={e => e.stopPropagation()}>
                          <ActionsMenu
                            propertyId={prop.id}
                            currentStatus={prop.status}
                            onStatusChange={handleStatusChange}
                            onRemove={handleRemove}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Property Cards (mobile) ──────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="portfolio-cards-wrap">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(prop => (
                <div
                  key={prop.id}
                  onClick={() => navigate(`/properties/${prop.id}`)}
                  style={{
                    backgroundColor: 'var(--color-bg-surface)',
                    border:          '1px solid var(--color-border)',
                    borderRadius:    12,
                    padding:         '16px',
                    cursor:          'pointer',
                    opacity:         removingId === prop.id ? 0.4 : 1,
                    transition:      'opacity 200ms',
                  }}
                >
                  {/* Card header: title + status badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                      <div style={{
                        fontSize:     14,
                        fontWeight:   600,
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
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                          {prop.city}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={prop.status} />
                  </div>

                  {/* Data pills: price, yield, gap */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: 'Price',     content: <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{fmtEur(prop.price)}</span> },
                      { label: 'Yield',     content: <YieldCell value={prop.gross_yield} /> },
                      { label: 'Gap',       content: <GapCell price={prop.price} valuation={prop.valuation} /> },
                    ].map(({ label, content }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: 3 }}>
                          {label}
                        </div>
                        {content}
                      </div>
                    ))}
                  </div>

                  {/* Footer: verdict badge + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {prop.compact_analysis?.verdict
                      ? <VerdictBadge verdict={prop.compact_analysis.verdict} />
                      : <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>No analysis yet</span>
                    }
                    <div onClick={e => e.stopPropagation()}>
                      <ActionsMenu
                        propertyId={prop.id}
                        currentStatus={prop.status}
                        onStatusChange={handleStatusChange}
                        onRemove={handleRemove}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {toast && (
        <Toast key={toast.key} message={toast.message} onDone={() => setToast(null)} />
      )}
    </>
  );
}

export default Portfolio;
