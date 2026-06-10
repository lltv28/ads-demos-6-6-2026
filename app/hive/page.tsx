'use client';

// Launcher index for the /hive/* recording stages — the six variants spun off
// the winning "Hive" ad. Not an ad itself; a menu for opening each one.

import { useEffect } from 'react';
import { BASE_PATH } from '@/lib/basePath';

const VARIANTS = [
  { slug: 'orbit', name: '1 · The Orbit', aspect: '16:9 · record at 1920×1080', hook: 'All 50 agents in a slow orbit around the brain — 8 up close, live.' },
  { slug: 'global', name: '2 · Global Takeover', aspect: '16:9 · record at 1920×1080', hook: 'It\'s 3am somewhere. Arcs fire from the brain to cities as sales land.' },
  { slug: 'throttle', name: '3 · The Throttle', aspect: '16:9 · record at 1920×1080', hook: 'A dial drags 1 → 50 agents and revenue/hr surges with it.' },
  { slug: 'mission-control', name: '4 · Mission Control', aspect: '16:9 · record at 1920×1080', hook: 'Ops room: brain on the big board, agent desks closing below.' },
  { slug: 'assembly', name: '5 · Assembly Line', aspect: '16:9 · record at 1920×1080', hook: 'Gray leads ride the belt into the brain; paying customers come out.' },
  { slug: 'switchboard', name: '6 · Switchboard', aspect: '9:16 · record at 1080×1920', hook: 'Leads rain into the orb; the conversations it\'s holding scroll below.' },
];

export default function HiveIndex() {
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.background = '#0b1220';
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#0b1220', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '48px 24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#34D399' }}>Lucas AI · Hive Stages</div>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: '8px 0 4px' }}>Six spins on the winning Hive ad</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 28px' }}>
          One brain, many AI salespeople — each stage frames it differently. Record at the viewport listed on each card.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {VARIANTS.map((v) => (
            <a
              key={v.slug}
              href={`${BASE_PATH}/hive/${v.slug}/`}
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: '#111c30', border: '1px solid #1e2b45', borderRadius: 14, padding: '18px 20px' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{v.name}</div>
                <div style={{ color: '#34D399', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{v.aspect}</div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 15, marginTop: 4 }}>{v.hook}</div>
              <div style={{ color: '#475569', fontSize: 13, marginTop: 8, fontFamily: 'ui-monospace, Menlo, monospace' }}>/hive/{v.slug}/</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
