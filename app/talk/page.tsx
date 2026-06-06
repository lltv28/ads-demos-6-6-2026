'use client';

// Launcher for the "Talk to your AI" switcher — conversational ad stages where
// the viewer asks the assistant about its numbers. Separate from /ad.

import { useEffect } from 'react';
import { BASE_PATH } from '@/lib/basePath';

const VARIANTS = [
  {
    slug: 'ask-the-floor',
    name: 'I · Ask the Floor',
    hook: 'Talk to your AI about today’s sales — it answers by voice and the org chart lights up to prove it.',
    ratio: '9:16 · record at 1080×1920',
  },
];

export default function TalkIndex() {
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.background = '#0b1220';
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#0b1220', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '48px 24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#34D399' }}>Lucas AI · Conversational Stages</div>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: '8px 0 4px' }}>Talk to your AI</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 28px' }}>
          “How many sales did you make today?” — the assistant answers and the floor lights up to back it.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {VARIANTS.map((v) => (
            <a
              key={v.slug}
              href={`${BASE_PATH}/talk/${v.slug}/`}
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: '#111c30', border: '1px solid #1e2b45', borderRadius: 14, padding: '18px 20px' }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>{v.name}</div>
              <div style={{ color: '#94a3b8', fontSize: 15, marginTop: 4 }}>{v.hook}</div>
              <div style={{ color: '#475569', fontSize: 13, marginTop: 8, fontFamily: 'ui-monospace, Menlo, monospace' }}>/talk/{v.slug}/ · {v.ratio}</div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
