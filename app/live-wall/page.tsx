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

// Layout geometry. Left = a stat "scoreboard" rail; right = the live demo wall.
// Everything derives from the fixed stage so the scale-to-fit transform is exact.
const PAD = 28;
const COL_GAP = 24; // gap between the rail and the wall
const TILE_GAP = 14; // gap between demo tiles
const RAIL_W = 384; // left scoreboard rail (20% of the 1920 stage)
const LABEL_H = 24; // per-tile header strip

const WALL_W = STAGE_W - PAD * 2 - RAIL_W - COL_GAP; // 1456
const WALL_H = STAGE_H - PAD * 2; // 1024
const TILE_W = Math.floor((WALL_W - (COLS - 1) * TILE_GAP) / COLS); // 353
const ROW_H = Math.floor((WALL_H - (ROWS - 1) * TILE_GAP) / ROWS); // 505
const CONTENT_H = ROW_H - LABEL_H; // 481

// Shrink the funnel content inside each tile so a full card (paywall / booking /
// results) fits vertically. Lower = more vertical content visible (at smaller
// size). The taller tiles in this layout leave plenty of room. Tune here.
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
const LEAD_START = BASE_LEADS + 1; // first on-screen tile is lead #121
// The 8 tiles occupy 121–128; the conversion feed counts forward from there so
// the running ledger never collides with the live tiles.
const FEED_START = LEAD_START + LEAD_COUNT; // 129

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

// Single corner radius for every rectangular surface/control on the dashboard.
const R = { card: '14px' };

type Lead = { id: number; seed: number };
type Outcome = { outcome: 'buy' | 'book'; valueUsd: number };
type FeedEvent = { key: number; leadNo: number; outcome: 'buy' | 'book'; valueUsd: number };

// Pre-fill the conversion feed so the wall reads like it's already mid-stream on
// load — these are earlier leads from today's baseline (already counted in the
// baseline tally, so they don't re-add to it). Negative keys never collide with
// live events, whose keys start at 0 and climb. Newest (highest #) on top.
const SEED_FEED: FeedEvent[] = [
  { key: -1, leadNo: 120, outcome: 'buy', valueUsd: PRICE_USD },
  { key: -2, leadNo: 119, outcome: 'book', valueUsd: 0 },
  { key: -3, leadNo: 117, outcome: 'buy', valueUsd: PRICE_USD },
  { key: -4, leadNo: 116, outcome: 'buy', valueUsd: PRICE_USD },
  { key: -5, leadNo: 114, outcome: 'book', valueUsd: 0 },
  { key: -6, leadNo: 113, outcome: 'buy', valueUsd: PRICE_USD },
];

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

// Smoothly count the displayed number up to each new target (easeOutCubic) so a
// fresh sale visibly ticks the revenue upward instead of snapping. Starts from
// wherever the current animation is, so rapid updates chain cleanly.
function useCountUp(target: number, durationMs = 700): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    const from = displayRef.current;
    const to = target;
    if (from === to) return;
    let start: number | null = null;
    let raf = 0;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (to - from) * eased;
      displayRef.current = value;
      setDisplay(value);
      if (t < 1) raf = requestAnimationFrame(tick);
      else { displayRef.current = to; setDisplay(to); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}

