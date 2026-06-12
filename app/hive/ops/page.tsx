'use client';

// HIVE VARIANT · "Ops Center" (productized) — the AI sales team as a REAL SaaS dashboard.
// Light Stripe/Notion design system: app top bar, a stats row of metric cards with
// sparklines + trend deltas, an activity timeline, and a flow/automation CANVAS where the
// brain is a source node with faint static connector lines to each live conversation (the
// active one gives a quiet green "executing" pulse on a sale). No glow, no energy beams.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_W, STAGE_H,
  createLeads, buildFunnelSrc,
  useFitStage, useRecordingChrome, useLiveTally, useCountUp,
} from '@/lib/adStage';
import VoiceOrbCluster, { type Speaker } from '@/components/VoiceOrbCluster';
import { asset } from '@/lib/basePath';

/* design tokens — Kodara d4a (warm white, warm ink, emerald + mint) */
const BG = '#F4F5F6';
const CARD = '#FFFFFF';
const BORDER = 'rgba(46,43,38,0.14)';
const INK = '#2E2B26';
const SUB = 'rgba(46,43,38,0.62)';
const FAINT = 'rgba(46,43,38,0.42)';
const ACCENT = '#16A46C';
const ACCENT_INK = '#106844';
const ACCENT_SOFT = 'rgba(22,164,108,0.10)';
const ACCENT_LINE = 'rgba(22,164,108,0.22)';
const POS = '#16A46C';
const LINE = 'rgba(46,43,38,0.20)';
const SHADOW = '0 1px 2px rgba(46,43,38,0.05), 0 1px 3px rgba(46,43,38,0.08)';

const SALE_MIN_MS = 5000;
const LOAD_MS = 2600;

/* canvas geometry (stage-absolute) */
const ORB_CX = 268, ORB_CY = 582, ORB_SIZE = 380, SRC_R = 160;

type TierCfg = { key: string; recurring: boolean; tilePrices: number[]; n: number; cx: number; w: number; h: number; gap: number; demoScale: number; orbColor: string; tagLabel: string };
const TIERS: TierCfg[] = [
  { key: 'low', recurring: false, tilePrices: [7, 27, 67, 97], n: 4, cx: 700, w: 282, h: 140, gap: 14, demoScale: 0.5, orbColor: '#16A46C', tagLabel: 'Low-ticket' },
  { key: 'mid', recurring: true, tilePrices: [197, 497, 1497], n: 3, cx: 1120, w: 300, h: 162, gap: 16, demoScale: 0.5, orbColor: '#106844', tagLabel: 'Membership' },
];
const TILE_COUNT = TIERS.reduce((a, t) => a + t.n, 0);
const BASE_REVENUE = 10737;

type Tile = { leadId: number; tier: TierCfg; price: number; tag: string; left: number; top: number; cx: number; cy: number };
function buildTiles(): Tile[] {
  const tiles: Tile[] = [];
  let leadId = 0;
  for (const tier of TIERS) {
    const totalH = tier.n * tier.h + (tier.n - 1) * tier.gap;
    const top0 = ORB_CY - totalH / 2;
    for (let i = 0; i < tier.n; i++) {
      const top = top0 + i * (tier.h + tier.gap);
      const price = tier.tilePrices[i];
      const tag = tier.recurring ? `$${price.toLocaleString()}/mo` : `$${price}`;
      tiles.push({ leadId, tier, price, tag, left: tier.cx - tier.w / 2, top, cx: tier.cx, cy: top + tier.h / 2 });
      leadId += 1;
    }
  }
  return tiles;
}

function linkPath(cx: number, cy: number, left: number): string {
  const ang = Math.atan2(cy - ORB_CY, cx - ORB_CX);
  const sx = ORB_CX + Math.cos(ang) * SRC_R;
  const sy = ORB_CY + Math.sin(ang) * SRC_R;
  const ex = left - 6, ey = cy;
  const pull = Math.abs(ex - sx) * 0.5;
  return `M ${sx} ${sy} C ${sx + pull} ${sy} ${ex - pull} ${ey} ${ex} ${ey}`;
}
function connPath(t: Tile): string { return linkPath(t.cx, t.cy, t.left); }

