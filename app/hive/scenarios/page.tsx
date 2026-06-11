'use client';

// HIVE VARIANT · "Pick Your Path" — one screen, one ladder. The low-ticket base is
// always lit; a focus toggle highlights EITHER the mid-ticket membership tier OR the
// high-ticket tier and dims the other, so a non-techy viewer instantly sees where the
// growth focus is. The avatar brain core powers it all (live sales flow to the lit
// tiers only). Revenue climbs honestly: low/mid in small per-sale steps, high in rare
// gated $15k jumps that land with the purple orb ring.

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

type Focus = 'mid' | 'high';

type TierCfg = {
  key: string;
  group: 'base' | 'mid' | 'high'; // 'base' (low) is always lit; mid/high toggle
  tag: string;
  n: number; cx: number; w: number; h: number; gap: number; demoScale: number;
  orbColor: string;
  soldText: string; idleText: string;
  footLabel: string; statNote: string;
  price: number;
  gated: boolean; // true = revenue only on the dramatized (≥5s) close, not every event
};

const TIERS: TierCfg[] = [
  { key: 'low', group: 'base', tag: '$17', n: 4, cx: 620, w: 300, h: 200, gap: 18, demoScale: 0.6, orbColor: '#38bdf8', soldText: 'SOLD $17', idleText: 'Selling…', footLabel: 'LOW TICKET · $17', statNote: '110 sold today', price: 17, gated: false },
  { key: 'mid', group: 'mid', tag: '$497/mo', n: 3, cx: 1080, w: 340, h: 240, gap: 20, demoScale: 0.6, orbColor: '#f59e0b', soldText: 'JOINED $497/mo', idleText: 'Selling…', footLabel: 'MEMBERSHIP · $497/mo', statNote: '8 new members', price: 497, gated: false },
  { key: 'high', group: 'high', tag: '$15,000', n: 2, cx: 1540, w: 380, h: 320, gap: 24, demoScale: 0.6, orbColor: '#a855f7', soldText: 'SOLD $15,000', idleText: 'Closing…', footLabel: 'HIGH-TICKET · $15,000', statNote: '2 closed today', price: 15000, gated: true },
];

const TILE_COUNT = TIERS.reduce((a, t) => a + t.n, 0); // 9
const BASE_REVENUE = 35846; // 110×$17 + 8×$497 + 2×$15,000

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

const isLit = (tier: TierCfg, focus: Focus) => tier.group === 'base' || tier.group === focus;

