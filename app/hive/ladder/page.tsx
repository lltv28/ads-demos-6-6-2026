'use client';

// HIVE VARIANT · "The Value Ladder" — the Hive, reshaped as a sideways pyramid.
// The glowing Lucas AI core (revenue inside) sits on the left and powers a ladder
// of live funnels that narrows rightward: a wide base of low-ticket → fewer mid
// → a few high-ticket. Signature Hive glowing curved threads carry money pulses
// back to the brain on every sale. Dark green-on-dark palette.

import { useMemo } from 'react';
import {
  STAGE_W, STAGE_H, C,
  createLeads, buildFunnelSrc,
  useFitStage, useRecordingChrome, useLiveTally, useCountUp,
} from '@/lib/adStage';
import VoiceOrbCluster from '@/components/VoiceOrbCluster';

const BG = '#0f172a';
const CORE_CX = 250, CORE_CY = STAGE_H / 2, CORE_R = 150;
const ORB_SIZE = 580; // VoiceOrbCluster canvas (cluster ≈0.52 of it → ~150px radius, matches the old orb), centred on the core

type TierCfg = {
  key: string; label: string; price: number;
  n: number; cx: number; w: number; h: number; gap: number; demoScale: number; sales: number;
};
const TIERS: TierCfg[] = [
  { key: 'low', label: 'Low', price: 27, n: 4, cx: 620, w: 300, h: 200, gap: 18, demoScale: 0.6, sales: 312 },
  { key: 'mid', label: 'Mid', price: 297, n: 3, cx: 1080, w: 340, h: 240, gap: 20, demoScale: 0.6, sales: 41 },
  { key: 'high', label: 'High', price: 1497, n: 2, cx: 1540, w: 380, h: 320, gap: 24, demoScale: 0.6, sales: 9 },
];

type Tile = { leadId: number; tier: TierCfg; idx: number; left: number; top: number; cx: number; cy: number };

function buildTiles(): Tile[] {
  const tiles: Tile[] = [];
  let leadId = 0;
  for (const tier of TIERS) {
    const totalH = tier.n * tier.h + (tier.n - 1) * tier.gap;
    const top0 = CORE_CY - totalH / 2;
    for (let i = 0; i < tier.n; i++) {
      const top = top0 + i * (tier.h + tier.gap);
      tiles.push({ leadId, tier, idx: i, left: tier.cx - tier.w / 2, top, cx: tier.cx, cy: top + tier.h / 2 });
      leadId += 1;
    }
  }
  return tiles;
}

// Glowing curved thread from the core edge to a tile's left side (Hive bezier).
function threadPath(t: Tile): string {
  const ang = Math.atan2(t.cy - CORE_CY, t.left - CORE_CX);
  const sx = CORE_CX + Math.cos(ang) * (CORE_R + 8);
  const sy = CORE_CY + Math.sin(ang) * (CORE_R + 8);
  const ex = t.left - 8;
  const ey = t.cy;
  const pull = Math.abs(ex - sx) * 0.55;
  const c1x = sx + Math.cos(ang) * pull;
  const c1y = sy + Math.sin(ang) * pull * 0.25;
  const c2x = ex - pull;
  const c2y = ey;
  return `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`;
}

const TILE_COUNT = TIERS.reduce((a, t) => a + t.n, 0); // 15

