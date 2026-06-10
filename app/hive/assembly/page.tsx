'use client';

// HIVE VARIANT 5 · "Assembly Line" — leads in, customers out. Gray lead cards
// ride the belt into the brain; green value cards come out the other side and
// drop into the day's revenue bin. Live funnels above show the work.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_W, STAGE_H, C, R,
  createLeads, buildFunnelSrc, saleLabel,
  useFitStage, useRecordingChrome, useLiveTally, useRealTileOutcomes, useCountUp,
  type Outcome,
} from '@/lib/adStage';

const LETTERBOX = '#e5e7eb';

const BELT_Y = 800, BELT_H = 88;
const CORE_R = 150;
const CORE_CX = STAGE_W / 2, CORE_CY = BELT_Y - 30;

// ── Live tiles above the line ──
const LIVE = 4;
const TILE_W = 330, TILE_H = 380, TILE_GAP = 36;
const TILES_W = LIVE * TILE_W + (LIVE - 1) * TILE_GAP;
const TILES_X = (STAGE_W - TILES_W) / 2, TILES_Y = 120;

// ── Belt cards ──
// Enter: from off-left to the core (3.2s). Exit: core to the bin (3.2s, starts 3.4s
// after the event so the core visibly "had it" for a beat).
type Card = { key: number; kind: 'in' | 'out'; label: string; buy: boolean };
const ENTER_MS = 3200, EXIT_DELAY_MS = 3400, EXIT_MS = 3200;
const NAMES = ['M. Torres', 'D. Reed', 'P. Shah', 'J. Cole', 'S. Kim', 'L. Ortiz', 'A. Brooks', 'N. Vance'];

