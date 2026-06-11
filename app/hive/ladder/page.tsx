'use client';

// HIVE VARIANT · "The Value Ladder" — a sideways pyramid. Lucas AI core on the
// left powers a ladder that narrows rightward: a wide base of low-ticket live
// funnels → fewer mid-ticket → a few high-ticket, with the running revenue total
// at the narrow tip. Every node is a live funnel; money pulses fire to the core
// on each sale. Dark Hive palette.

import { useMemo } from 'react';
import {
  STAGE_W, STAGE_H, C,
  createLeads, buildFunnelSrc, saleLabel,
  useFitStage, useRecordingChrome, useLiveTally, useRealTileOutcomes, useCountUp,
  type Outcome,
} from '@/lib/adStage';

const BG = '#0b1220';
const CORE_CX = 150, CORE_CY = STAGE_H / 2, CORE_R = 92;
const CORE_EDGE = CORE_CX + CORE_R; // wires start here
const TIP_CX = 1648;

type TierCfg = {
  key: string; label: string; price: number; color: string;
  n: number; cx: number; w: number; h: number; gap: number; demoScale: number; sales: number;
};
const TIERS: TierCfg[] = [
  { key: 'low', label: 'Low', price: 27, color: '#3B82F6', n: 7, cx: 470, w: 250, h: 120, gap: 16, demoScale: 0.42, sales: 312 },
  { key: 'mid', label: 'Mid', price: 297, color: '#D97706', n: 5, cx: 900, w: 280, h: 150, gap: 18, demoScale: 0.5, sales: 41 },
  { key: 'high', label: 'High', price: 1497, color: '#16A46C', n: 3, cx: 1340, w: 320, h: 210, gap: 24, demoScale: 0.6, sales: 9 },
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

const TILE_COUNT = TIERS.reduce((a, t) => a + t.n, 0); // 15

export default function LadderAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const leads = useMemo(() => createLeads(TILE_COUNT), []);
  const tiles = useMemo(() => buildTiles(), []);
  const outcomes = useRealTileOutcomes();
  const { tally, feed } = useLiveTally({ baseRevenue: 34074, basePurchases: 362, baseCalls: 40, minMs: 2000, maxMs: 3400 });
  const revenue = useCountUp(tally.revenue);

  const top = feed[0];
  const pulseTile = top ? tiles[top.leadNo % TILE_COUNT] : null;

  return (
    <main style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(120% 90% at 10% 50%, #16243c 0%, ${BG} 70%)`,
          fontFamily: 'inherit',
        }}
      >
        {/* Header */}
        <header style={{ position: 'absolute', top: 30, left: 0, right: 0, textAlign: 'center', zIndex: 40 }}>
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>Lucas AI · The Value Ladder</span>
        </header>

        {/* Connectors + money pulse */}
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
          {tiles.map((t) => (
            <line key={t.leadId} x1={CORE_EDGE} y1={CORE_CY} x2={t.left} y2={t.cy} stroke="rgba(46,125,82,0.30)" strokeWidth={1.4} />
          ))}
          {/* spine to the revenue tip */}
          <line x1={CORE_EDGE} y1={CORE_CY} x2={TIP_CX} y2={CORE_CY} stroke="rgba(74,222,128,0.35)" strokeWidth={2} strokeDasharray="12 16" className="ladder-flow" />
          {/* bright money pulse from the selling tile back to the core (keyed replay) */}
          {pulseTile && (
            <path key={top!.key} d={`M ${pulseTile.left} ${pulseTile.cy} L ${CORE_EDGE} ${CORE_CY}`} stroke="#4ade80" strokeWidth={6}
              fill="none" strokeLinecap="round" strokeDasharray="40 2400" className="ladder-inbound"
              style={{ filter: 'drop-shadow(0 0 6px rgba(74,222,128,0.85))' }} />
          )}
        </svg>

        {/* Tiles (all live funnels) */}
        {tiles.map((t) => {
          const lead = leads[t.leadId];
          const resolved = outcomes[lead.id];
          const isBuy = resolved?.outcome === 'buy';
          return (
            <article key={t.leadId} style={{
                position: 'absolute', left: t.left, top: t.top, width: t.tier.w, height: t.tier.h,
                borderRadius: 12, overflow: 'hidden', zIndex: 20,
                border: isBuy ? `3px solid ${C.green}` : `2px solid ${t.tier.color}55`,
                background: '#0f172a', boxShadow: isBuy ? '0 0 26px rgba(46,125,82,0.5)' : '0 8px 18px rgba(0,0,0,0.4)',
                transition: 'border 0.3s ease, box-shadow 0.3s ease',
              }}>
              <header style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', background: isBuy ? C.green : t.tier.color, color: '#fff' }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3 }}>{t.tier.label} #{String(t.idx + 1).padStart(2, '0')}</span>
                <StatusPill resolved={resolved} />
              </header>
              <div style={{ width: '100%', height: t.tier.h - 26, background: '#fff' }}>
                <iframe title={`ladder-${t.leadId}`} src={buildFunnelSrc(lead, t.leadId, { count: TILE_COUNT, demoScale: t.tier.demoScale, speed: 0.5 })}
                  allow="autoplay" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: 'block' }} />
              </div>
            </article>
          );
        })}

        {/* Per-tier footer labels (hug the narrowing columns) */}
        {TIERS.map((tier) => {
          const totalH = tier.n * tier.h + (tier.n - 1) * tier.gap;
          const bottom = CORE_CY + totalH / 2;
          return (
            <div key={tier.key} style={{ position: 'absolute', left: tier.cx - 130, top: bottom + 16, width: 260, textAlign: 'center', zIndex: 30 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, color: tier.color }}>{tier.label.toUpperCase()} · ${tier.price.toLocaleString()}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginTop: 2 }}>{tier.sales} sales today</div>
            </div>
          );
        })}

        {/* Core (left, the source) */}
        <div key={top ? `core-${top.key}` : 'core'} style={{
            position: 'absolute', left: CORE_CX - CORE_R, top: CORE_CY - CORE_R, width: CORE_R * 2, height: CORE_R * 2,
            borderRadius: '50%', zIndex: 30,
            background: 'radial-gradient(circle at 32% 28%, #d6f5e6 0%, #4ade80 34%, #166534 72%, #064e3b 100%)',
            boxShadow: '0 0 56px rgba(74,222,128,0.45), inset 0 4px 14px rgba(255,255,255,0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'ladder-bump 0.8s ease-out',
          }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>LUCAS</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 1, lineHeight: 1 }}>AI</span>
          <span style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.6 }}>powers the ladder</span>
        </div>

        {/* Revenue tip (narrow point, far right) */}
        <div style={{ position: 'absolute', left: TIP_CX - 16, top: CORE_CY - 66, width: 224, zIndex: 30,
            background: 'linear-gradient(160deg, #0f2a1c, #0a1f16)', border: '1px solid rgba(74,222,128,0.45)', borderRadius: 16,
            boxShadow: '0 0 36px rgba(74,222,128,0.25)', padding: '18px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#5BC998' }}>Revenue Today</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
            ${Math.round(revenue).toLocaleString()}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>1 AI · the whole ladder</div>
        </div>

        <style>{`
          @keyframes ladder-flow { to { stroke-dashoffset: -280; } }
          .ladder-flow { animation: ladder-flow 2.4s linear infinite; }
          @keyframes ladder-inbound-k { from { stroke-dashoffset: 2400; opacity: 1; } to { stroke-dashoffset: 0; opacity: 0; } }
          .ladder-inbound { animation: ladder-inbound-k 0.85s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }
          @keyframes ladder-bump { 0% { transform: scale(1); filter: brightness(1); } 15% { transform: scale(1.06); filter: brightness(1.3); } 100% { transform: scale(1); filter: brightness(1); } }
        `}</style>
      </div>
    </main>
  );
}

function StatusPill({ resolved }: { resolved?: Outcome }) {
  if (resolved?.outcome === 'buy') return <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>SOLD {saleLabel(resolved.valueUsd)}</span>;
  if (resolved?.outcome === 'book') return <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>BOOKED</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.9)' }} className="pulse-glow" /> Selling…
    </span>
  );
}
