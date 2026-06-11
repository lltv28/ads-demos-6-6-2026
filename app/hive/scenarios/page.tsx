'use client';

// HIVE VARIANT · "The Membership Engine" — the value ladder, focused on memberships.
// One AI sells a low-ticket entry offer ($17) and ascends those buyers into a recurring
// $497/mo membership. The avatar brain core powers both columns; live sales flow back to
// it on glowing Hive threads, and revenue climbs honestly in per-sale steps.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_W, STAGE_H, C,
  createLeads, buildFunnelSrc,
  useFitStage, useRecordingChrome, useLiveTally, useCountUp,
} from '@/lib/adStage';
import VoiceOrbCluster, { type Speaker } from '@/components/VoiceOrbCluster';
import { asset } from '@/lib/basePath';

const BG = '#0f172a';
const CORE_CX = 250, CORE_CY = STAGE_H / 2, CORE_R = 150;
const ORB_SIZE = 580;
const AVATAR_SCALE = 0.46;
const AVATAR_R = (ORB_SIZE * AVATAR_SCALE) / 2;
const IDLE_COLOR = '#16A46C';
const SALE_MIN_MS = 5000; // min gap between orb loadings
const LOAD_MS = 2600;     // how long the loading ring holds per sale

type TierCfg = {
  key: string;
  tag: string;
  kind: string; // small context label next to the big price ('offer' / 'plan')
  n: number; cx: number; w: number; h: number; gap: number; demoScale: number;
  orbColor: string;
  soldText: string; idleText: string;
  footLabel: string; statNote: string;
  price: number;
};

const TIERS: TierCfg[] = [
  { key: 'low', tag: '$17', kind: 'offer', n: 4, cx: 800, w: 300, h: 200, gap: 18, demoScale: 0.6, orbColor: '#38bdf8', soldText: 'SOLD', idleText: 'Selling…', footLabel: 'LOW TICKET · $17', statNote: '110 sold today', price: 17 },
  { key: 'mid', tag: '$497/mo', kind: 'plan', n: 3, cx: 1400, w: 380, h: 264, gap: 22, demoScale: 0.6, orbColor: '#f59e0b', soldText: 'JOINED', idleText: 'Welcoming…', footLabel: 'MEMBERSHIP · $497/mo', statNote: '8 new members today', price: 497 },
];

const TILE_COUNT = TIERS.reduce((a, t) => a + t.n, 0); // 7
const BASE_REVENUE = 5846; // 110×$17 + 8×$497

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

