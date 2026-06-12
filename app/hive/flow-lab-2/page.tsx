'use client';

// FLOW LAB 2 — 5 less-generic ways to show brain → salespeople, deliberately avoiding
// the glowing-neon-particle cliché. Concrete/flat/typographic motion instead of sci-fi
// energy. Each still shows a green "win" returning on a sale (top rep). Temporary picker.

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

type Variant = 'handoff' | 'pipe' | 'conveyor' | 'labels' | 'sweep';

const SCENES: { key: Variant; n: number; name: string; desc: string }[] = [
  { key: 'handoff', n: 1, name: 'Lead hand-off cards', desc: 'The AI slides a “Lead” card out to each rep; a “$497 ✓” card slides back on a sale.' },
  { key: 'pipe', n: 2, name: 'Pipe fill', desc: 'Flat colour fills the pipe brain → rep like liquid through plumbing. No glow.' },
  { key: 'conveyor', n: 3, name: 'Conveyor chevrons', desc: 'Small › marks feed steadily outward along the wire, like a supply line.' },
  { key: 'labels', n: 4, name: 'Traveling labels', desc: 'Actual text rides the wire: “lead” out, “$497 ✓” back. Typographic, not abstract.' },
  { key: 'sweep', n: 5, name: 'Attention sweep', desc: 'No particles — the brain’s focus lights each rep in turn, tending them one by one.' },
];