export default function ScenariosAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const leads = useMemo(() => createLeads(TILE_COUNT), []);
  const tiles = useMemo(() => buildTiles(), []);
  const paths = useMemo(() => tiles.map(threadPath), [tiles]);
  const { feed } = useLiveTally({ baseRevenue: BASE_REVENUE, basePurchases: 120, baseCalls: 12, minMs: 1800, maxMs: 3000 });

  // Focus toggle: low is always lit; this picks whether mid OR high is the second lit
  // tier. Defaults to memberships. Keys 2 = mid, 3 = high (1 = low is always on).
  const [focus, setFocus] = useState<Focus>('mid');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '2') setFocus('mid');
      else if (e.key === '3') setFocus('high');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const top = feed[0];
  const pulseIdx = top ? top.leadNo % TILE_COUNT : 0;
  const topLit = top ? isLit(tiles[pulseIdx].tier, focus) : false;

  // Only LIT tiles show live activity, so the focused path visibly carries the action.
  const soldByTile = useMemo(() => {
    const m: Record<number, true> = {};
    for (const ev of feed.slice(0, 4)) {
      const idx = ev.leadNo % TILE_COUNT;
      if (isLit(tiles[idx].tier, focus)) m[idx] = true;
    }
    return m;
  }, [feed, tiles, focus]);

  // Honest revenue: lit, non-gated tiers (low/mid) add on every sale; the gated high
  // tier adds $15k only on a dramatized close inside the orb effect.
  const [revenue, setRevenue] = useState(BASE_REVENUE);
  const lastRevKey = useRef<number | null>(null);
  useEffect(() => {
    const ev = feed[0];
    if (!ev || lastRevKey.current === ev.key) return;
    lastRevKey.current = ev.key;
    const tier = tiles[ev.leadNo % TILE_COUNT].tier;
    if (isLit(tier, focus) && !tier.gated && tier.price > 0) setTimeout(() => setRevenue((r) => r + tier.price), 0);
  }, [feed, tiles, focus]);
  const revDisplay = useCountUp(revenue);

  // Brain orb: idle green sphere; on each LIT sale it spins the loading ring in the
  // tier's colour, then settles. ≥5s between loadings. A gated close books its $15k here.
  const [orb, setOrb] = useState<{ speaker: Speaker; color: string }>({ speaker: 'idle', color: IDLE_COLOR });
  const lastOrbKey = useRef<number | null>(null);
  const lastLoadAt = useRef(0);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const ev = feed[0];
    if (!ev || lastOrbKey.current === ev.key) return;
    lastOrbKey.current = ev.key;
    const tier = tiles[ev.leadNo % TILE_COUNT].tier;
    if (!isLit(tier, focus)) return; // dimmed tiers don't fire the brain
    const now = performance.now();
    if (now - lastLoadAt.current < SALE_MIN_MS) return;
    lastLoadAt.current = now;
    const color = tier.orbColor ?? IDLE_COLOR;
    setTimeout(() => setOrb({ speaker: 'processing', color }), 0);
    settleRef.current = setTimeout(() => setOrb((s) => ({ speaker: 'idle', color: s.color })), LOAD_MS);
    if (tier.gated && tier.price > 0) setTimeout(() => setRevenue((r) => r + tier.price), 0);
  }, [feed, tiles, focus]);
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
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b' }}>The Value Ladder</span>
        </header>

        {/* Focus toggle (top-right) */}
        <div style={{ position: 'absolute', top: 30, right: 44, zIndex: 45, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b' }}>Where&rsquo;s the growth focus?</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <FocusButton active={focus === 'mid'} accent="#f59e0b" title="Memberships" sub="$497/mo" onClick={() => setFocus('mid')} />
            <FocusButton active={focus === 'high'} accent="#a855f7" title="High-Ticket" sub="$15,000" onClick={() => setFocus('high')} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Low-ticket base · $17 always on</span>
        </div>

        {/* Glowing curved threads + money pulse (dim to dimmed tiles) */}
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
          {paths.map((d, i) => {
            const dim = !isLit(tiles[i].tier, focus);
            return (
              <g key={i} style={{ opacity: dim ? 0.16 : 1, transition: 'opacity 0.45s ease' }}>
                <path d={d} stroke="rgba(255,255,255,0.05)" strokeWidth={5} fill="none" />
                <path d={d} stroke="rgba(46,125,82,0.3)" strokeWidth={2} fill="none" />
                <path d={d} stroke="rgba(46,125,82,0.8)" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray="14 240" className="ladder-flow" style={{ animationDelay: `${i * 0.25}s` }} />
              </g>
            );
          })}
          {top && topLit && (
            <path key={top.key} d={paths[pulseIdx]} stroke="#4ade80" strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray="40 2000" className="ladder-inbound"
              style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.8))' }} />
          )}
        </svg>

        {/* Tiles */}
        {tiles.map((t) => {
          const lead = leads[t.leadId];
          const lit = isLit(t.tier, focus);
          const hit = !!soldByTile[t.leadId];
          const clickable = t.tier.group !== 'base';
          return (
            <article key={t.leadId}
              onClick={clickable ? () => setFocus(t.tier.group as Focus) : undefined}
              style={{
                position: 'absolute', left: t.left, top: t.top, width: t.tier.w, height: t.tier.h,
                borderRadius: 12, overflow: 'hidden', zIndex: 20,
                cursor: clickable && !lit ? 'pointer' : 'default',
                opacity: lit ? 1 : 0.24,
                filter: lit ? 'none' : 'grayscale(0.85) brightness(0.85)',
                border: hit ? `4px solid ${C.green}` : '2px solid #334155',
                background: '#0f172a', boxShadow: hit ? '0 0 28px rgba(46,125,82,0.5)' : '0 8px 18px rgba(0,0,0,0.4)',
                transition: 'opacity 0.45s ease, filter 0.45s ease, border 0.3s ease, box-shadow 0.3s ease',
              }}>
              <header style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', background: hit ? C.green : '#1e293b', color: '#fff', transition: 'background 0.3s ease' }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: hit ? '#fff' : '#cbd5e1' }}>
                  {t.tier.footLabel.split(' · ')[0].replace(' TICKET', '').replace('MEMBERSHIP', 'MID')} <span style={{ color: hit ? '#fff' : '#4ade80' }}>{t.tier.tag}</span>
                </span>
                <StatusPill tier={t.tier} hit={hit} />
              </header>
              <div style={{ width: '100%', height: t.tier.h - 26, background: '#fff' }}>
                <iframe title={`scn-${t.leadId}`} src={buildFunnelSrc(lead, t.leadId, { count: TILE_COUNT, demoScale: t.tier.demoScale, speed: 0.5 })}
                  allow="autoplay" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: 'block' }} />
              </div>
            </article>
          );
        })}

        {/* Per-tier footers (dim with their column) */}
        {TIERS.map((tier) => {
          const totalH = tier.n * tier.h + (tier.n - 1) * tier.gap;
          const bottom = CORE_CY + totalH / 2;
          const lit = isLit(tier, focus);
          return (
            <div key={tier.key} style={{ position: 'absolute', left: tier.cx - 140, top: bottom + 16, width: 280, textAlign: 'center', zIndex: 30, opacity: lit ? 1 : 0.32, transition: 'opacity 0.45s ease' }}>
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
                1 AI · runs every tier
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

function FocusButton({ active, accent, title, sub, onClick }: { active: boolean; accent: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
        cursor: 'pointer', textAlign: 'left', minWidth: 150,
        display: 'flex', flexDirection: 'column', gap: 1,
        padding: '10px 16px', borderRadius: 12,
        background: active ? `${accent}26` : 'rgba(255,255,255,0.05)',
        border: `2px solid ${active ? accent : 'rgba(148,163,184,0.22)'}`,
        boxShadow: active ? `0 0 22px ${accent}44` : 'none',
        transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
      }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: active ? '#fff' : '#cbd5e1' }}>{title}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: active ? accent : '#64748b' }}>{sub}</span>
    </button>
  );
}

function StatusPill({ tier, hit }: { tier: TierCfg; hit: boolean }) {
  if (hit) return <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>{tier.soldText}</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: '#94a3b8' }} className="pulse-glow" /> {tier.idleText}
    </span>
  );
}
