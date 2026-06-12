'use client';

// FLOW LAB — a throwaway comparison of 5 ways to show the brain → salespeople flow
// (energy radiating OUT to the reps), each with the green "win" pulse returning on a
// sale. Not a recording stage; a picker. Open /hive/flow-lab and choose a style.

const BRAIN_X = 150, BRAIN_Y = 90, BRAIN_R = 44;
const REP_X = 858;
const REP_YS = [54, 126];

function tp(ey: number): string {
  const ang = Math.atan2(ey - BRAIN_Y, REP_X - BRAIN_X);
  const sx = BRAIN_X + Math.cos(ang) * BRAIN_R;
  const sy = BRAIN_Y + Math.sin(ang) * BRAIN_R;
  const ex = REP_X - 8;
  const c1x = sx + (ex - sx) * 0.5, c1y = sy;
  const c2x = ex - (ex - sx) * 0.32, c2y = ey;
  return `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`;
}

type Variant = 'dots' | 'comet' | 'march' | 'heartbeat' | 'beam';

const SCENES: { key: Variant; n: number; name: string; desc: string }[] = [
  { key: 'dots', n: 1, name: 'Energy packets', desc: 'Glowing pulses stream out along each wire to the reps.' },
  { key: 'comet', n: 2, name: 'Comet trail', desc: 'A bright light streak shoots outward to each rep.' },
  { key: 'march', n: 3, name: 'Live current', desc: 'A fine dashed current marches steadily outward.' },
  { key: 'heartbeat', n: 4, name: 'Broadcast pulse', desc: 'The brain pulses; rings ripple out to all reps at once.' },
  { key: 'beam', n: 5, name: 'Beam fill', desc: 'Each wire lights up brain → rep, then resets.' },
];

function Flow({ variant, d, idx }: { variant: Variant; d: string; idx: number }) {
  switch (variant) {
    case 'dots':
      return (
        <>
          <path d={d} fill="none" stroke="rgba(46,125,82,0.35)" strokeWidth={2} />
          {[0, 1, 2].map((i) => (
            <circle key={i} r={4} fill="#7dd3fc" style={{ filter: 'drop-shadow(0 0 5px #7dd3fc)' }}>
              <animateMotion dur="2.2s" repeatCount="indefinite" begin={`${idx * 0.3 + i * 0.73}s`} path={d} />
            </circle>
          ))}
        </>
      );
    case 'comet':
      return (
        <>
          <path d={d} fill="none" stroke="rgba(46,125,82,0.3)" strokeWidth={2} />
          <path d={d} fill="none" stroke="#38bdf8" strokeWidth={4} strokeLinecap="round" strokeDasharray="26 1000"
            style={{ animation: 'fl-comet 2s linear infinite', animationDelay: `${idx * 0.45}s`, filter: 'drop-shadow(0 0 6px #38bdf8)' }} />
        </>
      );
    case 'march':
      return (
        <>
          <path d={d} fill="none" stroke="rgba(46,125,82,0.25)" strokeWidth={2} />
          <path d={d} fill="none" stroke="#4ade80" strokeWidth={2.5} strokeDasharray="9 13"
            style={{ animation: 'fl-march 0.7s linear infinite', filter: 'drop-shadow(0 0 3px #4ade80)' }} />
        </>
      );
    case 'heartbeat':
      return (
        <>
          <path d={d} fill="none" stroke="rgba(46,125,82,0.3)" strokeWidth={2} />
          <path d={d} fill="none" stroke="#4ade80" strokeWidth={4} strokeLinecap="round" strokeDasharray="30 1000"
            style={{ filter: 'drop-shadow(0 0 6px #4ade80)' }}>
            <animate attributeName="stroke-dashoffset" from="0" to="-1030" dur="2s" repeatCount="indefinite" />
          </path>
        </>
      );
    case 'beam':
      return (
        <>
          <path d={d} fill="none" stroke="rgba(46,125,82,0.25)" strokeWidth={2} />
          <path d={d} fill="none" stroke="#38bdf8" strokeWidth={4} strokeLinecap="round" strokeDasharray="1000 1000"
            style={{ animation: 'fl-beam 2.4s ease-in-out infinite', animationDelay: `${idx * 0.5}s`, filter: 'drop-shadow(0 0 6px #38bdf8)' }} />
        </>
      );
  }
}