export default function LadderAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const leads = useMemo(() => createLeads(TILE_COUNT), []);
  const tiles = useMemo(() => buildTiles(), []);
  const paths = useMemo(() => tiles.map(threadPath), [tiles]);
  const { tally, feed } = useLiveTally({ baseRevenue: 34074, basePurchases: 362, baseCalls: 40, minMs: 2000, maxMs: 3400 });
  const revenue = useCountUp(tally.revenue);

  const top = feed[0];
  const pulseIdx = top ? top.leadNo % TILE_COUNT : 0;

  // The embedded funnel is the same low-ticket demo on every tile, so a tile's
  // SOLD value comes from its TIER, not the funnel. Each recent live-tally event
  // marks its tile as just-sold (in sync with the money pulse); the newest few
  // events keep a handful of tiles flashing SOLD at their tier price at once.
  const soldByTile = useMemo(() => {
    const m: Record<number, 'buy' | 'book'> = {};
    const recent = feed.slice(0, 4);
    for (let i = recent.length - 1; i >= 0; i--) m[recent[i].leadNo % TILE_COUNT] = recent[i].outcome;
    return m;
  }, [feed]);

  return (
    <main style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(circle at 13% 50%, #1e293b 0%, ${BG} 70%)`,
          fontFamily: 'inherit',
        }}
      >
        {/* Header (Hive chrome) */}
        <header style={{ position: 'absolute', top: 34, left: 48, display: 'flex', alignItems: 'center', gap: 14, zIndex: 40 }}>
          <span style={{ width: 16, height: 16, borderRadius: 999, background: C.green, boxShadow: '0 0 12px rgba(46,125,82,0.8)' }} className="pulse-glow" />
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>Lucas AI Core</span>
          <span style={{ color: '#334155' }}>·</span>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b' }}>The Value Ladder</span>
        </header>

        {/* Glowing curved threads + money pulse (Hive) */}
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
          {paths.map((d, i) => (
            <g key={i}>
              <path d={d} stroke="rgba(255,255,255,0.05)" strokeWidth={5} fill="none" />
              <path d={d} stroke="rgba(46,125,82,0.3)" strokeWidth={2} fill="none" />
              <path d={d} stroke="rgba(46,125,82,0.8)" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="14 240" className="ladder-flow" style={{ animationDelay: `${i * 0.25}s` }} />
            </g>
          ))}
          {top && (
            <path key={top.key} d={paths[pulseIdx]} stroke="#4ade80" strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray="40 2000" className="ladder-inbound"
              style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.8))' }} />
          )}
        </svg>

        {/* Tiles (all live funnels, Hive chrome) */}
        {tiles.map((t) => {
          const lead = leads[t.leadId];
          const outcome = soldByTile[t.leadId];
          const isBuy = outcome === 'buy';
          return (
            <article key={t.leadId} style={{
                position: 'absolute', left: t.left, top: t.top, width: t.tier.w, height: t.tier.h,
                borderRadius: 12, overflow: 'hidden', zIndex: 20,
                border: isBuy ? `4px solid ${C.green}` : '2px solid #334155',
                background: '#0f172a', boxShadow: isBuy ? '0 0 28px rgba(46,125,82,0.5)' : '0 8px 18px rgba(0,0,0,0.4)',
                transition: 'border 0.3s ease, box-shadow 0.3s ease',
              }}>
              <header style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', background: isBuy ? C.green : '#1e293b', color: '#fff', transition: 'background 0.3s ease' }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: isBuy ? '#fff' : '#cbd5e1' }}>
                  {t.tier.label} <span style={{ color: isBuy ? '#fff' : '#4ade80' }}>${t.tier.price.toLocaleString()}</span>
                </span>
                <StatusPill outcome={outcome} price={t.tier.price} />
              </header>
              <div style={{ width: '100%', height: t.tier.h - 26, background: '#fff' }}>
                <iframe title={`ladder-${t.leadId}`} src={buildFunnelSrc(lead, t.leadId, { count: TILE_COUNT, demoScale: t.tier.demoScale, speed: 0.5 })}
                  allow="autoplay" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: 'block' }} />
              </div>
            </article>
          );
        })}

        {/* Per-tier footer labels (green-forward, hug the narrowing columns) */}
        {TIERS.map((tier) => {
          const totalH = tier.n * tier.h + (tier.n - 1) * tier.gap;
          const bottom = CORE_CY + totalH / 2;
          return (
            <div key={tier.key} style={{ position: 'absolute', left: tier.cx - 130, top: bottom + 16, width: 260, textAlign: 'center', zIndex: 30 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, color: '#e2e8f0' }}>
                {tier.label.toUpperCase()} TICKET <span style={{ color: '#4ade80' }}>· ${tier.price.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{tier.sales} sales today</div>
            </div>
          );
        })}

        {/* Core (left) — particle-cluster brain (VoiceOrbCluster) with revenue overlaid */}
        <div key={top ? `core-${top.key}` : 'core'} style={{
            position: 'absolute', left: CORE_CX - ORB_SIZE / 2, top: CORE_CY - ORB_SIZE / 2, width: ORB_SIZE, height: ORB_SIZE,
            zIndex: 30, animation: 'ladder-bump 0.8s ease-out',
          }}>
          <VoiceOrbCluster speaker="idle" level={0.25} size={ORB_SIZE} count={640} aiColor="#16A46C" idleColor="#22c55e" style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {/* soft dark backing so the white revenue reads over the green particles */}
            <div style={{ position: 'absolute', width: 300, height: 210, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(4,14,9,0.62) 0%, rgba(4,14,9,0) 72%)' }} />
            <div style={{ position: 'relative', fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.92)', textTransform: 'uppercase', letterSpacing: 1.5, textShadow: '0 2px 8px rgba(0,0,0,0.75)' }}>Revenue Today</div>
            <div style={{ position: 'relative', fontSize: 56, fontWeight: 800, color: '#fff', marginTop: 2, fontVariantNumeric: 'tabular-nums', lineHeight: 1, textShadow: '0 3px 16px rgba(0,0,0,0.85)' }}>
              ${Math.round(revenue).toLocaleString()}
            </div>
            <div style={{ position: 'relative', marginTop: 12, background: 'rgba(0,0,0,0.42)', padding: '7px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
              1 AI · runs every tier
            </div>
          </div>
        </div>

        <style>{`
          @keyframes ladder-flow { to { stroke-dashoffset: 254; } }
          .ladder-flow { animation: ladder-flow 2s linear infinite; }
          @keyframes ladder-inbound-k { from { stroke-dashoffset: 2000; opacity: 1; } to { stroke-dashoffset: 0; opacity: 0; } }
          .ladder-inbound { animation: ladder-inbound-k 0.8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }
          @keyframes ladder-bump { 0% { transform: scale(1); filter: brightness(1); } 15% { transform: scale(1.05); filter: brightness(1.3); } 100% { transform: scale(1); filter: brightness(1); } }
        `}</style>
      </div>
    </main>
  );
}

function StatusPill({ outcome, price }: { outcome?: 'buy' | 'book'; price: number }) {
  if (outcome === 'buy') return <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>SOLD ${price.toLocaleString()}</span>;
  if (outcome === 'book') return <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>BOOKED</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: '#94a3b8' }} className="pulse-glow" /> Selling…
    </span>
  );
}
