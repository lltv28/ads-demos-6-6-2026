'use client';

// AD VARIANT C · "The Clone Army" — zoomable wall of live agents
// A 16×16 grid (256) of Lucas AI agents. Scroll to zoom toward the cursor, drag
// to pan: zoom out for the scale of the army, zoom in to watch each agent's live
// funnel and read its sales / calls booked. 256 live iframes is impossible, so
// only the ~12 tiles nearest the view run the real funnel; the rest show a light
// funnel skeleton and "wake up" as you bring them into view.

import { useEffect, useMemo, useRef, useState } from 'react';
import { createLeads, buildFunnelSrc, saleLabel, money, makeAgentStats, useRecordingChrome, useTileOutcomes } from '@/lib/adStage';

const BG = '#F1EFEA';
const GREEN = '#16A46C';
const N = 8;
const COUNT = N * N;
const HEAD_H = 46, FOOT_H = 74, BODY_H = 420;
const CELL_W = 340, CELL_H = HEAD_H + BODY_H + FOOT_H;
const GAP = 26, PITCH_X = CELL_W + GAP, PITCH_Y = CELL_H + GAP;
const CANVAS_W = N * PITCH_X - GAP, CANVAS_H = N * PITCH_Y - GAP;
// Per-agent daily snapshot — totals ~60 sales / ~24 calls / ~$4.5k across the floor.
const STATS = makeAgentStats(COUNT, 2026);
const BASE = STATS.reduce((a, s) => ({ sales: a.sales + s.sales, calls: a.calls + s.calls, revenue: a.revenue + s.revenue }), { sales: 0, calls: 0, revenue: 0 });
const MAX_LIVE = 24; // 3 rows × 8 columns all playing at the default zoom
const CARD_SHADOW = '0 4px 14px rgba(0,0,0,0.08)';

export default function CloneArmyAd() {
  useRecordingChrome(BG);
  const leads = useMemo(() => createLeads(COUNT), []);
  const outcomes = useTileOutcomes();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const z = useRef(0.8), tx = useRef(0), ty = useRef(0), zmin = useRef(0.1);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const recT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState<Set<number>>(new Set());
  const ZMAX = 1.4;

  const apply = () => {
    if (canvasRef.current) canvasRef.current.style.transform = `translate(${tx.current}px, ${ty.current}px) scale(${z.current})`;
  };

  // Pick the (up to MAX_LIVE) tiles nearest the viewport centre to run live funnels.
  const recompute = () => {
    const W = window.innerWidth, H = window.innerHeight, zz = z.current;
    const vx0 = -tx.current / zz, vy0 = -ty.current / zz, vx1 = (W - tx.current) / zz, vy1 = (H - ty.current) / zz;
    const cx = (vx0 + vx1) / 2, cy = (vy0 + vy1) / 2;
    const M = CELL_W * 0.6;
    const cand: { i: number; d: number }[] = [];
    for (let i = 0; i < COUNT; i++) {
      const c = i % N, r = Math.floor(i / N);
      const x = c * PITCH_X, y = r * PITCH_Y;
      if (x + CELL_W < vx0 - M || x > vx1 + M || y + CELL_H < vy0 - M || y > vy1 + M) continue;
      cand.push({ i, d: (x + CELL_W / 2 - cx) ** 2 + (y + CELL_H / 2 - cy) ** 2 });
    }
    cand.sort((a, b) => a.d - b.d);
    const set = new Set<number>();
    for (let k = 0; k < Math.min(MAX_LIVE, cand.length); k++) set.add(cand[k].i);
    setActive(set);
  };
  const schedule = () => { if (recT.current) clearTimeout(recT.current); recT.current = setTimeout(recompute, 140); };

  useEffect(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const z0 = W / CANVAS_W;   // fit all 8 columns across → ~3 rows visible, all live
    z.current = z0;
    zmin.current = Math.min(H / CANVAS_H, W / CANVAS_W) * 0.95;
    tx.current = (W - CANVAS_W * z0) / 2;
    ty.current = (H - CANVAS_H * z0) / 2;
    apply();
    recompute();
    const stage = stageRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.14 : 1 / 1.14;
      const nz = Math.max(zmin.current, Math.min(ZMAX, z.current * f));
      const k = nz / z.current;
      tx.current = e.clientX - (e.clientX - tx.current) * k;
      ty.current = e.clientY - (e.clientY - ty.current) * k;
      z.current = nz;
      apply();
      schedule();
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => { stage.removeEventListener('wheel', onWheel); if (recT.current) clearTimeout(recT.current); };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    tx.current += e.clientX - drag.current.x;
    ty.current += e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    apply();
  };
  const onPointerUp = () => { if (drag.current) { drag.current = null; schedule(); } };

  return (
    <main
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: `radial-gradient(120% 120% at 50% 40%, #FBFAF7 0%, ${BG} 70%)`, fontFamily: 'inherit', cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
    >
      <div ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: CANVAS_W, height: CANVAS_H, transformOrigin: '0 0', willChange: 'transform' }}>
        {leads.map((lead, i) => {
          const c = i % N, r = Math.floor(i / N);
          const live = active.has(i);
          const resolved = outcomes[lead.id];
          const s = STATS[i];
          return (
            <article key={i} style={{
              position: 'absolute', left: c * PITCH_X, top: r * PITCH_Y, width: CELL_W, height: CELL_H,
              background: '#fff', borderRadius: 18, overflow: 'hidden',
              border: resolved?.outcome === 'buy' ? `3px solid ${GREEN}` : '1px solid #e5e4df',
              boxShadow: CARD_SHADOW, display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ height: HEAD_H, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: '#FBFAF7', borderBottom: '1px solid #eceae4' }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#1f2937' }}>Lucas AI #{String(i + 1).padStart(2, '0')}</span>
                {resolved?.outcome === 'buy'
                  ? <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: GREEN, borderRadius: 999, padding: '3px 10px' }}>SOLD {saleLabel(resolved.valueUsd)}</span>
                  : <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#6b7280' }}><span className="pulse-glow" style={{ width: 8, height: 8, borderRadius: 999, background: GREEN }} />Working</span>}
              </div>
              <div style={{ height: BODY_H, flexShrink: 0, background: '#fff', position: 'relative' }}>
                {live
                  ? <iframe title={`agent-${i}`} src={buildFunnelSrc(lead, i, { count: 16, demoScale: 0.7, speed: 0.5 })} allow="autoplay" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }} />
                  : <Skeleton />}
              </div>
              <div style={{ height: FOOT_H, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-around', background: '#FBFAF7', borderTop: '1px solid #eceae4' }}>
                <Stat value={s.sales} label="Sales" />
                <span style={{ width: 1, height: 34, background: '#e5e4df' }} />
                <Stat value={s.calls} label="Calls" />
                <span style={{ width: 1, height: 34, background: '#e5e4df' }} />
                <Stat value={money(s.revenue)} label="Revenue" accent />
              </div>
            </article>
          );
        })}
      </div>
      <Hud />
    </main>
  );
}

