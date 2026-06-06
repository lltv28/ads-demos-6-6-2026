'use client';

// AD VARIANT A · "The Org Chart" (Optimized for FB Ads)
// Focus: Massive Revenue Ticker, Sales Terminology, Flashy Sales Updates.

import { useEffect, useMemo, useState, useRef } from 'react';
import {
  STAGE_W, STAGE_H, C, R, FONT, W,
  createLeads, buildFunnelSrc, saleLabel, money, makeAgentStats,
  useFitStage, useRecordingChrome, useLiveTally, useTileOutcomes, useCountUp,
  type Outcome,
} from '@/lib/adStage';

const PAD = 44;
const LETTERBOX = '#e5e7eb';

// ── Master node ──
const MASTER_W = 460;
const MASTER_H = 170;
const MASTER_X = (STAGE_W - MASTER_W) / 2;
const MASTER_Y = 100;
const MASTER_CX = STAGE_W / 2;
const MASTER_BOTTOM = MASTER_Y + MASTER_H;

// ── Clone tiles ──
const TILES = 5;
const TILE_GAP = 20;
const ROW_W = STAGE_W - PAD * 2;
const TILE_W = Math.floor((ROW_W - (TILES - 1) * TILE_GAP) / TILES); // ~350
const TILES_TOP = 360;
const TILE_LABEL_H = 46;
const TILE_FOOTER_H = 80;
const TILE_H = 650;
const TILE_CONTENT_H = TILE_H - TILE_LABEL_H - TILE_FOOTER_H;
const BUS_Y = 312;

const tileCenterX = (i: number) => PAD + TILE_W / 2 + i * (TILE_W + TILE_GAP);

type HeroStat = { sales: number; calls: number; revenue: number };

export default function OrgChartAd() {
  const fit = useFitStage();
  useRecordingChrome(LETTERBOX);
  const leads = createLeads(TILES);
  const outcomes = useTileOutcomes();
  const { tally, feed } = useLiveTally();
  const revenue = useCountUp(tally.revenue);

  const stats = useMemo<HeroStat[]>(() => makeAgentStats(TILES, 8126), []);

  // Highlight master node when revenue updates
  const [pulse, setPulse] = useState(0);
  const lastRev = useRef(tally.revenue);
  useEffect(() => {
    if (tally.revenue > lastRev.current) {
      setPulse(p => p + 1);
      lastRev.current = tally.revenue;
    }
  }, [tally.revenue]);

  return (
    <main style={{ position: 'fixed', inset: 0, background: LETTERBOX, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(120% 90% at 50% 0%, #ffffff 0%, #F6F6F7 70%)',
          fontFamily: FONT,
        }}
      >
        {/* ── Header ── */}
        <header style={{ position: 'absolute', top: 36, left: PAD, right: PAD, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, background: C.green }} className="pulse-glow" />
            <span style={{ fontSize: 24, fontWeight: W.semibold, color: C.green }}>LIVE</span>
            <span style={{ color: C.faint }}>·</span>
            <span style={{ fontSize: 24, fontWeight: W.semibold, color: C.ink }}>Lucas AI Sales Floor</span>
          </div>
        </header>

        {/* ── Connectors (behind cards) ── */}
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <path d={`M ${MASTER_CX} ${MASTER_BOTTOM} L ${MASTER_CX} ${BUS_Y}`} stroke="#d4d4d4" strokeWidth={4} fill="none" />
          <path d={`M ${tileCenterX(0)} ${BUS_Y} L ${tileCenterX(TILES - 1)} ${BUS_Y}`} stroke="#d4d4d4" strokeWidth={4} fill="none" />
          {leads.map((_, i) => (
            <path key={i} d={`M ${tileCenterX(i)} ${BUS_Y} L ${tileCenterX(i)} ${TILES_TOP}`} stroke="#d4d4d4" strokeWidth={4} fill="none" />
          ))}
        </svg>

        {/* ── Master node (MASSIVE REVENUE) ── */}
        <div key={pulse} style={{
            position: 'absolute', left: MASTER_X, top: MASTER_Y, width: MASTER_W, height: MASTER_H,
            background: C.ctaGradient, borderRadius: R.lg, boxShadow: '0 12px 32px rgba(46,125,82,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            animation: pulse > 0 ? 'node-bump 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Revenue Generated Today
            </div>
            <div style={{ fontSize: 64, fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              {`$${Math.round(revenue).toLocaleString()}`}
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '6px 16px', borderRadius: 999 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#fff' }} className="pulse-glow" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>50 AI Agents Working</span>
            </div>
          </div>
        </div>

        {/* ── Clone tiles ── */}
        {leads.map((lead, index) => {
          const resolved = outcomes[lead.id];
          return (
            <article
              key={lead.id}
              style={{
                position: 'absolute', top: TILES_TOP, left: PAD + index * (TILE_W + TILE_GAP),
                width: TILE_W, height: TILE_H, borderRadius: R.card, overflow: 'hidden',
                border: resolved?.outcome === 'buy' ? `4px solid ${C.green}` : `1px solid ${C.border}`, 
                background: C.card, boxShadow: resolved?.outcome === 'buy' ? '0 0 32px rgba(46,125,82,0.4)' : C.cardShadow,
                transition: 'all 0.3s ease'
              }}
            >
              <header style={{ height: TILE_LABEL_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: resolved?.outcome === 'buy' ? C.green : C.subtle, color: resolved?.outcome === 'buy' ? '#fff' : C.ink, transition: 'background 0.3s ease' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700 }}>
                  Agent #{String(index + 1).padStart(2, '0')}
                </span>
                <StatusPill resolved={resolved} />
              </header>
              <div style={{ width: '100%', height: TILE_CONTENT_H, overflow: 'hidden', background: C.appBg }}>
                <iframe
                  title={`clone-${index + 1}`}
                  src={buildFunnelSrc(lead, index, { count: TILES, demoScale: 0.72, speed: 0.5 })}
                  allow="autoplay"
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block', pointerEvents: 'none' }}
                />
              </div>
              <StatsBar stat={stats[index]} />
            </article>
          );
        })}

        <style>{`
          @keyframes node-bump {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    </main>
  );
}

function StatsBar({ stat }: { stat: HeroStat }) {
  return (
    <footer style={{ height: TILE_FOOTER_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', background: C.subtle, borderTop: `1px solid ${C.border}` }}>
      <Stat label="Sales" value={`${stat.sales}`} />
      <div style={{ width: 1, height: 24, background: C.border }} />
      <Stat label="Calls" value={`${stat.calls}`} />
      <div style={{ width: 1, height: 24, background: C.border }} />
      <Stat label="Revenue" value={money(stat.revenue)} accent />
    </footer>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: C.faint }}>{label}</div>
      <div style={{ fontSize: 31, fontWeight: 800, color: accent ? C.green : C.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>{value}</div>
    </div>
  );
}

function StatusPill({ resolved }: { resolved?: Outcome }) {
  if (resolved?.outcome === 'buy') {
    return (
      <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', animation: 'node-bump 0.4s ease' }}>
        SOLD - {saleLabel(resolved.valueUsd)}
      </span>
    );
  }
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: C.muted }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: C.slate }} className="pulse-glow" />
      Pitching...
    </span>
  );
}
