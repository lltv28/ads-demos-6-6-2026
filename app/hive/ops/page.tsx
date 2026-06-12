'use client';

// HIVE VARIANT · "Ops Center" — the membership engine wrapped in a mission-control
// frame: top status bar (all-systems-live + founder-away + middle-of-the-night clock),
// a right rail of grounded outcome counters ending in the "You: 0 hours" punchline, and
// a bottom activity ticker of outcome lines at odd hours (screams "while you slept").
// The brain core + live funnel tiles + OG Hive flow are kept as the proof it's real.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_W, STAGE_H, C,
  createLeads, buildFunnelSrc,
  useFitStage, useRecordingChrome, useLiveTally, useCountUp,
} from '@/lib/adStage';
import VoiceOrbCluster, { type Speaker } from '@/components/VoiceOrbCluster';
import { asset } from '@/lib/basePath';

const BG = '#0f172a';
const STATUS_H = 72;
const CORE_CX = 250, CORE_CY = (STAGE_H + STATUS_H) / 2, CORE_R = 150;
const ORB_SIZE = 560;
const AVATAR_SCALE = 0.46;
const AVATAR_R = (ORB_SIZE * AVATAR_SCALE) / 2;
const IDLE_COLOR = '#16A46C';
const SALE_MIN_MS = 5000;
const LOAD_MS = 2600;
const RAIL_X = 1530;

type TierCfg = {
  key: string;
  recurring: boolean;
  tilePrices: number[];
  n: number; cx: number; w: number; h: number; gap: number; demoScale: number;
  orbColor: string;
  soldText: string; idleText: string;
};

const TIERS: TierCfg[] = [
  { key: 'low', recurring: false, tilePrices: [7, 27, 67, 97], n: 4, cx: 760, w: 290, h: 178, gap: 16, demoScale: 0.55, orbColor: '#38bdf8', soldText: 'SOLD', idleText: 'Selling…' },
  { key: 'mid', recurring: true, tilePrices: [197, 497, 1497], n: 3, cx: 1290, w: 350, h: 238, gap: 20, demoScale: 0.58, orbColor: '#f59e0b', soldText: 'JOINED', idleText: 'Welcoming…' },
];

const TILE_COUNT = TIERS.reduce((a, t) => a + t.n, 0);
const BASE_REVENUE = 10737;

// Outcome-focused activity log at odd hours — the "while you slept" hero, as a ticker.
const ACTIVITY: { t: string; s: string; mark?: string }[] = [
  { t: '2:14 AM', s: 'Closer took Marcus from $17 → $247/mo', mark: '✅' },
  { t: '1:09 AM', s: 'Emailer recovered a buyer who went cold 41 days ago' },
  { t: '12:51 AM', s: 'SMS Rep booked a call for Tuesday 3pm' },
  { t: '3:47 AM', s: 'Nurturer answered a pricing objection — no human needed' },
  { t: '11:52 PM', s: 'Onboarder delivered personalized plans to 6 new buyers' },
  { t: '2:38 AM', s: 'Closer ascended a $7 buyer to the $497/mo plan', mark: '✅' },
  { t: '4:05 AM', s: 'SMS Rep re-engaged 14 stalled buyers' },
  { t: '12:18 AM', s: 'Nurturer handled 9 questions in your voice', mark: '🎙' },
];

type Tile = { leadId: number; tier: TierCfg; idx: number; left: number; top: number; cx: number; cy: number; price: number; tag: string };

