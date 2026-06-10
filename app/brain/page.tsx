'use client';

// Sales Brain app shell. One page, client view-state (graph | entity | chat);
// no per-entity routes so it static-exports and attract mode can switch views
// without navigation. Graph/EntityPanel/ChatView are wired in later tasks.
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { buildModel } from '@/lib/brain/data';
import TopBar from '@/components/brain/TopBar';

const Graph = dynamic(() => import('@/components/brain/Graph'), { ssr: false });

export default function SalesBrainPage() {
  const model = useMemo(() => buildModel(), []);
  const [query, setQuery] = useState('');
  const [live, setLive] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Recording chrome: hide the Next dev overlay + reset body so nothing floats.
  useEffect(() => {
    const prevBody = document.body.style.cssText;
    document.body.style.margin = '0';
    document.body.style.background = '#f4f5f7';
    const style = document.createElement('style');
    style.textContent = `nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay],nextjs-dev-toolbar{display:none!important}`;
    document.head.appendChild(style);
    return () => { document.body.style.cssText = prevBody; style.remove(); };
  }, []);

  return (
    <main style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f4f5f7', fontFamily: 'ui-sans-serif, system-ui, sans-serif', overflow: 'hidden' }}>
      <TopBar query={query} onQuery={setQuery} live={live} onToggleLive={() => setLive((v) => !v)} />
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Graph model={model} live={live} query={query} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    </main>
  );
}
