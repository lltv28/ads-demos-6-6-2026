'use client';

import { useState } from 'react';
import type { BrainModel } from '@/lib/brain/types';
import { squadColor, squadName } from '@/lib/brain/data';
import { money } from '@/lib/adStage';

type Props = { model: BrainModel };

export default function ChatView({ model }: Props) {
  const channels = ['General', ...model.squads.map((s) => `# ${s.name}`), '# Low-Ticket Report', '# Strategy Call'];
  const [channel, setChannel] = useState(channels[0]);
  const totalRev = model.agents.reduce((a, x) => a + x.revenue, 0);
  const totalSales = model.agents.reduce((a, x) => a + x.sales, 0);
  const totalCalls = model.agents.reduce((a, x) => a + x.calls, 0);
  const top = [...model.agents].sort((a, b) => b.revenue - a.revenue).slice(0, 3);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: '#f9fafb' }}>
      {/* sub-agent rail */}
      <aside style={{ width: 240, flexShrink: 0, background: '#fff', borderRight: '1px solid #e5e7eb', overflow: 'auto', padding: '14px 0' }}>
        <div style={{ padding: '4px 18px 10px', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#9ca3af' }}>Sub-agents</div>
        {model.subAgents.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', fontSize: 14, color: '#374151' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: squadColor(s.squadId ?? undefined) }} className="pulse-glow" />
            {s.name}
          </div>
        ))}
        <div style={{ padding: '14px 18px 6px', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#9ca3af' }}>Channels</div>
        {channels.map((c) => (
          <button key={c} type="button" onClick={() => setChannel(c)} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: c === channel ? '#f1f5f9' : 'transparent', padding: '8px 18px', fontSize: 14, fontWeight: c === channel ? 700 : 500, color: '#4b5563' }}>{c}</button>
        ))}
      </aside>

      {/* AI daily report */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '28px 40px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#16A46C' }}>{channel} · Daily Brief</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '6px 0 18px' }}>Sales floor — end-of-day report</h1>
        <div style={{ display: 'flex', gap: 14, marginBottom: 22 }}>
          <Big label="Revenue today" value={`$${totalRev.toLocaleString()}`} accent />
          <Big label="Sales" value={String(totalSales)} />
          <Big label="Calls booked" value={String(totalCalls)} />
        </div>
        <Section title="Top closers">
          {top.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, background: squadColor(a.squadId), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11 }}>{a.initials}</span>
              <span style={{ flex: 1, fontSize: 14, color: '#111827', fontWeight: 600 }}>{a.name} <span style={{ color: '#9ca3af', fontWeight: 500 }}>· {squadName(a.squadId)}</span></span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#16A46C' }}>{money(a.revenue)}</span>
              <span style={{ width: 64, textAlign: 'right', fontSize: 13, color: '#6b7280' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {a.sales} sales</span>
            </div>
          ))}
        </Section>
        <Section title="What the floor needs from you">
          <ul style={{ margin: 0, paddingLeft: 18, color: '#374151', fontSize: 14, lineHeight: 1.9 }}>
            <li><b>Follow-ups owed:</b> {model.leads.filter((l) => l.outcome === 'book').length} booked calls need confirmation texts before tomorrow.</li>
            <li><b>At-risk:</b> {model.leads.filter((l) => l.outcome === 'working').length} leads still mid-conversation past 24h — Reactivation squad is on them.</li>
            <li><b>Approve:</b> Closing squad wants to A/B a new objection script on the Core Program.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Big({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1, background: accent ? '#16A46C' : '#fff', color: accent ? '#fff' : '#111827', border: accent ? 'none' : '1px solid #e5e7eb', borderRadius: 14, padding: '18px 22px', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, opacity: accent ? 0.9 : 0.5 }}>{label}</div>
      <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 22px', marginBottom: 18, boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>{title}</h2>
      {children}
    </section>
  );
}
