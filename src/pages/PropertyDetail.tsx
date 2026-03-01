import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { EmptyState }   from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { MetricCard }   from '../components/common/MetricCard';
import { ContextHint }  from '../components/common/ContextHint';
import { VerdictBadge, type Verdict } from '../components/common/VerdictBadge';
import { Toast }        from '../components/common/Toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PriceHistoryEntry { date: string; price: number; }

interface CompactAnalysis {
  verdict?:          Verdict;
  one_line_summary?: string;
  ertragswert?:      number;
  sachwert?:         number;
}

interface NegotiateBrief {
  recommended_offer:   number;
  walk_away_price:     number;
  strategy:            string;
  leverage_points:     string[];
  talking_points_de:   string[];
  talking_points_en:   string[];
  offer_letter_draft:  string;
}

interface PropertyDetail {
  id:                   string;
  url:                  string;
  title?:               string;
  price?:               number;
  area_sqm?:            number;
  rooms?:               number;
  year_built?:          number;
  city?:                string;
  zip_code?:            string;
  district?:            string;
  address?:             string;
  images?:              string[];
  image_url?:           string;
  gross_yield?:         number;
  net_yield?:           number;
  cap_rate?:            number;
  price_per_sqm?:       number;
  days_listed?:         number;
  monthly_rent?:        number;
  description?:         string;
  floor?:               number | string;
  heating?:             string;
  condition?:           string;
  energy_class?:        string;
  balcony?:             boolean;
  garden?:              boolean;
  parking?:             boolean;
  cellar?:              boolean;
  price_history?:       PriceHistoryEntry[];
  price_reductions?:    number;
  price_reduction_total?: number;
  bodenrichtwert?:      number;
  compact_analysis?:    CompactAnalysis;
  negotiate_brief?:     NegotiateBrief;
  is_watched?:          boolean;
  property_type?:       string;
}

type TabId = 'overview' | 'analysis' | 'scenarios' | 'negotiate';

// ── Constants ─────────────────────────────────────────────────────────────────

const VERDICT_LABELS: Record<Verdict, string> = {
  strong_buy:           'Strong Buy',
  worth_analysing:      'Worth Analysing',
  proceed_with_caution: 'Proceed with Caution',
  avoid:                'Avoid',
};

const VERDICT_COLORS: Record<Verdict, string> = {
  strong_buy:           'var(--color-success)',
  worth_analysing:      'var(--color-brand)',
  proceed_with_caution: 'var(--color-warning)',
  avoid:                'var(--color-danger)',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const DETAIL_STYLES = `
.pd-layout {
  display: block;
}
.pd-right-desktop {
  display: none;
}
.pd-right-mobile {
  display: block;
  margin-top: 24px;
}
.pd-tab-bar {
  position: sticky;
  top: 56px;
  z-index: 10;
  background: var(--color-bg-base);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  gap: 0;
  margin: 24px -16px 0;
  padding: 0 16px;
  overflow-x: auto;
  scrollbar-width: none;
}
.pd-tab-bar::-webkit-scrollbar { display: none; }
.pd-tab-btn {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 12px 16px;
  font-size: 14px;
  font-family: var(--font-body);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: color 150ms, border-color 150ms;
}
.pd-tab-btn:hover {
  color: var(--color-text-primary);
}
.pd-tab-btn--active {
  color: var(--color-brand);
  border-bottom-color: var(--color-brand);
}
.pd-features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}
.pd-valuation-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
}
.pd-valuation-row:last-child {
  border-bottom: none;
}
.pd-yield-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.pd-sidebar-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 12px;
}
.pd-sidebar-card:last-child { margin-bottom: 0; }
.pd-divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 20px 0;
}
.pd-talking-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 12px;
}
@media (min-width: 768px) {
  .pd-layout {
    display: grid;
    grid-template-columns: 65% 35%;
    gap: 32px;
    align-items: start;
  }
  .pd-right-desktop {
    display: block;
    position: sticky;
    top: 72px;
    align-self: start;
  }
  .pd-right-mobile { display: none; }
  .pd-tab-bar {
    margin: 24px 0 0;
    padding: 0;
  }
}
@media (max-width: 500px) {
  .pd-features-grid { grid-template-columns: 1fr; }
  .pd-talking-grid  { grid-template-columns: 1fr; }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return `€ ${n.toLocaleString('de-DE')}`;
}
function fmtPriceSqm(n: number) {
  return `€ ${n.toLocaleString('de-DE')}/m²`;
}
function vsAsking(val: number, asking: number): { text: string; color: string } {
  const pct = ((val - asking) / asking) * 100;
  return {
    text:  `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    color: pct < 0 ? 'var(--color-success)' : 'var(--color-danger)',
  };
}
function boolFeature(val: boolean | undefined): string {
  if (val === undefined) return '—';
  return val ? 'Yes' : 'No';
}

// ── Stub Components ────────────────────────────────────────────────────────────
// These will be replaced with real implementations as they are built.

