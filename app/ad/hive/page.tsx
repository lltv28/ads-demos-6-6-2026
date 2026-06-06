'use client';

// AD VARIANT H · "The Hive" (Optimized for FB Ads)
// Focus: The Brain. Reverts to glowing curved lines, massive central brain orb,
// and visible bright green pulses shooting down wires on every sale to clearly
// communicate "AI generating money".

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_W, STAGE_H, C,
  createLeads, buildFunnelSrc, makeAgentStats, money,
  useFitStage, useRecordingChrome, useLiveTally, useTileOutcomes, useCountUp,
  type Outcome,
} from '@/lib/adStage';

const BG = '#0f172a'; // Deep dark blue/gray for maximum glowing contrast

const CORE_CX = STAGE_W / 2;
const CORE_CY = STAGE_H / 2;
const CORE_R = 180;

const TILES = 6;
const TILE_W = 380;
const TILE_H = 460;
const TILE_LABEL_H = 40;
const TILE_FOOTER_H = 52;
const TILE_CONTENT_H = TILE_H - TILE_LABEL_H - TILE_FOOTER_H;
const STATS = makeAgentStats(TILES, 5150);

const EDGE_PAD = 80;
const LEFT_X = EDGE_PAD;
const RIGHT_X = STAGE_W - EDGE_PAD - TILE_W;

const TILE_GAP = 32;
const COL_H = TILE_H * 3 + TILE_GAP * 2;
const COL_TOP = Math.round((STAGE_H - COL_H) / 2);

const ROW_Y = [
  COL_TOP,
  COL_TOP + TILE_H + TILE_GAP,
  COL_TOP + (TILE_H + TILE_GAP) * 2,
];

type TilePos = { x: number; y: number; side: 'L' | 'R'; cx: number; cy: number };

const POS: TilePos[] = [
  { x: LEFT_X, y: ROW_Y[0], side: 'L', cx: LEFT_X + TILE_W, cy: ROW_Y[0] + TILE_H / 2 },
  { x: LEFT_X, y: ROW_Y[1], side: 'L', cx: LEFT_X + TILE_W, cy: ROW_Y[1] + TILE_H / 2 },
  { x: LEFT_X, y: ROW_Y[2], side: 'L', cx: LEFT_X + TILE_W, cy: ROW_Y[2] + TILE_H / 2 },
  { x: RIGHT_X, y: ROW_Y[0], side: 'R', cx: RIGHT_X, cy: ROW_Y[0] + TILE_H / 2 },
  { x: RIGHT_X, y: ROW_Y[1], side: 'R', cx: RIGHT_X, cy: ROW_Y[1] + TILE_H / 2 },
  { x: RIGHT_X, y: ROW_Y[2], side: 'R', cx: RIGHT_X, cy: ROW_Y[2] + TILE_H / 2 },
];

function threadPath(p: TilePos): string {
  const ang = Math.atan2(p.cy - CORE_CY, p.cx - CORE_CX);
  const sx = CORE_CX + Math.cos(ang) * (CORE_R + 6);
  const sy = CORE_CY + Math.sin(ang) * (CORE_R + 6);
  const dirX = p.side === 'L' ? -1 : 1;
  const ex = p.cx - dirX * 10;
  const ey = p.cy;
  const pull = Math.abs(ex - sx) * 0.6;
  const c1x = sx + Math.cos(ang) * pull;
  const c1y = sy + Math.sin(ang) * pull * 0.2;
  const c2x = ex + dirX * pull;
  const c2y = ey;
  return `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`;
}

