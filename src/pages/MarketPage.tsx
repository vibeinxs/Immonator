import React, { useEffect, useState } from 'react';
import { useParams, useNavigate }    from 'react-router-dom';
import { api }                       from '../lib/api';
import { MetricCard, SectionCard, EmptyState, LoadingState } from '../components/common';
import { VerdictBadge, type Verdict } from '../components/common/VerdictBadge';
import { AnalysisChat }              from '../components/chat/AnalysisChat';

// ── Types ─────────────────────────────────────────────────────────────────────

type MarketTemperature = 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';

interface DatabaseStats {
  total_listings:    number;
  avg_price:         number;
  avg_price_per_sqm: number;
  avg_yield:         number;
  avg_days_listed:   number;
}

interface ValueZone {
  area:            string;
  why_interesting: string;
}

interface Neighbourhood {
  name:   string;
  reason: string;
}

interface CompactAnalysis {
  verdict?:          Verdict;
  one_line_summary?: string;
}

interface Property {
  id:               string;
  url:              string;
  title?:           string;
  price?:           number;
  area_sqm?:        number;
  rooms?:           number;
  city?:            string;
  zip_code?:        string;
  image_url?:       string;
  gross_yield?:     number;
  price_per_sqm?:   number;
  days_listed?:     number;
  compact_analysis?: CompactAnalysis;
}

interface MarketData {
  city:                   string;
  database_stats:         DatabaseStats;
  market_temperature:     MarketTemperature;
  city_investment_rating: number;

  // Market Overview
  temperature_reason:   string;
  buyer_seller_balance: string;
  inventory_assessment: string;

  // Price Analysis
  price_level:  string;
  price_trend:  string;
  reasoning:    string;
  value_zones:  ValueZone[];

  // Yield Environment
  yield_assessment:    string;
  vs_germany_average:  string;
  best_property_types: string[];

  // Economic Drivers
  key_employers:               string[];
  population_trend:            string;
  infrastructure_developments: string[];

  // Investment Outlook
  outlook_1_year:    string;
  outlook_3_year:    string;
  key_risks:         string[];
  key_opportunities: string[];

  // Practical Advice
  best_neighbourhoods: Neighbourhood[];
  avoid_list:          Neighbourhood[];
  negotiation_climate: string;

