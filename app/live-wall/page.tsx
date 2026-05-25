'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createSeededRandom } from '@/lib/demoAuto';
import { BASE_PATH } from '@/lib/basePath';

// ── Fixed recording stage ───────────────────────────────────────────────
const STAGE_W = 1920;
const STAGE_H = 1080;

const COLS = 4;
const ROWS = 2;
const LEAD_COUNT = COLS * ROWS; // 8

// Layout geometry (all derived from the fixed stage, so transforms are exact).
const PAD = 28;
const GAP = 12;
const HEADER_H = 156;
const HEADER_GAP = 16;
const LABEL_H = 24;

const GRID_W = STAGE_W - PAD * 2;
const GRID_H = STAGE_H - PAD * 2 - HEADER_H - HEADER_GAP;
const TILE_W = Math.floor((GRID_W - (COLS - 1) * GAP) / COLS);
const ROW_H = Math.floor((GRID_H - (ROWS - 1) * GAP) / ROWS);
const CONTENT_H = ROW_H - LABEL_H;

// Shrink the funnel content inside each tile so a full card (paywall / booking /
// results) fits vertically instead of being cropped at the bottom. Lower = more
// vertical content visible (at smaller size). Tune here.
const DEMO_SCALE = 0.62;

// Distinct, evenly-spread funnel start points (one per tile) so no two demos
// ever begin at the same step. Spans the ~14-step quiz portion of the funnel.
const START_STEPS = Array.from({ length: LEAD_COUNT }, (_, i) =>
  1 + Math.round((i * 13) / Math.max(1, LEAD_COUNT - 1)),
);

// ── "Running all day" baseline ──────────────────────────────────────────
// Seed the tally so the wall reads like it has been live since this morning;
// the visible leads tick these upward in real time. Lead numbers continue from
// the day's processed count so the figures reconcile on screen. Tune freely.
const PRICE_USD = 27; // low-ticket purchase
const UPSELL_PRICE_USD = 240; // upsell taken by UPSELL_PCT of buyers
const UPSELL_PCT = 35; // % of purchases that take the upsell
const BASE_LEADS = 120; // quiz-takers earlier today → lead numbers start at 121
const BASE_PURCHASES = 45; // low-ticket purchases earlier today
const BASE_CALLS = 30; // strategy calls booked earlier today
const BASE_UPSELLS = Math.round((BASE_PURCHASES * UPSELL_PCT) / 100); // 16
const BASE_REVENUE = BASE_PURCHASES * PRICE_USD + BASE_UPSELLS * UPSELL_PRICE_USD; // ≈ $5,055
const LEAD_START = BASE_LEADS + 1; // next lead # of the day (visitor index → 121)

// ── Design-system palette (light) ───────────────────────────────────────
const C = {
  letterbox: '#e5e7eb',
  appBg: '#F6F6F7',
  card: '#ffffff',
  border: '#E5E5E8',
  ink: '#1A1A1A',
  muted: '#71717A',
  faint: '#A1A1AA',
  green: '#2E7D52', // brand green (buy / revenue)
  blue: '#2563EB', // booked call
  subtle: '#F1F5F9', // hover / selected / inset surfaces
  slate: '#334155', // secondary control text
  cardShadow: '0 4px 16px rgba(15,23,42,0.06)',
};

// Single corner radius for every rectangular surface/control on the dashboard
// (cards, tiles, selector, menus, buttons). Round dots are circles, separate.
const R = { card: '14px' };

type Lead = { id: number; seed: number };
type Outcome = { outcome: 'buy' | 'book'; valueUsd: number };

// Scale the stage to fit the current window (1:1 at 1920×1080), SSR-safe.
function useFitScale(): number {
  const dims = useSyncExternalStore(
    (cb) => {
      window.addEventListener('resize', cb);
      return () => window.removeEventListener('resize', cb);
    },
    () => `${window.innerWidth}x${window.innerHeight}`,
    () => `${STAGE_W}x${STAGE_H}`,
  );
  const [w, h] = dims.split('x').map(Number);
  return Math.min(w / STAGE_W, h / STAGE_H);
}

