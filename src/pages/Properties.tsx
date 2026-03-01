import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { VerdictBadge, type Verdict } from '../components/common/VerdictBadge';
import { ContextHint } from '../components/common/ContextHint';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PropertyStats {
  total_listings: number;
  total_cities:   number;
}

interface CompactAnalysis {
  verdict?:         Verdict;
  one_line_summary?: string;
}

interface Property {
  id:               string;
  url:              string;
  title?:           string;
  price?:           number;
  area_sqm?:        number;
  rooms?:           number;
  year_built?:      number;
  city?:            string;
  zip_code?:        string;
  image_url?:       string;
  gross_yield?:     number;
  price_per_sqm?:   number;
  days_listed?:     number;
  compact_analysis?: CompactAnalysis;
  is_watched?:      boolean;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const PAGE_STYLES = `
@keyframes immo-prop-toast-in  { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
@keyframes immo-prop-toast-out { from { opacity:1; } to { opacity:0; } }

.immo-prop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 24px;
}
.immo-prop-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 24px;
}
.immo-filter-bar {
  position: sticky;
  top: 56px;
  z-index: 50;
  background: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
  margin: 24px -32px 0;
  padding: 10px 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.immo-prop-card {
  transition: transform 0.15s, box-shadow 0.15s;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.immo-prop-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.immo-ghost-btn {
  background: transparent;
  border: 1px solid var(--color-border-strong);
  border-radius: 7px;
  padding: 5px 12px;
  font-size: 13px;
  font-family: var(--font-body);
  color: var(--color-text-secondary);
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: color 0.15s, border-color 0.15s;
}
.immo-ghost-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-text-secondary);
}
.immo-chip-option {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-family: var(--font-body);
  padding: 8px 14px;
  transition: background 0.1s;
}
.immo-chip-option:hover {
  background: var(--color-bg-subtle);
}
@media (max-width: 1024px) {
  .immo-prop-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .immo-prop-grid { grid-template-columns: 1fr; }
  .immo-filter-bar { margin: 16px -16px 0; padding: 10px 16px; }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return `€ ${n.toLocaleString('de-DE')}`;
}
function fmtPriceSqm(n: number) {
  return `€ ${n.toLocaleString('de-DE')}/m²`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 2500);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div style={{
      position:        'fixed',
      bottom:          80,
      left:            '50%',
      transform:       'translateX(-50%)',
      background:      'var(--color-bg-elevated)',
      border:          '1px solid var(--color-border-strong)',
      borderRadius:    10,
      padding:         '10px 20px',
      fontSize:        13,
      fontFamily:      'var(--font-body)',
      color:           'var(--color-text-primary)',
      zIndex:          400,
      boxShadow:       '0 8px 24px rgba(0,0,0,0.35)',
      whiteSpace:      'nowrap',
      animation:       fading
        ? 'immo-prop-toast-out 500ms ease forwards'
        : 'immo-prop-toast-in 200ms ease',
    }}>
      {message}
    </div>
  );
}

// ── AddPropertyModal ──────────────────────────────────────────────────────────

function AddPropertyModal({ onClose }: { onClose: () => void }) {
  const [url,    setUrl]    = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error,  setError]  = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(id); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setStatus('loading');
    setError('');
    const result = await api.post('/api/properties/trigger-scrape', { url: url.trim() });
    if (result.error) {
      setError(result.error);
      setStatus('idle');
      return;
    }
    setStatus('done');
    setTimeout(onClose, 2000);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        role="button"
        aria-label="Close modal"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-prop-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          position:   'fixed',
          top:        '50%',
          left:       '50%',
          transform:  'translate(-50%, -50%)',
          zIndex:     201,
          background: 'var(--color-bg-elevated)',
          border:     '1px solid var(--color-border-strong)',
          borderRadius: 16,
          padding:    '28px 32px',
          width:      'min(480px, calc(100vw - 32px))',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', fontSize: 22, lineHeight: 1,
            padding: '4px 8px',
          }}
        >
          ×
        </button>

        <h2
          id="add-prop-title"
          style={{
            margin:     '0 0 8px',
            fontFamily: 'var(--font-display)',
            fontSize:   22, fontWeight: 400,
            color:      'var(--color-text-primary)',
          }}
        >
          Add Property URL
        </h2>
        <p style={{
          margin: '0 0 20px', fontSize: 14,
          color: 'var(--color-text-secondary)', lineHeight: 1.6,
        }}>
          Paste an ImmoScout24 listing URL and Immonator will analyse it automatically.
        </p>

        {status === 'done' ? (
          <div style={{
            textAlign: 'center', padding: '16px 0',
            color: 'var(--color-success)', fontSize: 15, fontWeight: 500,
          }}>
            ✓ Done! Analysis starting.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.immoscout24.de/expose/..."
              required
              style={{
                display:     'block',
                width:       '100%',
                padding:     '12px 16px',
                background:  'var(--color-bg-surface)',
                border:      `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
                borderRadius: 8,
                color:       'var(--color-text-primary)',
                fontSize:    14, fontFamily: 'var(--font-body)',
                outline:     'none',
                boxSizing:   'border-box',
                marginBottom: error ? 8 : 16,
              }}
            />
            {error && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-danger)' }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'loading' || !url.trim()}
              style={{
                display:    'block', width: '100%', height: 44,
                background: 'var(--color-brand)',
                color:      '#fff', border: 'none', borderRadius: 8,
                fontSize:   14, fontWeight: 600, fontFamily: 'var(--font-body)',
                cursor:     status === 'loading' ? 'not-allowed' : 'pointer',
                opacity:    status === 'loading' ? 0.7 : 1,
              }}
            >
              {status === 'loading' ? 'Adding property…' : 'Add Property'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

// ── FilterChip ────────────────────────────────────────────────────────────────

interface FilterOption {
  label: string;
  value: string | null;
}

interface FilterChipProps {
  label:    string;
  options:  FilterOption[];
  value:    string | null;
  onChange: (v: string | null) => void;
}

function FilterChip({ label, options, value, onChange }: FilterChipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = value !== null;
  const activeLabel = options.find((o) => o.value === value)?.label;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{
        display:    'flex',
        alignItems: 'center',
        background: isActive ? 'var(--color-brand-subtle)' : 'var(--color-bg-elevated)',
        border:     `1px solid ${isActive ? 'var(--color-brand)' : 'var(--color-border-strong)'}`,
        borderRadius: 20,
        overflow:   'hidden',
      }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            padding:    '6px 10px 6px 12px',
            background: 'none', border: 'none', cursor: 'pointer',
            color:      isActive ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            fontSize:   13, fontFamily: 'var(--font-body)',
            display:    'flex', alignItems: 'center', gap: 4,
            whiteSpace: 'nowrap',
          }}
        >
          {isActive ? `${label}: ${activeLabel}` : label}
          <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
        </button>

        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            aria-label={`Clear ${label} filter`}
            style={{
              padding:    '6px 10px 6px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              color:      'var(--color-brand)', fontSize: 15, lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div style={{
          position:   'absolute', top: '100%', left: 0, marginTop: 4,
          background: 'var(--color-bg-elevated)',
          border:     '1px solid var(--color-border-strong)',
          borderRadius: 10, padding: '6px 0',
          minWidth:   160, zIndex: 100,
          boxShadow:  '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              className="immo-chip-option"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                background: opt.value === value ? 'var(--color-brand-subtle)' : undefined,
                color:      opt.value === value ? 'var(--color-brand)' : 'var(--color-text-primary)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PropertyCardSkeleton ──────────────────────────────────────────────────────

function PropertyCardSkeleton() {
  return (
    <div style={{
      background: 'var(--color-bg-surface)',
      border:     '1px solid var(--color-border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <LoadingState height={190} borderRadius={0} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <LoadingState height={26} width="55%" />
        <LoadingState height={16} />
        <LoadingState height={14} width="70%" />
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <LoadingState height={22} width={52} borderRadius={6} />
          <LoadingState height={22} width={52} borderRadius={6} />
          <LoadingState height={22} width={52} borderRadius={6} />
        </div>
        <LoadingState height={1} borderRadius={0} />
        <LoadingState height={40} />
        <LoadingState height={14} width="80%" />
      </div>
      <div style={{
        padding:   '12px 16px',
        borderTop: '1px solid var(--color-border)',
        display:   'flex', gap: 8,
      }}>
        <LoadingState height={30} width={100} borderRadius={7} />
        <LoadingState height={30} width={30} borderRadius={7} />
      </div>
    </div>
  );
}

// ── PropertyCard ──────────────────────────────────────────────────────────────

interface PropertyCardProps {
  property: Property;
  watched:  boolean;
  onWatch:  (id: string) => void;
}

function PropertyCard({ property, watched, onWatch }: PropertyCardProps) {
  const {
    id, url, title, price, area_sqm, rooms, year_built,
    city, zip_code, image_url, gross_yield, price_per_sqm,
    days_listed, compact_analysis,
  } = property;

  const daysBg =
    days_listed === undefined ? undefined
    : days_listed > 60        ? 'var(--color-danger)'
    : days_listed > 30        ? 'var(--color-warning)'
    :                           'rgba(0,0,0,0.50)';

  const yieldColor =
    gross_yield && gross_yield >= 5
      ? 'var(--color-success)'
      : 'var(--color-text-primary)';

  const location = [city, zip_code].filter(Boolean).join(' · ') || 'Location unknown';

  return (
    <div className="immo-prop-card">
      {/* ── Image ── */}
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

        {/* Verdict overlay — top-left */}
        {compact_analysis?.verdict && (
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <VerdictBadge verdict={compact_analysis.verdict} />
          </div>
        )}

        {/* Days pill — top-right */}
        {days_listed !== undefined && (
          <div style={{
            position:     'absolute', top: 10, right: 10,
            background:   daysBg,
            color:        '#fff',
            fontSize:     11, fontWeight: 600, fontFamily: 'var(--font-body)',
            padding:      '3px 8px', borderRadius: 20,
            letterSpacing: '0.02em',
          }}>
            {days_listed} days
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>

        {/* Price row */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize:   22, fontWeight: 400,
            color:      'var(--color-text-primary)',
          }}>
            {price ? fmtPrice(price) : '—'}
          </span>
          {price_per_sqm !== undefined && (
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>
              {fmtPriceSqm(price_per_sqm)}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{
          fontSize:          15, fontWeight: 600, lineHeight: 1.4,
          color:             'var(--color-text-primary)',
          fontFamily:        'var(--font-body)',
          display:           '-webkit-box',
          WebkitLineClamp:   2,
          WebkitBoxOrient:   'vertical',
          overflow:          'hidden',
        }}>
          {title ?? 'Property Listing'}
        </div>

        {/* Location */}
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
          📍 {location}
        </div>

        {/* Spec pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {area_sqm !== undefined && (
            <span style={{
              fontSize: 12, fontFamily: 'var(--font-body)',
              background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)',
              padding: '3px 8px', borderRadius: 6,
            }}>
              {area_sqm}m²
            </span>
          )}
          {rooms !== undefined && (
            <span style={{
              fontSize: 12, fontFamily: 'var(--font-body)',
              background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)',
              padding: '3px 8px', borderRadius: 6,
            }}>
              {rooms} Zi.
            </span>
          )}
          {year_built !== undefined && (
            <span style={{
              fontSize: 12, fontFamily: 'var(--font-body)',
              background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)',
              padding: '3px 8px', borderRadius: 6,
            }}>
              {year_built}
            </span>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

        {/* Yield row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={{
              fontSize: 10, fontFamily: 'var(--font-body)',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2,
            }}>
              Gross Yield
            </div>
            <div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 600, color: yieldColor }}>
              {gross_yield !== undefined ? `${gross_yield.toFixed(1)}%` : '—'}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: 10, fontFamily: 'var(--font-body)',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2,
            }}>
              €/SQM
            </div>
            <div style={{ fontSize: 20, fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {price_per_sqm !== undefined ? price_per_sqm.toLocaleString('de-DE') : '—'}
            </div>
          </div>
        </div>

        {/* AI summary or CTA */}
        {compact_analysis?.one_line_summary ? (
          <div style={{
            fontSize:        13, fontStyle: 'italic',
            color:           'var(--color-text-secondary)',
            fontFamily:      'var(--font-body)', lineHeight: 1.5,
            display:         '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow:        'hidden', marginTop: 2,
          }}>
            {compact_analysis.one_line_summary}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', marginTop: 2 }}>
            Save to get AI analysis
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding:         '12px 16px',
        borderTop:       '1px solid var(--color-border)',
        display:         'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="immo-ghost-btn"
        >
          View Details
        </a>
        <button
          onClick={() => onWatch(id)}
          aria-label={watched ? 'Saved to portfolio' : 'Save to portfolio'}
          style={{
            background:  'none', border: 'none', cursor: watched ? 'default' : 'pointer',
            fontSize:    22, lineHeight: 1, padding: '4px 6px',
            color:       watched ? 'var(--color-success)' : 'var(--color-text-muted)',
            transition:  'color 0.15s, transform 0.1s',
          }}
        >
          {watched ? '♥' : '♡'}
        </button>
      </div>
    </div>
  );
}

// ── Filter / sort data ────────────────────────────────────────────────────────

const CITY_OPTIONS: FilterOption[] = [
  { label: 'Any',        value: null        },
  { label: 'Berlin',     value: 'Berlin'    },
  { label: 'Munich',     value: 'Munich'    },
  { label: 'Hamburg',    value: 'Hamburg'   },
  { label: 'Frankfurt',  value: 'Frankfurt' },
  { label: 'Cologne',    value: 'Cologne'   },
];

const TYPE_OPTIONS: FilterOption[] = [
  { label: 'Any',        value: null         },
  { label: 'Apartment',  value: 'apartment'  },
  { label: 'House',      value: 'house'      },
  { label: 'Commercial', value: 'commercial' },
];

const PRICE_OPTIONS: FilterOption[] = [
  { label: 'Any',           value: null      },
  { label: 'Under €200k',   value: '200000'  },
  { label: 'Under €400k',   value: '400000'  },
  { label: 'Under €600k',   value: '600000'  },
  { label: 'Under €1M',     value: '1000000' },
];

const YIELD_OPTIONS: FilterOption[] = [
  { label: 'Any',   value: null },
  { label: '3%+',   value: '3'  },
  { label: '4%+',   value: '4'  },
  { label: '5%+',   value: '5'  },
  { label: '6%+',   value: '6'  },
];

const SORT_OPTIONS = [
  { label: 'Newest',      value: 'newest'      },
  { label: 'Yield',       value: 'yield'       },
  { label: 'Price',       value: 'price'       },
  { label: 'Days Listed', value: 'days_listed' },
  { label: 'AI Score',    value: 'ai_score'    },
];

// ── Properties page ───────────────────────────────────────────────────────────

export function Properties() {
  const [stats,        setStats]        = useState<PropertyStats | null>(null);
  const [properties,   setProperties]   = useState<Property[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [sortBy,       setSortBy]       = useState('newest');
  const [viewMode,     setViewMode]     = useState<'grid' | 'list'>('grid');
  const [watchedIds,   setWatchedIds]   = useState<Set<string>>(new Set());
  const [toast,        setToast]        = useState<string | null>(null);

  const [cityFilter,  setCityFilter]  = useState<string | null>(null);
  const [typeFilter,  setTypeFilter]  = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [yieldFilter, setYieldFilter] = useState<string | null>(null);

  const hasFilters = !!(cityFilter || typeFilter || priceFilter || yieldFilter);

  // Fetch stats once on mount
  useEffect(() => {
    api.get<PropertyStats>('/api/properties/stats').then((res) => {
      if (res.data) setStats(res.data);
    });
  }, []);

  // Fetch properties whenever filters or sort change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cityFilter)  params.set('city',          cityFilter);
    if (typeFilter)  params.set('property_type',  typeFilter);
    if (priceFilter) params.set('max_price',       priceFilter);
    if (yieldFilter) params.set('min_yield',       yieldFilter);
    params.set('sort_by', sortBy);

    api.get<Property[]>(`/api/properties?${params.toString()}`).then((res) => {
      setProperties(res.data ?? []);
      setLoading(false);
    });
  }, [cityFilter, typeFilter, priceFilter, yieldFilter, sortBy]);

  function clearFilters() {
    setCityFilter(null);
    setTypeFilter(null);
    setPriceFilter(null);
    setYieldFilter(null);
  }

  async function handleWatch(propertyId: string) {
    const already = watchedIds.has(propertyId)
      || properties.find((p) => p.id === propertyId)?.is_watched;
    if (already) return;

    const res = await api.post(`/api/portfolio/watch/${propertyId}`, {});
    if (!res.error) {
      setWatchedIds((prev) => new Set([...prev, propertyId]));
      setToast('Saved. Immonator is analysing…');
    }
  }

  const noProperties = !loading && properties.length === 0 && !hasFilters;
  const noResults    = !loading && properties.length === 0 &&  hasFilters;

  return (
    <>
      <style>{PAGE_STYLES}</style>

      {/* ── Page header ── */}
      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        gap:            16,
        flexWrap:       'wrap',
      }}>
        <div>
          <h1 style={{
            margin:     '0 0 4px',
            fontFamily: 'var(--font-display)',
            fontSize:   32, fontWeight: 400,
            color:      'var(--color-text-primary)',
          }}>
            Properties
          </h1>
          <p style={{
            margin:     0,
            fontSize:   13,
            color:      'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
          }}>
            {stats
              ? `${stats.total_listings.toLocaleString()} listing${stats.total_listings !== 1 ? 's' : ''} across ${stats.total_cities} cit${stats.total_cities !== 1 ? 'ies' : 'y'}`
              : '\u00A0' /* non-breaking space holds height while loading */
            }
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          style={{
            padding:    '9px 18px',
            background: 'transparent',
            border:     '1px solid var(--color-border-strong)',
            borderRadius: 8,
            color:      'var(--color-text-primary)',
            fontSize:   14, fontWeight: 500,
            fontFamily: 'var(--font-body)',
            cursor:     'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Add Property URL
        </button>
      </div>

      {/* ── Context hint (first visit) ── */}
      <div style={{ marginTop: 20 }}>
        <ContextHint
          hintId="properties-save-tip"
          headline="Save to analyse"
          body="Click the ♡ on any property. Immonator analyses it instantly."
          position="top"
        />
      </div>

      {/* ── Filter bar (sticky) ── */}
      <div className="immo-filter-bar">
        <FilterChip label="City"      options={CITY_OPTIONS}  value={cityFilter}  onChange={setCityFilter}  />
        <FilterChip label="Type"      options={TYPE_OPTIONS}  value={typeFilter}  onChange={setTypeFilter}  />
        <FilterChip label="Price"     options={PRICE_OPTIONS} value={priceFilter} onChange={setPriceFilter} />
        <FilterChip label="Min Yield" options={YIELD_OPTIONS} value={yieldFilter} onChange={setYieldFilter} />

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              background:     'none', border: 'none', cursor: 'pointer',
              color:          'var(--color-text-muted)',
              fontSize:       13, fontFamily: 'var(--font-body)',
              textDecoration: 'underline',
            }}
          >
            Clear all
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            background:   'var(--color-bg-elevated)',
            border:       '1px solid var(--color-border-strong)',
            borderRadius: 20,
            padding:      '6px 12px',
            color:        'var(--color-text-secondary)',
            fontSize:     13, fontFamily: 'var(--font-body)',
            cursor:       'pointer', outline: 'none',
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Grid / list toggle */}
        <div style={{
          display:      'flex',
          background:   'var(--color-bg-elevated)',
          border:       '1px solid var(--color-border-strong)',
          borderRadius: 20, overflow: 'hidden',
        }}>
          {(['grid', 'list'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              aria-label={`${mode} view`}
              aria-pressed={viewMode === mode}
              style={{
                padding:    '6px 11px',
                background: viewMode === mode ? 'var(--color-brand-subtle)' : 'none',
                border:     'none', cursor: 'pointer',
                color:      viewMode === mode ? 'var(--color-brand)' : 'var(--color-text-muted)',
                fontSize:   15, lineHeight: 1,
              }}
            >
              {mode === 'grid' ? '⊞' : '☰'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}

      {/* Loading skeletons */}
      {loading && (
        <div className="immo-prop-grid">
          {Array.from({ length: 9 }, (_, i) => <PropertyCardSkeleton key={i} />)}
        </div>
      )}

      {/* Property cards */}
      {!loading && properties.length > 0 && (
        <div className={viewMode === 'grid' ? 'immo-prop-grid' : 'immo-prop-list'}>
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              watched={watchedIds.has(p.id) || (p.is_watched ?? false)}
              onWatch={handleWatch}
            />
          ))}
        </div>
      )}

      {/* Empty — no properties in DB at all */}
      {noProperties && (
        <div style={{ marginTop: 48 }}>
          <EmptyState
            icon="🔍"
            title="No properties yet."
            description="Paste an ImmoScout24 link to add your first property — Immonator analyses it instantly."
            actionLabel="+ Add Property URL"
            onAction={() => setAddModalOpen(true)}
          />
        </div>
      )}

      {/* Empty — filters have no results */}
      {noResults && (
        <div style={{ marginTop: 48 }}>
          <EmptyState
            icon="⚙"
            title="No matches for these filters."
            description="Try widening your price range or selecting more cities."
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        </div>
      )}

      {/* ── Modals & overlays ── */}
      {addModalOpen && (
        <AddPropertyModal onClose={() => setAddModalOpen(false)} />
      )}

      {toast && (
        <Toast message={toast} onDone={() => setToast(null)} />
      )}
    </>
  );
}

export default Properties;