  // Properties
  properties: Property[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_STYLES = `
.market-stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.market-prop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 16px;
}
.market-prop-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.market-prop-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
@media (max-width: 1100px) {
  .market-stats-grid { grid-template-columns: repeat(3, 1fr); }
  .market-prop-grid  { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .market-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .market-prop-grid  { grid-template-columns: 1fr; }
}
`;

const TEMP_CONFIG: Record<MarketTemperature, { label: string; color: string; bg: string }> = {
  hot:     { label: 'Hot',     color: 'var(--color-danger)',         bg: 'var(--color-danger-bg)'    },
  warm:    { label: 'Warm',    color: 'var(--color-warning)',        bg: 'var(--color-warning-bg)'   },
  neutral: { label: 'Neutral', color: 'var(--color-brand)',          bg: 'var(--color-brand-subtle)' },
  cool:    { label: 'Cool',    color: 'var(--color-text-secondary)', bg: 'var(--color-bg-elevated)'  },
  cold:    { label: 'Cold',    color: 'var(--color-text-muted)',     bg: 'var(--color-bg-subtle)'    },
};

// Generic badge lookup — values come from the API as underscore_strings.
const BADGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  // buyer_seller_balance
  sellers_market: { label: 'Sellers Market', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'    },
  balanced:       { label: 'Balanced',       color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  buyers_market:  { label: 'Buyers Market',  color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  // price_level
  undervalued:    { label: 'Undervalued',    color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  fair_value:     { label: 'Fair Value',     color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  overvalued:     { label: 'Overvalued',     color: 'var(--color-warning)', bg: 'var(--color-warning-bg)'  },
  high:           { label: 'High',           color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
  // price_trend
  rising_fast:    { label: 'Rising Fast',    color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
  rising:         { label: 'Rising',         color: 'var(--color-warning)', bg: 'var(--color-warning-bg)'  },
  stable:         { label: 'Stable',         color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  declining:      { label: 'Declining',      color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  // yield_assessment
  excellent:      { label: 'Excellent',      color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  above_average:  { label: 'Above Average',  color: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  average:        { label: 'Average',        color: 'var(--color-brand)',   bg: 'var(--color-brand-subtle)' },
  below_average:  { label: 'Below Average',  color: 'var(--color-warning)', bg: 'var(--color-warning-bg)'  },
  poor:           { label: 'Poor',           color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
};

// ── Shared style objects ──────────────────────────────────────────────────────

const PARA_STYLE: React.CSSProperties = {
  margin:     0,
  fontSize:   14,
  lineHeight: 1.7,
  fontFamily: 'var(--font-body)',
  color:      'var(--color-text-primary)',
};

const LABEL_STYLE: React.CSSProperties = {
  margin:        '0 0 8px',
  fontSize:      11,
  fontWeight:    600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color:         'var(--color-text-muted)',
  fontFamily:    'var(--font-body)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(n: number) {
  return `€\u202f${Math.round(n).toLocaleString('de-DE')}`;
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function capitalize(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TemperatureBadge({ temp }: { temp: MarketTemperature }) {
  const { label, color, bg } = TEMP_CONFIG[temp];
  return (
    <span style={{
      display:         'inline-block',
      padding:         '4px 12px',
      borderRadius:    6,
      fontSize:        12,
      fontWeight:      600,
      letterSpacing:   '0.05em',
      textTransform:   'uppercase',
      fontFamily:      'var(--font-body)',
      color,
      backgroundColor: bg,
      border:          `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
    }}>
      {label}
    </span>
  );
}

function TextBadge({ value }: { value: string }) {
  const cfg   = BADGE_CONFIG[value];
  const color = cfg?.color ?? 'var(--color-text-secondary)';
  const bg    = cfg?.bg    ?? 'var(--color-bg-elevated)';
  const label = cfg?.label ?? capitalize(value);
  return (
    <span style={{
      display:         'inline-block',
      padding:         '4px 12px',
      borderRadius:    6,
      fontSize:        12,
      fontWeight:      600,
      letterSpacing:   '0.05em',
      textTransform:   'uppercase',
      fontFamily:      'var(--font-body)',
      color,
      backgroundColor: bg,
      border:          `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
    }}>
      {label}
    </span>
  );
}

function TagPill({ label, variant = 'neutral' }: { label: string; variant?: 'neutral' | 'success' | 'danger' }) {
  const VARIANT_MAP = {
    neutral: { color: 'var(--color-text-secondary)', bg: 'var(--color-bg-elevated)', border: 'var(--color-border)'  },
    success: { color: 'var(--color-success)',         bg: 'var(--color-success-bg)',  border: 'var(--color-success)' },
    danger:  { color: 'var(--color-danger)',          bg: 'var(--color-danger-bg)',   border: 'var(--color-danger)'  },
  };
  const { color, bg, border } = VARIANT_MAP[variant];
  return (
    <span style={{
      display:         'inline-block',
      padding:         '6px 14px',
      borderRadius:    20,
      fontSize:        13,
      fontFamily:      'var(--font-body)',
      color,
      backgroundColor: bg,
      border:          `1px solid color-mix(in srgb, ${border} 40%, transparent)`,
    }}>
      {label}
    </span>
  );
}

// ── PropertyCard ──────────────────────────────────────────────────────────────

function PropertyCard({
  property,
  navigate,
}: {
  property: Property;
  navigate: (path: string) => void;
}) {
  const {
    id, url, title, price, area_sqm, rooms, city, zip_code,
    image_url, gross_yield, price_per_sqm, days_listed, compact_analysis,
  } = property;

  const location = [city, zip_code].filter(Boolean).join(' · ') || 'Location unknown';

  const daysBg =
    days_listed === undefined ? undefined
    : days_listed > 60        ? 'var(--color-danger)'
    : days_listed > 30        ? 'var(--color-warning)'
    :                           'rgba(0,0,0,0.50)';

  const yieldColor = gross_yield && gross_yield >= 5
    ? 'var(--color-success)'
    : 'var(--color-text-primary)';

  return (
    <div
      className="market-prop-card"
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/properties/${id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/properties/${id}`)}
    >
      {/* Image */}
      <div style={{ position: 'relative', aspectRatio: '16/9', flexShrink: 0 }}>
        {image_url ? (
          <img
            src={image_url}
            alt={title ?? 'Property'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'var(--color-bg-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
          }}>
            🏢
          </div>
        )}

        {compact_analysis?.verdict && (
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <VerdictBadge verdict={compact_analysis.verdict} />
          </div>
        )}

        {days_listed !== undefined && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: daysBg, color: '#fff',
            fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)',
            padding: '3px 8px', borderRadius: 20, letterSpacing: '0.02em',
          }}>
            {days_listed}d
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400,
            color: 'var(--color-text-primary)',
          }}>
            {price ? fmtEur(price) : '—'}
          </span>
          {price_per_sqm !== undefined && (
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
              {price_per_sqm.toLocaleString('de-DE')} €/m²
            </span>
          )}
        </div>

        <div style={{
          fontSize: 15, fontWeight: 600, lineHeight: 1.4,
          color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {title ?? 'Property Listing'}
        </div>

        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
          📍 {location}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {area_sqm !== undefined && (
            <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', padding: '3px 8px', borderRadius: 6 }}>
              {area_sqm}m²
            </span>
          )}
          {rooms !== undefined && (
            <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', padding: '3px 8px', borderRadius: 6 }}>
              {rooms} Zi.
            </span>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              Gross Yield
            </div>
            <div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 600, color: yieldColor }}>
              {gross_yield !== undefined ? fmtPct(gross_yield) : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              €/m²
            </div>
            <div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {price_per_sqm !== undefined ? price_per_sqm.toLocaleString('de-DE') : '—'}
            </div>
          </div>
        </div>

        {compact_analysis?.one_line_summary && (
          <div style={{
            fontSize: 13, fontStyle: 'italic',
            color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {compact_analysis.one_line_summary}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)' }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 13, fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
          }}
        >
          View on ImmoScout ↗
        </a>
      </div>
    </div>
  );
}

// ── MarketPage ────────────────────────────────────────────────────────────────

export function MarketPage() {
  const { city = '' } = useParams<{ city: string }>();
  const navigate      = useNavigate();

  const [data,    setData]    = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty,   setEmpty]   = useState(false);

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    setEmpty(false);
    api.get<MarketData>(`/api/analysis/market/${encodeURIComponent(city)}`).then(res => {
      if (res.data) {
        setData(res.data);
      } else {
        setEmpty(true);
      }
      setLoading(false);
    });
  }, [city]);

  const displayCity = city.charAt(0).toUpperCase() + city.slice(1);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{PAGE_STYLES}</style>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <LoadingState height={42} width="45%" borderRadius={8} />
          <LoadingState height={22} width="25%" borderRadius={6} />
          <div className="market-stats-grid" style={{ marginBottom: 8 }}>
            {Array.from({ length: 5 }, (_, i) => <LoadingState key={i} height={102} borderRadius={12} />)}
          </div>
          {Array.from({ length: 4 }, (_, i) => <LoadingState key={i} height={180} borderRadius={12} />)}
        </div>
      </>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (empty || !data) {
    return (
      <>
        <style>{PAGE_STYLES}</style>
        <div style={{ marginTop: 48 }}>
          <EmptyState
            icon="🗺"
            title={`No market data for ${displayCity} yet.`}
            description={`Market analysis is generated as properties are added. Add a property from ${displayCity} to generate the analysis.`}
          />
        </div>
      </>
    );
  }

  const s = data.database_stats;

  // ── Page ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{PAGE_STYLES}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin:     '0 0 10px',
          fontFamily: 'var(--font-display)',
          fontSize:   32, fontWeight: 400,
          color:      'var(--color-text-primary)',
        }}>
          {displayCity} Real Estate Market
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <TemperatureBadge temp={data.market_temperature} />
          <span style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
            Investment Rating:{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>
              {data.city_investment_rating}/10
            </strong>
          </span>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────────── */}
      <div className="market-stats-grid">
        <MetricCard label="Total Listings"  value={s.total_listings.toLocaleString('de-DE')} />
        <MetricCard label="Avg Price"       value={fmtEur(s.avg_price)}         isMonospace />
        <MetricCard label="Avg €/m²"        value={fmtEur(s.avg_price_per_sqm)} isMonospace />
        <MetricCard
          label="Avg Yield"
          value={fmtPct(s.avg_yield)}
          isMonospace
          color={s.avg_yield >= 5 ? 'success' : 'default'}
        />
        <MetricCard label="Avg Days Listed" value={Math.round(s.avg_days_listed).toString()} />
      </div>

      {/* ── Report Sections ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Market Overview */}
        <SectionCard title="Market Overview">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <TemperatureBadge temp={data.market_temperature} />
          </div>
          <p style={PARA_STYLE}>{data.temperature_reason}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '20px 0 8px' }}>
            <TextBadge value={data.buyer_seller_balance} />
          </div>
          <p style={PARA_STYLE}>{data.inventory_assessment}</p>
        </SectionCard>

        {/* Price Analysis */}
        <SectionCard title="Price Analysis">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <TextBadge value={data.price_level} />
            <TextBadge value={data.price_trend} />
          </div>
          <p style={PARA_STYLE}>{data.reasoning}</p>

          {data.value_zones?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={LABEL_STYLE}>Value Zones</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {data.value_zones.map(zone => (
                  <div key={zone.area} style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border:          '1px solid var(--color-border)',
                    borderRadius:    8, padding: '12px 16px',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)', marginBottom: 4 }}>
                      {zone.area}
                    </div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {zone.why_interesting}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Yield Environment */}
        <SectionCard title="Yield Environment">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <TextBadge value={data.yield_assessment} />
          </div>
          <p style={PARA_STYLE}>{data.vs_germany_average}</p>

          {data.best_property_types?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {data.best_property_types.map(t => <TagPill key={t} label={t} />)}
            </div>
          )}
        </SectionCard>

        {/* Economic Drivers */}
        <SectionCard title="Economic Drivers">
          {data.key_employers?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={LABEL_STYLE}>Key Employers</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.key_employers.map(e => <TagPill key={e} label={e} />)}
              </div>
            </div>
          )}

          <p style={PARA_STYLE}>{data.population_trend}</p>

          {data.infrastructure_developments?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={LABEL_STYLE}>Infrastructure Developments</p>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.infrastructure_developments.map((item, i) => (
                  <li key={i} style={{ fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>

        {/* Investment Outlook */}
        <SectionCard title="Investment Outlook">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <p style={LABEL_STYLE}>1-Year Outlook</p>
              <p style={PARA_STYLE}>{data.outlook_1_year}</p>
            </div>
            <div>
              <p style={LABEL_STYLE}>3-Year Outlook</p>
              <p style={PARA_STYLE}>{data.outlook_3_year}</p>
            </div>
          </div>

          {data.key_risks?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={LABEL_STYLE}>Key Risks</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.key_risks.map(r => <TagPill key={r} label={r} variant="danger" />)}
              </div>
            </div>
          )}

          {data.key_opportunities?.length > 0 && (
            <div>
              <p style={LABEL_STYLE}>Key Opportunities</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.key_opportunities.map(o => <TagPill key={o} label={o} variant="success" />)}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Practical Advice */}
        <SectionCard title="Practical Advice">
          {data.best_neighbourhoods?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={LABEL_STYLE}>Best Neighbourhoods</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.best_neighbourhoods.map(n => (
                  <div key={n.name} style={{
                    backgroundColor: 'var(--color-success-bg)',
                    border:          '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)',
                    borderRadius:    8, padding: '12px 16px',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-success)', marginBottom: 2 }}>
                      {n.name}
                    </div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {n.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.avoid_list?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={LABEL_STYLE}>Areas to Avoid</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.avoid_list.map(n => (
                  <div key={n.name} style={{
                    backgroundColor: 'var(--color-danger-bg)',
                    border:          '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
                    borderRadius:    8, padding: '12px 16px',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-danger)', marginBottom: 2 }}>
                      {n.name}
                    </div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {n.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={PARA_STYLE}>{data.negotiation_climate}</p>
        </SectionCard>

      </div>

      {/* ── Properties in this city ──────────────────────────────────────────── */}
      {data.properties?.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2 style={{
            margin:     '0 0 4px',
            fontFamily: 'var(--font-display)',
            fontSize:   24, fontWeight: 400,
            color:      'var(--color-text-primary)',
          }}>
            Properties in {displayCity}
          </h2>
          <p style={{ margin: '0 0 0', fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            {data.properties.length} listing{data.properties.length !== 1 ? 's' : ''} available
          </p>
          <div className="market-prop-grid">
            {data.properties.map(p => (
              <PropertyCard key={p.id} property={p} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* ── Chat ────────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 40 }}>
        <AnalysisChat
          contextType="market"
          contextId={city}
          title={`${displayCity} market`}
        />
      </div>
    </>
  );
}