const FLOOR_W = 204, FLOOR_H = 116;
const FLOOR = [
  { name: 'SMS Rep', channel: 'SMS', work: '“Still in? →” · 14 queued', cx: 660, cy: 972 },
  { name: 'Emailer', channel: 'Email', work: 'Re-engage seq · 41 sending', cx: 884, cy: 972 },
  { name: 'Nurturer', channel: 'Chat', work: 'Pricing objection · resolved', cx: 1108, cy: 972 },
  { name: 'Onboarder', channel: 'Onboarding', work: 'Plan delivered · ×6', cx: 1332, cy: 972 },
];

const AGENT_COLOR: Record<string, string> = {
  Closer: '#106844', 'SMS Rep': '#16A46C', Emailer: '#5BC998', Nurturer: '#2F8F66', Onboarder: '#7C7468',
};
const ACTIVITY: { t: string; agent: string; text: string; won?: boolean }[] = [
  { t: '2:14 AM', agent: 'Closer', text: 'Ascended Marcus from $17 to $247/mo', won: true },
  { t: '1:09 AM', agent: 'Emailer', text: 'Recovered a buyer who went cold 41 days ago' },
  { t: '12:51 AM', agent: 'SMS Rep', text: 'Booked a call for Tuesday 3:00 PM' },
  { t: '12:18 AM', agent: 'Nurturer', text: 'Answered a pricing objection in your voice' },
  { t: '11:52 PM', agent: 'Onboarder', text: 'Delivered plans to 6 new buyers' },
  { t: '11:20 PM', agent: 'Closer', text: 'Ascended a $7 buyer to the $497/mo plan', won: true },
  { t: '10:46 PM', agent: 'SMS Rep', text: 'Re-engaged 14 stalled buyers' },
  { t: '10:09 PM', agent: 'Nurturer', text: 'Handled 9 questions overnight' },
];
const SPARKS = {
  convos: [280, 288, 291, 300, 296, 305, 312, 318, 314, 322, 326, 329],
  calls: [4, 5, 5, 6, 7, 6, 8, 8, 7, 9, 9, 9],
  ascend: [30, 33, 34, 38, 40, 41, 44, 45, 46, 47, 47, 47],
  recovered: [2100, 2300, 2480, 2600, 2760, 2880, 2960, 3050, 3110, 3180, 3180, 3180],
};

