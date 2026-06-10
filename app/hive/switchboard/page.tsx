'use client';

// HIVE VARIANT 6 · "Switchboard" (9:16 vertical, 1080×1920) — leads rain into
// the orb from the top; the conversations it's holding right now run live
// below. Warm d4a palette (matches /talk/ask-the-floor).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createLeads, buildFunnelSrc,
  useFitStage, useRecordingChrome, useLiveTally, useRealTileOutcomes, useCountUp,
  type Outcome,
} from '@/lib/adStage';

const VW = 1080, VH = 1920;
const LETTERBOX = '#E9E3D8';

// d4a tokens (same direction as ask-the-floor)
const T = {
  bg: '#FFFDFB', surface: '#F6F3EC',
  ink: '#2E2B26', ink3: 'rgba(46,43,38,.70)', ink4: 'rgba(46,43,38,.50)',
  line: 'rgba(46,43,38,.10)',
  accent: '#16A46C', accentInk: '#106844', accentSoft: 'rgba(22,164,108,.10)', accentLine: 'rgba(22,164,108,.22)', mint: '#5BC998',
  shadowSm: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
};
const ORB_GRADIENT = `radial-gradient(circle at 35% 28%, #d6f5e6 0%, ${T.mint} 26%, ${T.accent} 64%, ${T.accentInk} 100%)`;

const ORB_R = 180;
const ORB_CY = 640;
const LANES = [200, 540, 880];
const POOL = ['Maria · IG ad', 'Devon · FB ad', 'Priya · YouTube', 'Jake · IG ad', 'Sofia · FB ad', 'Liam · TikTok', 'Ava · IG ad', 'Noah · FB ad'];
const DROP_MS = 2600;

type Drop = { key: number; lane: number; label: string };

