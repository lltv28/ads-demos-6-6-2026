'use client';

// HIVE VARIANT 2 · "Global Takeover" — it's 3am somewhere; the brain is closing
// there. Dotted world map, arc pulses core→city on each sale, toasts with the
// city's real current local time. Night-time cities are weighted 2×.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STAGE_W, STAGE_H, C,
  createLeads, buildFunnelSrc, saleLabel,
  useFitStage, useRecordingChrome, useLiveTally, useRealTileOutcomes, useCountUp,
  type Outcome,
} from '@/lib/adStage';

const BG = '#0f172a';
const CX = STAGE_W / 2;
const CY = 470; // core sits slightly above centre; toasts + tiles live below
const CORE_R = 150;

// ── 48×24 landmask ('#' = land), equirectangular: lon -180..180 → col 0..47,
// lat 90..-90 → row 0..23. Coarse but reads as Earth at a glance. ──
const MASK = [
  '................................................',
  '................####............................',
  '......########..#####.......###################.',
  '.....##########.####.....######################.',
  '.....###########.......#.######################.',
  '......##########.......########################.',
  '.......#########.......#######################..',
  '........#######........######################...',
  '.........####.........###########.##########....',
  '..........###.........########....#########.....',
  '...........###........#########...##.#####......',
  '.............###......#########.....########....',
  '.............#####.....########.....#########...',
  '.............######.....#######.......#######...',
  '.............######.....######..................',
  '..............#####......#####...........#####..',
  '..............####.......####...........#######.',
  '..............####.......###............#######.',
  '..............###........................#####..',
  '..............##................................',
  '..............##................................',
  '..............#.................................',
  '................................................',
  '................................................',
];
const MAP_W = 1760, MAP_H = 880, MAP_X = (STAGE_W - MAP_W) / 2, MAP_Y = 90;
const DX = MAP_W / 48, DY = MAP_H / 24;
const lonLatToXY = (lon: number, lat: number) => ({
  x: MAP_X + ((lon + 180) / 360) * MAP_W,
  y: MAP_Y + ((90 - lat) / 180) * MAP_H,
});

type City = { name: string; lon: number; lat: number; utc: number };
const CITIES: City[] = [
  { name: 'Sydney', lon: 151.2, lat: -33.9, utc: 10 },
  { name: 'Tokyo', lon: 139.7, lat: 35.7, utc: 9 },
  { name: 'Singapore', lon: 103.8, lat: 1.35, utc: 8 },
  { name: 'Dubai', lon: 55.3, lat: 25.2, utc: 4 },
  { name: 'London', lon: -0.1, lat: 51.5, utc: 0 },
  { name: 'São Paulo', lon: -46.6, lat: -23.55, utc: -3 },
  { name: 'New York', lon: -74.0, lat: 40.7, utc: -5 },
  { name: 'Austin', lon: -97.7, lat: 30.3, utc: -6 },
  { name: 'Denver', lon: -105.0, lat: 39.7, utc: -7 },
  { name: 'Los Angeles', lon: -118.2, lat: 34.05, utc: -8 },
];

