import React, { useEffect, useState } from 'react';
import { useParams, useNavigate }    from 'react-router-dom';
import { api }                       from '../lib/api';
import { MetricCard, SectionCard, EmptyState, LoadingState } from '../components/common';
import { AnalysisChat }              from '../components/chat/AnalysisChat';
import { type MarketTemperature, type Property } from '../components/market/types';
import { fmtEur, fmtPct }           from '../components/market/helpers';
import { TemperatureBadge }          from '../components/market/TemperatureBadge';
import { TextBadge }                 from '../components/market/TextBadge';
import { TagPill }                   from '../components/market/TagPill';
import { MarketPropertyCard }        from '../components/market/MarketPropertyCard';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Page-level styles ─────────────────────────────────────────────────────────

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

// ── MarketPage ────────────────────────────────────────────────────────────────

export function MarketPage() {
  const { city = '' } = useParams<{ city: string }>();
  const navigate      = useNavigate();

  const [data,    setData]    = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty,   setEmpty]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!city) return;
    let isCancelled = false;

    setLoading(true);
    setEmpty(false);
    setError(null);
    api.get<MarketData>(`/api/analysis/market/${encodeURIComponent(city)}`).then(res => {
      if (isCancelled) return;
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setData(res.data);
      } else {
        setEmpty(true);
      }
      setLoading(false);
    });

    return () => { isCancelled = true; };
  }, [city]);

  const displayCity = city.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');

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

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <style>{PAGE_STYLES}</style>
        <div style={{ marginTop: 48 }}>
          <EmptyState icon="⚠" title="Something went wrong" description={error} />
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
              <MarketPropertyCard key={p.id} property={p} navigate={navigate} />
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