export default function SwitchboardAd() {
  const fit = useFitStage(VW, VH);
  useRecordingChrome(LETTERBOX);
  const leads = useMemo(() => createLeads(2), []);
  const outcomes = useRealTileOutcomes();
  const { tally, feed } = useLiveTally({ basePurchases: 58, baseCalls: 24, minMs: 4000, maxMs: 6500 });
  const sales = useCountUp(tally.purchases);
  const calls = useCountUp(tally.calls);
  const revenue = useCountUp(tally.revenue);

  // Lead rain: spawn a chip every ~1.2s, prune when its fall completes.
  const [drops, setDrops] = useState<Drop[]>([]);
  const dropKey = useRef(0);
  useEffect(() => {
    const spawn = setInterval(() => {
      const key = dropKey.current++;
      setDrops((prev) => [...prev.slice(-5), { key, lane: key % LANES.length, label: POOL[key % POOL.length] }]);
    }, 1200);
    return () => clearInterval(spawn);
  }, []);
  useEffect(() => {
    if (drops.length === 0) return;
    const oldest = drops[0];
    const t = setTimeout(() => setDrops((prev) => prev.filter((d) => d.key !== oldest.key)), DROP_MS + 200);
    return () => clearTimeout(t);
  }, [drops]);

  // Orb flare per tally event.
  const [flare, setFlare] = useState(0);
  const lastKey = useRef<number | null>(null);
  useEffect(() => {
    const top = feed[0];
    if (!top || lastKey.current === top.key) return;
    lastKey.current = top.key;
    const t = setTimeout(() => setFlare((f) => f + 1), 0);
    return () => clearTimeout(t);
  }, [feed]);

  return (
    <main style={{ position: 'fixed', inset: 0, background: LETTERBOX, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: VW, height: VH, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(110% 50% at 50% 4%, ${T.surface} 0%, ${T.bg} 60%)`,
          color: T.ink, fontFamily: 'inherit',
        }}
      >
        {/* Top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', zIndex: 40 }}>
          <span style={{ fontSize: 31, fontWeight: 600, letterSpacing: '-0.01em' }}>Lucas&nbsp;AI</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 20, fontWeight: 600, color: T.accentInk, background: T.accentSoft, border: `1px solid ${T.accentLine}`, borderRadius: 100, padding: '10px 20px 10px 16px' }}>
            <span className="pulse-glow" style={{ width: 14, height: 14, borderRadius: 999, background: T.accent }} /> Live · 24/7
          </span>
        </div>

        {/* Lead rain */}
        {drops.map((d) => (
          <div key={d.key} className="sb-drop" style={{
              position: 'absolute', left: LANES[d.lane] - 110, top: -60, width: 220, zIndex: 20,
              background: T.bg, border: `1px solid ${T.line}`, borderRadius: 14, padding: '10px 16px',
              boxShadow: T.shadowSm, fontSize: 19, fontWeight: 600, color: T.ink3, textAlign: 'center', whiteSpace: 'nowrap',
            }}>
            {d.label}
          </div>
        ))}

        {/* Orb */}
        <div key={`orb-${flare}`} style={{
            position: 'absolute', left: VW / 2 - ORB_R, top: ORB_CY - ORB_R, width: ORB_R * 2, height: ORB_R * 2,
            borderRadius: '50%', zIndex: 30, background: ORB_GRADIENT,
            boxShadow: '0 24px 60px rgba(22,164,108,0.22), inset 0 10px 34px rgba(255,255,255,0.5)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'sb-bump 0.8s ease-out',
          }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.92)', textTransform: 'uppercase', letterSpacing: 1.2 }}>Revenue today</span>
          <span style={{ fontSize: 62, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            ${Math.round(revenue).toLocaleString()}
          </span>
        </div>
        <div style={{ position: 'absolute', top: ORB_CY + ORB_R + 26, left: 0, right: 0, textAlign: 'center', zIndex: 30, fontSize: 26, fontWeight: 600, color: T.ink3 }}>
          50 conversations · one mind
        </div>

        {/* KPI strip */}
        <div style={{ position: 'absolute', top: 950, left: 48, right: 48, display: 'flex', gap: 24, zIndex: 30 }}>
          <Kpi label="Sales today" value={Math.round(sales).toLocaleString()} />
          <Kpi label="Calls booked" value={Math.round(calls).toLocaleString()} accent />
        </div>

        {/* Two live conversations */}
        {leads.map((lead, i) => {
          const resolved = outcomes[lead.id];
          const isBuy = resolved?.outcome === 'buy';
          return (
            <article key={lead.id} style={{
                position: 'absolute', left: 48, right: 48, top: 1170 + i * 360, height: 330,
                borderRadius: 18, overflow: 'hidden', zIndex: 30,
                border: isBuy ? `3px solid ${T.accent}` : `1px solid ${T.line}`,
                background: T.bg, boxShadow: T.shadowSm,
              }}>
              <header style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', background: isBuy ? T.accent : T.surface, color: isBuy ? '#fff' : T.ink, borderBottom: `1px solid ${T.line}` }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>Conversation #{String(i + 1).padStart(2, '0')}</span>
                <StatusPill resolved={resolved} light={!isBuy} />
              </header>
              <iframe title={`switchboard-${i}`} src={buildFunnelSrc(lead, i, { count: 2, demoScale: 0.62, speed: 0.5 })} allow="autoplay"
                style={{ width: '100%', height: 282, border: 'none', pointerEvents: 'none', display: 'block', background: '#fff' }} />
            </article>
          );
        })}

        <style>{`
          @keyframes sb-drop-k {
            from { transform: translateY(0) scale(1); opacity: 0; }
            8% { opacity: 1; }
            78% { opacity: 1; }
            to { transform: translateY(${ORB_CY - 40}px) scale(0.5); opacity: 0; }
          }
          .sb-drop { animation: sb-drop-k ${DROP_MS}ms cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards; }
          @keyframes sb-bump { 0% { transform: scale(1); filter: brightness(1); } 15% { transform: scale(1.06); filter: brightness(1.18); } 100% { transform: scale(1); filter: brightness(1); } }
        `}</style>
      </div>
    </main>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1, background: accent ? T.surface : T.bg, border: `1px solid ${accent ? T.accentLine : T.line}`, borderRadius: 16, padding: '20px 28px', boxShadow: T.shadowSm }}>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: accent ? T.accentInk : T.ink3 }}>{label}</div>
      <div style={{ fontSize: 72, fontWeight: 700, color: accent ? T.accentInk : T.ink, lineHeight: 1.05, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function StatusPill({ resolved, light }: { resolved?: Outcome; light?: boolean }) {
  if (resolved?.outcome === 'buy') return <span style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase' }}>SOLD ${resolved.valueUsd}</span>;
  if (resolved?.outcome === 'book') return <span style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: light ? T.accentInk : '#fff' }}>BOOKED</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: T.ink4 }}>
      <span className="pulse-glow" style={{ width: 7, height: 7, borderRadius: 4, background: T.accent }} /> Working…
    </span>
  );
}
