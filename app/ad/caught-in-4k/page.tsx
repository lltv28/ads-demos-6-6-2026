'use client';

// AD VARIANT B · "Caught in 4K" (Optimized for FB Ads)
// Focus: The 24/7 Sales Floor. Loud labels, flashing wins, huge revenue tracker.

import { useEffect, useState } from 'react';
import {
  STAGE_W, STAGE_H, C,
  createLeads, buildFunnelSrc, makeAgentStats, saleLabel, money,
  useFitStage, useRecordingChrome, useLiveTally, useTileOutcomes, useCountUp,
  type Outcome, type FeedEvent,
} from '@/lib/adStage';

const BG = '#09090b';
type AgentStat = { sales: number; calls: number; revenue: number };

// ── Layout (Landscape 1920x1080) ──────────────────────────────────────────
const NAV_H = 72;
const LOG_H = 100;
const MAIN_W = STAGE_W;
const CONTENT_H = STAGE_H - NAV_H - LOG_H;

const PAD = 24;
const GAP = 20;

const CAMERAS = 5;
const STATS = makeAgentStats(CAMERAS, 4242);

const GRID_W = MAIN_W - (PAD * 2);
const GRID_H = CONTENT_H - (PAD * 2);

// 1 big + 4 small grid
const COL1_W = Math.floor((GRID_W - GAP) * 0.65);
const COL2_W = GRID_W - GAP - COL1_W;
const BIG_H = GRID_H;
const SMALL_W = Math.floor((COL2_W - GAP) / 2);
const SMALL_H = Math.floor((GRID_H - GAP) / 2);

function pad2(n: number) { return String(n).padStart(2, '0'); }