function Skeleton() {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 22, display: 'flex', flexDirection: 'column', gap: 16, background: '#fff' }}>
      <div style={{ width: '60%', height: 16, borderRadius: 8, background: '#eef0ee' }} />
      <div style={{ alignSelf: 'flex-start', width: '88%', height: 56, borderRadius: 16, borderTopLeftRadius: 4, background: '#f3f4f3' }} />
      <div style={{ alignSelf: 'flex-end', width: '78%', height: 48, borderRadius: 16, borderTopRightRadius: 4, background: 'rgba(22,164,108,0.10)' }} />
      <div style={{ alignSelf: 'flex-start', width: '84%', height: 56, borderRadius: 16, borderTopLeftRadius: 4, background: '#f3f4f3' }} />
      <div style={{ flex: 1 }} />
      <div style={{ width: '100%', height: 48, borderRadius: 12, background: 'rgba(22,164,108,0.16)' }} />
    </div>
  );
}

function Stat({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 33, fontWeight: 800, color: accent ? GREEN : '#1f2937', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9ca3af', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function Hud() {
  const [t, setT] = useState(BASE);
  useEffect(() => {
    const id = setInterval(() => setT((p) => ({ sales: p.sales + 1, calls: p.calls + (Math.random() < 0.32 ? 1 : 0), revenue: p.revenue + (Math.random() < 0.55 ? 17 : 97) })), 8000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div style={{ position: 'fixed', top: 24, right: 32, display: 'flex', gap: 14, pointerEvents: 'none' }}>
        <Tot label="Sales today" value={t.sales} />
        <Tot label="Calls booked" value={t.calls} />
        <Tot label="Revenue today" value={t.revenue} accent dollars />
      </div>
      <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.85)', border: '1px solid #e5e4df', borderRadius: 999, padding: '10px 20px', boxShadow: CARD_SHADOW, pointerEvents: 'none', backdropFilter: 'blur(4px)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>Scroll to zoom · drag to pan</span>
      </div>
    </>
  );
}

function Tot({ label, value, accent, dollars }: { label: string; value: number; accent?: boolean; dollars?: boolean }) {
  return (
    <div style={{ background: accent ? 'linear-gradient(160deg, #1c3a2a, #122a1e)' : '#fff', border: `1px solid ${accent ? 'rgba(22,164,108,0.4)' : '#e5e4df'}`, borderRadius: 14, padding: '12px 18px', boxShadow: CARD_SHADOW, textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: accent ? '#5BC998' : '#9ca3af' }}>{label}</div>
      <div style={{ fontSize: 54, fontWeight: 800, color: accent ? '#fff' : '#1f2937', lineHeight: 1.0, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{dollars ? `$${value.toLocaleString()}` : value.toLocaleString()}</div>
    </div>
  );
}
