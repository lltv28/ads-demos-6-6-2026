'use client';

// Sales Brain app shell — single screen: the graph on top, a condensed AI daily
// brief band underneath, both always visible (no view toggle). One page, client
// view-state, no per-entity routes so it static-exports and attract mode can
// drive it without navigation.
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { buildModel } from '@/lib/brain/data';
import TopBar from '@/components/brain/TopBar';
import EntityPanel from '@/components/brain/EntityPanel';
import LeftRail from '@/components/brain/LeftRail';
import ReportBand from '@/components/brain/ReportBand';

const Graph = dynamic(() => import('@/components/brain/Graph'), { ssr: false });

function SalesBrainInner() {
  const model = useMemo(() => buildModel(), []);
  const [query, setQuery] = useState('');
  const [live, setLive] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useSearchParams();
  const attract = params.get('attract') === '1';
  const instant = params.get('instant') === '1'; // skip the initial delay (recording)
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

  // Attract: hands-free auto-tour of agents (panel open, graph spotlighting each).
  // The report band is always on screen, so no view switching is needed.
  useEffect(() => {
    if (!attract) return;
    const agents = model.agents;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const a = agents[i % agents.length];
      setFocusId(a.id);
      setSelectedId(a.id);
      i += 1;
      timer = setTimeout(step, 5500);
    };
    timer = setTimeout(step, instant ? 0 : 2200);
    return () => clearTimeout(timer);
  }, [attract, instant, model.agents]);

  return (
    <main style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#f4f5f7', fontFamily: 'ui-sans-serif, system-ui, sans-serif', overflow: 'hidden' }}>
      <TopBar query={query} onQuery={setQuery} live={live} onToggleLive={() => setLive((v) => !v)} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <LeftRail model={model} onSelect={(id) => { setSelectedId(id); setFocusId(id); }} selectedId={selectedId} />
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Graph (top) — the entity panel slides in over just this region */}
          <div style={{ flex: '1 1 58%', minHeight: 0, position: 'relative' }}>
            <Graph model={model} live={live} query={query} selectedId={selectedId} onSelect={setSelectedId} focusId={focusId} />
            {selectedId && selectedId !== 'core' && (
              <EntityPanel key={selectedId} model={model} id={selectedId} onClose={() => setSelectedId(null)} />
            )}
          </div>
          {/* Condensed daily brief (bottom) — always visible */}
          <div style={{ flex: '0 0 42%', minHeight: 0 }}>
            <ReportBand model={model} />
          </div>
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
