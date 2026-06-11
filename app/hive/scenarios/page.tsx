'use client';

// HIVE VARIANT · "Pick Your Path" — the Value Ladder, split into two selectable
// scenarios so a non-techy viewer self-selects the one that matches their business:
//   • Products & Memberships  (Low $17 → Mid $497/mo) — the volume + recurring engine
//   • High-Ticket Coaching    (AI chats → booked calls → $15k closes) — the closer engine
// A full-screen two-card chooser flies into the chosen floor; the avatar brain core,
// glowing Hive threads, and live funnel tiles are reused per scenario. Revenue is
// summed honestly from each event's tier price (small steps vs $15k jumps).

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
const SALE_MIN_MS = 5000; // min gap between orb loadings (≥5s between dramatized "sales")
const LOAD_MS = 2600;     // how long the loading ring holds per sale

type Mode = 'lowmid' | 'aihigh';

type TierCfg = {
  key: string;
  tag: string;        // header price/label tag, e.g. '$17', 'AI Chat', '$15,000'
  n: number; cx: number; w: number; h: number; gap: number; demoScale: number;
  orbColor: string;   // loading-ring colour when this tier fires
  soldText: string;   // status pill text when a tile is hit
  idleText: string;   // status pill text while idle
  footLabel: string;  // big footer label under the column
  statNote: string;   // ambient "X today" footer count
  price: number;      // revenue added per event on this tier (0 = activity-only)
};

type Scenario = {
  key: Mode;
  name: string;        // header subtitle
  brainNote: string;   // pill under the revenue card
  revLabel: string;    // 'Revenue Today' / 'Closed Today'
  baseRevenue: number; // seeded "earlier today" figure
  cadence: { minMs: number; maxMs: number };
  // false: revenue climbs on every sale (volume path, fast small steps).
  // true:  revenue only moves on a dramatized close (closer path, rare $15k jumps).
  gatedRevenue: boolean;
  tiers: TierCfg[];
};

const SCENARIOS: Record<Mode, Scenario> = {
  lowmid: {
    key: 'lowmid',
    name: 'Products & Memberships',
    brainNote: '1 AI · sells & ascends',
    revLabel: 'Revenue Today',
    baseRevenue: 5846, // ≈ 110×$17 + 8×$497
    cadence: { minMs: 1800, maxMs: 3000 },
    gatedRevenue: false,
    tiers: [
      { key: 'low', tag: '$17', n: 4, cx: 720, w: 320, h: 210, gap: 18, demoScale: 0.6, orbColor: '#38bdf8', soldText: 'SOLD $17', idleText: 'Selling…', footLabel: 'LOW TICKET · $17', statNote: '110 sold today', price: 17 },
      { key: 'mid', tag: '$497/mo', n: 3, cx: 1300, w: 360, h: 250, gap: 22, demoScale: 0.6, orbColor: '#f59e0b', soldText: 'JOINED $497/mo', idleText: 'Selling…', footLabel: 'MEMBERSHIP · $497/mo', statNote: '8 new members', price: 497 },
    ],
  },
  aihigh: {
    key: 'aihigh',
    name: 'High-Ticket Coaching & Services',
    brainNote: '1 AI · chats, books & closes',
    revLabel: 'Closed Today',
    baseRevenue: 30000, // ≈ 2 × $15,000 closed earlier
    cadence: { minMs: 1600, maxMs: 2800 },
    gatedRevenue: true,
    tiers: [
      { key: 'chat', tag: 'AI Chat', n: 4, cx: 620, w: 300, h: 200, gap: 18, demoScale: 0.6, orbColor: '#38bdf8', soldText: 'REPLIED', idleText: 'In chat…', footLabel: 'LIVE CONVERSATIONS', statNote: '184 chats today', price: 0 },
      { key: 'call', tag: 'Call', n: 3, cx: 1080, w: 340, h: 240, gap: 20, demoScale: 0.6, orbColor: '#f59e0b', soldText: 'BOOKED', idleText: 'Scheduling…', footLabel: 'BOOKED CALLS', statNote: '11 booked today', price: 0 },
      { key: 'high', tag: '$15,000', n: 2, cx: 1540, w: 380, h: 320, gap: 24, demoScale: 0.6, orbColor: '#a855f7', soldText: 'SOLD $15,000', idleText: 'Closing…', footLabel: 'HIGH-TICKET · $15,000', statNote: '2 closed today', price: 15000 },
    ],
  },
};

type Tile = { leadId: number; tier: TierCfg; idx: number; left: number; top: number; cx: number; cy: number };

