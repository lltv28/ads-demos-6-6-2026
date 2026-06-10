'use client';

// HIVE VARIANT 1 · "The Orbit" — all 50 agents around the brain.
// 8 live funnel tiles on an inner ring; 42 mini skeleton agents drift along an
// outer elliptical orbit (offset-path). Pulses fire core→tile on every event.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_W, STAGE_H, C,
  createLeads, buildFunnelSrc, makeAgentStats, money,
  useFitStage, useRecordingChrome, useLiveTally, useRealTileOutcomes, useCountUp,
  type Outcome,
} from '@/lib/adStage';
import { createSeededRandom as seeded } from '@/lib/demoAuto';

const BG = '#0f172a';
const CX = STAGE_W / 2;
const CY = STAGE_H / 2;
const CORE_R = 170;

// Inner ring: 8 live tiles, every 45°, radius from centre.
const LIVE = 8;
const RING_R = 420;
const TILE_W = 300;
const TILE_H = 210;
const TILE_LABEL_H = 36;

// Outer orbit: 42 minis on an ellipse (8 + 42 = 50 agents on screen).
const MINIS = 42;
const ORBIT_RX = 850;
const ORBIT_RY = 460;
const ORBIT_S = 180; // seconds per revolution

const STATS = makeAgentStats(LIVE, 6011);

const ringPos = (i: number) => {
  const a = (i / LIVE) * Math.PI * 2 - Math.PI / 2;
  return { x: CX + Math.cos(a) * RING_R, y: CY + Math.sin(a) * RING_R };
};