export default function AssemblyAd() {
  const fit = useFitStage();
  useRecordingChrome(LETTERBOX);
  const leads = useMemo(() => createLeads(LIVE), []);
  const outcomes = useRealTileOutcomes();
  const { tally, feed } = useLiveTally({ minMs: 4500, maxMs: 7000 });
  const revenue = useCountUp(tally.revenue);

  const [cards, setCards] = useState<Card[]>([]);
  const lastKey = useRef<number | null>(null);
  // Use a persistent timer Set so each event's timers run to completion
  // independently — if a new feed event fires before the prune timer (at ~7s)
  // the prune still runs instead of being cancelled by effect-cleanup.
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    // Unmount-only cleanup: clear all outstanding timers when the component unmounts.
    // Capture the ref value in a local variable so the closure sees a stable reference.
    const t = timers.current;
    return () => { t.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    const top = feed[0];
    if (!top || lastKey.current === top.key) return;
    lastKey.current = top.key;
    const name = NAMES[top.leadNo % NAMES.length];
    const buy = top.outcome === 'buy';
    const inCard: Card = { key: top.key * 2, kind: 'in', label: name, buy };

    const spawnTimer = setTimeout(() => {
      timers.current.delete(spawnTimer);
      setCards((prev) => [...prev.slice(-7), inCard]);
    }, 0);
    timers.current.add(spawnTimer);

    const outTimer = setTimeout(() => {
      timers.current.delete(outTimer);
      setCards((prev) => [...prev.slice(-7), { key: top.key * 2 + 1, kind: 'out', label: buy ? saleLabel(top.valueUsd) : 'CALL BOOKED', buy }]);
    }, EXIT_DELAY_MS);
    timers.current.add(outTimer);

    const pruneTimer = setTimeout(() => {
      timers.current.delete(pruneTimer);
      setCards((prev) => prev.filter((c) => c.key !== top.key * 2 && c.key !== top.key * 2 + 1));
    }, EXIT_DELAY_MS + EXIT_MS + 400);
    timers.current.add(pruneTimer);
  }, [feed]);

  return (
    <main style={{ position: 'fixed', inset: 0, background: LETTERBOX, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(120% 90% at 50% 0%, #ffffff 0%, #F6F6F7 70%)',
          fontFamily: 'inherit',
        }}
      >
        <header style={{ position: 'absolute', top: 30, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 56px', zIndex: 40 }}>
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: C.muted }}>Leads in</span>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: C.ink }}>Lucas AI · The Line Never Stops</span>
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: C.green }}>Customers out</span>
        </header>

        {/* Live tiles above the line */}
        {leads.map((lead, i) => {
          const resolved = outcomes[lead.id];
          const isBuy = resolved?.outcome === 'buy';
          return (
            <article key={lead.id} style={{
                position: 'absolute', left: TILES_X + i * (TILE_W + TILE_GAP), top: TILES_Y, width: TILE_W, height: TILE_H,
                borderRadius: R.card, overflow: 'hidden', zIndex: 20,
                border: isBuy ? `3px solid ${C.green}` : `1px solid ${C.border}`,
                background: '#fff', boxShadow: isBuy ? '0 0 28px rgba(46,125,82,0.35)' : C.cardShadow,
                transition: 'all 0.3s ease',
              }}>
              <header style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: isBuy ? C.green : C.subtle, color: isBuy ? '#fff' : C.ink, borderBottom: `1px solid ${C.border}`, transition: 'background 0.3s ease' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Lucas AI #{String(i + 1).padStart(2, '0')}</span>
                <StatusPill resolved={resolved} />
              </header>
              <iframe title={`assembly-${i}`} src={buildFunnelSrc(lead, i, { count: LIVE, demoScale: 0.6, speed: 0.5 })} allow="autoplay"
                style={{ width: '100%', height: TILE_H - 40, border: 'none', pointerEvents: 'none', display: 'block' }} />
            </article>
          );
        })}

        {/* Belt */}
        <div className="belt" style={{ position: 'absolute', left: 0, right: 0, top: BELT_Y, height: BELT_H, zIndex: 10, borderTop: `2px solid ${C.border}`, borderBottom: `2px solid ${C.border}` }} />

        {/* Belt cards (enter under the core; exit from it) */}
        {cards.map((c) => (
          <div key={c.key} className={c.kind === 'in' ? 'card-in' : 'card-out'} style={{
              position: 'absolute', top: BELT_Y + 10, width: 150, height: 66, zIndex: 12,
              borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              background: c.kind === 'in' ? '#9ca3af' : c.buy ? C.green : C.slate,
              color: '#fff', boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
            }}>
            <span style={{ fontSize: c.kind === 'in' ? 16 : 20, fontWeight: 800 }}>{c.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.85 }}>
              {c.kind === 'in' ? 'New lead' : c.buy ? 'Sale closed' : 'Qualified'}
            </span>
          </div>
        ))}

        {/* Core (sits ON the line) */}
        <div style={{
            position: 'absolute', left: CORE_CX - CORE_R, top: CORE_CY - CORE_R,
            width: CORE_R * 2, height: CORE_R * 2, borderRadius: '50%', zIndex: 30,
            background: 'radial-gradient(circle at 30% 30%, #4ade80 0%, #166534 60%, #064e3b 100%)',
            boxShadow: '0 0 54px rgba(74,222,128,0.4), inset 0 4px 14px rgba(255,255,255,0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.2 }}>Lucas AI</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>working every lead</span>
        </div>

        {/* Revenue bin (right edge) */}
        <div style={{ position: 'absolute', right: 40, top: BELT_Y - 76, zIndex: 35, background: '#fff', border: `1px solid ${C.border}`, borderRadius: R.lg, boxShadow: C.cardShadow, padding: '16px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: C.muted }}>Today</div>
          <div style={{ fontSize: 46, fontWeight: 800, color: C.green, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            ${Math.round(revenue).toLocaleString()}
          </div>
        </div>

        <style>{`
          .belt {
            background: repeating-linear-gradient(90deg, #ececef 0 26px, #e3e3e7 26px 52px);
            animation: belt-run 1.1s linear infinite;
          }
          @keyframes belt-run { from { background-position: 0 0; } to { background-position: 52px 0; } }
          .card-in { animation: card-in-k ${ENTER_MS}ms linear forwards; }
          @keyframes card-in-k {
            from { left: -160px; opacity: 1; }
            92% { opacity: 1; }
            to { left: ${CORE_CX - 75}px; opacity: 0; }
          }
          .card-out { animation: card-out-k ${EXIT_MS}ms linear forwards; }
          @keyframes card-out-k {
            from { left: ${CORE_CX - 75}px; opacity: 0; }
            10% { opacity: 1; }
            92% { opacity: 1; }
            to { left: ${STAGE_W - 230}px; opacity: 0; }
          }
        `}</style>
      </div>
    </main>
  );
}

function StatusPill({ resolved }: { resolved?: Outcome }) {
  if (resolved?.outcome === 'buy') return <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>SOLD ${resolved.valueUsd}</span>;
  if (resolved?.outcome === 'book') return <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>BOOKED</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: C.muted }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: C.slate }} className="pulse-glow" /> Working…
    </span>
  );
}