export default function OpsCenterAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const leads = useMemo(() => createLeads(TILE_COUNT), []);
  const tiles = useMemo(() => buildTiles(), []);
  const conns = useMemo(() => tiles.map(connPath), [tiles]);
  const floorConns = useMemo(() => FLOOR.map((f) => linkPath(f.cx, f.cy, f.cx - FLOOR_W / 2)), []);
  const { feed } = useLiveTally({ baseRevenue: BASE_REVENUE, basePurchases: 118, baseCalls: 0, minMs: 1800, maxMs: 3000 });

  const top = feed[0];
  const pulseIdx = top ? top.leadNo % TILE_COUNT : 0;
  const soldByTile = useMemo(() => {
    const m: Record<number, true> = {};
    for (const ev of feed.slice(0, 4)) m[ev.leadNo % TILE_COUNT] = true;
    return m;
  }, [feed]);

  const [revenue, setRevenue] = useState(BASE_REVENUE);
  const [convos, setConvos] = useState(329);
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

  const [orb, setOrb] = useState<{ speaker: Speaker; color: string }>({ speaker: 'idle', color: ACCENT });
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
    const color = tiles[ev.leadNo % TILE_COUNT].tier.orbColor ?? ACCENT;
    setTimeout(() => setOrb({ speaker: 'processing', color }), 0);
    settleRef.current = setTimeout(() => setOrb((s) => ({ speaker: 'idle', color: s.color })), LOAD_MS);
  }, [feed, tiles]);
  useEffect(() => () => { if (settleRef.current) clearTimeout(settleRef.current); }, []);

  return (
    <main style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden', background: BG,
          fontFamily: 'inherit', color: INK,
        }}
      >
        {/* ── App top bar ── */}
        <header style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', background: CARD, borderBottom: `1px solid ${BORDER}`, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>L</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: INK }}>Lucas&nbsp;AI</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: SUB, background: BG, border: `1px solid ${BORDER}`, borderRadius: 7, padding: '4px 10px' }}>AI Team workspace</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: SUB }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: POS }} className="pulse-glow" /> All systems operational
            </span>
            <span style={{ width: 1, height: 22, background: BORDER }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: SUB, fontVariantNumeric: 'tabular-nums' }}>2:14 AM</span>
            <span style={{ width: 30, height: 30, borderRadius: 999, background: 'rgba(46,43,38,0.07)', color: SUB, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>LT</span>
          </div>
        </header>

        {/* ── Stats row ── */}
        <div style={{ position: 'absolute', top: 72, left: 32, right: 32, display: 'flex', gap: 20, zIndex: 30 }}>
          <MetricCard label="Conversations handled" value={Math.round(convoDisplay).toLocaleString()} delta="12%" data={SPARKS.convos} live />
          <MetricCard label="Calls booked · this week" value="9" delta="2" data={SPARKS.calls} />
          <MetricCard label="Buyers ascended · this month" value="47" delta="8%" data={SPARKS.ascend} />
          <MetricCard label="Recovered from cold leads" value="$3,180" delta="14%" data={SPARKS.recovered} />
        </div>

        {/* ── Flow canvas (left + center): dotted backdrop ── */}
        <div style={{
          position: 'absolute', top: 212, left: 32, width: 1404, bottom: 32, background: CARD,
          border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW, overflow: 'hidden',
          backgroundImage: `radial-gradient(rgba(46,43,38,0.10) 1.2px, transparent 1.2px)`, backgroundSize: '22px 22px', backgroundPosition: '14px 14px',
        }} />
        <div style={{ position: 'absolute', top: 228, left: 52, fontSize: 13, fontWeight: 700, color: SUB, zIndex: 25, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: POS }} className="pulse-glow" /> Sales floor · {TILE_COUNT} conversations · {FLOOR.length} agents
        </div>

        {/* ── Connector lines (faint static; active one pulses green on a sale) ── */}
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 21 }}>
          {conns.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={LINE} strokeWidth={1.5} strokeLinecap="round" />
          ))}
          {floorConns.map((d, i) => (
            <path key={`f${i}`} d={d} fill="none" stroke={LINE} strokeWidth={1.5} strokeLinecap="round" />
          ))}
          {top && (
            <path key={top.key} d={conns[pulseIdx]} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="34 1030" className="ops-exec" />
          )}
        </svg>

        {/* ── Conversation tiles (nodes) ── */}
        {tiles.map((t) => {
          const lead = leads[t.leadId];
          const hit = !!soldByTile[t.leadId];
          return (
            <article key={t.leadId} style={{
                position: 'absolute', left: t.left, top: t.top, width: t.tier.w, height: t.tier.h, zIndex: 23,
                background: CARD, border: `1px solid ${hit ? ACCENT_LINE : BORDER}`, borderRadius: 13, overflow: 'hidden',
                boxShadow: hit ? '0 0 0 3px rgba(22,164,108,0.12), ' + SHADOW : SHADOW,
                display: 'flex', flexDirection: 'column', transition: 'border 0.3s ease, box-shadow 0.3s ease',
              }}>
              <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: INK, fontVariantNumeric: 'tabular-nums' }}>{t.tag}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: FAINT }}>{t.tier.tagLabel}</span>
                </span>
                {hit
                  ? <span style={{ fontSize: 10, fontWeight: 800, color: ACCENT_INK, background: ACCENT_SOFT, borderRadius: 999, padding: '3px 8px' }}>{t.tier.recurring ? 'Joined' : 'Sold'}</span>
                  : <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: SUB }}><span style={{ width: 5, height: 5, borderRadius: 999, background: POS }} className="pulse-glow" /> Active</span>}
              </header>
              <div style={{ flex: 1, background: '#fff', minHeight: 0 }}>
                <iframe title={`ops-${t.leadId}`} src={buildFunnelSrc(lead, t.leadId, { count: TILE_COUNT, demoScale: t.tier.demoScale, speed: 0.5 })}
                  allow="autoplay" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: 'block' }} />
              </div>
            </article>
          );
        })}

        {/* ── Other agents on the floor (bottom row) ── */}
        {FLOOR.map((f) => <FloorCard key={f.name} f={f} />)}

        {/* ── AI Engine source node (orb + revenue) ── */}
        <div style={{ position: 'absolute', left: ORB_CX - ORB_SIZE / 2, top: ORB_CY - ORB_SIZE / 2, width: ORB_SIZE, height: ORB_SIZE, zIndex: 24 }}>
          <div style={{ position: 'absolute', inset: 30, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(22,164,108,0.13), rgba(22,164,108,0))' }} />
          <VoiceOrbCluster speaker={orb.speaker} level={orb.speaker === 'processing' ? 0 : 0.1} spin={0.45} morphSpeed={0.04} size={ORB_SIZE} count={480} aiColor={ACCENT} idleColor={ACCENT} light avatarSrc={asset('/profilepicnew.png')} avatarScale={0.52} style={{ position: 'absolute', inset: 0 }} />
        </div>
        <div style={{ position: 'absolute', left: ORB_CX - 130, top: ORB_CY + ORB_SIZE / 2 - 6, width: 260, textAlign: 'center', zIndex: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: INK, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 999, padding: '5px 13px', boxShadow: SHADOW }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: POS }} className="pulse-glow" /> AI Engine · running
          </div>
          <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: SUB }}>Revenue today</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: INK, lineHeight: 1, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>${Math.round(revDisplay).toLocaleString()}</div>
          <div style={{ marginTop: 9, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: POS }}>▲ 9%</span> <span style={{ color: FAINT }}>vs yesterday</span>
          </div>
        </div>

        {/* ── Activity timeline (right) ── */}
        <section style={{ position: 'absolute', top: 212, left: 1456, width: 432, bottom: 32, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>Activity</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: SUB }}><span style={{ width: 7, height: 7, borderRadius: 999, background: POS }} className="pulse-glow" /> Live</span>
          </div>
          <div style={{ flex: 1, padding: '6px 6px', overflow: 'hidden' }}>
            {ACTIVITY.map((a, i) => {
              const initials = a.agent.split(' ').map((w) => w[0]).join('').slice(0, 2);
              return (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10 }}>
                  <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 999, background: AGENT_COLOR[a.agent] ?? SUB, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{initials}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK, lineHeight: 1.35 }}>{a.text}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: SUB, fontWeight: 600 }}>{a.agent}</span>
                      <span style={{ width: 3, height: 3, borderRadius: 999, background: FAINT }} />
                      <span style={{ fontSize: 12, color: FAINT, fontVariantNumeric: 'tabular-nums' }}>{a.t}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: SUB, border: `1px solid ${BORDER}`, borderRadius: 5, padding: '1px 5px' }}>AI</span>
                      {a.won && <span style={{ fontSize: 10, fontWeight: 800, color: ACCENT_INK, background: ACCENT_SOFT, borderRadius: 5, padding: '1px 6px' }}>Won</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <style>{`
          @keyframes ops-exec { 0% { stroke-dashoffset: 1030; opacity: 0; } 16% { opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
          .ops-exec { animation: ops-exec 1s cubic-bezier(0.3, 0.8, 0.4, 1) forwards; }
        `}</style>
      </div>
    </main>
  );
}

