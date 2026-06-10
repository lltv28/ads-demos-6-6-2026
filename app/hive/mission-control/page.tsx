'use client';

// HIVE VARIANT 4 · "Mission Control" — dark ops room. The brain lives on the
// big board; rows of agent desks below run real funnels on their monitors. On
// every event a desk flares and a beam shoots up to the board.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_W, STAGE_H, C,
  createLeads, buildFunnelSrc, makeAgentStats, saleLabel, money,
  useFitStage, useRecordingChrome, useLiveTally, useCountUp,
} from '@/lib/adStage';

const BG = '#0b1220';

// ── Big board ──
const BOARD_X = 140, BOARD_Y = 48, BOARD_W = STAGE_W - 280, BOARD_H = 430;
const CORE_R = 110;
const CORE_CX = BOARD_X + 290, CORE_CY = BOARD_Y + BOARD_H / 2;

// ── Desks ──
// Back row: 9 desks, smaller. Front row: 7 desks, larger. Light perspective by
// scale + overlap. Live monitors: front indexes 1,3,5 / back indexes 2,6.
const FRONT = 7, BACK = 9;
const FW = 236, FH = 250, FGAP = 18;
const BW = 178, BH = 190, BGAP = 14;
const FRONT_W = FRONT * FW + (FRONT - 1) * FGAP;
const BACK_W = BACK * BW + (BACK - 1) * BGAP;
const FRONT_X = (STAGE_W - FRONT_W) / 2, FRONT_Y = 770;
const BACK_X = (STAGE_W - BACK_W) / 2, BACK_Y = 540;
const LIVE_FRONT = [1, 3, 5];
const LIVE_BACK = [2, 6];
const LIVE = LIVE_FRONT.length + LIVE_BACK.length; // 5

const STATS = makeAgentStats(FRONT, 4711);

type Desk = { x: number; y: number; w: number; h: number; row: 'front' | 'back'; liveIdx: number | null; label: string };

function buildDesks(): Desk[] {
  const desks: Desk[] = [];
  let live = 0;
  for (let i = 0; i < BACK; i++) {
    const isLive = LIVE_BACK.includes(i);
    desks.push({ x: BACK_X + i * (BW + BGAP), y: BACK_Y, w: BW, h: BH, row: 'back', liveIdx: isLive ? live++ : null, label: `AI Agent #${String(FRONT + i + 1).padStart(2, '0')}` });
  }
  for (let i = 0; i < FRONT; i++) {
    const isLive = LIVE_FRONT.includes(i);
    desks.push({ x: FRONT_X + i * (FW + FGAP), y: FRONT_Y, w: FW, h: FH, row: 'front', liveIdx: isLive ? live++ : null, label: `AI Agent #${String(i + 1).padStart(2, '0')}` });
  }
  return desks;
}

