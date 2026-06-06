'use client';

// AD VARIANT G · "AI Agents Console" (Optimized for FB Ads)
// Focus: The Sales Manager Dashboard. Plain-english tasks, massive KPI cards, 
// and an activity feed showing clear business wins.

import { useEffect, useMemo, useState } from 'react';
import {
  STAGE_W, STAGE_H, C,
  createLeads, buildFunnelSrc, saleLabel, money, makeAgentStats,
  useFitStage, useRecordingChrome, useLiveTally, useCountUp,
} from '@/lib/adStage';
import { createSeededRandom as seeded } from '@/lib/demoAuto';

const TASKS = ['Greeting lead...', 'Asking qualifying questions...', 'Presenting the offer...', 'Handling objections...', 'Sending checkout link...'];

const LETTERBOX = '#e5e7eb';
const ROWS = 10;
const SEEDED_SALES = [1, 3, 5];

type Row = { agentName: string; sales: number; calls: number; revenue: number; taskIdx: number; result: 'working' | 'buy' | 'book'; phase: number };

function makeRow(agentNum: number, fs: { sales: number; calls: number; revenue: number }, rnd: () => number): Row {
  return {
    agentName: `AI Agent #${String(agentNum).padStart(2, '0')}`,
    sales: fs.sales, calls: fs.calls, revenue: fs.revenue,
    taskIdx: Math.floor(rnd() * TASKS.length),
    result: 'working',
    phase: rnd() * 3,
  };
}

