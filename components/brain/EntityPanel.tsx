'use client';

import { useState } from 'react';
import type { BrainModel } from '@/lib/brain/types';
import { squadColor, squadName } from '@/lib/brain/data';
import { money, buildFunnelSrc } from '@/lib/adStage';

type Props = { model: BrainModel; id: string; onClose: () => void };
const TABS = ['Overview', 'Access', 'Activity', 'Compliance'] as const;
type Tab = typeof TABS[number];

export default function EntityPanel({ model, id, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('Overview');
  const agent = model.agents.find((a) => a.id === id);
  if (!agent) {
    const node = model.nodes.find((n) => n.id === id);
    return (
      <Shell title={node?.label ?? 'Node'} subtitle={node?.type ?? ''} color="#64748b" onClose={onClose}>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Used across the Lucas AI sales floor. Select an agent node to see a full profile.</p>
      </Shell>
    );
  }
  const color = squadColor(agent.squadId);
  const leads = model.leads.filter((l) => l.agentId === agent.id);
  const tools = model.tools.filter((t) => agent.toolIds.includes(t.id));
  const playbook = model.offers.find((o) => o.id === agent.playbookId);
  const leadIndex = Number(agent.id.split(':')[1]) || 0;

  return (
    <Shell title={agent.name} subtitle={`${agent.role} · ${squadName(agent.squadId)}`} color={color} avatar={agent.initials} status={agent.status} onClose={onClose}>
      <div style={{ display: 'flex', gap: 10, padding: '0 0 14px' }}>
        <Stat label="Sales" value={String(agent.sales)} />
        <Stat label="Calls" value={String(agent.calls)} />
        <Stat label="Revenue" value={money(agent.revenue)} accent />
      </div>
      <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 14 }}>
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '8px 12px', fontSize: 13, fontWeight: 700, color: tab === t ? '#111827' : '#9ca3af', borderBottom: tab === t ? '2px solid #111827' : '2px solid transparent' }}>{t}</button>
        ))}
      </nav>

      {tab === 'Overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Row label="Current task"><span style={{ fontStyle: 'italic', color: '#374151' }}>{agent.currentTask}…</span></Row>
          <Row label="Playbook">{playbook ? `${playbook.name}${playbook.priceUsd ? ` ($${playbook.priceUsd})` : ''}` : '—'}</Row>
          <Row label={`Leads working (${leads.length})`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {leads.slice(0, 6).map((l) => (
                <span key={l.id} style={{ fontSize: 12, fontWeight: 600, color: '#374151', background: '#f3f4f6', borderRadius: 999, padding: '4px 10px' }}>{l.name} · {l.source}</span>
              ))}
              {leads.length === 0 && <span style={{ color: '#9ca3af', fontSize: 13 }}>Idle — waiting for the next lead.</span>}
            </div>
          </Row>
          <Row label="Live conversation">
            <div style={{ width: '100%', height: 280, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#fff' }}>
              <iframe title="live" src={buildFunnelSrc({ id: leadIndex, seed: 7000 + leadIndex * 37 }, leadIndex, { count: 6, demoScale: 0.7, speed: 0.5 })} style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }} />
            </div>
          </Row>
        </div>
      )}
      {tab === 'Access' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Row label="Tools">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tools.map((t) => <span key={t.id} style={{ fontSize: 12, fontWeight: 700, color: '#111827', background: '#f3f4f6', borderRadius: 8, padding: '5px 10px' }}>{t.name}</span>)}
            </div>
          </Row>
          <Row label="Permissions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {agent.permissions.map((p) => (
                <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#fff', background: p.allowed ? '#16A46C' : '#dc2626' }}>{p.allowed ? '✓' : '✕'}</span>
                  <span style={{ color: '#374151' }}>{p.label}</span>
                </div>
              ))}
            </div>
          </Row>
        </div>
      )}
      {tab === 'Activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leads.map((l) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f9fafb', borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: '#374151' }}>{l.name} · {l.source}</span>
              <span style={{ fontWeight: 700, color: l.outcome === 'buy' ? '#16A46C' : l.outcome === 'book' ? '#7C3AED' : '#9ca3af' }}>
                {l.outcome === 'buy' ? `Bought $${l.valueUsd}` : l.outcome === 'book' ? 'Booked a call' : 'Working…'}
              </span>
            </div>
          ))}
          {leads.length === 0 && <span style={{ color: '#9ca3af', fontSize: 13 }}>No recent activity.</span>}
        </div>
      )}
      {tab === 'Compliance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#374151' }}>
          <p>Operates within the {squadName(agent.squadId)} squad guardrails. Cannot export raw lead PII. All actions logged and attributable to this agent.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16A46C', fontWeight: 700 }}><span>●</span> In compliance · last audit passed</div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ title, subtitle, color, avatar, status, onClose, children }: { title: string; subtitle: string; color: string; avatar?: string; status?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <aside style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '92vw', background: '#fff', borderLeft: '1px solid #e5e7eb', boxShadow: '-12px 0 40px rgba(0,0,0,0.08)', zIndex: 60, display: 'flex', flexDirection: 'column', animation: 'panel-in 0.28s cubic-bezier(0.2,0.7,0.2,1)' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 48, height: 48, borderRadius: 12, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{avatar ?? title[0]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{title}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>{subtitle}{status ? ` · ${status}` : ''}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close panel" style={{ border: 'none', background: '#f3f4f6', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#6b7280' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px' }}>{children}</div>
      <style>{`@keyframes panel-in { from { transform: translateX(28px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
    </aside>
  );
}
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1, background: accent ? 'rgba(22,164,108,0.08)' : '#f9fafb', border: '1px solid #eef0f3', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, color: '#9ca3af' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ? '#106844' : '#111827' }}>{value}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, color: '#9ca3af', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#111827' }}>{children}</div>
    </div>
  );
}