function OutFlow({ variant, d, idx }: { variant: Variant; d: string; idx: number }) {
  switch (variant) {
    case 'handoff':
      return (
        <>
          <path d={d} fill="none" stroke="#26344d" strokeWidth={2} />
          <g>
            <rect x={-25} y={-11} width={50} height={22} rx={5} fill="#172033" stroke="#3b82f6" strokeWidth={1.5} />
            <text x={0} y={4} fill="#cbd5e1" fontSize={11} fontWeight={700} textAnchor="middle" fontFamily="system-ui">Lead</text>
            <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${idx * 0.6}s`} path={d} />
          </g>
        </>
      );
    case 'pipe':
      return (
        <>
          <path d={d} fill="none" stroke="#1c2942" strokeWidth={8} strokeLinecap="round" />
          <path d={d} fill="none" stroke="#3b82f6" strokeWidth={6} strokeLinecap="round" strokeDasharray="1000 1000"
            style={{ animation: 'fl2-fill 2.6s ease-in-out infinite', animationDelay: `${idx * 0.5}s` }} />
        </>
      );
    case 'conveyor':
      return (
        <>
          <path d={d} fill="none" stroke="#26344d" strokeWidth={2} />
          {[0, 1, 2, 3].map((i) => (
            <text key={i} fill="#64839e" fontSize={17} fontWeight={900} textAnchor="middle" fontFamily="system-ui">
              ›
              <animateMotion dur="2.8s" repeatCount="indefinite" begin={`${idx * 0.35 + i * 0.7}s`} path={d} rotate="auto" />
            </text>
          ))}
        </>
      );
    case 'labels':
      return (
        <>
          <path d={d} fill="none" stroke="#26344d" strokeWidth={2} />
          {[0, 1].map((i) => (
            <text key={i} fill="#8aa0bb" fontSize={12} fontWeight={700} textAnchor="middle" fontFamily="system-ui">
              lead →
              <animateMotion dur="2.8s" repeatCount="indefinite" begin={`${idx * 0.5 + i * 1.4}s`} path={d} />
            </text>
          ))}
        </>
      );
    case 'sweep':
      return (
        <>
          <path d={d} fill="none" stroke="#26344d" strokeWidth={2} />
          <path d={d} fill="none" stroke="#4ade80" strokeWidth={3}
            style={{ animation: 'fl2-sweep 2.4s ease-in-out infinite', animationDelay: `${idx * 1.2}s`, opacity: 0 }} />
        </>
      );
  }
}

function Return({ variant, d }: { variant: Variant; d: string }) {
  if (variant === 'handoff') {
    return (
      <g>
        <rect x={-30} y={-11} width={60} height={22} rx={5} fill="#0f2a1c" stroke="#22c55e" strokeWidth={1.5} />
        <text x={0} y={4} fill="#86efac" fontSize={11} fontWeight={800} textAnchor="middle" fontFamily="system-ui">$497 ✓</text>
        <animateMotion dur="2.2s" repeatCount="indefinite" begin="1.3s" path={d} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
      </g>
    );
  }
  if (variant === 'labels') {
    return (
      <text fill="#22c55e" fontSize={12} fontWeight={800} textAnchor="middle" fontFamily="system-ui">
        $497 ✓
        <animateMotion dur="2.2s" repeatCount="indefinite" begin="1.3s" path={d} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
      </text>
    );
  }
  // pipe / conveyor / sweep: a simple green token returns
  return (
    <circle r={5} fill="#22c55e">
      <animateMotion dur="1.8s" repeatCount="indefinite" begin="1.1s" path={d} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
    </circle>
  );
}

function Scene({ variant }: { variant: Variant }) {
  const paths = REP_YS.map((ey) => tp(ey));
  return (
    <svg width={1040} height={180} style={{ display: 'block' }}>
      {paths.map((d, k) => (
        <g key={k}>
          <OutFlow variant={variant} d={d} idx={k} />
          {k === 0 && <Return variant={variant} d={d} />}
        </g>
      ))}

      {/* rep tiles (border lights in turn for the sweep variant) */}
      {REP_YS.map((ey, k) => (
        <g key={k}>
          <rect x={REP_X} y={ey - 22} width={172} height={44} rx={9} fill="#0f172a" stroke="#334155" strokeWidth={2}
            style={variant === 'sweep' ? { animation: 'fl2-tile 2.4s ease-in-out infinite', animationDelay: `${k * 1.2}s` } : undefined} />
          <circle cx={REP_X + 22} cy={ey} r={9} fill="#1e293b" stroke="#475569" />
          <text x={REP_X + 42} y={ey - 1} fill="#cbd5e1" fontSize={13} fontWeight={700} fontFamily="system-ui">AI rep {k + 1}</text>
          <text x={REP_X + 42} y={ey + 14} fill="#64748b" fontSize={11} fontFamily="system-ui">live conversation</text>
        </g>
      ))}

      {/* brain */}
      <circle cx={BRAIN_X} cy={BRAIN_Y} r={BRAIN_R} fill="#16A46C" stroke="#0b6b46" strokeWidth={2} />
      <circle cx={BRAIN_X - 12} cy={BRAIN_Y - 14} r={14} fill="rgba(255,255,255,0.16)" />
      <text x={BRAIN_X} y={BRAIN_Y + 6} fill="#fff" fontSize={18} fontWeight={800} textAnchor="middle" fontFamily="system-ui">AI</text>
    </svg>
  );
}

export default function FlowLab2() {
  return (
    <main style={{ minHeight: '100vh', background: '#0b1220', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '36px 32px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#34D399' }}>Flow Lab · round 2</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '6px 0 2px' }}>5 less-generic flows (brain → salespeople)</h1>
        <p style={{ color: '#94a3b8', margin: '0 0 18px', fontSize: 15 }}>
          Deliberately avoiding the glowing-particle look — concrete, flat, and typographic motion. <b style={{ color: '#22c55e' }}>Green</b> = a sale returning (top rep).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SCENES.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#111c30', border: '1px solid #1e2b45', borderRadius: 14, padding: '6px 18px' }}>
              <div style={{ width: 244, flexShrink: 0 }}>
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
          @keyframes fl2-fill { 0% { stroke-dashoffset: 1000; opacity: 1; } 42% { stroke-dashoffset: 0; opacity: 1; } 72% { opacity: 1; } 86% { opacity: 0; } 100% { stroke-dashoffset: 0; opacity: 0; } }
          @keyframes fl2-sweep { 0%, 100% { opacity: 0; } 8% { opacity: 0.95; } 38% { opacity: 0.95; } 52% { opacity: 0; } }
          @keyframes fl2-tile { 0%, 100% { stroke: #334155; } 8%, 38% { stroke: #4ade80; } 52% { stroke: #334155; } }
        `}</style>
      </div>
    </main>
  );
}