function cityLocal(c: City): { label: string; night: boolean } {
  const now = new Date();
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes() + c.utc * 60;
  const m = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const label = `${h12}:${String(m % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
  return { label, night: h24 >= 22 || h24 < 7 };
}

// Weighted pick: cities currently in night-time count twice (sells the 24/7 story).
function pickCity(): City {
  const pool: City[] = [];
  for (const c of CITIES) {
    pool.push(c);
    if (cityLocal(c).night) pool.push(c);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

type Toast = { key: number; city: string; time: string; label: string };

export default function GlobalAd() {
  const fit = useFitStage();
  useRecordingChrome(BG);
  const leads = useMemo(() => createLeads(2), []);
  const outcomes = useRealTileOutcomes();
  const { tally, feed } = useLiveTally({ minMs: 4000, maxMs: 6500 });
  const revenue = useCountUp(tally.revenue);

  const [arc, setArc] = useState<{ key: number; city: City }>({ key: 0, city: CITIES[0] });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastKey = useRef<number | null>(null);
  useEffect(() => {
    const top = feed[0];
    if (!top || lastKey.current === top.key) return;
    lastKey.current = top.key;
    const city = pickCity();
    const { label: time } = cityLocal(city);
    const timer = setTimeout(() => {
      setArc({ key: top.key + 1, city });
      setToasts((prev) => [
        { key: top.key, city: city.name, time, label: top.outcome === 'buy' ? saleLabel(top.valueUsd) : 'Call booked' },
        ...prev,
      ].slice(0, 3));
    }, 0);
    return () => clearTimeout(timer);
  }, [feed]);

  const arcPath = (c: City) => {
    const p = lonLatToXY(c.lon, c.lat);
    const mx = (CX + p.x) / 2;
    const my = Math.min(CY, p.y) - 160;
    return `M ${CX} ${CY} Q ${mx} ${my} ${p.x} ${p.y}`;
  };

  return (
    <main style={{ position: 'fixed', inset: 0, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: STAGE_W, height: STAGE_H, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(circle at 50% 42%, #16243c 0%, ${BG} 75%)`,
          fontFamily: 'inherit',
        }}
      >
        <header style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 72, display: 'flex', alignItems: 'center', gap: 16, padding: '0 48px', zIndex: 40 }}>
          <span style={{ width: 16, height: 16, borderRadius: 999, background: C.green, boxShadow: '0 0 12px rgba(46,125,82,0.8)' }} className="pulse-glow" />
          <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>LUCAS AI · SELLING IN 10 TIME ZONES</span>
        </header>

        {/* Dot-matrix map + cities + arcs */}
        <svg width={STAGE_W} height={STAGE_H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
          {MASK.flatMap((row, r) =>
            row.split('').map((ch, col) =>
              ch === '#' ? (
                <circle key={`${r}-${col}`} cx={MAP_X + col * DX + DX / 2} cy={MAP_Y + r * DY + DY / 2} r={5}
                  fill="rgba(74,222,128,0.13)" />
              ) : null,
            ),
          )}
          {CITIES.map((c) => {
            const p = lonLatToXY(c.lon, c.lat);
            const night = cityLocal(c).night;
            return (
              <g key={c.name}>
                <circle cx={p.x} cy={p.y} r={9} fill={night ? '#4ade80' : 'rgba(74,222,128,0.55)'}
                  style={night ? { filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.9))' } : undefined} />
                <text x={p.x} y={p.y - 16} textAnchor="middle" fill="#94a3b8" fontSize={15} fontWeight={700}>{c.name}</text>
              </g>
            );
          })}
          <path key={arc.key} d={arcPath(arc.city)} stroke="#4ade80" strokeWidth={5} fill="none"
            strokeLinecap="round" strokeDasharray="60 3000" className="glb-arc"
            style={{ filter: 'drop-shadow(0 0 8px rgba(74,222,128,0.8))' }} />
        </svg>

        {/* Core */}
        <div key={`core-${arc.key}`} style={{
            position: 'absolute', left: CX - CORE_R, top: CY - CORE_R,
            width: CORE_R * 2, height: CORE_R * 2, borderRadius: '50%', zIndex: 30,
            background: 'radial-gradient(circle at 30% 30%, #4ade80 0%, #166534 60%, #064e3b 100%)',
            boxShadow: '0 0 64px rgba(74,222,128,0.4), inset 0 4px 16px rgba(255,255,255,0.4)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'glb-bump 0.8s ease-out',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 1.5 }}>Revenue Today</div>
          <div style={{ fontSize: 56, fontWeight: 700, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.3)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            ${Math.round(revenue).toLocaleString()}
          </div>
          <div style={{ marginTop: 10, background: 'rgba(0,0,0,0.3)', padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            24/7 · every time zone
          </div>
        </div>

        {/* Toast stack */}
        <div style={{ position: 'absolute', top: 100, right: 48, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 40, width: 380 }}>
          {toasts.map((t) => (
            <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(15,23,42,0.92)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: 12, padding: '12px 16px', animation: 'glb-toast 0.35s ease' }}>
              <span style={{ fontSize: 24 }}>{t.label === 'Call booked' ? '📅' : '💰'}</span>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: t.label === 'Call booked' ? '#fff' : '#4ade80' }}>
                  {t.label === 'Call booked' ? 'Call booked' : `Sale · ${t.label}`}
                </div>
                <div style={{ fontSize: 14, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{t.time} · {t.city}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Two live proof tiles, bottom corners */}
        {leads.map((lead, i) => {
          const resolved = outcomes[lead.id];
          const isBuy = resolved?.outcome === 'buy';
          const left = i === 0 ? 48 : STAGE_W - 48 - 340;
          return (
            <article key={lead.id} style={{
                position: 'absolute', left, bottom: 40, width: 340, height: 420,
                borderRadius: 14, overflow: 'hidden', zIndex: 35,
                border: isBuy ? `3px solid ${C.green}` : '2px solid #334155',
                background: '#0f172a', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              }}>
              <header style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: isBuy ? C.green : '#1e293b', color: '#fff' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Live conversation #{i + 1}</span>
                <StatusPill resolved={resolved} />
              </header>
              <div style={{ width: '100%', height: 382, background: '#fff' }}>
                <iframe title={`global-${i}`} src={buildFunnelSrc(lead, i, { count: 2, demoScale: 0.55, speed: 0.5 })} allow="autoplay"
                  style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }} />
              </div>
            </article>
          );
        })}

        <style>{`
          @keyframes glb-arc-k { from { stroke-dashoffset: 3000; opacity: 1; } to { stroke-dashoffset: 0; opacity: 0; } }
          .glb-arc { animation: glb-arc-k 1.1s cubic-bezier(0.2, 0.8, 0.3, 1) forwards; }
          @keyframes glb-bump { 0% { transform: scale(1); filter: brightness(1); } 15% { transform: scale(1.07); filter: brightness(1.3); } 100% { transform: scale(1); filter: brightness(1); } }
          @keyframes glb-toast { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
        `}</style>
      </div>
    </main>
  );
}

function StatusPill({ resolved }: { resolved?: Outcome }) {
  if (resolved?.outcome === 'buy') return <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>SOLD ${resolved.valueUsd}</span>;
  if (resolved?.outcome === 'book') return <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>BOOKED</span>;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: '#94a3b8' }} className="pulse-glow" /> Selling…
    </span>
  );
}