function StubCard({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div style={{
      background:   'var(--color-bg-surface)',
      border:       '1px solid var(--color-border)',
      borderRadius: 12,
      padding:      '24px',
      display:      'flex',
      alignItems:   'center',
      gap:          16,
    }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginTop: 2 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function CompactAnalysisCard({ propertyId }: { propertyId: string }) {
  void propertyId;
  return (
    <StubCard
      icon="🤖"
      label="Compact Analysis"
      sub="AI-powered quick verdict — component coming soon"
    />
  );
}

function DeepAnalysisReport({ propertyId }: { propertyId: string }) {
  void propertyId;
  return (
    <StubCard
      icon="📋"
      label="Deep Analysis Report"
      sub="Full risk assessment and offer price recommendation — component coming soon"
    />
  );
}

function MarketAnalysisCard({ city }: { city: string }) {
  return (
    <StubCard
      icon="🗺"
      label={`Market Analysis · ${city}`}
      sub="Comparable sales, price trends, and supply/demand — component coming soon"
    />
  );
}

function ScenarioModeller({
  propertyId,
  askingPrice,
  monthlyRent,
}: {
  propertyId:   string;
  askingPrice:  number;
  monthlyRent:  number;
}) {
  void propertyId; void askingPrice; void monthlyRent;
  return (
    <StubCard
      icon="📐"
      label="Scenario Modeller"
      sub="Adjust purchase price, rent, vacancy, and leverage — component coming soon"
    />
  );
}

function AnalysisChat({
  contextType,
  contextId,
  title,
}: {
  contextType: string;
  contextId:   string;
  title:       string;
}) {
  void contextType; void contextId;
  return (
    <div style={{
      background:   'var(--color-bg-surface)',
      border:       '1px solid var(--color-border)',
      borderRadius: 12,
      padding:      '20px 24px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', marginBottom: 4 }}>
        Ask about {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
        AI chat context — component coming soon
      </div>
    </div>
  );
}

// ── Image Gallery ─────────────────────────────────────────────────────────────

function ImageGallery({
  images,
  city,
  propertyType,
}: {
  images:       string[];
  city?:        string;
  propertyType?: string;
}) {
  const [selected, setSelected] = useState(0);
  const safeIdx = Math.min(selected, images.length - 1);

  const mainSrc = images[safeIdx];

  return (
    <div>
      {/* Main image */}
      <div style={{
        width:        '100%',
        height:       400,
        borderRadius: 12,
        overflow:     'hidden',
        background:   'linear-gradient(135deg, var(--color-bg-subtle) 0%, var(--color-bg-elevated) 100%)',
        flexShrink:   0,
      }}>
        {mainSrc ? (
          <img
            src={mainSrc}
            alt="Property main"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width:          '100%',
            height:         '100%',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            8,
          }}>
            <span style={{ fontSize: 52 }}>🏢</span>
            <div style={{
              fontSize:   14,
              fontWeight: 500,
              color:      'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
              textAlign:  'center',
            }}>
              {[city, propertyType].filter(Boolean).join(' · ') || 'Property'}
            </div>
          </div>
        )}
      </div>

      {/* Thumbnails — only when >1 image */}
      {images.length > 1 && (
        <div style={{
          display:        'flex',
          gap:            8,
          marginTop:      10,
          overflowX:      'auto',
          scrollbarWidth: 'none',
          paddingBottom:  2,
        }}>
          {images.slice(0, 5).map((src, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              style={{
                flexShrink:  0,
                width:       80,
                height:      56,
                borderRadius: 8,
                overflow:    'hidden',
                border:      `2px solid ${i === safeIdx ? 'var(--color-brand)' : 'transparent'}`,
                cursor:      'pointer',
                padding:     0,
                background:  'var(--color-bg-elevated)',
                transition:  'border-color 150ms',
              }}
            >
              <img
                src={src}
                alt={`View ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Property Header ───────────────────────────────────────────────────────────

function SpecPill({ label }: { label: string }) {
  return (
    <span style={{
      display:         'inline-block',
      background:      'var(--color-bg-elevated)',
      color:           'var(--color-text-secondary)',
      borderRadius:    6,
      padding:         '3px 10px',
      fontSize:        12,
      fontFamily:      'var(--font-body)',
      whiteSpace:      'nowrap',
    }}>
      {label}
    </span>
  );
}

function PropertyHeader({ property }: { property: PropertyDetail }) {
  const {
    price, price_per_sqm, title, address, city, zip_code, district,
    area_sqm, rooms, year_built, floor, heating,
  } = property;

  const location = [address, [zip_code, city].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ') || [district, city].filter(Boolean).join(', ');

  const pills: string[] = [
    area_sqm    !== undefined ? `${area_sqm} m²`         : '',
    rooms       !== undefined ? `${rooms} Zimmer`         : '',
    year_built  !== undefined ? `Baujahr ${year_built}`  : '',
    floor       !== undefined ? `${floor}. OG`           : '',
    heating                   ? heating                  : '',
  ].filter(Boolean);

  return (
    <div style={{ marginTop: 20 }}>
      {/* Price row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize:   40,
          fontWeight: 400,
          color:      'var(--color-text-primary)',
          lineHeight: 1.1,
        }}>
          {price ? fmtPrice(price) : '—'}
        </span>
        {price_per_sqm !== undefined && (
          <span style={{
            fontSize:   14,
            fontFamily: 'var(--font-mono)',
            color:      'var(--color-text-secondary)',
          }}>
            {fmtPriceSqm(price_per_sqm)}
          </span>
        )}
      </div>

      {/* Title */}
      {title && (
        <div style={{
          marginTop:  8,
          fontSize:   18,
          fontWeight: 600,
          color:      'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
          lineHeight: 1.4,
        }}>
          {title}
        </div>
      )}

      {/* Address */}
      {location && (
        <div style={{
          marginTop:  4,
          fontSize:   14,
          color:      'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
          {location}
        </div>
      )}

      {/* Spec pills */}
      {pills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {pills.map((p) => <SpecPill key={p} label={p} />)}
        </div>
      )}
    </div>
  );
}

// ── Price History Chart ───────────────────────────────────────────────────────

function PriceHistoryChart({ data }: { data: PriceHistoryEntry[] }) {
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  if (data.length < 2) return null;

  const W = 560, H = 140;
  const PAD = { top: 10, right: 8, bottom: 28, left: 70 };
  const IW = W - PAD.left - PAD.right;
  const IH = H - PAD.top - PAD.bottom;

  const prices = data.map((d) => d.price);
  const minP   = Math.min(...prices);
  const maxP   = Math.max(...prices);
  const pRange = maxP - minP || maxP * 0.1 || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * IW;
  const toY = (p: number) => PAD.top + IH - ((p - minP) / pRange) * IH;

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.price).toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${toX(data.length - 1).toFixed(1)} ${(PAD.top + IH).toFixed(1)} L ${PAD.left.toFixed(1)} ${(PAD.top + IH).toFixed(1)} Z`;

  function fmtDate(d: string) {
    try {
      return new Date(d).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
    } catch {
      return d.slice(0, 7);
    }
  }

  const yTicks = [minP, (minP + maxP) / 2, maxP];

  // X-axis: show first, last, and up to 2 middle labels
  const xLabelIdxs = new Set<number>([0, data.length - 1]);
  if (data.length > 3) xLabelIdxs.add(Math.round(data.length / 3));
  if (data.length > 5) xLabelIdxs.add(Math.round((2 * data.length) / 3));

  const tooltip = tooltipIdx !== null ? data[tooltipIdx] : null;
  const ttX     = tooltipIdx !== null ? toX(tooltipIdx) : 0;
  const ttY     = tooltip ? toY(tooltip.price) : 0;
  const ttLeft  = ttX > W * 0.65;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setTooltipIdx(null)}
      >
        <defs>
          <linearGradient id="pd-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--color-brand)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0"   />
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PAD.left} x2={W - PAD.right}
              y1={toY(tick)} y2={toY(tick)}
              stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3 3"
            />
            <text
              x={PAD.left - 6} y={toY(tick)}
              textAnchor="end" dominantBaseline="middle"
              fontSize={9} fill="var(--color-text-muted)" fontFamily="var(--font-mono)"
            >
              {(tick / 1000).toFixed(0)}k
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {data.map((d, i) =>
          xLabelIdxs.has(i) ? (
            <text
              key={i}
              x={toX(i)} y={H - 5}
              textAnchor="middle"
              fontSize={9} fill="var(--color-text-muted)" fontFamily="var(--font-mono)"
            >
              {fmtDate(d.date)}
            </text>
          ) : null,
        )}

        {/* Area */}
        <path d={areaD} fill="url(#pd-area-grad)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points + hover targets */}
        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={toX(i)} cy={toY(d.price)}
              r={tooltipIdx === i ? 4 : 3}
              fill={tooltipIdx === i ? 'var(--color-brand)' : 'var(--color-bg-surface)'}
              stroke="var(--color-brand)"
              strokeWidth={2}
            />
            <rect
              x={toX(i) - 14} y={PAD.top}
              width={28} height={IH}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setTooltipIdx(i)}
            />
          </g>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <line
              x1={ttX} x2={ttX}
              y1={PAD.top} y2={PAD.top + IH}
              stroke="var(--color-border-strong)" strokeWidth={1} strokeDasharray="3 2"
            />
            <rect
              x={ttLeft ? ttX - 102 : ttX + 8} y={ttY - 26}
              width={94} height={40}
              rx={5}
              fill="var(--color-bg-elevated)" stroke="var(--color-border)" strokeWidth={1}
            />
            <text
              x={ttLeft ? ttX - 102 + 8 : ttX + 16} y={ttY - 12}
              fontSize={9} fill="var(--color-text-muted)" fontFamily="var(--font-mono)"
            >
              {fmtDate(tooltip.date)}
            </text>
            <text
              x={ttLeft ? ttX - 102 + 8 : ttX + 16} y={ttY + 5}
              fontSize={10} fill="var(--color-text-primary)" fontFamily="var(--font-mono)" fontWeight="600"
            >
              € {tooltip.price.toLocaleString('de-DE')}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ property }: { property: PropertyDetail }) {
  const [expanded, setExpanded] = useState(false);

  const features: { icon: string; label: string; value: string }[] = [
    { icon: '🏷',  label: 'Condition',     value: property.condition    ?? '—' },
    { icon: '🔥',  label: 'Heating',       value: property.heating      ?? '—' },
    { icon: '⚡',  label: 'Energy Class',  value: property.energy_class ?? '—' },
    { icon: '🏢',  label: 'Floor',         value: property.floor !== undefined ? String(property.floor) : '—' },
    { icon: '🌿',  label: 'Balcony',       value: boolFeature(property.balcony)  },
    { icon: '🌱',  label: 'Garden',        value: boolFeature(property.garden)   },
    { icon: '🚗',  label: 'Parking',       value: boolFeature(property.parking)  },
    { icon: '📦',  label: 'Cellar',        value: boolFeature(property.cellar)   },
  ];

  const desc = property.description ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Description */}
      {desc && (
        <div>
          <div
            style={{
              fontSize:          14,
              lineHeight:        1.7,
              color:             'var(--color-text-secondary)',
              fontFamily:        'var(--font-body)',
              display:           expanded ? 'block' : '-webkit-box',
              WebkitLineClamp:   expanded ? undefined : 3,
              WebkitBoxOrient:   'vertical' as const,
              overflow:          expanded ? 'visible' : 'hidden',
            }}
          >
            {desc}
          </div>
          {desc.length > 200 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                background:      'none',
                border:          'none',
                color:           'var(--color-brand)',
                fontSize:        13,
                fontFamily:      'var(--font-body)',
                cursor:          'pointer',
                padding:         '4px 0',
                marginTop:       4,
                textDecoration:  'underline',
              }}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Features grid */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', marginBottom: 4 }}>
          Property Features
        </div>
        <div className="pd-features-grid">
          {features.map(({ icon, label, value }) => (
            <div
              key={label}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          10,
                padding:      '10px 12px',
                background:   'var(--color-bg-elevated)',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', fontWeight: 500, marginTop: 1 }}>
                  {value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price history */}
      {(property.price_history ?? []).length > 1 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', marginBottom: 8 }}>
            Price History
          </div>
          <PriceHistoryChart data={property.price_history!} />
        </div>
      )}
    </div>
  );
}

// ── AI Analysis Tab ───────────────────────────────────────────────────────────

function AIAnalysisTab({ property }: { property: PropertyDetail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ContextHint
        hintId="deep-analysis-tip"
        headline="Want the full picture?"
        body="Run Deep Analysis for risk assessment and recommended offer price."
      />

      <CompactAnalysisCard propertyId={property.id} />
      <hr className="pd-divider" />
      <DeepAnalysisReport propertyId={property.id} />
      <hr className="pd-divider" />
      <MarketAnalysisCard city={property.city ?? ''} />
    </div>
  );
}

// ── Scenarios Tab ─────────────────────────────────────────────────────────────

const SCENARIO_HINT_KEY = 'immo_hint_scenario-modeller-tip_dismissed';

function ScenariosHint() {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(SCENARIO_HINT_KEY) !== 'true'; } catch { return false; }
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setFading(true), 7800);
    const t2 = setTimeout(() => {
      setVisible(false);
      try { localStorage.setItem(SCENARIO_HINT_KEY, 'true'); } catch {}
    }, 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible]);

  function handleDismiss() {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      try { localStorage.setItem(SCENARIO_HINT_KEY, 'true'); } catch {}
    }, 200);
  }

  if (!visible) return null;

  return (
    <div
      role="note"
      style={{
        backgroundColor: 'var(--color-brand-subtle)',
        borderLeft:      '3px solid var(--color-brand)',
        borderRadius:    '8px',
        padding:         '12px 16px',
        display:         'flex',
        alignItems:      'flex-start',
        gap:             '12px',
        opacity:         fading ? 0 : 1,
        transition:      'opacity 200ms',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-brand)', fontFamily: 'var(--font-body)', marginBottom: 2 }}>
          Adjust to model your scenario
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
          Immonator recalculates cashflow instantly. AI commentary updates every few seconds as you move the sliders.
        </div>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss hint"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 18, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

function ScenariosTab({ property }: { property: PropertyDetail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ScenariosHint />
      <ScenarioModeller
        propertyId={property.id}
        askingPrice={property.price ?? 0}
        monthlyRent={property.monthly_rent ?? 0}
      />
    </div>
  );
}

// ── Negotiate Tab ─────────────────────────────────────────────────────────────

function NegotiateTab({
  property,
  onGenerate,
  generating,
}: {
  property:   PropertyDetail;
  onGenerate: () => void;
  generating: boolean;
}) {
  const brief = property.negotiate_brief;
  const [offerExpanded, setOfferExpanded] = useState(false);

  if (!brief) {
    return (
      <EmptyState
        icon="🤝"
        title="Know your number before you offer."
        description="Immonator calculates an opening offer, walk-away price, and talking points in German and English."
        actionLabel={generating ? 'Generating…' : 'Generate Negotiation Brief'}
        onAction={generating ? undefined : onGenerate}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Recommended offer */}
      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
          Recommended Opening Offer
        </div>
        <div style={{ fontSize: 36, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-success)', marginTop: 6 }}>
          {fmtPrice(brief.recommended_offer)}
        </div>
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
          Walk-away price:{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-warning)' }}>
            {fmtPrice(brief.walk_away_price)}
          </span>
        </div>
      </div>

      {/* Strategy badge */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: 6 }}>
          Negotiation Strategy
        </div>
        <span style={{
          display:      'inline-block',
          background:   'var(--color-brand-subtle)',
          color:        'var(--color-brand)',
          borderRadius: 6,
          padding:      '5px 14px',
          fontSize:     13,
          fontWeight:   600,
          fontFamily:   'var(--font-body)',
          border:       '1px solid var(--color-brand)',
        }}>
          {brief.strategy}
        </span>
      </div>

      {/* Leverage points */}
      {brief.leverage_points.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: 8 }}>
            Leverage Points
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {brief.leverage_points.map((pt, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--color-brand)', flexShrink: 0 }}>›</span>
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Talking points */}
      {(brief.talking_points_de.length > 0 || brief.talking_points_en.length > 0) && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: 8 }}>
            Talking Points
          </div>
          <div className="pd-talking-grid">
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: 6, fontWeight: 500 }}>Deutsch</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {brief.talking_points_de.map((pt, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5, paddingLeft: 12, borderLeft: '2px solid var(--color-border-strong)' }}>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginBottom: 6, fontWeight: 500 }}>English</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {brief.talking_points_en.map((pt, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5, paddingLeft: 12, borderLeft: '2px solid var(--color-border-strong)' }}>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Offer letter draft — expandable */}
      {brief.offer_letter_draft && (
        <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 10, overflow: 'hidden' }}>
          <button
            onClick={() => setOfferExpanded((v) => !v)}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              width:          '100%',
              background:     'none',
              border:         'none',
              padding:        '12px 16px',
              cursor:         'pointer',
              fontFamily:     'var(--font-body)',
              fontSize:       13,
              fontWeight:     600,
              color:          'var(--color-text-primary)',
            }}
          >
            Offer Letter Draft
            <span style={{ transform: offerExpanded ? 'rotate(180deg)' : undefined, transition: 'transform 200ms', display: 'inline-block', fontSize: 10, color: 'var(--color-text-muted)' }}>▾</span>
          </button>
          {offerExpanded && (
            <div style={{ padding: '0 16px 16px' }}>
              <pre style={{
                margin:      0,
                fontSize:    12,
                fontFamily:  'var(--font-mono)',
                color:       'var(--color-text-secondary)',
                whiteSpace:  'pre-wrap',
                lineHeight:  1.6,
              }}>
                {brief.offer_letter_draft}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',   label: 'Overview'   },
  { id: 'analysis',   label: 'AI Analysis' },
  { id: 'scenarios',  label: 'Scenarios'  },
  { id: 'negotiate',  label: 'Negotiate'  },
];

function TabBar({ activeTab, onTabChange, tabBarRef }: {
  activeTab:  TabId;
  onTabChange: (id: TabId) => void;
  tabBarRef:   React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={tabBarRef} className="pd-tab-bar">
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          className={`pd-tab-btn${activeTab === id ? ' pd-tab-btn--active' : ''}`}
          onClick={() => onTabChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Valuation Card ────────────────────────────────────────────────────────────

function ValuationCard({ property }: { property: PropertyDetail }) {
  const ca = property.compact_analysis;
  const asking       = property.price;
  const ertragswert  = ca?.ertragswert;
  const sachwert     = ca?.sachwert;

  if (!asking || (!ertragswert && !sachwert)) return null;

  const avg = ertragswert && sachwert
    ? (ertragswert + sachwert) / 2
    : ertragswert ?? sachwert!;

  const rows: { label: string; value: number; highlight?: boolean }[] = [
    ...(ertragswert ? [{ label: 'Ertragswert', value: ertragswert }] : []),
    ...(sachwert    ? [{ label: 'Sachwert',    value: sachwert    }] : []),
    { label: 'Avg Valuation', value: avg, highlight: true },
  ];

  // Bar proportions — anchor to 0, show relative positions
  const minVal = Math.min(...rows.map((r) => r.value), asking) * 0.97;
  const maxVal = Math.max(...rows.map((r) => r.value), asking) * 1.03;
  const range  = maxVal - minVal || 1;
  const avgPct    = ((avg    - minVal) / range) * 100;
  const askingPct = ((asking - minVal) / range) * 100;
  const gapFraction = Math.abs(asking - avg) / asking * 100;
  const gapColor = gapFraction > 15 ? 'var(--color-danger)' : 'var(--color-warning)';

  return (
    <div className="pd-sidebar-card">
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', marginBottom: 12 }}>
        Valuation
      </div>

      {/* Rows */}
      {rows.map(({ label, value, highlight }) => {
        const { text, color } = vsAsking(value, asking);
        return (
          <div
            key={label}
            className="pd-valuation-row"
            style={{
              background: highlight ? 'var(--color-bg-elevated)' : undefined,
              borderRadius: highlight ? 6 : undefined,
              padding: highlight ? '10px 8px' : undefined,
              margin: highlight ? '0 -8px' : undefined,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontWeight: highlight ? 600 : 400 }}>
              {label}
            </span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', fontWeight: highlight ? 700 : 400 }}>
              {fmtPrice(value)}
            </span>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color, textAlign: 'right', minWidth: 42 }}>
              {text}
            </span>
          </div>
        );
      })}

      {/* Visual bar */}
      <div style={{ marginTop: 14 }}>
        <div style={{
          width:        '100%',
          height:       8,
          borderRadius: 4,
          background:   'var(--color-bg-elevated)',
          position:     'relative',
          overflow:     'hidden',
        }}>
          {/* Valuation fill */}
          <div style={{
            position:     'absolute',
            left:         0,
            top:          0,
            bottom:       0,
            width:        `${Math.min(avgPct, 100)}%`,
            background:   'var(--color-text-muted)',
            borderRadius: '4px 0 0 4px',
          }} />
          {/* Gap to asking */}
          {asking > avg && (
            <div style={{
              position:     'absolute',
              top:          0,
              bottom:       0,
              left:         `${Math.min(avgPct, 100)}%`,
              width:        `${Math.max(0, Math.min(askingPct - avgPct, 100 - avgPct))}%`,
              background:   gapColor,
              borderRadius: '0 4px 4px 0',
            }} />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>Valuation</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>Asking</span>
        </div>
      </div>
    </div>
  );
}

// ── Yield Card ────────────────────────────────────────────────────────────────

function YieldCard({ property }: { property: PropertyDetail }) {
  const { gross_yield, net_yield, cap_rate, price_per_sqm } = property;

  if (!gross_yield && !net_yield && !cap_rate && !price_per_sqm) return null;

  function yieldColor(y?: number): 'success' | 'warning' | 'default' {
    if (y === undefined) return 'default';
    if (y >= 5) return 'success';
    if (y >= 4) return 'warning';
    return 'default';
  }

  return (
    <div className="pd-sidebar-card">
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', marginBottom: 12 }}>
        Yield &amp; Returns
      </div>
      <div className="pd-yield-grid">
        <MetricCard
          label="Gross Yield"
          value={gross_yield !== undefined ? `${gross_yield.toFixed(1)}%` : '—'}
          color={yieldColor(gross_yield)}
          isMonospace
        />
        <MetricCard
          label="Net Yield"
          value={net_yield !== undefined ? `${net_yield.toFixed(1)}%` : '—'}
          color={yieldColor(net_yield)}
          isMonospace
        />
        <MetricCard
          label="Cap Rate"
          value={cap_rate !== undefined ? `${cap_rate.toFixed(1)}%` : '—'}
          color={yieldColor(cap_rate)}
          isMonospace
        />
        <MetricCard
          label="€/SQM"
          value={price_per_sqm !== undefined ? price_per_sqm.toLocaleString('de-DE') : '—'}
          isMonospace
        />
      </div>
    </div>
  );
}

// ── Market Data Card ──────────────────────────────────────────────────────────

function MarketDataCard({ property }: { property: PropertyDetail }) {
  const { bodenrichtwert, days_listed, price_reductions, price_reduction_total } = property;

  if (!bodenrichtwert && days_listed === undefined && !price_reductions) return null;

  const daysColor =
    days_listed === undefined
      ? 'var(--color-text-primary)'
      : days_listed > 60
      ? 'var(--color-danger)'
      : days_listed > 30
      ? 'var(--color-warning)'
      : 'var(--color-text-primary)';

  const reductionText =
    price_reductions && price_reductions > 0
      ? `${price_reductions} (${price_reduction_total ? fmtPrice(price_reduction_total) + ' total' : 'amount unknown'})`
      : 'None';

  const rows = [
    ...(bodenrichtwert !== undefined
      ? [{ label: 'Bodenrichtwert', value: fmtPriceSqm(bodenrichtwert), color: 'var(--color-text-primary)' }]
      : []),
    ...(days_listed !== undefined
      ? [{ label: 'Days Listed', value: `${days_listed} days`, color: daysColor }]
      : []),
    ...(price_reductions !== undefined
      ? [{ label: 'Price Reductions', value: reductionText, color: 'var(--color-text-primary)' }]
      : []),
  ];

  return (
    <div className="pd-sidebar-card">
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', marginBottom: 10 }}>
        Market Data
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>{label}</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color, textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

function QuickActions({
  property,
  isSaved,
  onSave,
  onDeepAnalysis,
  onNegotiate,
  generating,
}: {
  property:       PropertyDetail;
  isSaved:        boolean;
  onSave:         () => void;
  onDeepAnalysis: () => void;
  onNegotiate:    () => void;
  generating:     boolean;
}) {
  const [deepHovered, setDeepHovered] = useState(false);

  const btnBase: React.CSSProperties = {
    display:      'block',
    width:        '100%',
    height:       48,
    borderRadius: 10,
    fontSize:     14,
    fontWeight:   600,
    fontFamily:   'var(--font-body)',
    cursor:       'pointer',
    border:       'none',
    transition:   'background 150ms, color 150ms',
    marginBottom: 8,
  };

  return (
    <div className="pd-sidebar-card" style={{ position: 'relative' }}>
      {/* Save to Portfolio */}
      <button
        onClick={onSave}
        disabled={isSaved}
        style={{
          ...btnBase,
          background: isSaved ? 'var(--color-success-bg)' : 'var(--color-brand)',
          color:      isSaved ? 'var(--color-success)' : '#fff',
          cursor:     isSaved ? 'default' : 'pointer',
        }}
      >
        {isSaved ? '✓ Saved' : '♡ Save to Portfolio'}
      </button>

      {/* Run Deep Analysis */}
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setDeepHovered(true)}
        onMouseLeave={() => setDeepHovered(false)}
      >
        <button
          onClick={onDeepAnalysis}
          disabled={!isSaved}
          style={{
            ...btnBase,
            background: !isSaved ? 'var(--color-bg-elevated)' : 'var(--color-bg-surface)',
            color:      !isSaved ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            border:     '1px solid var(--color-border)',
            cursor:     !isSaved ? 'not-allowed' : 'pointer',
          }}
        >
          Run Deep Analysis
        </button>
        {!isSaved && deepHovered && (
          <div style={{
            position:     'absolute',
            bottom:       '100%',
            left:         '50%',
            transform:    'translateX(-50%)',
            marginBottom: 6,
            background:   'var(--color-bg-elevated)',
            border:       '1px solid var(--color-border-strong)',
            borderRadius: 6,
            padding:      '5px 10px',
            fontSize:     11,
            fontFamily:   'var(--font-body)',
            color:        'var(--color-text-secondary)',
            whiteSpace:   'nowrap',
            zIndex:       20,
            pointerEvents: 'none',
          }}>
            Save property first
          </div>
        )}
      </div>

      {/* Generate Negotiation Brief */}
      <button
        onClick={onNegotiate}
        disabled={generating}
        style={{
          ...btnBase,
          background: 'var(--color-bg-surface)',
          color:      generating ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
          border:     '1px solid var(--color-border)',
          cursor:     generating ? 'not-allowed' : 'pointer',
          marginBottom: 0,
        }}
      >
        {generating ? 'Generating…' : 'Generate Negotiation Brief'}
      </button>
    </div>
  );
}

// ── Sidebar Content ───────────────────────────────────────────────────────────

function SidebarContent({
  property,
  isSaved,
  onSave,
  onDeepAnalysis,
  onNegotiate,
  generating,
}: {
  property:       PropertyDetail;
  isSaved:        boolean;
  onSave:         () => void;
  onDeepAnalysis: () => void;
  onNegotiate:    () => void;
  generating:     boolean;
}) {
  return (
    <div>
      <ValuationCard property={property} />
      <YieldCard property={property} />
      <MarketDataCard property={property} />
      <QuickActions
        property={property}
        isSaved={isSaved}
        onSave={onSave}
        onDeepAnalysis={onDeepAnalysis}
        onNegotiate={onNegotiate}
        generating={generating}
      />
    </div>
  );
}

// ── Page Skeleton ─────────────────────────────────────────────────────────────

function PropertyDetailSkeleton() {
  return (
    <div>
      <LoadingState height={400} borderRadius={12} />
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <LoadingState height={44} width="45%" />
        <LoadingState height={22} width="70%" />
        <LoadingState height={16} width="55%" />
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {[60, 80, 100, 72, 90].map((w, i) => (
            <LoadingState key={i} height={22} width={w} borderRadius={6} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [property,    setProperty]    = useState<PropertyDetail | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [isSaved,     setIsSaved]     = useState(false);
  const [activeTab,   setActiveTab]   = useState<TabId>('overview');
  const [generating,  setGenerating]  = useState(false);

  // Toast state
  const [toastVisible,  setToastVisible]  = useState(false);
  const [toastKey,      setToastKey]      = useState(0);
  const [toastContent,  setToastContent]  = useState<React.ReactNode>(null);
  const [toastClickable, setToastClickable] = useState(false);
  const [pollActive,    setPollActive]    = useState(false);

  const tabBarRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch property on mount
  useEffect(() => {
    if (!id) return;
    api.get<PropertyDetail>(`/api/properties/${id}`).then((res) => {
      if (res.data) {
        setProperty(res.data);
        setIsSaved(res.data.is_watched ?? false);
      } else {
        setError(res.error ?? 'Property not found.');
      }
      setLoading(false);
    });
  }, [id]);

  // Poll for compact analysis after saving
  useEffect(() => {
    if (!pollActive || !id) return;

    pollRef.current = setInterval(async () => {
      const res = await api.get<CompactAnalysis>(`/api/analysis/compact/${id}`);
      if (res.data?.verdict) {
        clearInterval(pollRef.current!);
        setPollActive(false);
        setProperty((prev) => prev ? { ...prev, compact_analysis: res.data! } : prev);

        const v     = res.data.verdict;
        const label = VERDICT_LABELS[v];
        const color = VERDICT_COLORS[v];

        setToastContent(
          <span>
            Analysis ready —{' '}
            <span style={{ color, fontWeight: 600 }}>{label}</span>
          </span>,
        );
        setToastClickable(true);
        setToastKey((k) => k + 1);
      }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pollActive, id]);

  // Save to portfolio
  const handleSave = useCallback(async () => {
    if (isSaved || !property) return;

    const isFirstSave = !localStorage.getItem('immo_first_save');
    const res = await api.post(`/api/portfolio/watch/${property.id}`, {});

    if (!res.error) {
      setIsSaved(true);

      if (isFirstSave) {
        localStorage.setItem('immo_first_save', 'true');
        setToastContent('Nice. Check back in a few seconds for your verdict.');
      } else {
        setToastContent('Saved. Immonator is analysing...');
      }
      setToastClickable(false);
      setToastVisible(true);
      setToastKey((k) => k + 1);
      setPollActive(true);
    }
  }, [isSaved, property]);

  // Run deep analysis
  const handleDeepAnalysis = useCallback(async () => {
    if (!property) return;
    await api.post(`/api/analysis/deep/${property.id}`, {});
  }, [property]);

  // Generate negotiation brief
  const handleGenerateBrief = useCallback(async () => {
    if (!property || generating) return;
    setGenerating(true);
    const res = await api.post<NegotiateBrief>(`/api/negotiate/${property.id}`, {});
    if (res.data) {
      setProperty((prev) => prev ? { ...prev, negotiate_brief: res.data! } : prev);
      setActiveTab('negotiate');
    }
    setGenerating(false);
  }, [property, generating]);

  // Toast click → scroll to analysis tab
  const handleToastClick = useCallback(() => {
    if (!toastClickable) return;
    setActiveTab('analysis');
    tabBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [toastClickable]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <style>{DETAIL_STYLES}</style>
        <button
          onClick={() => navigate('/properties')}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 13, fontFamily: 'var(--font-body)', cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← Properties
        </button>
        <PropertyDetailSkeleton />
      </>
    );
  }

  if (error || !property) {
    return (
      <>
        <style>{DETAIL_STYLES}</style>
        <div style={{ marginTop: 40 }}>
          <EmptyState
            icon="⚠"
            title="Property not found"
            description={error ?? 'This property could not be loaded.'}
            actionLabel="← Back to Properties"
            onAction={() => navigate('/properties')}
          />
        </div>
      </>
    );
  }

  const images = [
    ...(property.images ?? []),
    ...(property.image_url && !(property.images ?? []).includes(property.image_url)
      ? [property.image_url]
      : []),
  ];

  const sidebarProps = {
    property,
    isSaved,
    onSave:         handleSave,
    onDeepAnalysis: handleDeepAnalysis,
    onNegotiate:    handleGenerateBrief,
    generating,
  };

  return (
    <>
      <style>{DETAIL_STYLES}</style>

      {/* Back link */}
      <button
        onClick={() => navigate('/properties')}
        style={{
          background:  'none',
          border:      'none',
          color:       'var(--color-text-secondary)',
          fontSize:    13,
          fontFamily:  'var(--font-body)',
          cursor:      'pointer',
          padding:     '0 0 16px',
          display:     'flex',
          alignItems:  'center',
          gap:         4,
          transition:  'color 150ms',
        }}
      >
        ← Properties
      </button>

      <div className="pd-layout">
        {/* ── Left column ── */}
        <div>
          <ImageGallery
            images={images}
            city={property.city}
            propertyType={property.property_type}
          />

          <PropertyHeader property={property} />

          {/* Sidebar — MOBILE position (above tabs) */}
          <div className="pd-right-mobile">
            <SidebarContent {...sidebarProps} />
          </div>

          {/* Tab bar — sticky */}
          <TabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabBarRef={tabBarRef}
          />

          {/* Tab content */}
          <div style={{ marginTop: 24 }}>
            {activeTab === 'overview'  && <OverviewTab property={property} />}
            {activeTab === 'analysis'  && <AIAnalysisTab property={property} />}
            {activeTab === 'scenarios' && <ScenariosTab property={property} />}
            {activeTab === 'negotiate' && (
              <NegotiateTab
                property={property}
                onGenerate={handleGenerateBrief}
                generating={generating}
              />
            )}
          </div>

          {/* Analysis chat — always visible, below tabs */}
          <div style={{ marginTop: 32 }}>
            <AnalysisChat
              contextType="property"
              contextId={property.id}
              title="this property"
            />
          </div>
        </div>

        {/* ── Right column — DESKTOP sticky sidebar ── */}
        <div className="pd-right-desktop">
          <SidebarContent {...sidebarProps} />
        </div>
      </div>

      {/* Toast */}
      {toastVisible && (
        <Toast
          key={toastKey}
          message={toastContent}
          onDone={() => setToastVisible(false)}
          onClick={toastClickable ? handleToastClick : undefined}
          duration={4000}
        />
      )}
    </>
  );
}

export default PropertyDetail;