export default function OrbitAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const leads = useMemo(() => createLeads(LIVE), []);
  const outcomes = useRealTileOutcomes();
  const { tally, feed } = useLiveTally();
  const revenue = useCountUp(tally.revenue);

  // Inbound pulse to a random live tile on each new feed event.
  const [pulse, setPulse] = useState({ key: 0, idx: 0 });
  const lastKey = useRef<number | null>(null);
  useEffect(() => {
    const top = feed[0];
    if (!top || lastKey.current === top.key) return;
    lastKey.current = top.key;
    const captured = { key: top.key + 1, idx: top.leadNo % LIVE };
    setTimeout(() => setPulse(captured), 0);
  }, [feed]);

  // Random outer mini flashes a SOLD/BOOKED chip every ~3.5s.
  const [flash, setFlash] = useState({ key: 0, idx: 0, label: '' });
  useEffect(() => {
    const id = setInterval(() => {
      setFlash((f) => ({
        key: f.key + 1,
        idx: Math.floor(Math.random() * MINIS),
        label: Math.random() < 0.65 ? `SOLD $${Math.random() < 0.5 ? 17 : 97}` : 'BOOKED',
      }));
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const miniSeeds = useMemo(() => {
    const rnd = seeded(7331);
    return Array.from({ length: MINIS }, () => 0.4 + rnd() * 0.6);
  }, []);

  return (
    <main style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(circle at 50% 50%, #1e293b 0%, ${BG} 100%)`,
          fontFamily: 'inherit',
        }}
      >
        <header style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 72, display: 'flex', alignItems: 'center', gap: 16, padding: '0 48px', zIndex: 40 }}>
          <span style={{ width: 16, height: 16, borderRadius: 999, background: C.green, boxShadow: '0 0 12px rgba(46,125,82,0.8)' }} className="pulse-glow" />
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>LUCAS AI · 50 AGENTS IN ORBIT</span>
        </header>

        {/* Wires + inbound pulse */}
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
          {Array.from({ length: LIVE }, (_, i) => {
            const p = ringPos(i);
            const a = Math.atan2(p.y - CY, p.x - CX);
            const sx = CX + Math.cos(a) * (CORE_R + 6);
            const sy = CY + Math.sin(a) * (CORE_R + 6);
            return (
              <g key={i}>
                <path d={`M ${sx} ${sy} L ${p.x} ${p.y}`} stroke="rgba(255,255,255,0.05)" strokeWidth={6} fill="none" />
                <path d={`M ${sx} ${sy} L ${p.x} ${p.y}`} stroke="rgba(46,125,82,0.35)" strokeWidth={2} fill="none" />
              </g>
            );
          })}
          {(() => {
            const p = ringPos(pulse.idx);
            const a = Math.atan2(p.y - CY, p.x - CX);
            const sx = CX + Math.cos(a) * (CORE_R + 6);
            const sy = CY + Math.sin(a) * (CORE_R + 6);
            return (
              <path key={pulse.key} d={`M ${sx} ${sy} L ${p.x} ${p.y}`} stroke="#4ade80" strokeWidth={12}
                fill="none" strokeLinecap="round" strokeDasharray="40 2000" className="orbit-inbound"
                style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.8))' }} />
            );
          })()}
        </svg>

        {/* Outer orbit of 42 minis */}
        {miniSeeds.map((s, i) => {
          const isFlash = flash.idx === i;
          return (
            <div
              key={i}
              style={{
                position: 'absolute', left: 0, top: 0, width: 120, height: 84, marginLeft: -60, marginTop: -42,
                offsetPath: `ellipse(${ORBIT_RX}px ${ORBIT_RY}px at ${CX}px ${CY}px)`, offsetRotate: '0deg',
                animation: `orbit-travel ${ORBIT_S}s linear infinite`,
                animationDelay: `${-(i / MINIS) * ORBIT_S}s`,
                zIndex: 5,
              } as React.CSSProperties}
            >
              <div style={{ width: '100%', height: '100%', background: '#101b31', border: '1px solid #283455', borderRadius: 10, padding: 8, boxSizing: 'border-box', opacity: 0.92 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="pulse-glow" style={{ width: 6, height: 6, borderRadius: 999, background: C.green, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>Lucas AI #{String(i + 9).padStart(2, '0')}</span>
                </div>
                {isFlash ? (
                  <div key={flash.key} style={{ marginTop: 10, textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#fff', background: C.green, borderRadius: 6, padding: '4px 0', animation: 'orbit-pop 0.4s ease' }}>
                    {flash.label}
                  </div>
                ) : (
                  <>
                    <div style={{ marginTop: 8, width: `${55 + s * 30}%`, height: 6, borderRadius: 3, background: 'rgba(148,163,184,0.25)' }} />
                    <div style={{ marginTop: 6, width: `${35 + s * 40}%`, height: 6, borderRadius: 3, background: 'rgba(46,125,82,0.4)', marginLeft: 'auto' }} />
                    <div style={{ marginTop: 6, width: `${45 + s * 25}%`, height: 6, borderRadius: 3, background: 'rgba(148,163,184,0.25)' }} />
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Inner ring: 8 live tiles */}
        {leads.map((lead, i) => {
          const p = ringPos(i);
          const resolved = outcomes[lead.id];
          const isBuy = resolved?.outcome === 'buy';
          return (
            <article key={lead.id} style={{
                position: 'absolute', left: p.x - TILE_W / 2, top: p.y - TILE_H / 2, width: TILE_W, height: TILE_H,
                borderRadius: 14, overflow: 'hidden', zIndex: 20,
                border: isBuy ? `3px solid ${C.green}` : '2px solid #334155',
                background: '#0f172a', boxShadow: isBuy ? '0 0 28px rgba(46,125,82,0.5)' : '0 8px 16px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease',
              }}>
              <header style={{ height: TILE_LABEL_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: isBuy ? C.green : '#1e293b', color: '#fff', transition: 'background 0.3s ease' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Lucas AI #{String(i + 1).padStart(2, '0')}</span>
                <StatusPill resolved={resolved} />
              </header>
              <div style={{ width: '100%', height: TILE_H - TILE_LABEL_H, background: '#fff' }}>
                <iframe
                  title={`orbit-${i + 1}`}
                  src={buildFunnelSrc(lead, i, { count: LIVE, demoScale: 0.5, speed: 0.5 })}
                  allow="autoplay"
                  style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                />
              </div>
            </article>
          );
        })}

        {/* Core */}
        <div key={`core-${pulse.key}`} style={{
            position: 'absolute', left: CX - CORE_R, top: CY - CORE_R,
            width: CORE_R * 2, height: CORE_R * 2, borderRadius: '50%', zIndex: 30,
            background: 'radial-gradient(circle at 30% 30%, #4ade80 0%, #166534 60%, #064e3b 100%)',
            boxShadow: '0 0 64px rgba(74,222,128,0.4), inset 0 4px 16px rgba(255,255,255,0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'orbit-bump 0.8s ease-out',
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Revenue Today</div>
          <div style={{ fontSize: 64, fontWeight: 700, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.3)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            ${Math.round(revenue).toLocaleString()}
          </div>
          <div style={{ marginTop: 12, background: 'rgba(0,0,0,0.3)', padding: '7px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            50 agents · 1 mind
          </div>
        </div>

        {/* Per-live-agent stat chips along the bottom */}
        <footer style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10, zIndex: 40 }}>
          {STATS.slice(0, 4).map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, background: 'rgba(15,23,42,0.85)', border: '1px solid #334155', borderRadius: 10, padding: '8px 14px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>#{String(i + 1).padStart(2, '0')}</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{s.sales}<span style={{ fontSize: 11, color: '#94a3b8' }}> sales</span></span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#4ade80' }}>{money(s.revenue)}</span>
            </div>
          ))}
        </footer>

        <style>{`
          @keyframes orbit-travel { from { offset-distance: 0%; } to { offset-distance: 100%; } }
          @keyframes orbit-inbound-k { from { stroke-dashoffset: 2000; opacity: 1; } to { stroke-dashoffset: 0; opacity: 0; } }
          .orbit-inbound { animation: orbit-inbound-k 0.8s cubic-bezier(0.1, 0.9, 0.2, 1) forwards; }
          @keyframes orbit-bump { 0% { transform: scale(1); filter: brightness(1); } 15% { transform: scale(1.08); filter: brightness(1.3); } 100% { transform: scale(1); filter: brightness(1); } }
          @keyframes orbit-pop { 0% { opacity: 0; transform: scale(0.85); } 100% { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    </main>
  );
}

function StatusPill({ resolved }: { resolved?: Outcome }) {
  if (resolved?.outcome === 'buy') return <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>SOLD ${resolved.valueUsd}</span>;
  if (resolved?.outcome === 'book') return <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>BOOKED</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: '#94a3b8' }} className="pulse-glow" /> Selling…
    </span>
  );
}