function Scene({ variant }: { variant: Variant }) {
  const paths = REP_YS.map((ey) => tp(ey));
  return (
    <svg width={1040} height={180} style={{ display: 'block' }}>
      {/* broadcast rings for the heartbeat variant (behind everything) */}
      {variant === 'heartbeat' && [0, 1].map((i) => (
        <circle key={i} cx={BRAIN_X} cy={BRAIN_Y} r={BRAIN_R} fill="none" stroke="#4ade80" strokeWidth={2}>
          <animate attributeName="r" from={`${BRAIN_R}`} to="150" dur="2s" begin={`${i}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.7" to="0" dur="2s" begin={`${i}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* threads + outward flow + a green "win" return on the top rep */}
      {paths.map((d, k) => (
        <g key={k}>
          <Flow variant={variant} d={d} idx={k} />
          {k === 0 && (
            <circle r={5} fill="#22c55e" style={{ filter: 'drop-shadow(0 0 7px #22c55e)' }}>
              <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.8s" path={d} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
            </circle>
          )}
        </g>
      ))}

      {/* rep tiles */}
      {REP_YS.map((ey, k) => (
        <g key={k}>
          <rect x={REP_X} y={ey - 22} width={172} height={44} rx={9} fill="#0f172a" stroke="#334155" strokeWidth={2} />
          <circle cx={REP_X + 22} cy={ey} r={9} fill="#1e293b" stroke="#475569" />
          <text x={REP_X + 42} y={ey - 1} fill="#cbd5e1" fontSize={13} fontWeight={700} fontFamily="system-ui">AI rep {k + 1}</text>
          <text x={REP_X + 42} y={ey + 14} fill="#64748b" fontSize={11} fontFamily="system-ui">live conversation</text>
        </g>
      ))}

      {/* brain */}
      <circle cx={BRAIN_X} cy={BRAIN_Y} r={BRAIN_R} fill="#16A46C" stroke="#0b6b46" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 16px rgba(46,125,82,0.7))' }} />
      <circle cx={BRAIN_X - 12} cy={BRAIN_Y - 14} r={14} fill="rgba(255,255,255,0.18)" />
      <text x={BRAIN_X} y={BRAIN_Y + 6} fill="#fff" fontSize={18} fontWeight={800} textAnchor="middle" fontFamily="system-ui">AI</text>
    </svg>
  );
}

export default function FlowLab() {
  return (
    <main style={{ minHeight: '100vh', background: '#0b1220', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '36px 32px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#34D399' }}>Flow Lab</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '6px 0 2px' }}>5 ways to show brain → salespeople</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 18px', fontSize: 15 }}>
          Energy radiates <b style={{ color: '#38bdf8' }}>out</b> to each rep; the <b style={{ color: '#22c55e' }}>green pulse</b> is a sale returning to the brain (shown on the top rep). Pick the outward style you like.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SCENES.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#111c30', border: '1px solid #1e2b45', borderRadius: 14, padding: '6px 18px' }}>
              <div style={{ width: 230, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(52,211,153,0.18)', color: '#34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>{s.n}</span>
                  <span style={{ fontSize: 17, fontWeight: 800 }}>{s.name}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6, lineHeight: 1.35 }}>{s.desc}</div>
              </div>
              <Scene variant={s.key} />
            </div>
          ))}
        </div>

        <style>{`
          @keyframes fl-comet { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -1026; } }
          @keyframes fl-march { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -22; } }
          @keyframes fl-beam { 0% { stroke-dashoffset: 1000; opacity: 0; } 12% { opacity: 1; } 55% { stroke-dashoffset: 0; opacity: 1; } 72% { opacity: 0; } 100% { stroke-dashoffset: 0; opacity: 0; } }
        `}</style>
      </div>
    </main>
  );
}