function buildTiles(tiers: TierCfg[]): Tile[] {
  const tiles: Tile[] = [];
  let leadId = 0;
  for (const tier of tiers) {
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

export default function ScenariosAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const [mode, setMode] = useState<Mode | null>(null);

  // Deep-link: ?mode=lowmid|aihigh opens straight into a floor (deferred to keep
  // setState out of the effect body, per the repo lint baseline).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('mode');
    if (p === 'lowmid' || p === 'aihigh') {
      const m = p;
      setTimeout(() => setMode(m), 0);
    }
  }, []);

  // Recording shortcuts: 1 = volume path, 2 = closer path, 0/Esc = chooser.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1') setMode('lowmid');
      else if (e.key === '2') setMode('aihigh');
      else if (e.key === '0' || e.key === 'Escape') setMode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        {mode
          ? <ScenarioFloor key={mode} scenario={SCENARIOS[mode]} onSwitch={() => setMode(null)} />
          : <Chooser onPick={setMode} />}

        <style>{`
          @keyframes ladder-flow { to { stroke-dashoffset: 254; } }
          .ladder-flow { animation: ladder-flow 2s linear infinite; }
          @keyframes ladder-inbound-k { from { stroke-dashoffset: 2000; opacity: 1; } to { stroke-dashoffset: 0; opacity: 0; } }
          .ladder-inbound { animation: ladder-inbound-k 0.8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }
          @keyframes scn-fly { from { opacity: 0; transform: scale(0.95) translateX(-26px); } to { opacity: 1; transform: scale(1) translateX(0); } }
          .scn-fly { animation: scn-fly 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
          @keyframes scn-choose-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
          .scn-choose-in { animation: scn-choose-in 0.5s ease both; }
          .scn-card { transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; cursor: pointer; }
          .scn-card:hover { transform: translateY(-6px); border-color: #4ade80 !important; box-shadow: 0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(74,222,128,0.4) !important; }
          .scn-card:hover .scn-cta { background: #4ade80; color: #062013; }
        `}</style>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chooser — "Which one sounds like your business?"                          */
/* -------------------------------------------------------------------------- */

function Chooser({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <div className="scn-choose-in" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, zIndex: 50 }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <span style={{ width: 16, height: 16, borderRadius: 999, background: C.green, boxShadow: '0 0 12px rgba(46,125,82,0.8)' }} className="pulse-glow" />
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>Lucas AI Core</span>
      </div>
      <h1 style={{ margin: 0, fontSize: 52, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.1 }}>
        Which one sounds like your business?
      </h1>
      <p style={{ margin: '16px 0 48px', fontSize: 22, color: '#94a3b8', textAlign: 'center' }}>
        Pick a path and watch one AI work it live.
      </p>

      <div style={{ display: 'flex', gap: 40 }}>
        <Card
          onPick={() => onPick('lowmid')}
          accent="#38bdf8"
          eyebrow="The Volume Engine"
          title="Products & Memberships"
          sub="I sell low-ticket offers and recurring plans."
          chips={['$17 offers', '$497/mo memberships', 'Sells & upsells 24/7']}
          cta="Show me this path →"
        />
        <Card
          onPick={() => onPick('aihigh')}
          accent="#a855f7"
          eyebrow="The Closer Engine"
          title="High-Ticket Coaching & Services"
          sub="My AI chats with leads, books calls, and closes premium deals."
          chips={['AI conversations', 'Booked calls', '$15,000 closes']}
          cta="Show me this path →"
        />
      </div>

      <p style={{ marginTop: 40, fontSize: 14, color: '#475569' }}>Press 1 or 2 to pick · 0 to come back</p>
    </div>
  );
}

function Card({ onPick, accent, eyebrow, title, sub, chips, cta }: {
  onPick: () => void; accent: string; eyebrow: string; title: string; sub: string; chips: string[]; cta: string;
}) {
  return (
    <div className="scn-card" onClick={onPick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPick(); }}
      style={{
        width: 540, padding: '38px 40px', borderRadius: 24,
        background: 'linear-gradient(160deg, #182539 0%, #0f1a2b 100%)',
        border: '2px solid #334155', boxShadow: '0 18px 44px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}
    >
      <span style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', color: accent, background: `${accent}1f`, border: `1px solid ${accent}55`, padding: '6px 14px', borderRadius: 999 }}>
        {eyebrow}
      </span>
      <h2 style={{ margin: 0, fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1.12 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 19, color: '#cbd5e1', lineHeight: 1.4 }}>{sub}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 2 }}>
        {chips.map((c) => (
          <span key={c} style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '7px 14px', borderRadius: 999 }}>{c}</span>
        ))}
      </div>
      <span className="scn-cta" style={{ marginTop: 14, alignSelf: 'flex-start', fontSize: 17, fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '12px 22px', borderRadius: 12, transition: 'background 0.18s ease, color 0.18s ease' }}>
        {cta}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ScenarioFloor — the live wall for the chosen path                         */
/* -------------------------------------------------------------------------- */

