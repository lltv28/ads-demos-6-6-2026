'use client';

// Left-side switcher for the /ad/* recording stages. Visible by default. Hide it
// for a clean recording with the "Hide" control or the M key — a thin tab stays
// on the left edge to reopen. Keys: 1–5 jump to a variant, M toggle.

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BASE_PATH } from '@/lib/basePath';

const VARIANTS = [
  { slug: 'org-chart', key: 'A', name: 'The Org Chart' },
  { slug: 'caught-in-4k', key: 'B', name: 'Caught in 4K' },
  { slug: 'clone-army', key: 'C', name: 'The Clone Army' },
  { slug: 'agents', key: 'G', name: 'AI Agents Console' },
  { slug: 'hive', key: 'H', name: 'One Mind · 50 Convos' },
];

export default function AdNav() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(true);

  // Keyboard: 1–5 jump, M toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm') { setOpen((v) => !v); return; }
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= VARIANTS.length) {
        window.location.href = `${BASE_PATH}/ad/${VARIANTS[n - 1].slug}/`;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Collapsed: a thin tab on the left edge to reopen.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show ad-stage menu"
        style={{
          position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)',
          zIndex: 2147483000, cursor: 'pointer',
          background: 'rgba(15,23,42,0.92)', color: '#cbd5e1',
          border: '1px solid rgba(148,163,184,0.18)', borderLeft: 'none',
          borderRadius: '0 12px 12px 0', padding: '14px 9px',
          fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 800,
          letterSpacing: 1, writingMode: 'vertical-rl', textOrientation: 'mixed',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        ‹ STAGES
      </button>
    );
  }

  return (
    <nav
      style={{
        position: 'fixed', left: 18, top: '50%', transform: 'translateY(-50%)',
        zIndex: 2147483000, width: 236,
        background: 'rgba(15,23,42,0.94)',
        border: '1px solid rgba(148,163,184,0.18)',
        borderRadius: 16, boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)', padding: 12,
        fontFamily: 'system-ui, -apple-system, sans-serif', color: '#e2e8f0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 10px 8px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#34D399' }} />
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#94a3b8' }}>
            Ad Stages
          </span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Hide menu (M)"
          style={{ cursor: 'pointer', background: 'transparent', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 700, padding: '2px 4px' }}
        >
          Hide ‹
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {VARIANTS.map((v) => {
          const active = pathname.replace(/\/$/, '') === `/ad/${v.slug}`;
          return (
            <a
              key={v.slug}
              href={`${BASE_PATH}/ad/${v.slug}/`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                borderRadius: 10, padding: '9px 10px',
                background: active ? 'rgba(52,211,153,0.16)' : 'transparent',
                border: `1px solid ${active ? 'rgba(52,211,153,0.45)' : 'transparent'}`,
                color: active ? '#a7f3d0' : '#cbd5e1',
              }}
            >
              <span
                style={{
                  flexShrink: 0, width: 22, height: 22, borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800,
                  background: active ? '#34D399' : 'rgba(148,163,184,0.18)',
                  color: active ? '#06281c' : '#e2e8f0',
                }}
              >
                {v.key}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{v.name}</span>
            </a>
          );
        })}
      </div>

      <a href={`${BASE_PATH}/ad/`} style={{ display: 'block', marginTop: 8, padding: '7px 10px', fontSize: 12, color: '#64748b', textDecoration: 'none' }}>
        ← All stages
      </a>
      <div style={{ padding: '2px 10px 4px', fontSize: 11, color: '#475569', fontFamily: 'ui-monospace, Menlo, monospace' }}>
        1–5 jump · M hide
      </div>
    </nav>
  );
}