export default function HiveAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const leads = createLeads(TILES);
  const outcomes = useTileOutcomes();
  const { tally, feed } = useLiveTally();
  const revenue = useCountUp(tally.revenue);
  const paths = useMemo(() => POS.map(threadPath), []);

  const [inbound, setInbound] = useState<{ key: number; idx: number; kind: 'buy' | 'book' }>({ key: 0, idx: 0, kind: 'buy' });

  const lastFeedKey = useRef<number | null>(null);
  useEffect(() => {
    const top = feed[0];
    if (!top || lastFeedKey.current === top.key) return;
    lastFeedKey.current = top.key;
    setInbound({ key: top.key + 1, idx: top.leadNo % TILES, kind: top.outcome });
  }, [feed]);

  return (
    <main style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(circle at 50% 50%, #1e293b 0%, ${BG} 100%)`,
          fontFamily: 'inherit'
        }}
      >
        {/* ── Top Header ── */}
        <header style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 48px', zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 16, height: 16, borderRadius: 999, background: C.green, boxShadow: '0 0 12px rgba(46,125,82,0.8)' }} className="pulse-glow" />
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>LUCAS AI CORE</span>
          </div>
        </header>

        {/* ── SVG: Glowing threads, pulses ── */}
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
          {paths.map((d, i) => (
            <g key={i}>
              <path d={d} stroke="rgba(255,255,255,0.05)" strokeWidth={6} fill="none" />
              <path d={d} stroke="rgba(46,125,82,0.3)" strokeWidth={2} fill="none" />
              <path d={d} stroke="rgba(46,125,82,0.8)" strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray="15 250" className="hive-flow" style={{ animationDelay: `${i * 0.4}s` }} />
            </g>
          ))}
          {/* Huge inbound bright pulse on sale */}
          <path key={inbound.key} d={paths[inbound.idx]} stroke={inbound.kind === 'buy' ? '#4ade80' : '#fff'} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray="40 2000" className="hive-inbound" style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.8))' }} />
        </svg>

        {/* ── Edge Tiles (Active Conversations) ── */}
        {leads.map((lead, index) => {
          const p = POS[index];
          const resolved = outcomes[lead.id];
          return (
            <article key={lead.id} style={{
                position: 'absolute', top: p.y, left: p.x, width: TILE_W, height: TILE_H,
                borderRadius: 16, overflow: 'hidden', zIndex: 20,
                border: resolved?.outcome === 'buy' ? `4px solid ${C.green}` : '2px solid #334155',
                background: '#0f172a', boxShadow: resolved?.outcome === 'buy' ? '0 0 32px rgba(46,125,82,0.5)' : '0 8px 16px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }}>
              <header style={{ height: TILE_LABEL_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: resolved?.outcome === 'buy' ? C.green : '#1e293b', color: '#fff', transition: 'background 0.3s ease' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Chat #{String(index + 1).padStart(2, '0')}</span>
                <StatusPill resolved={resolved} />
              </header>
              <div style={{ width: '100%', height: TILE_CONTENT_H, background: '#fff' }}>
                <iframe
                  title={`chat-${index + 1}`}
                  src={buildFunnelSrc(lead, index, { count: TILES, demoScale: 0.6, speed: 0.5 })}
                  allow="autoplay"
                  style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                />
              </div>
              {/* Per-agent stat row (sales / calls booked) */}
              <div style={{ height: TILE_FOOTER_H, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 16px', background: '#1e293b', borderTop: '1px solid #334155' }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: '#fff', fontWeight: 800, fontSize: 24 }}>
                  {STATS[index].sales}<span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>sales</span>
                </span>
                <span style={{ width: 1, height: 24, background: '#334155' }} />
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: '#fff', fontWeight: 800, fontSize: 24 }}>
                  {STATS[index].calls}<span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>booked</span>
                </span>
                <span style={{ width: 1, height: 24, background: '#334155' }} />
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, color: '#4ade80', fontWeight: 800, fontSize: 24 }}>
                  {money(STATS[index].revenue)}<span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>rev</span>
                </span>
              </div>
            </article>
          );
        })}

        {/* ── Central Core (The Brain) ── */}
        <div key={`core-${inbound.key}`} style={{
            position: 'absolute', left: CORE_CX - CORE_R, top: CORE_CY - CORE_R,
            width: CORE_R * 2, height: CORE_R * 2, borderRadius: '50%', zIndex: 30,
            background: 'radial-gradient(circle at 30% 30%, #4ade80 0%, #166534 60%, #064e3b 100%)',
            boxShadow: '0 0 64px rgba(74,222,128,0.4), inset 0 4px 16px rgba(255,255,255,0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'core-bump 0.8s ease-out'
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Total Revenue
          </div>
          <div style={{ fontSize: 72, fontWeight: 700, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.3)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            ${Math.round(revenue).toLocaleString()}
          </div>
          <div style={{ marginTop: 16, background: 'rgba(0,0,0,0.3)', padding: '8px 20px', borderRadius: 999, fontSize: 14, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            1 AI Brain • 50 Chats
          </div>
        </div>

        <style>{`
          @keyframes hive-flow { to { stroke-dashoffset: -250; } }
          .hive-flow { animation: hive-flow 2s linear infinite; }
          @keyframes hive-inbound { from { stroke-dashoffset: 2000; opacity: 1; } to { stroke-dashoffset: 0; opacity: 0; } }
          .hive-inbound { animation: hive-inbound 0.8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }
          @keyframes core-bump { 0% { transform: scale(1); filter: brightness(1); } 15% { transform: scale(1.1); filter: brightness(1.3); } 100% { transform: scale(1); filter: brightness(1); } }
        `}</style>
      </div>
    </main>
  );
}

function StatusPill({ resolved }: { resolved?: Outcome }) {
  if (resolved?.outcome === 'buy') return <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase' }}>SOLD!</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: '#94a3b8' }} className="pulse-glow" /> Selling...
    </span>
  );
}