export default function LiveWallPage() {
  const [sessionKey, setSessionKey] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [skipPaywallTimer, setSkipPaywallTimer] = useState(true);
  const [showControls, setShowControls] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('controls') === '1';
  });

  const fit = useFitScale();

  useEffect(() => {
    const prevHtml = document.documentElement.style.cssText;
    const prevBody = document.body.style.cssText;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.background = C.letterbox;

    // Hide the Next.js dev error overlay/toast so it stays out of the recording.
    const style = document.createElement('style');
    style.textContent = `
      nextjs-portal, .nextjs-toast-errors-parent, .nextjs-toast-errors,
      [data-nextjs-toast], [data-nextjs-dialog-overlay],
      nextjs-dev-toolbar { display: none !important; }
    `;
    document.head.appendChild(style);

    return () => {
      document.documentElement.style.cssText = prevHtml;
      document.body.style.cssText = prevBody;
      style.remove();
    };
  }, []);

  const leads = useMemo<Lead[]>(
    () => Array.from({ length: LEAD_COUNT }, (_, index) => ({ id: index, seed: 7000 + index * 37 })),
    [],
  );

  // Each iframe reports its resolved outcome up via postMessage; deduped by leadId.
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({});

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'kdr-demo') return;
      const leadId = Number(data.leadId);
      if (!Number.isInteger(leadId) || leadId < 0) return;
      const outcome = data.outcome === 'book' ? 'book' : 'buy';
      const valueUsd = Number(data.valueUsd) || 0;
      // First outcome per lead wins, so loop replays don't double-count.
      setOutcomes((prev) => (prev[leadId] ? prev : { ...prev, [leadId]: { outcome, valueUsd } }));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const tally = useMemo(() => {
    const list = Object.values(outcomes);
    const purchases = BASE_PURCHASES + list.filter((o) => o.outcome === 'buy').length;
    const calls = BASE_CALLS + list.filter((o) => o.outcome === 'book').length;
    const revenue = BASE_REVENUE + list.reduce((sum, o) => sum + o.valueUsd, 0);
    return { purchases, calls, revenue };
  }, [outcomes]);

  const buildFrameSrc = (lead: Lead, index: number) => {
    const random = createSeededRandom(lead.seed + sessionKey * 1000);

    // Distinct start step per tile (assignment rotated each session for variety)
    // so the demos never begin in sync.
    const rotation = Math.floor(createSeededRandom(sessionKey + 1)() * LEAD_COUNT);
    const demoStartAt = START_STEPS[(index + rotation) % LEAD_COUNT];

    // Per-tile cadence + loop delay so the demos keep drifting apart and never
    // phase-lock, even across loop replays.
    const answerDelay = 1150 + Math.floor(random() * 650); // ~1150–1800ms between answers
    const loopDelay = 3500 + Math.floor(random() * 3000); // ~3.5–6.5s before each replay

    const params = new URLSearchParams({
      demoAuto: '1',
      demoLeadId: String(lead.id),
      demoSeed: String(lead.seed + sessionKey * 1000),
      demoStartAt: String(demoStartAt),
      demoAnswerDelayMs: String(answerDelay),
      demoScale: String(DEMO_SCALE),
      demoSpeed: String(speed),
      demoLoop: loop ? '1' : '0',
      demoLoopDelayMs: String(loopDelay),
      skipPaywallTimer: skipPaywallTimer ? '1' : '0',
      hideDemoControls: '1',
    });

    return `${BASE_PATH}/?${params.toString()}`;
  };

  const restart = () => {
    setOutcomes({});
    setSessionKey((key) => key + 1);
  };

  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        background: C.letterbox,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${STAGE_W}px`,
          height: `${STAGE_H}px`,
          transform: `scale(${fit})`,
          transformOrigin: 'center center',
          flexShrink: 0,
          padding: `${PAD}px`,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #ffffff 0%, #f1f5f9 100%)',
          position: 'relative',
        }}
      >
        {/* ── Hero header (centered) ── */}
        <header
          style={{
            height: `${HEADER_H}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LiveRangeSelect />
            <span
              style={{
                color: C.green,
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '2.5px',
                textTransform: 'uppercase',
              }}
            >
              Kodara - Low Ticket v1.2 Funnel
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'stretch' }}>
            <StatBlock label="Revenue · today" value={`$${tally.revenue.toLocaleString()}`} accent={C.green} />
            <StatBlock label="Purchases" value={tally.purchases.toLocaleString()} accent={C.muted} />
            <StatBlock label="Calls booked" value={tally.calls.toLocaleString()} accent={C.muted} />
            <StatBlock label="Upsell %" value={`${UPSELL_PCT}%`} accent={C.muted} />
          </div>
        </header>

        <div style={{ height: `${HEADER_GAP}px` }} />

        {/* ── Tile grid ── */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${TILE_W}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${ROW_H}px)`,
            gap: `${GAP}px`,
            justifyContent: 'center',
          }}
        >
          {leads.map((lead, index) => {
            const resolved = outcomes[lead.id];
            return (
              <article
                key={`${sessionKey}-${lead.id}`}
                style={{
                  width: `${TILE_W}px`,
                  height: `${ROW_H}px`,
                  borderRadius: R.card,
                  overflow: 'hidden',
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  boxShadow: C.cardShadow,
                }}
              >
                <header
                  style={{
                    height: `${LABEL_H}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    background: C.card,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <span style={{ color: C.muted, textTransform: 'uppercase' }}>
                    Lead {LEAD_START + index}
                  </span>
                  <StatusPill resolved={resolved} />
                </header>

                <div style={{ width: `${TILE_W}px`, height: `${CONTENT_H}px`, overflow: 'hidden', background: C.appBg }}>
                  <iframe
                    title={`Lead ${index + 1}`}
                    src={buildFrameSrc(lead, index)}
                    allow="autoplay"
                    style={{
                      width: `${TILE_W}px`,
                      height: `${CONTENT_H}px`,
                      border: 'none',
                      display: 'block',
                      pointerEvents: 'none',
                      background: C.appBg,
                    }}
                  />
                </div>
              </article>
            );
          })}
        </section>

        {/* ── Presentation controls (hidden by default; hover dot or ?controls=1) ── */}
        <button
          type="button"
          onClick={() => setShowControls((v) => !v)}
          aria-label="Toggle controls"
          className="wall-gear"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '26px',
            height: '26px',
            borderRadius: R.card,
            border: `1px solid ${C.border}`,
            background: 'rgba(255,255,255,0.85)',
            color: C.muted,
            cursor: 'pointer',
            opacity: showControls ? 0.9 : 0,
            transition: 'opacity 0.15s',
            fontSize: '13px',
            lineHeight: 1,
          }}
        >
          ⚙
        </button>

        {showControls && (
          <div
            style={{
              position: 'absolute',
              top: '44px',
              right: '10px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: R.card,
              padding: '12px 14px',
              boxShadow: C.cardShadow,
            }}
          >
            <label style={{ color: C.slate, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Speed
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                style={{ background: C.card, color: C.ink, border: `1px solid ${C.border}`, borderRadius: R.card, fontSize: '12px', padding: '6px 8px' }}
              >
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
              </select>
            </label>
            <label style={{ color: C.slate, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
              Auto-loop
            </label>
            <label style={{ color: C.slate, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="checkbox" checked={skipPaywallTimer} onChange={(e) => setSkipPaywallTimer(e.target.checked)} />
              Skip paywall timer
            </label>
            <button
              type="button"
              onClick={restart}
              style={{ background: C.green, color: C.card, border: 'none', borderRadius: R.card, fontWeight: 700, fontSize: '12px', padding: '8px 16px', cursor: 'pointer' }}
            >
              Restart all {LEAD_COUNT}
            </button>
          </div>
        )}
      </div>

      <style>{`
        .wall-gear:hover { opacity: 0.9 !important; }
        .wall-range-item:hover { background: #f1f5f9 !important; }
      `}</style>
    </main>
  );
}

const RANGE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
] as const;

// Relative date-range selector. Defaults to "Today" (shown with a live dot);
// the menu is cosmetic for the demo — it doesn't refilter the wall data.
function LiveRangeSelect() {
  const [open, setOpen] = useState(false);
  const [rangeKey, setRangeKey] = useState<string>('today');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = RANGE_OPTIONS.find((r) => r.key === rangeKey) ?? RANGE_OPTIONS[0];
  const isLive = rangeKey === 'today';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: R.card,
          padding: '7px 14px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          boxShadow: C.cardShadow,
        }}
      >
        {isLive && (
          <>
            <span
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '999px',
                background: C.green,
                boxShadow: '0 0 0 4px rgba(46,125,82,0.18)',
              }}
            />
            <span style={{ color: C.green }}>Live</span>
            <span style={{ color: C.border }}>·</span>
          </>
        )}
        <span style={{ color: C.ink }}>{current.label}</span>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: C.muted, marginLeft: '2px' }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: '180px',
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: R.card,
            boxShadow: C.cardShadow,
            padding: '6px',
            zIndex: 50,
          }}
        >
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              className="wall-range-item"
              onClick={() => {
                setRangeKey(r.key);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                textAlign: 'left',
                background: r.key === rangeKey ? C.subtle : 'transparent',
                border: 'none',
                borderRadius: R.card,
                padding: '8px 12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 600,
                color: C.ink,
              }}
            >
              {r.key === 'today' && (
                <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: C.green }} />
              )}
              <span style={{ flex: 1 }}>{r.label}</span>
              {r.key === 'today' && (
                <span style={{ color: C.green, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>LIVE</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBlock({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        minWidth: '176px',
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: R.card,
        padding: '16px 20px',
        boxShadow: C.cardShadow,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ color: C.muted, fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ color: accent, fontSize: '40px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}

function StatusPill({ resolved }: { resolved?: Outcome }) {
  let dot = C.faint;
  let text = 'Working…';
  let color = C.muted;
  if (resolved?.outcome === 'buy') {
    dot = C.green;
    color = C.green;
    text = `Bought · $${resolved.valueUsd}`;
  } else if (resolved?.outcome === 'book') {
    dot = C.blue;
    color = C.blue;
    text = 'Booked call';
  }
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: dot }} />
      {text}
    </span>
  );
}
