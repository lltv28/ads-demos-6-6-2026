'use client';

// HIVE VARIANT 3 · "The Throttle" — what if sales headcount was a setting?
// A scripted dial drags 1 → 5 → 15 → 50; the agent grid fills as it climbs and
// the revenue cadence accelerates with N. Loops every ~23.5s.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_W, STAGE_H, C, R,
  createLeads, buildFunnelSrc, randomSalePrice,
  useFitStage, useRecordingChrome, useCountUp,
} from '@/lib/adStage';
import { createSeededRandom as seeded } from '@/lib/demoAuto';

const LETTERBOX = '#e5e7eb';

// ── Scripted timeline: [target N at end of segment, duration ms] ──
const SEGMENTS: Array<{ to: number; ms: number }> = [
  { to: 1, ms: 3000 },   // hold 1
  { to: 5, ms: 2000 },   // ramp → 5
  { to: 5, ms: 3000 },   // hold
  { to: 15, ms: 2000 },  // ramp → 15
  { to: 15, ms: 3000 },  // hold
  { to: 50, ms: 2500 },  // ramp → 50
  { to: 50, ms: 8000 },  // hold at full
];
const LOOP_MS = SEGMENTS.reduce((a, s) => a + s.ms, 0); // 23500
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function valueAt(tMs: number): number {
  let t = tMs % LOOP_MS;
  let from = 1;
  for (const seg of SEGMENTS) {
    if (t <= seg.ms) {
      if (seg.to === from) return from;
      return from + (seg.to - from) * easeInOut(t / seg.ms);
    }
    t -= seg.ms;
    from = seg.to;
  }
  return 50;
}

// ── Tile field: 10 × 5 grid ──
const COLS = 10, ROWS = 5, SLOTS = 50;
const TILE_W = 160, TILE_H = 128, GAP = 12;
const FIELD_W = COLS * TILE_W + (COLS - 1) * GAP;
const FIELD_X = (STAGE_W - FIELD_W) / 2;
const FIELD_Y = 110;
const LIVE = 6;

