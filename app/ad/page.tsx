'use client';

// Launcher index for the 9:16 ad recording stages. Not an ad itself — just a
// quick menu to open each variant full-screen for recording.

import { useEffect } from 'react';
import { BASE_PATH } from '@/lib/basePath';

const VARIANTS = [
  { slug: 'org-chart', name: 'A · The Org Chart', hook: 'Every node is the same AI — Lucas AI, cloned across a whole sales org.' },
  { slug: 'caught-in-4k', name: 'B · Caught in 4K', hook: 'Mission-control / CCTV surveillance feed of the AI sales floor.' },
  { slug: 'clone-army', name: 'C · The Clone Army', hook: 'One closer splits 1→2→4→8 — replication in real time.' },
  { slug: 'agents', name: 'G · AI Agents Console', hook: 'A real ops wallboard: a fleet of Lucas AI agents working leads live, 24/7.' },
  { slug: 'hive', name: 'H · One Mind, 50 Convos', hook: 'A glowing Lucas AI core running many conversations at once.' },
];

export default function AdIndex() {
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.background = '#0b1220';
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#0b1220', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '48px 24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#34D399' }}>Lucas AI · Ad Stages</div>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: '8px 0 4px' }}>9:16 recording variants</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 28px' }}>
          “These are my AI salespeople — they work 24/7, they never take a break.” Record each at a 1080×1920 viewport (1:1).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {VARIANTS.map((v) => (
            <a
              key={v.slug}
              href={`${BASE_PATH}/ad/${v.slug}/`}
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: '#111c30', border: '1px solid #1e2b45', borderRadius: 14, padding: '18px 20px' }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>{v.name}</div>
              <div style={{ color: '#94a3b8', fontSize: 15, marginTop: 4 }}>{v.hook}</div>
              <div style={{ color: '#475569', fontSize: 13, marginTop: 8, fontFamily: 'ui-monospace, Menlo, monospace' }}>/ad/{v.slug}/</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