export default function MembershipAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const leads = useMemo(() => createLeads(TILE_COUNT), []);
  const tiles = useMemo(() => buildTiles(), []);
  const paths = useMemo(() => tiles.map(threadPath), [tiles]);
  const { feed } = useLiveTally({ baseRevenue: BASE_REVENUE, basePurchases: 118, baseCalls: 0, minMs: 1800, maxMs: 3000 });

  const top = feed[0];
  const pulseIdx = top ? top.leadNo % TILE_COUNT : 0;

  // The newest few events keep their tiles flashing SOLD, in sync with the money pulse.
  const soldByTile = useMemo(() => {
    const m: Record<number, true> = {};
    for (const ev of feed.slice(0, 4)) m[ev.leadNo % TILE_COUNT] = true;
    return m;
  }, [feed]);

  // Honest revenue: each sale adds its tile's tier price ($17 or $497).
  const [revenue, setRevenue] = useState(BASE_REVENUE);
  const lastRevKey = useRef<number | null>(null);
  useEffect(() => {
    const ev = feed[0];
    if (!ev || lastRevKey.current === ev.key) return;
    lastRevKey.current = ev.key;
    const price = tiles[ev.leadNo % TILE_COUNT].tier.price;
    if (price > 0) setTimeout(() => setRevenue((r) => r + price), 0);
  }, [feed, tiles]);
  const revDisplay = useCountUp(revenue);

  // Brain orb: idle green sphere; on each sale spins up the loading ring in the tier's
  // colour for LOAD_MS, then settles. ≥5s between loadings.
  const [orb, setOrb] = useState<{ speaker: Speaker; color: string }>({ speaker: 'idle', color: IDLE_COLOR });
  const lastOrbKey = useRef<number | null>(null);
  const lastLoadAt = useRef(0);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const ev = feed[0];
    if (!ev || lastOrbKey.current === ev.key) return;
    lastOrbKey.current = ev.key;
    const now = performance.now();
    if (now - lastLoadAt.current < SALE_MIN_MS) return;
    lastLoadAt.current = now;
    const color = tiles[ev.leadNo % TILE_COUNT].tier.orbColor ?? IDLE_COLOR;
    setTimeout(() => setOrb({ speaker: 'processing', color }), 0);
    settleRef.current = setTimeout(() => setOrb((s) => ({ speaker: 'idle', color: s.color })), LOAD_MS);
  }, [feed, tiles]);
  useEffect(() => () => { if (settleRef.current) clearTimeout(settleRef.current); }, []);

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
        {/* Header */}
        <header style={{ position: 'absolute', top: 34, left: 48, display: 'flex', alignItems: 'center', gap: 14, zIndex: 40 }}>
          <span style={{ width: 16, height: 16, borderRadius: 999, background: C.green, boxShadow: '0 0 12px rgba(46,125,82,0.8)' }} className="pulse-glow" />
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>Lucas AI Core</span>
          <span style={{ color: '#334155' }}>·</span>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b' }}>The Membership Engine</span>
        </header>

        {/* Flow caption (top-right) */}
        <div style={{ position: 'absolute', top: 38, right: 48, zIndex: 40, textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', letterSpacing: 0.3 }}>
            <span style={{ color: '#38bdf8' }}>$17 buyers</span> → <span style={{ color: '#f59e0b' }}>$497/mo members</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 2 }}>one AI sells the offer and ascends them</div>
        </div>

        {/* Glowing curved threads + money pulse */}
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

        {/* Tiles */}
        {tiles.map((t) => {
          const lead = leads[t.leadId];
          const hit = !!soldByTile[t.leadId];
          return (
            <article key={t.leadId} style={{
                position: 'absolute', left: t.left, top: t.top, width: t.tier.w, height: t.tier.h,
                borderRadius: 12, overflow: 'hidden', zIndex: 20,
                border: hit ? `4px solid ${C.green}` : '2px solid #334155',
                background: '#0f172a', boxShadow: hit ? '0 0 28px rgba(46,125,82,0.5)' : '0 8px 18px rgba(0,0,0,0.4)',
                transition: 'border 0.3s ease, box-shadow 0.3s ease',
              }}>
              <header style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: hit ? C.green : '#1e293b', color: '#fff', transition: 'background 0.3s ease' }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ fontSize: 25, fontWeight: 900, letterSpacing: 0.2, color: hit ? '#fff' : '#4ade80', lineHeight: 1 }}>{t.tier.tag}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: hit ? 'rgba(255,255,255,0.85)' : '#64748b' }}>{t.tier.kind}</span>
                </span>
                <StatusPill tier={t.tier} hit={hit} />
              </header>
              <div style={{ width: '100%', height: t.tier.h - 46, background: '#fff' }}>
                <iframe title={`mbr-${t.leadId}`} src={buildFunnelSrc(lead, t.leadId, { count: TILE_COUNT, demoScale: t.tier.demoScale, speed: 0.5 })}
                  allow="autoplay" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: 'block' }} />
              </div>
            </article>
          );
        })}

        {/* Per-tier footers */}
        {TIERS.map((tier) => {
          const totalH = tier.n * tier.h + (tier.n - 1) * tier.gap;
          const bottom = CORE_CY + totalH / 2;
          return (
            <div key={tier.key} style={{ position: 'absolute', left: tier.cx - 140, top: bottom + 16, width: 280, textAlign: 'center', zIndex: 30 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1, color: '#e2e8f0' }}>{tier.footLabel}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{tier.statNote}</div>
            </div>
          );
        })}

        {/* Core (left) — avatar brain */}
        <div style={{ position: 'absolute', left: CORE_CX - ORB_SIZE / 2, top: CORE_CY - ORB_SIZE / 2, width: ORB_SIZE, height: ORB_SIZE, zIndex: 30 }}>
          <VoiceOrbCluster speaker={orb.speaker} level={orb.speaker === 'processing' ? 0 : 0.12} spin={0.5} morphSpeed={0.04} size={ORB_SIZE} count={640} aiColor={orb.color} idleColor={IDLE_COLOR} avatarSrc={asset('/profilepicnew.png')} avatarScale={AVATAR_SCALE} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '50%', top: `calc(50% + ${AVATAR_R + 22}px)`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ background: 'rgba(4,14,9,0.66)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16, padding: '10px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 34px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Revenue Today</div>
                <div style={{ fontSize: 44, fontWeight: 800, color: '#fff', marginTop: 2, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  ${Math.round(revDisplay).toLocaleString()}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.42)', padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}>
                1 AI · sells &amp; ascends to membership
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes ladder-flow { to { stroke-dashoffset: 254; } }
          .ladder-flow { animation: ladder-flow 2s linear infinite; }
          @keyframes ladder-inbound-k { from { stroke-dashoffset: 2000; opacity: 1; } to { stroke-dashoffset: 0; opacity: 0; } }
          .ladder-inbound { animation: ladder-inbound-k 0.8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }
        `}</style>
      </div>
    </main>
  );
}

function StatusPill({ tier, hit }: { tier: TierCfg; hit: boolean }) {
  if (hit) return <span style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6 }}>{tier.soldText}</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: '#94a3b8' }} className="pulse-glow" /> {tier.idleText}
    </span>
  );
}
