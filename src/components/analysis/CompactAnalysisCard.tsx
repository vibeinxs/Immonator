import React, { useState, useEffect, useRef } from 'react';
import { api }          from '../../lib/api';
import { VerdictBadge, type Verdict } from '../common/VerdictBadge';
import { LoadingState } from '../common/LoadingState';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompactAnalysisData {
  status:            'not_generated' | 'ready';
  verdict?:          Verdict;
  /** 0 – 10 */
  confidence?:       number;
  one_line_summary?: string;
  positives?:        string[];
  risks?:            string[];
  generated_at?:     string;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_STYLES = `
@keyframes immo-compact-pulse {
  0%   { transform: scale(1);    }
  50%  { transform: scale(1.05); }
  100% { transform: scale(1);    }
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso?: string): string {
  if (!iso) return 'Just now';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins   = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Animated ellipsis ─────────────────────────────────────────────────────────

function AnimatedDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setCount((c) => (c % 3) + 1), 500);
    return () => clearInterval(t);
  }, []);
  return <span aria-hidden="true">{'.' .repeat(count)}</span>;
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.min(Math.max(value / max, 0), 1) * 100;
  const barColor =
    pct >= 70 ? 'var(--color-success)'
    : pct >= 50 ? 'var(--color-brand)'
    :             'var(--color-warning)';

  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{
        width:        80,
        height:       6,
        borderRadius: 3,
        background:   'var(--color-bg-elevated)',
        overflow:     'hidden',
        flexShrink:   0,
      }}
    >
      <div
        style={{
          width:        `${pct}%`,
          height:       '100%',
          background:   barColor,
          borderRadius: 3,
          transition:   'width 600ms ease',
        }}
      />
    </div>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────

function CompactAnalysisLoading() {
  return (
    <div>
      {/* Card skeleton */}
      <div
        style={{
          background:    'var(--color-bg-surface)',
          border:        '1px solid var(--color-border)',
          borderRadius:  12,
          padding:       20,
          minHeight:     160,
          display:       'flex',
          flexDirection: 'column',
          gap:           12,
        }}
      >
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <LoadingState height={24} width={110} borderRadius={6} />
          <LoadingState height={14} width={130} borderRadius={4} />
        </div>

        {/* Headline */}
        <LoadingState height={22} width="88%" />
        <LoadingState height={16} width="60%" />

        {/* Two-column list */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <LoadingState height={11} width={60} borderRadius={3} />
            <LoadingState height={13} />
            <LoadingState height={13} width="80%" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <LoadingState height={11} width={40} borderRadius={3} />
            <LoadingState height={13} />
            <LoadingState height={13} width="75%" />
          </div>
        </div>
      </div>

      {/* Status line below card */}
      <p
        style={{
          margin:     '8px 0 0',
          textAlign:  'center',
          fontSize:   12,
          fontFamily: 'var(--font-body)',
          color:      'var(--color-text-muted)',
        }}
      >
        Immonator is analysing this property<AnimatedDots />
      </p>
    </div>
  );
}

// ── Loaded card ───────────────────────────────────────────────────────────────

function CompactAnalysisLoaded({
  data,
  animateBadge,
}: {
  data:         CompactAnalysisData;
  animateBadge: boolean;
}) {
  const positives = data.positives ?? [];
  const risks     = data.risks     ?? [];
  const hasLists  = positives.length > 0 || risks.length > 0;

  return (
    <div
      style={{
        background:   'var(--color-bg-surface)',
        border:       '1px solid var(--color-border)',
        borderRadius: 12,
        padding:      20,
      }}
    >
      {/* ── Top row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        {/* Verdict badge — pulse on first load */}
        <span
          style={{
            display:       'inline-block',
            transformOrigin: 'left center',
            animation:     animateBadge ? 'immo-compact-pulse 400ms ease' : undefined,
          }}
        >
          {data.verdict && <VerdictBadge verdict={data.verdict} />}
        </span>

        {/* Confidence + progress bar */}
        {data.confidence !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span
              style={{
                fontSize:   11,
                fontFamily: 'var(--font-body)',
                color:      'var(--color-text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              Confidence {data.confidence}/10
            </span>
            <ProgressBar value={data.confidence} />
          </div>
        )}
      </div>

      {/* ── Headline ── */}
      {data.one_line_summary && (
        <p
          style={{
            margin:     '12px 0',
            fontSize:   18,
            fontWeight: 600,
            lineHeight: 1.4,
            color:      'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {data.one_line_summary}
        </p>
      )}

      {/* ── Two columns ── */}
      {hasLists && (
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 16,
            marginTop:           data.one_line_summary ? 0 : 12,
          }}
        >
          {/* Positives */}
          <div>
            <p
              style={{
                margin:        '0 0 8px',
                fontSize:      11,
                fontWeight:    600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color:         'var(--color-text-muted)',
                fontFamily:    'var(--font-body)',
              }}
            >
              Positives
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {positives.map((pt, i) => (
                <li
                  key={i}
                  style={{
                    display:    'flex',
                    gap:        6,
                    fontSize:   14,
                    lineHeight: 1.45,
                    fontFamily: 'var(--font-body)',
                    color:      'var(--color-text-secondary)',
                  }}
                >
                  <span style={{ color: 'var(--color-success)', flexShrink: 0, lineHeight: 1.45 }}>✓</span>
                  {pt}
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div>
            <p
              style={{
                margin:        '0 0 8px',
                fontSize:      11,
                fontWeight:    600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color:         'var(--color-text-muted)',
                fontFamily:    'var(--font-body)',
              }}
            >
              Risks
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {risks.map((r, i) => (
                <li
                  key={i}
                  style={{
                    display:    'flex',
                    gap:        6,
                    fontSize:   14,
                    lineHeight: 1.45,
                    fontFamily: 'var(--font-body)',
                    color:      'var(--color-text-secondary)',
                  }}
                >
                  <span style={{ color: 'var(--color-warning)', flexShrink: 0, lineHeight: 1.45 }}>⚠</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Bottom row ── */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'flex-end',
          marginTop:      16,
          paddingTop:     12,
          borderTop:      '1px solid var(--color-border)',
        }}
      >
        <span
          style={{
            fontSize:   11,
            fontFamily: 'var(--font-body)',
            color:      'var(--color-text-muted)',
          }}
        >
          Immonator AI · {relativeTime(data.generated_at)}
        </span>
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function CompactAnalysisError({ message }: { message: string }) {
  return (
    <div
      style={{
        background:   'var(--color-danger-bg)',
        border:       '1px solid var(--color-danger)',
        borderRadius: 12,
        padding:      '14px 20px',
        fontSize:     13,
        fontFamily:   'var(--font-body)',
        color:        'var(--color-danger)',
      }}
    >
      {message}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function CompactAnalysisCard({ propertyId }: { propertyId: string }) {
  type FetchState = 'loading' | 'polling' | 'ready' | 'error';

  const [fetchState,   setFetchState]   = useState<FetchState>('loading');
  const [data,         setData]         = useState<CompactAnalysisData | null>(null);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [animateBadge, setAnimateBadge] = useState(false);

  /** Flip to false after the badge has animated once. */
  const firstLoadRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    /**
     * Fetches /api/analysis/compact/{propertyId}.
     * Returns true when polling should stop (data ready or error).
     */
    async function tryFetch(): Promise<boolean> {
      const res = await api.get<CompactAnalysisData>(`/api/analysis/compact/${propertyId}`);
      if (cancelled) return true;

      if (res.error) {
        setErrorMsg(res.error);
        setFetchState('error');
        return true;
      }

      if (res.data.status === 'not_generated') {
        // Transition to polling UI only once
        setFetchState((prev) => (prev === 'loading' ? 'polling' : prev));
        return false;
      }

      // Analysis is ready
      setData(res.data);
      setFetchState('ready');

      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        setAnimateBadge(true);
        setTimeout(() => {
          if (!cancelled) setAnimateBadge(false);
        }, 400);
      }

      return true;
    }

    async function init() {
      const done = await tryFetch();
      if (cancelled || done) return;

      pollId = setInterval(async () => {
        const done = await tryFetch();
        if (done && pollId) clearInterval(pollId);
      }, 3000);
    }

    init();

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
    };
  }, [propertyId]);

  return (
    <>
      <style>{CARD_STYLES}</style>

      {(fetchState === 'loading' || fetchState === 'polling') && (
        <CompactAnalysisLoading />
      )}

      {fetchState === 'ready' && data && (
        <CompactAnalysisLoaded data={data} animateBadge={animateBadge} />
      )}

      {fetchState === 'error' && (
        <CompactAnalysisError message={errorMsg ?? 'Analysis could not be loaded.'} />
      )}
    </>
  );
}

export default CompactAnalysisCard;
