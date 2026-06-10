'use client';

// Sales Brain app shell. One page, client view-state (graph | entity | chat);
// no per-entity routes so it static-exports and attract mode can switch views
// without navigation. Graph/EntityPanel/ChatView are wired in later tasks.
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildModel } from '@/lib/brain/data';
import TopBar from '@/components/brain/TopBar';
import EntityPanel from '@/components/brain/EntityPanel';
import LeftRail from '@/components/brain/LeftRail';
import ChatView from '@/components/brain/ChatView';

const Graph = dynamic(() => import('@/components/brain/Graph'), { ssr: false });

function SalesBrainInner() {
  const model = useMemo(() => buildModel(), []);
  const [query, setQuery] = useState('');
  const [live, setLive] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'graph' | 'chat'>('graph');

  const params = useSearchParams();
  const attract = params.get('attract') === '1';
  const [focusId, setFocusId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!attract) return;
    // Choreographed loop: focus 2 agents (panel open, graph view), then show the
    // chat report, then repeat with the next agents. Hands-free for recording.
    const agents = model.agents;
    const seq: Array<() => void> = [];
    for (let k = 0; k < 9; k += 3) {
      const a1 = agents[k % agents.length];
      const a2 = agents[(k + 1) % agents.length];
      seq.push(() => { setView('graph'); setFocusId(a1.id); setSelectedId(a1.id); });
      seq.push(() => { setFocusId(a2.id); setSelectedId(a2.id); });
      seq.push(() => { setView('chat'); setSelectedId(null); });
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => { seq[i % seq.length](); i += 1; timer = setTimeout(step, 5500); };
    timer = setTimeout(step, 2200);
    return () => clearTimeout(timer);
  }, [attract, model.agents]);

  return (
    <main style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f4f5f7', fontFamily: 'ui-sans-serif, system-ui, sans-serif', overflow: 'hidden' }}>
      <TopBar query={query} onQuery={setQuery} live={live} onToggleLive={() => setLive((v) => !v)} />
      <div style={{ display: 'flex', gap: 6, padding: '8px 22px', background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
        {(['graph', 'chat'] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} style={{ border: 'none', cursor: 'pointer', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, background: view === v ? '#111418' : '#f3f4f6', color: view === v ? '#fff' : '#6b7280' }}>{v === 'graph' ? 'Graph' : 'Chat & Report'}</button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <LeftRail model={model} onSelect={(id) => { setSelectedId(id); setFocusId(id); }} selectedId={selectedId} />
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          {view === 'graph' ? (
            <>
              <Graph model={model} live={live} query={query} selectedId={selectedId} onSelect={setSelectedId} focusId={focusId} />
              {selectedId && selectedId !== 'core' && (
                <EntityPanel key={selectedId} model={model} id={selectedId} onClose={() => setSelectedId(null)} />
              )}
            </>
          ) : (
            <ChatView model={model} />
          )}
        </div>
      </div>
    </main>
  );
}

export default function SalesBrainPage() {
  return (
    <Suspense fallback={null}>
      <SalesBrainInner />
    </Suspense>
  );
}
