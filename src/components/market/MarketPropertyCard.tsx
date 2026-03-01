import React from 'react';
import { VerdictBadge } from '../common/VerdictBadge';
import { type Property } from './types';
import { fmtEur, fmtPct } from './helpers';

const DANGER_DAYS_THRESHOLD  = 60;
const WARNING_DAYS_THRESHOLD = 30;

export function MarketPropertyCard({
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
    days_listed === undefined         ? undefined
    : days_listed > DANGER_DAYS_THRESHOLD  ? 'var(--color-danger)'
    : days_listed > WARNING_DAYS_THRESHOLD ? 'var(--color-warning)'
    :                                        'rgba(0,0,0,0.50)';

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
          href={url.startsWith('http') ? url : '#'}
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