export default function ThrottleAd() {
  const fit = useFitStage();
  useRecordingChrome(LETTERBOX);
  const leads = useMemo(() => createLeads(LIVE), []);

  // Dial value driven by a rAF timeline (setState in rAF callback, not effect body).
  const [n, setN] = useState(1);
  const nRef = useRef(1);
  useEffect(() => {
    let raf = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const v = Math.round(valueAt(now - t0));
      if (v !== nRef.current) { nRef.current = v; setN(v); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Local tally cadence: interval shrinks as N grows → revenue visibly accelerates.
  const [tally, setTally] = useState({ revenue: 4200, perHour: 90 });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const emit = () => {
      setTally((p) => ({ revenue: p.revenue + (Math.random() < 0.6 ? randomSalePrice() : 0), perHour: nRef.current * 90 }));
      const interval = Math.min(9000, Math.max(700, 9000 / nRef.current));
      timer = setTimeout(emit, interval * (0.75 + Math.random() * 0.5));
    };
    timer = setTimeout(emit, 1500);
    return () => clearTimeout(timer);
  }, []);
  const revenue = useCountUp(tally.revenue);
  const perHour = useCountUp(tally.perHour, 900);

  const fills = useMemo(() => {
    const rnd = seeded(8181);
    return Array.from({ length: SLOTS }, () => 0.4 + rnd() * 0.6);
  }, []);

  // Dial geometry
  const DIAL_W = 900, DIAL_X = (STAGE_W - DIAL_W) / 2, DIAL_Y = 905;
  const frac = (n - 1) / 49;
  const knobX = DIAL_X + frac * DIAL_W;

  return (
    <main style={{ position: 'fixed', inset: 0, background: LETTERBOX, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(120% 90% at 50% 0%, #ffffff 0%, #F6F6F7 70%)',
          fontFamily: 'inherit',
        }}
      >
        <header style={{ position: 'absolute', top: 28, left: 0, right: 0, textAlign: 'center', zIndex: 40 }}>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: C.ink }}>
            What if sales headcount was a setting?
          </span>
        </header>

        {/* Tile field */}
        {Array.from({ length: SLOTS }, (_, i) => {
          const col = i % COLS, row = Math.floor(i / COLS);
          const revealed = i < n;
          const isLive = i < LIVE;
          return (
            <div key={i} style={{
                position: 'absolute', left: FIELD_X + col * (TILE_W + GAP), top: FIELD_Y + row * (TILE_H + GAP),
                width: TILE_W, height: TILE_H, borderRadius: 10, overflow: 'hidden',
                background: '#fff', border: `1px solid ${C.border}`, boxShadow: C.cardShadow,
                opacity: revealed ? 1 : 0, transform: revealed ? 'scale(1)' : 'scale(0.7)',
                transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
              <div style={{ height: 24, display: 'flex', alignItems: 'center', gap: 5, padding: '0 8px', background: C.subtle, borderBottom: `1px solid ${C.border}` }}>
                <span className="pulse-glow" style={{ width: 5, height: 5, borderRadius: 999, background: C.green, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, whiteSpace: 'nowrap' }}>#{String(i + 1).padStart(2, '0')}</span>
              </div>
              {isLive ? (
                // Always mounted (so playback never resets); revealed via the wrapper's opacity.
                <iframe title={`throttle-${i}`} src={buildFunnelSrc(leads[i], i, { count: LIVE, demoScale: 0.4, speed: 0.5 })} allow="autoplay"
                  style={{ width: '100%', height: TILE_H - 24, border: 'none', pointerEvents: 'none', display: 'block' }} />
              ) : (
                <div style={{ padding: 8 }}>
                  <div style={{ width: `${50 + fills[i] * 40}%`, height: 7, borderRadius: 4, background: '#eef0ee' }} />
                  <div style={{ marginTop: 6, width: `${30 + fills[i] * 35}%`, height: 7, borderRadius: 4, background: 'rgba(46,125,82,0.18)', marginLeft: 'auto' }} />
                  <div style={{ marginTop: 6, width: `${42 + fills[i] * 30}%`, height: 7, borderRadius: 4, background: '#eef0ee' }} />
                  <div style={{ marginTop: 10, width: '100%', height: 16, borderRadius: 6, background: 'rgba(46,125,82,0.12)' }} />
                </div>
              )}
            </div>
          );
        })}

        {/* Gauges */}
        <div style={{ position: 'absolute', left: 48, top: FIELD_Y + ROWS * (TILE_H + GAP) + 16, right: 48, display: 'flex', gap: 24, zIndex: 30 }}>
          <Gauge label="AI Agents Active" value={String(n)} />
          <Gauge label="Revenue / Hour" value={`$${Math.round(perHour).toLocaleString()}`} highlight />
          <Gauge label="Revenue Today" value={`$${Math.round(revenue).toLocaleString()}`} />
        </div>

        {/* Slider */}
        <div style={{ position: 'absolute', left: DIAL_X, top: DIAL_Y, width: DIAL_W, zIndex: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: C.muted }}>AI Agents</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>1 — 50</span>
          </div>
          <div style={{ position: 'relative', height: 18, borderRadius: 999, background: '#e2e2e6' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${frac * 100}%`, borderRadius: 999, background: C.ctaGradient }} />
            <div style={{ position: 'absolute', left: `${frac * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', width: 44, height: 44, borderRadius: 999, background: '#fff', border: `4px solid ${C.green}`, boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }} />
          </div>
        </div>
        <div style={{ position: 'absolute', left: knobX + 14, top: DIAL_Y + 18, zIndex: 41, pointerEvents: 'none' }}>
          {/* fake cursor riding the knob */}
          <svg width="28" height="28" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
            <path d="M5 3l14 8-6.5 1.5L16 19l-3 1.5-3.5-6.5L5 17V3z" fill="#111827" stroke="#fff" strokeWidth="1.4" />
          </svg>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: DIAL_Y + 56, textAlign: 'center', zIndex: 40 }}>
          <span style={{ fontSize: 64, fontWeight: 800, color: C.green, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{n}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.muted }}> agents selling right now</span>
        </div>
      </div>
    </main>
  );
}

function Gauge({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ flex: 1, background: highlight ? C.green : '#fff', border: highlight ? 'none' : `1px solid ${C.border}`, borderRadius: R.lg, padding: '14px 22px', boxShadow: highlight ? '0 12px 24px rgba(46,125,82,0.3)' : C.cardShadow, color: highlight ? '#fff' : C.ink }}>
      <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, opacity: highlight ? 0.9 : 0.55 }}>{label}</div>
      <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
