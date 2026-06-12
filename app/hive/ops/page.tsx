'use client';

// HIVE VARIANT · "Ops Center" (productized) — the AI sales team as a REAL SaaS dashboard,
// not a promo render. Light Stripe/Notion design system: app shell (top bar), a stats row
// of metric cards with sparklines + trend deltas, the brain kept in a calm "AI Engine"
// card, live-conversation tiles, and a proper activity timeline. No glow, no energy beams.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_W, STAGE_H,
  createLeads, buildFunnelSrc,
  useFitStage, useRecordingChrome, useLiveTally, useCountUp,
} from '@/lib/adStage';
import VoiceOrbCluster, { type Speaker } from '@/components/VoiceOrbCluster';
import { asset } from '@/lib/basePath';

/* design tokens — light, restrained */
const BG = '#F5F6F8';
const CARD = '#FFFFFF';
const BORDER = '#E6E8EC';
const INK = '#1B2330';
const SUB = '#677184';
const FAINT = '#98A1B0';
const ACCENT = '#16A46C';
const POS = '#15A36B';
const SHADOW = '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.07)';

const SALE_MIN_MS = 5000;
const LOAD_MS = 2600;

type TierCfg = { key: string; recurring: boolean; tilePrices: number[]; n: number; demoScale: number; orbColor: string; tagLabel: string };
const TIERS: TierCfg[] = [
  { key: 'low', recurring: false, tilePrices: [7, 27, 67, 97], n: 4, demoScale: 0.5, orbColor: '#2563EB', tagLabel: 'Low-ticket' },
  { key: 'mid', recurring: true, tilePrices: [197, 497, 1497], n: 3, demoScale: 0.5, orbColor: '#D97706', tagLabel: 'Membership' },
];
const TILE_COUNT = TIERS.reduce((a, t) => a + t.n, 0);
const BASE_REVENUE = 10737;

type Tile = { leadId: number; tier: TierCfg; price: number; tag: string };
function buildTiles(): Tile[] {
  const tiles: Tile[] = [];
  let leadId = 0;
  for (const tier of TIERS) {
    for (let i = 0; i < tier.n; i++) {
      const price = tier.tilePrices[i];
      const tag = tier.recurring ? `$${price.toLocaleString()}/mo` : `$${price}`;
      tiles.push({ leadId, tier, price, tag });
      leadId += 1;
    }
  }
  return tiles;
}

const AGENT_COLOR: Record<string, string> = {
  Closer: '#2563EB', 'SMS Rep': '#7C3AED', Emailer: '#0E9AAE', Nurturer: '#DB2777', Onboarder: '#D97706',
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
  const { feed } = useLiveTally({ baseRevenue: BASE_REVENUE, basePurchases: 118, baseCalls: 0, minMs: 1800, maxMs: 3000 });

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
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif', color: INK,
        }}
      >
        {/* ── App top bar ── */}
        <header style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', background: CARD, borderBottom: `1px solid ${BORDER}` }}>
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 600, color: SUB }}>
              Founder <Toggle on={false} /> <span style={{ color: INK }}>Away</span>
            </span>
            <span style={{ width: 1, height: 22, background: BORDER }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: SUB, fontVariantNumeric: 'tabular-nums' }}>2:14 AM</span>
            <span style={{ width: 30, height: 30, borderRadius: 999, background: '#E8EBF0', color: SUB, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>LT</span>
          </div>
        </header>

        {/* ── Stats row ── */}
        <div style={{ position: 'absolute', top: 84, left: 32, right: 32, display: 'flex', gap: 20 }}>
          <MetricCard label="Conversations handled" value={Math.round(convoDisplay).toLocaleString()} delta="12%" data={SPARKS.convos} live />
          <MetricCard label="Calls booked · this week" value="9" delta="2" data={SPARKS.calls} />
          <MetricCard label="Buyers ascended · this month" value="47" delta="8%" data={SPARKS.ascend} />
          <MetricCard label="Recovered from cold leads" value="$3,180" delta="14%" data={SPARKS.recovered} />
        </div>

        {/* ── AI Engine card (left) ── */}
        <section style={{ position: 'absolute', top: 228, left: 32, width: 452, bottom: 32, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>AI Engine</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: POS, background: '#E8F6EF', borderRadius: 999, padding: '4px 10px' }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: POS }} className="pulse-glow" /> Live
            </span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <VoiceOrbCluster speaker={orb.speaker} level={orb.speaker === 'processing' ? 0 : 0.1} spin={0.45} morphSpeed={0.04} size={360} count={560} aiColor={'#0E7A4F'} idleColor={'#0E7A4F'} avatarSrc={asset('/profilepicnew.png')} avatarScale={0.5} />
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: SUB }}>Revenue today</div>
              <div style={{ fontSize: 38, fontWeight: 700, color: INK, lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>${Math.round(revDisplay).toLocaleString()}</div>
              <div style={{ marginTop: 7, fontSize: 12, fontWeight: 600 }}>
                <span style={{ color: POS }}>▲ 9%</span> <span style={{ color: FAINT }}>vs yesterday</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', background: '#E8F6EF', border: '1px solid #BFE8D6', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0E7A4F' }}>You worked today</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: INK, lineHeight: 1, marginTop: 3 }}>0 hrs</div>
            </div>
          </div>
        </section>

        {/* ── Live conversations (center) ── */}
        <section style={{ position: 'absolute', top: 228, left: 504, width: 932, bottom: 32, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: INK }}>Live conversations <span style={{ color: FAINT, fontWeight: 600 }}>· {TILE_COUNT} active</span></span>
            <span style={{ fontSize: 12, fontWeight: 600, color: SUB, border: `1px solid ${BORDER}`, background: CARD, borderRadius: 8, padding: '5px 12px' }}>All agents ▾</span>
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '1fr', gap: 16 }}>
            {tiles.map((t) => {
              const lead = leads[t.leadId];
              const hit = !!soldByTile[t.leadId];
              return (
                <article key={t.leadId} style={{ background: CARD, border: `1px solid ${hit ? '#BFE8D6' : BORDER}`, borderRadius: 13, overflow: 'hidden', boxShadow: SHADOW, display: 'flex', flexDirection: 'column', transition: 'border 0.3s ease' }}>
                  <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: INK, fontVariantNumeric: 'tabular-nums' }}>{t.tag}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: FAINT }}>{t.tier.tagLabel}</span>
                    </span>
                    {hit
                      ? <span style={{ fontSize: 11, fontWeight: 800, color: POS, background: '#E8F6EF', borderRadius: 999, padding: '3px 9px' }}>{t.tier.recurring ? 'Joined' : 'Sold'}</span>
                      : <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: SUB }}><span style={{ width: 6, height: 6, borderRadius: 999, background: POS }} className="pulse-glow" /> Active</span>}
                  </header>
                  <div style={{ flex: 1, background: '#fff', minHeight: 0 }}>
                    <iframe title={`ops-${t.leadId}`} src={buildFunnelSrc(lead, t.leadId, { count: TILE_COUNT, demoScale: t.tier.demoScale, speed: 0.5 })}
                      allow="autoplay" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: 'block' }} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── Activity timeline (right) ── */}
        <section style={{ position: 'absolute', top: 228, left: 1456, width: 432, bottom: 32, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: SHADOW, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                      {a.won && <span style={{ fontSize: 10, fontWeight: 800, color: POS, background: '#E8F6EF', borderRadius: 5, padding: '1px 6px' }}>Won</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span style={{ display: 'inline-block', position: 'relative', width: 34, height: 20, borderRadius: 999, background: on ? ACCENT : '#CBD2DD' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
    </span>
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