export default function LiveWallPage() {
  // Locked-in recording defaults — no in-UI controls so nothing floats on camera.
  // Tune these here; reload the page to reset the run.
  const sessionKey = 0;
  const speed = 0.5;
  const loop = true;
  const skipPaywallTimer = true;

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

  // Per-tile resolved status (latest wins) drives each tile's status pill.
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({});
  // Running scoreboard — climbs on every completed run (incl. loop replays).
  const [tally, setTally] = useState({
    purchases: BASE_PURCHASES,
    calls: BASE_CALLS,
    revenue: BASE_REVENUE,
  });
  // Reverse-chronological conversion feed for the ticker (newest first).
  const [feed, setFeed] = useState<FeedEvent[]>(SEED_FEED);
  const feedCounterRef = useRef(FEED_START);
  const eventKeyRef = useRef(0);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'kdr-demo') return;
      const leadId = Number(data.leadId);
      if (!Number.isInteger(leadId) || leadId < 0) return;
      const outcome: 'buy' | 'book' = data.outcome === 'book' ? 'book' : 'buy';
      const valueUsd = Number(data.valueUsd) || 0;
      // Real funnel completions only drive the per-tile status pill, so a tile
      // that flips to "Bought/Booked" matches what's on its own screen. The
      // scoreboard tally + ticker run on a fixed cadence (below), independent of
      // how fast each funnel happens to finish.
      setOutcomes((prev) => ({ ...prev, [leadId]: { outcome, valueUsd } }));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Drive the scoreboard + conversion feed at a steady ~6–8s average so the wall
  // always reads "live". Each conversion is a purchase (~60%) or a booked call
  // (~40%), matching the baseline buy/call ratio. Real-time (not scaled by the
  // funnel playback speed).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const emit = () => {
      const isBuy = Math.random() < 0.6;
      const outcome: 'buy' | 'book' = isBuy ? 'buy' : 'book';
      const valueUsd = isBuy ? PRICE_USD : 0;
      setTally((prev) => ({
        purchases: prev.purchases + (isBuy ? 1 : 0),
        calls: prev.calls + (isBuy ? 0 : 1),
        revenue: prev.revenue + valueUsd,
      }));
      const leadNo = feedCounterRef.current++;
      const key = eventKeyRef.current++;
      setFeed((prev) => [{ key, leadNo, outcome, valueUsd }, ...prev].slice(0, 9));
      timer = setTimeout(emit, 6000 + Math.random() * 2000); // next in 6–8s
    };
    timer = setTimeout(emit, 6000 + Math.random() * 2000);
    return () => clearTimeout(timer);
  }, []);

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
          flexDirection: 'row',
          gap: `${COL_GAP}px`,
          background: 'linear-gradient(160deg, #ffffff 0%, #f1f5f9 100%)',
          position: 'relative',
        }}
      >
        {/* ── Left scoreboard rail ── */}
        <aside
          style={{
            width: `${RAIL_W}px`,
            height: `${WALL_H}px`,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LiveRangeSelect />
            <span
              style={{
                color: C.green,
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              Low Ticket v1.2
            </span>
          </div>

          <RevenueHero amount={tally.revenue} />

          <div style={{ display: 'flex', gap: '12px' }}>
            <MiniStat label="Purchases" value={tally.purchases.toLocaleString()} />
            <MiniStat label="Calls" value={tally.calls.toLocaleString()} />
            <MiniStat label="Upsell %" value={`${UPSELL_PCT}%`} />
          </div>

          <Ticker feed={feed} />
        </aside>

        {/* ── Right demo wall ── */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${TILE_W}px)`,
            gridTemplateRows: `repeat(${ROWS}, ${ROW_H}px)`,
            gap: `${TILE_GAP}px`,
            alignContent: 'start',
            flex: 1,
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
                    title={`Lead ${LEAD_START + index}`}
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

      </div>

      <style>{`
        .wall-range-item:hover { background: #f1f5f9 !important; }
        @keyframes wall-feed-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
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
          fontSize: '16px',
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
                fontSize: '16px',
                fontWeight: 600,
                color: C.ink,
              }}
            >
              {r.key === 'today' && (
                <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: C.green }} />
              )}
              <span style={{ flex: 1 }}>{r.label}</span>
              {r.key === 'today' && (
                <span style={{ color: C.green, fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>LIVE</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The hero number — the focal point of the recording. Big, tabular, green.
// Counts up to each new total so a fresh sale ticks the number upward.
function RevenueHero({ amount }: { amount: number }) {
  const display = useCountUp(amount);
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: R.card,
        boxShadow: C.cardShadow,
        padding: '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ color: C.muted, fontSize: '16px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
        Revenue · today
      </div>
      <div
        style={{
          color: C.green,
          fontSize: '88px',
          fontWeight: 700,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-1.5px',
        }}
      >
        {`$${Math.round(display).toLocaleString()}`}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: C.green, fontSize: '16px', fontWeight: 600 }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: C.green }} className="pulse-glow" />
        Updating live
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: R.card,
        padding: '16px 18px',
        boxShadow: C.cardShadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div style={{ color: C.muted, fontSize: '13px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ color: C.ink, fontSize: '41px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}

// Reverse-chronological feed of conversions; new rows animate in at the top.
function Ticker({ feed }: { feed: FeedEvent[] }) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: R.card,
        boxShadow: C.cardShadow,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: C.muted, fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
          Latest conversions
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
        {feed.length === 0 && (
          <div style={{ color: C.faint, fontSize: '17px', padding: '8px 0' }}>Waiting for the first conversion…</div>
        )}
        {feed.map((e) => {
          const isBuy = e.outcome === 'buy';
          const accent = isBuy ? C.green : C.blue;
          return (
            <div
              key={e.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 4px',
                borderBottom: `1px solid ${C.subtle}`,
                animation: 'wall-feed-in 280ms ease-out',
              }}
            >
              <span style={{ width: '9px', height: '9px', borderRadius: '999px', background: accent, flexShrink: 0 }} />
              <span style={{ color: C.ink, fontSize: '18px', fontWeight: 600, flexShrink: 0 }}>
                Lead {e.leadNo}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{ color: accent, fontSize: '18px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {isBuy ? `bought · $${e.valueUsd}` : 'booked a call'}
              </span>
            </div>
          );
        })}
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