function FloorCard({ f }: { f: typeof FLOOR[number] }) {
  const initials = f.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return (
    <div style={{ position: 'absolute', left: f.cx - FLOOR_W / 2, top: f.cy - FLOOR_H / 2, width: FLOOR_W, height: FLOOR_H, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: SHADOW, padding: '12px 13px', zIndex: 23, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 999, background: AGENT_COLOR[f.name] ?? SUB, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{initials}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>{f.name}</span>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: ACCENT }} className="pulse-glow" />
      </div>
      <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, color: SUB, background: BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '2px 7px' }}>{f.channel}</span>
      <span style={{ fontSize: 12, color: SUB, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.work}</span>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 92, h = 34, max = Math.max(...data), min = Math.min(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`);
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={`${color}1f`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ label, value, delta, data, live }: { label: string; value: string; delta: string; data: number[]; live?: boolean }) {
  return (
    <div style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: SHADOW, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {live && <span style={{ width: 7, height: 7, borderRadius: 999, background: POS }} className="pulse-glow" />}
        <span style={{ fontSize: 13, fontWeight: 600, color: SUB }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color: INK, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          <div style={{ marginTop: 7, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: POS }}>▲ {delta}</span> <span style={{ color: FAINT }}>vs last month</span>
          </div>
        </div>
        <Sparkline data={data} color={POS} />
      </div>
    </div>
  );
}