function ScenarioFloor({ scenario, onSwitch }: { scenario: Scenario; onSwitch: () => void }) {
  const tileCount = useMemo(() => scenario.tiers.reduce((a, t) => a + t.n, 0), [scenario]);
  const leads = useMemo(() => createLeads(tileCount), [tileCount]);
  const tiles = useMemo(() => buildTiles(scenario.tiers), [scenario]);
  const paths = useMemo(() => tiles.map(threadPath), [tiles]);
  const { feed } = useLiveTally({ baseRevenue: scenario.baseRevenue, basePurchases: 100, baseCalls: 10, minMs: scenario.cadence.minMs, maxMs: scenario.cadence.maxMs });

  const top = feed[0];
  const pulseIdx = top ? top.leadNo % tileCount : 0;

  // Which tiles are mid-flash (the newest few events), in sync with the money pulse.
  const hitByTile = useMemo(() => {
    const m: Record<number, true> = {};
    for (const ev of feed.slice(0, 4)) m[ev.leadNo % tileCount] = true;
    return m;
  }, [feed, tileCount]);

  // Honest revenue: each sale adds its tile's tier price. Volume path (gatedRevenue
  // false) climbs on every event in $17/$497 steps; closer path (gatedRevenue true)
  // only moves on a dramatized $15k close — incremented inside the gated orb effect.
  const [revenue, setRevenue] = useState(scenario.baseRevenue);
  const lastRevKey = useRef<number | null>(null);
  useEffect(() => {
    if (scenario.gatedRevenue) return;
    const ev = feed[0];
    if (!ev || lastRevKey.current === ev.key) return;
    lastRevKey.current = ev.key;
    const price = tiles[ev.leadNo % tileCount].tier.price;
    if (price > 0) setTimeout(() => setRevenue((r) => r + price), 0);
  }, [feed, tiles, tileCount, scenario]);
  const revDisplay = useCountUp(revenue);

  // Brain orb: idle green sphere; on each sale spins up the loading ring in the
  // firing tier's colour for LOAD_MS, then settles. ≥5s between loadings.
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
    const tier = tiles[ev.leadNo % tileCount].tier;
    const color = tier.orbColor ?? IDLE_COLOR;
    setTimeout(() => setOrb({ speaker: 'processing', color }), 0);
    settleRef.current = setTimeout(() => setOrb((s) => ({ speaker: 'idle', color: s.color })), LOAD_MS);
    // Closer path: a dramatized close on a priced tier books its revenue, so the
    // $15k jump lands exactly with the purple loading ring.
    if (scenario.gatedRevenue && tier.price > 0) setTimeout(() => setRevenue((r) => r + tier.price), 0);
  }, [feed, tiles, tileCount, scenario]);
  useEffect(() => () => { if (settleRef.current) clearTimeout(settleRef.current); }, []);

  return (
    <div className="scn-fly" style={{ position: 'absolute', inset: 0 }}>
      {/* Header */}
      <header style={{ position: 'absolute', top: 34, left: 48, display: 'flex', alignItems: 'center', gap: 14, zIndex: 40 }}>
        <span style={{ width: 16, height: 16, borderRadius: 999, background: C.green, boxShadow: '0 0 12px rgba(46,125,82,0.8)' }} className="pulse-glow" />
        <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>Lucas AI Core</span>
        <span style={{ color: '#334155' }}>·</span>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#64748b' }}>{scenario.name}</span>
      </header>

      {/* Switch path (top-right) */}
      <button onClick={onSwitch}
        style={{ position: 'absolute', top: 34, right: 48, zIndex: 50, cursor: 'pointer',
          fontSize: 15, fontWeight: 800, letterSpacing: 0.5, color: '#e2e8f0',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
          padding: '10px 18px', borderRadius: 999 }}>
        ↺ Switch path
      </button>

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

      {/* Tiles (live funnels) */}
      {tiles.map((t) => {
        const lead = leads[t.leadId];
        const hit = !!hitByTile[t.leadId];
        return (
          <article key={t.leadId} style={{
              position: 'absolute', left: t.left, top: t.top, width: t.tier.w, height: t.tier.h,
              borderRadius: 12, overflow: 'hidden', zIndex: 20,
              border: hit ? `4px solid ${C.green}` : '2px solid #334155',
              background: '#0f172a', boxShadow: hit ? '0 0 28px rgba(46,125,82,0.5)' : '0 8px 18px rgba(0,0,0,0.4)',
              transition: 'border 0.3s ease, box-shadow 0.3s ease',
            }}>
            <header style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', background: hit ? C.green : '#1e293b', color: '#fff', transition: 'background 0.3s ease' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: hit ? '#fff' : '#cbd5e1' }}>
                {t.tier.tag === 'AI Chat' || t.tier.tag === 'Call'
                  ? <span style={{ color: hit ? '#fff' : '#94a3b8' }}>{t.tier.tag}</span>
                  : <span style={{ color: hit ? '#fff' : '#4ade80' }}>{t.tier.tag}</span>}
              </span>
              <StatusPill tier={t.tier} hit={hit} />
            </header>
            <div style={{ width: '100%', height: t.tier.h - 26, background: '#fff' }}>
              <iframe title={`scn-${t.leadId}`} src={buildFunnelSrc(lead, t.leadId, { count: tileCount, demoScale: t.tier.demoScale, speed: 0.5 })}
                allow="autoplay" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: 'block' }} />
            </div>
          </article>
        );
      })}

      {/* Per-tier footers */}
      {scenario.tiers.map((tier) => {
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
              <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{scenario.revLabel}</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: '#fff', marginTop: 2, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                ${Math.round(revDisplay).toLocaleString()}
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.42)', padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}>
              {scenario.brainNote}
            </div>
          </div>
        </div>
      </div>
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