export default function CaughtIn4KAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const leads = createLeads(CAMERAS);
  const outcomes = useTileOutcomes();
  const { tally, feed } = useLiveTally({ feedLen: 1, minMs: 2500, maxMs: 4000 });
  const revenue = useCountUp(tally.revenue);

  return (
    <main style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden', background: BG,
          fontFamily: 'inherit', color: '#e5e7eb'
        }}
      >
        {/* ── Top Bar ── */}
        <header style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: NAV_H,
          background: '#18181b', borderBottom: '1px solid #27272a', zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 16, height: 16, borderRadius: 8, background: '#ef4444' }} className="pulse-glow" />
            <span style={{ fontSize: 24, fontWeight: 700, color: '#f4f4f5', letterSpacing: 1 }}>24/7 AI SALES FLOOR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase' }}>Revenue Today:</span>
            <span key={tally.revenue} style={{ fontSize: 36, fontWeight: 700, color: C.green, fontVariantNumeric: 'tabular-nums', animation: 'pop 0.3s ease' }}>
              ${Math.round(revenue).toLocaleString()}
            </span>
          </div>
        </header>

        {/* ── CCTV Grid ── */}
        <div style={{
          position: 'absolute', top: NAV_H, left: 0, width: MAIN_W, height: CONTENT_H,
          padding: PAD
        }}>
          {/* Big Cam (Left) */}
          <CameraTile
            camId="AGENT #01" lead={leads[0]} resolved={outcomes[leads[0].id]} stat={STATS[0]}
            left={PAD} top={PAD} width={COL1_W} height={BIG_H} scale={1.1} primary
          />

          {/* 4 Small Cams (Right Grid) */}
          {leads.slice(1).map((lead, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = PAD + COL1_W + GAP + (col * (SMALL_W + GAP));
            const y = PAD + (row * (SMALL_H + GAP));
            return (
              <CameraTile
                key={lead.id} camId={`AGENT #${pad2(i+2)}`} lead={lead} resolved={outcomes[lead.id]} stat={STATS[i + 1]}
                left={x} top={y} width={SMALL_W} height={SMALL_H} scale={0.5}
              />
            );
          })}
        </div>

        {/* ── Giant Win Strip (Bottom) ── */}
        <footer style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: LOG_H,
          background: feed[0]?.outcome === 'buy' ? C.green : '#18181b', 
          borderTop: '1px solid #27272a', zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s ease'
        }}>
          {feed[0] ? (
            <div key={feed[0].key} style={{ fontSize: 32, fontWeight: 700, color: '#fff', textTransform: 'uppercase', animation: 'slide-up 0.4s ease' }}>
              {feed[0].outcome === 'buy'
                ? `🔥 AGENT #${pad2((feed[0].leadNo % CAMERAS) + 1)} JUST CLOSED A ${saleLabel(feed[0].valueUsd)} DEAL! 🔥`
                : `📅 AGENT #${pad2((feed[0].leadNo % CAMERAS) + 1)} JUST BOOKED A CALL! 📅`}
            </div>
          ) : (
            <div style={{ fontSize: 24, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase' }}>
              MONITORING SALES PIPELINE...
            </div>
          )}
        </footer>
        
        <style>{`
          @keyframes pop { 50% { transform: scale(1.1); } }
          @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </main>
  );
}

function CameraTile({
  camId, lead, resolved, stat, left, top, width, height, scale, primary
}: {
  camId: string; lead: any; resolved?: Outcome; stat: AgentStat; left: number; top: number; width: number; height: number; scale: number; primary?: boolean;
}) {
  const isBuy = resolved?.outcome === 'buy';
  const bs = primary ? 27 : 17; // big/small stat number size
  
  return (
    <article style={{
      position: 'absolute', left, top, width, height,
      background: '#000', border: isBuy ? `6px solid ${C.green}` : '2px solid #27272a',
      overflow: 'hidden', borderRadius: 12, transition: 'border 0.3s'
    }}>
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isBuy ? 0.7 : 1 }}>
        <iframe
          title={camId}
          src={buildFunnelSrc(lead, parseInt(camId.replace('AGENT #',''), 10), { count: CAMERAS, demoScale: scale, speed: 0.5 })}
          allow="autoplay"
          style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
        />
      </div>

      {/* Obnoxious Labels */}
      <div style={{ position: 'absolute', top: 16, left: 16, background: '#000', padding: '6px 12px', borderRadius: 8, fontSize: primary ? 24 : 16, fontWeight: 700, color: '#fff', zIndex: 10 }}>
        {camId}
      </div>

      {/* Per-agent stat row (sales / calls booked) */}
      <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.78)', padding: primary ? '8px 14px' : '5px 10px', borderRadius: 8, zIndex: 10, display: 'flex', alignItems: 'center', gap: primary ? 14 : 9 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, color: '#fff', fontWeight: 800, fontSize: bs }}>
          {stat.sales}<span style={{ fontSize: bs * 0.55, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5 }}>sales</span>
        </span>
        <span style={{ width: 1, height: bs, background: '#3f3f46' }} />
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, color: '#fff', fontWeight: 800, fontSize: bs }}>
          {stat.calls}<span style={{ fontSize: bs * 0.55, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5 }}>booked</span>
        </span>
        <span style={{ width: 1, height: bs, background: '#3f3f46' }} />
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, color: '#4ade80', fontWeight: 800, fontSize: bs }}>
          {money(stat.revenue)}<span style={{ fontSize: bs * 0.55, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5 }}>rev</span>
        </span>
      </div>
      
      {/* Huge status overlay on win */}
      {isBuy && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
          <div style={{ background: C.green, padding: '12px 24px', borderRadius: 12, fontSize: primary ? 48 : 24, fontWeight: 900, color: '#fff', transform: 'rotate(-5deg)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)', animation: 'pop 0.4s ease' }}>
            DEAL CLOSED!
          </div>
        </div>
      )}

      {!isBuy && (
        <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'rgba(0,0,0,0.8)', padding: '6px 12px', borderRadius: 8, fontSize: primary ? 18 : 12, fontWeight: 700, color: '#4ade80', zIndex: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: '#4ade80' }} className="pulse-glow" />
          WORKING LEAD...
        </div>
      )}
    </article>
  );
}