export default function MissionControlAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const desks = useMemo(() => buildDesks(), []);
  const leads = useMemo(() => createLeads(LIVE), []);
  const { tally, feed } = useLiveTally();
  const revenue = useCountUp(tally.revenue);

  // Beam + flare target on each feed event.
  const [beam, setBeam] = useState<{ key: number; deskIdx: number; label: string }>({ key: 0, deskIdx: 0, label: '' });
  const lastKey = useRef<number | null>(null);
  useEffect(() => {
    const top = feed[0];
    if (!top || lastKey.current === top.key) return;
    lastKey.current = top.key;
    const next = {
      key: top.key + 1,
      deskIdx: top.leadNo % desks.length,
      label: top.outcome === 'buy' ? `+${saleLabel(top.valueUsd)}` : 'CALL BOOKED',
    };
    const t = setTimeout(() => setBeam(next), 0);
    return () => clearTimeout(t);
  }, [feed, desks.length]);

  const beamDesk = desks[beam.deskIdx];

  return (
    <main style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: `linear-gradient(180deg, #0e1729 0%, ${BG} 55%, #080d18 100%)`,
          fontFamily: 'inherit',
        }}
      >
        {/* Big board */}
        <section style={{ position: 'absolute', left: BOARD_X, top: BOARD_Y, width: BOARD_W, height: BOARD_H, background: '#0a1322', border: '2px solid #22314e', borderRadius: 18, boxShadow: '0 0 60px rgba(13,34,66,0.8), inset 0 0 80px rgba(20,40,75,0.35)', zIndex: 20, overflow: 'hidden' }}>
          <div key={`core-${beam.key}`} style={{
              position: 'absolute', left: CORE_CX - BOARD_X - CORE_R, top: CORE_CY - BOARD_Y - CORE_R,
              width: CORE_R * 2, height: CORE_R * 2, borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, #4ade80 0%, #166534 60%, #064e3b 100%)',
              boxShadow: '0 0 48px rgba(74,222,128,0.45), inset 0 4px 12px rgba(255,255,255,0.4)',
              animation: 'mc-bump 0.8s ease-out',
            }} />
          <div style={{ position: 'absolute', left: 560, top: 90, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#7d8db0' }}>Revenue Generated Today</span>
            <span key={tally.revenue} style={{ fontSize: 96, fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 24px rgba(74,222,128,0.35)' }}>
              ${Math.round(revenue).toLocaleString()}
            </span>
            <span style={{ marginTop: 10, fontSize: 19, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#4ade80' }}>
              50 agents · 10 time zones · 24/7
            </span>
          </div>
          <header style={{ position: 'absolute', top: 18, left: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 12, height: 12, borderRadius: 999, background: '#ef4444' }} className="pulse-glow" />
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#aab8d4' }}>Lucas AI · Mission Control</span>
          </header>
        </section>

        {/* Beam desk→board */}
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25 }}>
          <path key={beam.key} d={`M ${beamDesk.x + beamDesk.w / 2} ${beamDesk.y + 10} L ${CORE_CX} ${BOARD_Y + BOARD_H - 8}`}
            stroke="#4ade80" strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray="36 2000"
            className="mc-beam" style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.8))' }} />
        </svg>

        {/* Desks (back row first so front overlaps) */}
        {desks.map((d, idx) => {
          const isEvt = beam.deskIdx === idx;
          const lead = d.liveIdx !== null ? leads[d.liveIdx] : null;
          const front = d.row === 'front';
          return (
            <article key={idx} style={{
                position: 'absolute', left: d.x, top: d.y, width: d.w, height: d.h, zIndex: front ? 30 : 28,
                display: 'flex', flexDirection: 'column',
              }}>
              {/* monitor */}
              <div style={{
                  flex: 1, borderRadius: 10, overflow: 'hidden', background: '#0d1830',
                  border: isEvt ? '3px solid #4ade80' : '2px solid #25324f',
                  boxShadow: isEvt ? '0 0 28px rgba(74,222,128,0.55)' : '0 10px 22px rgba(0,0,0,0.5)',
                  transition: 'border 0.25s ease, box-shadow 0.25s ease', position: 'relative',
                }}>
                {lead ? (
                  <iframe title={`desk-${idx}`} src={buildFunnelSrc(lead, d.liveIdx ?? 0, { count: LIVE, demoScale: front ? 0.42 : 0.34, speed: 0.5 })} allow="autoplay"
                    style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none', display: 'block', background: '#fff' }} />
                ) : (
                  <div style={{ padding: 10 }}>
                    <div style={{ width: '70%', height: 6, borderRadius: 3, background: 'rgba(125,141,176,0.3)' }} />
                    <div style={{ marginTop: 6, width: '50%', height: 6, borderRadius: 3, background: 'rgba(74,222,128,0.3)', marginLeft: 'auto' }} />
                    <div style={{ marginTop: 6, width: '62%', height: 6, borderRadius: 3, background: 'rgba(125,141,176,0.3)' }} />
                    <span className="pulse-glow" style={{ position: 'absolute', bottom: 10, left: 10, width: 8, height: 8, borderRadius: 999, background: '#4ade80' }} />
                  </div>
                )}
                {isEvt && (
                  <div key={beam.key} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,40,28,0.45)' }}>
                    <span style={{ background: C.green, color: '#fff', fontSize: front ? 22 : 16, fontWeight: 900, padding: '6px 14px', borderRadius: 8, transform: 'rotate(-4deg)', animation: 'mc-pop 0.35s ease' }}>{beam.label}</span>
                  </div>
                )}
              </div>
              {/* name plate */}
              <div style={{ height: front ? 44 : 32, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', background: '#101b31', border: '1px solid #22314e', borderRadius: 8 }}>
                <span style={{ fontSize: front ? 14 : 11, fontWeight: 700, color: '#c3cde4', whiteSpace: 'nowrap' }}>{d.label}</span>
                {front && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#4ade80', fontVariantNumeric: 'tabular-nums' }}>
                    {STATS[idx - BACK] ? `${STATS[idx - BACK].sales} sales · ${money(STATS[idx - BACK].revenue)}` : ''}
                  </span>
                )}
              </div>
            </article>
          );
        })}

        <style>{`
          @keyframes mc-beam-k { from { stroke-dashoffset: 2000; opacity: 1; } to { stroke-dashoffset: 0; opacity: 0; } }
          .mc-beam { animation: mc-beam-k 0.9s cubic-bezier(0.15, 0.85, 0.25, 1) forwards; }
          @keyframes mc-bump { 0% { transform: scale(1); filter: brightness(1); } 15% { transform: scale(1.08); filter: brightness(1.35); } 100% { transform: scale(1); filter: brightness(1); } }
          @keyframes mc-pop { 0% { opacity: 0; transform: rotate(-4deg) scale(0.8); } 100% { opacity: 1; transform: rotate(-4deg) scale(1); } }
        `}</style>
      </div>
    </main>
  );
}