function buildTiles(): Tile[] {
  const tiles: Tile[] = [];
  let leadId = 0;
  for (const tier of TIERS) {
    const totalH = tier.n * tier.h + (tier.n - 1) * tier.gap;
    const top0 = CORE_CY - totalH / 2;
    for (let i = 0; i < tier.n; i++) {
      const top = top0 + i * (tier.h + tier.gap);
      const price = tier.tilePrices[i];
      const tag = tier.recurring ? `$${price.toLocaleString()}/mo` : `$${price}`;
      tiles.push({ leadId, tier, idx: i, left: tier.cx - tier.w / 2, top, cx: tier.cx, cy: top + tier.h / 2, price, tag });
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

export default function OpsCenterAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const leads = useMemo(() => createLeads(TILE_COUNT), []);
  const tiles = useMemo(() => buildTiles(), []);
  const paths = useMemo(() => tiles.map(threadPath), [tiles]);
  const { feed } = useLiveTally({ baseRevenue: BASE_REVENUE, basePurchases: 118, baseCalls: 0, minMs: 1800, maxMs: 3000 });

  const top = feed[0];
  const pulseIdx = top ? top.leadNo % TILE_COUNT : 0;

  const soldByTile = useMemo(() => {
    const m: Record<number, true> = {};
    for (const ev of feed.slice(0, 4)) m[ev.leadNo % TILE_COUNT] = true;
    return m;
  }, [feed]);

  // Each sale books its tile's price and ticks the "conversations handled" counter.
  const [revenue, setRevenue] = useState(BASE_REVENUE);
  const [convos, setConvos] = useState(312);
  const lastRevKey = useRef<number | null>(null);
  useEffect(() => {
    const ev = feed[0];
    if (!ev || lastRevKey.current === ev.key) return;
    lastRevKey.current = ev.key;
    const price = tiles[ev.leadNo % TILE_COUNT].price;
    setTimeout(() => { setRevenue((r) => r + price); setConvos((c) => c + 1); }, 0);
  }, [feed, tiles]);
  const revDisplay = useCountUp(revenue);
  const convoDisplay = useCountUp(convos);

  // Brain orb loading ring on each sale (≥5s apart).
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
          background: `radial-gradient(circle at 12% 55%, #1e293b 0%, ${BG} 70%)`,
          fontFamily: 'inherit',
        }}
      >
        {/* ── Top status bar ── */}
        <header style={{ position: 'absolute', top: 0, left: 0, right: 0, height: STATUS_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', background: 'rgba(2,8,16,0.86)', borderBottom: '1px solid #1e2b45', zIndex: 45 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, background: C.green, boxShadow: '0 0 12px rgba(46,125,82,0.9)' }} className="pulse-glow" />
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: '#fff' }}>Lucas AI Team</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#4ade80' }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} className="pulse-glow" />
              All systems live
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', border: '1px solid #2a3a55', borderRadius: 999, padding: '6px 14px' }}>
              Founder: <span style={{ color: '#f87171' }}>✗ away</span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>2:14 AM · Tue</span>
          </div>
        </header>

        {/* ── Glowing OG-Hive threads + outward flow + inbound sale pulse ── */}
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
          {paths.map((d, i) => (
            <g key={i}>
              <path d={d} stroke="rgba(255,255,255,0.05)" strokeWidth={6} fill="none" />
              <path d={d} stroke="rgba(46,125,82,0.3)" strokeWidth={2} fill="none" />
              <path d={d} stroke="rgba(46,125,82,0.8)" strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray="15 250" className="ops-flow" style={{ animationDelay: `${i * 0.4}s` }} />
            </g>
          ))}
          {top && (
            <path key={top.key} d={paths[pulseIdx]} stroke="#4ade80" strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray="40 2000" className="ops-inbound"
              style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.8))' }} />
          )}
        </svg>

        {/* ── Tiles ── */}
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
              <header style={{ height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: hit ? C.green : '#1e293b', color: '#fff', transition: 'background 0.3s ease' }}>
                <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.2, color: hit ? '#fff' : '#4ade80', lineHeight: 1 }}>{t.tag}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: hit ? 'rgba(255,255,255,0.85)' : '#64748b' }}>🤖</span>
                  <StatusPill tier={t.tier} hit={hit} />
                </span>
              </header>
              <div style={{ width: '100%', height: t.tier.h - 42, background: '#fff' }}>
                <iframe title={`ops-${t.leadId}`} src={buildFunnelSrc(lead, t.leadId, { count: TILE_COUNT, demoScale: t.tier.demoScale, speed: 0.5 })}
                  allow="autoplay" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: 'block' }} />
              </div>
            </article>
          );
        })}

        {/* ── Core (left) — avatar brain + revenue ── */}
        <div style={{ position: 'absolute', left: CORE_CX - ORB_SIZE / 2, top: CORE_CY - ORB_SIZE / 2, width: ORB_SIZE, height: ORB_SIZE, zIndex: 30 }}>
          <VoiceOrbCluster speaker={orb.speaker} level={orb.speaker === 'processing' ? 0 : 0.12} spin={0.5} morphSpeed={0.04} size={ORB_SIZE} count={620} aiColor={orb.color} idleColor={IDLE_COLOR} avatarSrc={asset('/profilepicnew.png')} avatarScale={AVATAR_SCALE} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', left: '50%', top: `calc(50% + ${AVATAR_R + 20}px)`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ background: 'rgba(4,14,9,0.66)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 16, padding: '9px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 34px rgba(0,0,0,0.5)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Revenue Today</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', marginTop: 2, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  ${Math.round(revDisplay).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right rail — grounded outcome counters ── */}
        <aside style={{ position: 'absolute', left: RAIL_X, top: STATUS_H + 60, width: 350, display: 'flex', flexDirection: 'column', gap: 14, zIndex: 30 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b' }}>Outcomes · automated</div>
          <Counter label="Conversations handled today" value={Math.round(convoDisplay).toLocaleString()} live />
          <Counter label="Calls booked this week" value="9" />
          <Counter label="Buyers ascended this month" value="47" />
          <Counter label="Revenue recovered · cold leads" value="$3,180" />
          {/* the punchline */}
          <div style={{ marginTop: 4, background: 'rgba(22,164,108,0.12)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#86efac', letterSpacing: 0.3 }}>You worked today</div>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>0 hours</div>
          </div>
        </aside>

        {/* ── Bottom activity ticker (the "while you slept" feed) ── */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 54, background: 'rgba(2,8,16,0.92)', borderTop: '1px solid #1e2b45', display: 'flex', alignItems: 'center', overflow: 'hidden', zIndex: 45 }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px', height: '100%', background: 'rgba(74,222,128,0.1)', borderRight: '1px solid #1e2b45' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#4ade80' }} className="pulse-glow" />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#86efac' }}>Live feed</span>
          </div>
          <div className="ops-ticker" style={{ display: 'flex', whiteSpace: 'nowrap', willChange: 'transform' }}>
            {[0, 1].map((copy) => (
              <span key={copy} style={{ display: 'flex', alignItems: 'center' }}>
                {ACTIVITY.map((a, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 26px', fontSize: 15 }}>
                    <span style={{ color: '#4ade80', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{a.t}</span>
                    <span style={{ color: '#cbd5e1' }}>{a.s}</span>
                    {a.mark && <span>{a.mark}</span>}
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', border: '1px solid #2a3a55', borderRadius: 999, padding: '2px 8px' }}>🤖 no human</span>
                    <span style={{ color: '#334155' }}>•</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes ops-flow { to { stroke-dashoffset: -250; } }
          .ops-flow { animation: ops-flow 2s linear infinite; }
          @keyframes ops-inbound-k { from { stroke-dashoffset: 2000; opacity: 1; } to { stroke-dashoffset: 0; opacity: 0; } }
          .ops-inbound { animation: ops-inbound-k 0.8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }
          @keyframes ops-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .ops-ticker { animation: ops-ticker 42s linear infinite; }
        `}</style>
      </div>
    </main>
  );
}

function Counter({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div style={{ background: '#0f1a2c', border: '1px solid #1e2b45', borderRadius: 14, padding: '13px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
        {live && <span style={{ width: 7, height: 7, borderRadius: 999, background: '#4ade80' }} className="pulse-glow" />}
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1, marginTop: 5, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
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
