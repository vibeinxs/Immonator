import React, { useState, useEffect } from 'react';
import { api }          from '../../lib/api';
import { LoadingState } from '../common/LoadingState';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketStats {
  avg_price_per_sqm: number;
  avg_yield:         number;
  avg_days_listed:   number;
}

type MarketTemperature = 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';

interface MarketAnalysisData {
  market_temperature?: MarketTemperature;
  city_overview?: {
    headline?: string;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMP_CONFIG: Record<MarketTemperature, { label: string; color: string; bg: string }> = {
  hot:     { label: 'Hot',     color: 'var(--color-danger)',        bg: 'var(--color-danger-bg)'   },
  warm:    { label: 'Warm',    color: 'var(--color-warning)',       bg: 'var(--color-warning-bg)'  },
  neutral: { label: 'Neutral', color: 'var(--color-brand)',         bg: 'var(--color-brand-subtle)' },
  cool:    { label: 'Cool',    color: '#0d9488',                    bg: '#042f2e'                  },
  cold:    { label: 'Cold',    color: 'var(--color-text-secondary)', bg: 'var(--color-bg-elevated)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number, decimals = 0) {
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TemperatureBadge({ temp }: { temp: MarketTemperature }) {
  const { label, color, bg } = TEMP_CONFIG[temp];
  return (
    <span
      style={{
        display:       'inline-block',
        padding:       '3px 10px',
        borderRadius:  6,
        fontSize:      11,
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

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background:   'var(--color-bg-elevated)',
        border:       '1px solid var(--color-border)',
        borderRadius: 8,
        padding:      '8px 14px',
        flex:         '1 1 0',
        minWidth:     0,
      }}
    >
      <p style={{
        margin:        0,
        fontSize:      10,
        fontWeight:    500,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color:         'var(--color-text-muted)',
        fontFamily:    'var(--font-body)',
        whiteSpace:    'nowrap',
        marginBottom:  3,
      }}>
        {label}
      </p>
      <p style={{
        margin:     0,
        fontSize:   15,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        color:      'var(--color-text-primary)',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </p>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function MarketCardSkeleton({ city }: { city: string }) {
  return (
    <div style={{
      background:   'var(--color-bg-surface)',
      border:       '1px solid var(--color-border)',
      borderRadius: 12,
      padding:      '16px 20px',
      display:      'flex',
      flexDirection: 'column',
      gap:          12,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
          {city} Market
        </span>
        <LoadingState height={22} width={64} borderRadius={6} />
      </div>
      {/* Stat pills */}
      <div style={{ display: 'flex', gap: 8 }}>
        <LoadingState height={52} borderRadius={8} />
        <LoadingState height={52} borderRadius={8} />
        <LoadingState height={52} borderRadius={8} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MarketAnalysisCard({ city }: { city: string }) {
  const [stats,        setStats]        = useState<MarketStats | null>(null);
  const [analysis,     setAnalysis]     = useState<MarketAnalysisData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;

    // Fire both fetches in parallel — stats first (fast), analysis second (may be slower)
    api.get<MarketStats>(`/api/analysis/market/${encodeURIComponent(city)}/stats`).then((res) => {
      if (cancelled) return;
      if (res.data) setStats(res.data);
      setStatsLoading(false);
    });

    api.get<MarketAnalysisData>(`/api/analysis/market/${encodeURIComponent(city)}`).then((res) => {
      if (cancelled) return;
      if (res.data) setAnalysis(res.data);
    });

    return () => { cancelled = true; };
  }, [city]);

  // While stats are still loading, show a skeleton
  if (statsLoading) {
    return <MarketCardSkeleton city={city} />;
  }

  const temp     = analysis?.market_temperature;
  const headline = analysis?.city_overview?.headline;

  return (
    <div style={{
      background:    'var(--color-bg-surface)',
      border:        '1px solid var(--color-border)',
      borderRadius:  12,
      padding:       '16px 20px',
      display:       'flex',
      flexDirection: 'column',
      gap:           12,
    }}>
      {/* ── Header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize:   16,
          fontWeight: 600,
          color:      'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
        }}>
          {city} Market
        </span>
        {temp && <TemperatureBadge temp={temp} />}
      </div>

      {/* ── Stat pills ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {stats ? (
          <>
            <StatPill
              label="Avg €/m²"
              value={`€ ${fmtNum(stats.avg_price_per_sqm)}`}
            />
            <StatPill
              label="Avg Yield"
              value={`${fmtNum(stats.avg_yield, 1)}%`}
            />
            <StatPill
              label="Avg Days Listed"
              value={`${fmtNum(stats.avg_days_listed)} days`}
            />
          </>
        ) : (
          // Stats fetch succeeded but returned no data — show dashes
          <>
            <StatPill label="Avg €/m²"        value="—" />
            <StatPill label="Avg Yield"        value="—" />
            <StatPill label="Avg Days Listed"  value="—" />
          </>
        )}
      </div>

      {/* ── Headline (appears once full analysis loads) ── */}
      {headline && (
        <p style={{
          margin:     0,
          fontSize:   14,
          fontStyle:  'italic',
          lineHeight: 1.55,
          color:      'var(--color-text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
          {headline}
        </p>
      )}

      {/* ── Footer link ── */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, marginTop: 2 }}>
        <a
          href={`/markets/${encodeURIComponent(city)}`}
          style={{
            fontSize:       13,
            fontFamily:     'var(--font-body)',
            color:          'var(--color-brand)',
            textDecoration: 'none',
            display:        'inline-flex',
            alignItems:     'center',
            gap:            4,
            transition:     'opacity 150ms',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.75'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
        >
          View Full Market Report →
        </a>
      </div>
    </div>
  );
}

export default MarketAnalysisCard;