export default function AgentsConsoleAd() {
  const fit = useFitStage();
  useRecordingChrome(LETTERBOX);
  const { tally, feed } = useLiveTally({ feedLen: 6 });
  const revenue = useCountUp(tally.revenue);
  const liveLead = useMemo(() => createLeads(1)[0], []);

  const [rows, setRows] = useState<Row[]>(() => {
    const rnd = seeded(4242);
    const floor = makeAgentStats(ROWS, 7777);
    const init = Array.from({ length: ROWS }, (_, i) => makeRow(i + 1, floor[i], rnd));
    for (const idx of SEEDED_SALES) {
      if (init[idx]) init[idx] = { ...init[idx], result: 'buy', sales: init[idx].sales + 1 };
    }
    return init;
  });
  
  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => {
        const next = [...prev];
        const i = Math.floor(Math.random() * next.length);
        const r = next[i];
        if (r.result !== 'working') {
          next[i] = { ...r, result: 'working', taskIdx: 0 };
        } else if (r.taskIdx < TASKS.length - 1) {
          next[i] = { ...r, taskIdx: r.taskIdx + 1 };
        } else {
          next[i] = Math.random() < 0.7
            ? { ...r, result: 'buy', sales: r.sales + 1, revenue: r.revenue + (Math.random() < 0.6 ? 17 : 97) }
            : { ...r, result: 'book', calls: r.calls + 1 };
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const activeCount = rows.filter((r) => r.result === 'working').length;

  return (
    <main style={{ position: 'fixed', inset: 0, background: LETTERBOX, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ width: STAGE_W, height: STAGE_H, flexShrink: 0, transform: `scale(${fit})`, transformOrigin: 'center center', position: 'relative', overflow: 'hidden', background: '#f9fafb', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>

        {/* ── App Header ── */}
        <div style={{ height: 90, flexShrink: 0, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ width: 50, height: 50, borderRadius: 11, background: C.ctaGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 25 }}>AI</span>
            <span style={{ fontWeight: 800, fontSize: 31, color: '#111827' }}>Sales Manager Dashboard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'rgba(46,125,82,0.1)', padding: '13px 24px', borderRadius: 999 }}>
            <span style={{ width: 15, height: 15, borderRadius: 8, background: C.green }} className="pulse-glow" />
            <span style={{ fontWeight: 700, color: C.green, fontSize: 20 }}>SYSTEM ONLINE • 24/7</span>
          </div>
        </div>

        {/* ── KPI Strip (HUGE METRICS) ── */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 24, padding: '24px 32px' }}>
          <Kpi label="Active AI Agents" value={String(activeCount)} />
          <Kpi label="Total Leads Worked" value={String(tally.calls + tally.purchases + 142)} />
          <Kpi label="REVENUE GENERATED TODAY" value={`$${Math.round(revenue).toLocaleString()}`} highlight />
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 24, padding: '0 32px 32px' }}>

          {/* Agents Table */}
          <section style={{ flex: 1.5, minWidth: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ height: 66, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 28px', borderBottom: '1px solid #e5e7eb', background: '#f3f4f6', fontSize: 24, fontWeight: 800, color: '#111827' }}>
              Live AI Sales Team
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 2.2fr 1fr 0.85fr 0.85fr 1.05fr', gap: 16, padding: '16px 28px', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
              <span>Agent</span><span>Current Task</span><span>Status</span><span>Sales Made</span><span>Calls Booked</span><span>Revenue</span>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.1fr 2.2fr 1fr 0.85fr 0.85fr 1.05fr', gap: 16, alignItems: 'center', padding: '0 28px', height: 62, background: i % 2 === 1 ? '#f9fafb' : '#fff', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{r.agentName}</span>
                  <span style={{ fontSize: 19, color: '#4b5563', fontStyle: r.result !== 'working' ? 'italic' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.result === 'working' ? TASKS[r.taskIdx] : 'Resetting for next lead...'}
                  </span>
                  <span>
                    {r.result === 'working' && <span style={{ fontSize: 18, color: '#6b7280', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: '#9ca3af' }} /> Working</span>}
                    {r.result === 'buy' && <span style={{ fontSize: 18, color: C.green, fontWeight: 800, background: 'rgba(46,125,82,0.15)', padding: '5px 12px', borderRadius: 7 }}>DEAL CLOSED!</span>}
                    {r.result === 'book' && <span style={{ fontSize: 18, color: '#111827', fontWeight: 800, background: '#f3f4f6', padding: '5px 12px', borderRadius: 7 }}>CALL BOOKED</span>}
                  </span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>{r.sales}</span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>{r.calls}</span>
                  <span style={{ fontSize: 26, fontWeight: 800, color: C.green }}>{money(r.revenue)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Right Rail: Live Conversation + Activity */}
          <aside style={{ width: 500, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
            
            {/* Live Conversation Iframe */}
            <section style={{ flex: '0 0 auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 22px', borderBottom: '1px solid #e5e7eb', background: '#f3f4f6' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 6, background: C.green }} className="pulse-glow" />
                  Live Chat Peek
                </span>
              </div>
              <div style={{ width: '100%', height: 400, overflow: 'hidden', background: '#fff' }}>
                <iframe
                  title="live-conversation"
                  src={buildFunnelSrc(liveLead, 0, { count: 1, demoScale: 0.8, speed: 0.5 })}
                  allow="autoplay"
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block', pointerEvents: 'none' }}
                />
              </div>
            </section>

            {/* Wins Feed */}
            <section style={{ flex: 1, minHeight: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ height: 58, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 22px', borderBottom: '1px solid #e5e7eb', background: '#f3f4f6', fontSize: 20, fontWeight: 800, color: '#111827' }}>
                Recent Wins
              </div>
              <div style={{ flex: 1, overflow: 'hidden', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {feed.map((e) => {
                  const isBuy = e.outcome === 'buy';
                  return (
                    <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: '1px solid #f3f4f6', animation: 'slide-in 0.3s ease' }}>
                      <span style={{ fontSize: 30 }}>{isBuy ? '💰' : '📅'}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 19, fontWeight: 800, color: isBuy ? C.green : '#111827' }}>
                          {isBuy ? `Collected ${saleLabel(e.valueUsd)}!` : 'New Appointment Booked'}
                        </span>
                        <span style={{ fontSize: 15, color: '#6b7280' }}>Agent #{String((e.leadNo % 10) + 1).padStart(2, '0')} closed lead #{e.leadNo}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
        <style>{`
          @keyframes slide-in { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `}</style>
      </div>
    </main>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ flex: 1, background: highlight ? C.green : '#fff', border: highlight ? 'none' : '1px solid #e5e7eb', borderRadius: 14, padding: '26px 30px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: highlight ? '0 12px 24px rgba(46,125,82,0.3)' : '0 4px 6px rgba(0,0,0,0.05)', color: highlight ? '#fff' : '#111827' }}>
      <div style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, opacity: highlight ? 0.9 : 0.6 }}>{label}</div>
      <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
