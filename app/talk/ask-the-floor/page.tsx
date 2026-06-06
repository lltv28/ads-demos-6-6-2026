'use client';

// CONVERSATIONAL VARIANT I · "Ask the Floor" (9:16 vertical, 1080×1920)
// Mic-driven voice call: you tap to start, then talk out loud. Energy-based VAD
// (no transcription) detects when you stop; after ~1s it plays the next AI line
// (pre-generated ElevenLabs audio in /public/talk/vo) and the orb "answers". The
// waveform reacts to your real voice while listening and to the TTS while it
// speaks; synthetic motion otherwise. Falls back to a timed loop if the mic is
// denied, and to a synthetic answer beat if the audio files aren't present yet.
// d4a financial-advisor design system (warm cream, emerald, Instrument Sans).

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFitStage, useRecordingChrome, useLiveTally, useCountUp } from '@/lib/adStage';
import { createSeededRandom as seeded } from '@/lib/demoAuto';
import { BASE_PATH } from '@/lib/basePath';

// ── Vertical stage ──────────────────────────────────────────────────────────
const VW = 1080;
const VH = 1920;
const LETTERBOX = '#E9E3D8';

// ── d4a design tokens ───────────────────────────────────────────────────────
const T = {
  bg: '#FFFDFB', surface: '#F6F3EC', surface2: '#FBF9F5',
  ink: '#2E2B26', ink2: 'rgba(46,43,38,.82)', ink3: 'rgba(46,43,38,.70)', ink4: 'rgba(46,43,38,.50)',
  line: 'rgba(46,43,38,.10)', line2: 'rgba(46,43,38,.17)',
  accent: '#16A46C', accentInk: '#106844', accentSoft: 'rgba(22,164,108,.10)', accentLine: 'rgba(22,164,108,.22)', mint: '#5BC998',
  shadowSm: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  shadow: '0 20px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.10)',
};
const ORB_GRADIENT = `radial-gradient(circle at 35% 28%, #d6f5e6 0%, ${T.mint} 26%, ${T.accent} 64%, ${T.accentInk} 100%)`;

const AGENTS = 8;
const BEST = 3;

// ── VAD tuning ──────────────────────────────────────────────────────────────
const ONSET_MS = 150;     // sustained voice before we count you as "talking"
const HANGOVER_MS = 1000; // silence after talking before the AI responds
const GUARD_MS = 700;     // pause after the AI finishes before re-listening (echo guard)
const NO_MIC_LISTEN_MS = 2800; // fallback turn length when mic is unavailable
const NO_AUDIO_SPEAK_MS = 3200; // fallback answer length when the mp3 is missing

type Agent = { id: number; sales: number; calls: number };
type Turn = 'idle' | 'listening' | 'thinking' | 'speaking';
type Round = { ask: string; say: string };
type Line = { who: 'you' | 'ai'; text: string; key: number };

const SCRIPT: Round[] = [
  { ask: 'How many sales today?', say: '58 low-ticket sales so far — and climbing.' },
  { ask: 'Calls booked for the high-tier program?', say: '24 booked. All qualified, all on the calendar.' },
  { ask: 'How many agents are working right now?', say: 'Every one. 50 of me, around the clock.' },
  { ask: 'Who’s booked the most calls?', say: 'Agent #04 — 6 calls booked.' },
  { ask: 'Keep going tonight?', say: 'Always. I never sleep. 😏' },
];

export default function AskTheFloorAd() {
  const fit = useFitStage(VW, VH);
  useRecordingChrome(LETTERBOX);
  const { tally } = useLiveTally({ basePurchases: 58, baseCalls: 24, buyShare: 0.72, minMs: 1800, maxMs: 3000 });
  const sales = useCountUp(tally.purchases);
  const calls = useCountUp(tally.calls);

  // ── Always-visible agent floor (live) ──
  const [agents, setAgents] = useState<Agent[]>(() => {
    const rnd = seeded(5150);
    return Array.from({ length: AGENTS }, (_, i) => ({
      id: i + 1,
      sales: i === BEST ? 8 : 1 + Math.floor(rnd() * 4),
      calls: i === BEST ? 6 : Math.floor(rnd() * 2),
    }));
  });
  const [evt, setEvt] = useState<{ id: number; kind: 'sale' | 'booked'; key: number }>({ id: -1, kind: 'sale', key: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      const i = Math.floor(Math.random() * AGENTS);
      const isSale = Math.random() < 0.7;
      setAgents((prev) => prev.map((a, idx) => (idx === i ? { ...a, sales: a.sales + (isSale ? 1 : 0), calls: a.calls + (isSale ? 0 : 1) } : a)));
      setEvt((e) => ({ id: i, kind: isSale ? 'sale' : 'booked', key: e.key + 1 }));
    }, 1700);
    return () => clearInterval(id);
  }, []);

  // ── Voice conversation (mic VAD → AI response) ──
  const [started, setStarted] = useState(false);
  const [turn, setTurn] = useState<Turn>('idle');
  const [lines, setLines] = useState<Line[]>([]);
  const keyRef = useRef(0);
  const activeAnalyser = useRef<AnalyserNode | null>(null); // what the waveform reads
  const startRef = useRef<() => void>(() => {});

  useEffect(() => {
    let ctx: AudioContext | null = null;
    let micAn: AnalyserNode | null = null;
    let aiAn: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let audio: HTMLAudioElement[] = [];
    let raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let round = 0;

    const addLine = (who: 'you' | 'ai', text: string) =>
      setLines((prev) => [...prev, { who, text, key: keyRef.current++ }].slice(-6));
    const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };
    const stopRaf = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

    const beginListening = () => {
      setTurn('listening');
      activeAnalyser.current = micAn; // real mic in the bars (or null → synthetic)
      if (micAn) startVad();
      else timers.push(setTimeout(endOfSpeech, NO_MIC_LISTEN_MS));
    };

    const startVad = () => {
      const buf = new Uint8Array(micAn!.fftSize);
      let armed = false, onset = 0, lastVoice = 0, noise = 0.012;
      const step = () => {
        micAn!.getByteTimeDomainData(buf);
        let sum = 0;
        for (let k = 0; k < buf.length; k++) { const v = (buf[k] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        const thresh = Math.min(0.2, Math.max(0.03, noise * 2.2 + 0.018));
        if (rms < thresh) noise = noise * 0.98 + rms * 0.02; // track the noise floor
        if (!armed) {
          if (rms > thresh) {
            if (!onset) onset = now;
            else if (now - onset > ONSET_MS) { armed = true; lastVoice = now; addLine('you', SCRIPT[round].ask); }
          } else { onset = 0; }
        } else {
          if (rms > thresh) lastVoice = now;
          else if (now - lastVoice > HANGOVER_MS) { stopRaf(); endOfSpeech(); return; }
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const endOfSpeech = () => {
      setTurn('thinking');
      activeAnalyser.current = null;
      timers.push(setTimeout(speak, 600));
    };

    const speak = () => {
      setTurn('speaking');
      addLine('ai', SCRIPT[round].say);
      const el = audio[round];
      if (el) {
        activeAnalyser.current = aiAn;
        try { el.currentTime = 0; } catch { /* not seekable yet */ }
        el.onended = afterSpeak;
        el.play().catch(() => { activeAnalyser.current = null; el.onended = null; timers.push(setTimeout(afterSpeak, NO_AUDIO_SPEAK_MS)); });
      } else {
        activeAnalyser.current = null;
        timers.push(setTimeout(afterSpeak, NO_AUDIO_SPEAK_MS));
      }
    };

    const afterSpeak = () => {
      round = (round + 1) % SCRIPT.length;
      activeAnalyser.current = null;
      setTurn('idle'); // brief guard so the AI's tail doesn't retrigger the mic
      timers.push(setTimeout(beginListening, GUARD_MS));
    };

    const start = async () => {
      if (ctx) return;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctx();
      await ctx.resume();
      // AI audio + analyser (one analyser, all clips routed through it)
      aiAn = ctx.createAnalyser(); aiAn.fftSize = 1024; aiAn.smoothingTimeConstant = 0.75;
      aiAn.connect(ctx.destination);
      audio = SCRIPT.map((_, i) => {
        const a = new Audio(`${BASE_PATH}/talk/vo/line-${i}.mp3`);
        a.preload = 'auto';
        try { ctx!.createMediaElementSource(a).connect(aiAn!); } catch { /* ignore */ }
        return a;
      });
      // Mic (analysis only — never routed to destination, so no feedback)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ms = ctx.createMediaStreamSource(stream);
        micAn = ctx.createAnalyser(); micAn.fftSize = 1024; micAn.smoothingTimeConstant = 0.5;
        ms.connect(micAn);
      } catch { micAn = null; }
      setStarted(true);
      beginListening();
    };
    startRef.current = start;

    return () => {
      stopRaf(); clearTimers();
      audio.forEach((a) => { a.onended = null; a.pause(); });
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
  }, []);

  const speaking = turn === 'speaking';
  const listening = turn === 'listening';
  const wfMode: 'idle' | 'you' | 'ai' = speaking ? 'ai' : listening ? 'you' : 'idle';

  return (
    <main style={{ position: 'fixed', inset: 0, background: LETTERBOX, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
          width: VW, height: VH, flexShrink: 0,
          transform: `scale(${fit})`, transformOrigin: 'center center',
          position: 'relative', overflow: 'hidden',
          background: `radial-gradient(110% 50% at 50% 4%, ${T.surface2} 0%, ${T.bg} 60%)`,
          color: T.ink, display: 'flex', flexDirection: 'column',
        }}
      >
        {/* ── Top bar ── */}
        <div style={{ flexShrink: 0, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Orb size={44} />
            <span style={{ fontSize: 31, fontWeight: 600, letterSpacing: '-0.01em', color: T.ink }}>Lucas&nbsp;AI</span>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 20, fontWeight: 600, color: T.accentInk, background: T.accentSoft, border: `1px solid ${T.accentLine}`, borderRadius: 100, padding: '10px 20px 10px 16px', letterSpacing: '-0.01em' }}>
            <span className="af-dot" style={{ width: 14, height: 14, borderRadius: 999, background: T.accent }} /> Live · 24/7
          </span>
        </div>

        {/* ── AI orb (top) + waveform ── */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '20px 0 12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {listening && <><span className="af-ring" /><span className="af-ring af-ring2" /></>}
            <Orb size={300} hero speaking={speaking} />
          </div>
          <Waveform analyserRef={activeAnalyser} mode={wfMode} />
        </div>

        {/* ── Transcript — sits right under the orb ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '8px 44px 0' }}>
          <Transcript lines={lines} thinking={turn === 'thinking'} />
        </div>

        {/* ── KPI strip (right above the floor) ── */}
        <div style={{ flexShrink: 0, display: 'flex', gap: 24, padding: '0 48px 16px' }}>
          <Kpi label="Sales today" value={Math.round(sales).toLocaleString()} sub="low-ticket offer" />
          <Kpi label="Calls booked" value={Math.round(calls).toLocaleString()} sub="high-tier program" accent />
        </div>

        {/* ── Agent floor ── */}
        <div style={{ flexShrink: 0, padding: '18px 44px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 16px' }}>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.04em', color: T.ink3, textTransform: 'uppercase' }}>AI Sales Floor</span>
            <span style={{ fontSize: 19, fontWeight: 500, color: T.ink4 }}>50 agents · live</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            {agents.map((a, idx) => {
              const isEvt = evt.id === idx;
              const isBest = idx === BEST;
              return (
                <div key={a.id} style={{
                    height: 130, borderRadius: 14, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16,
                    background: T.bg, border: `1px solid ${isBest ? T.accentLine : T.line}`, boxShadow: T.shadowSm,
                  }}>
                  <span className="af-pin" style={{ width: 14, height: 14, borderRadius: 999, background: T.accent, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 27, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                      AI Agent #{String(a.id).padStart(2, '0')}
                    </div>
                    <div style={{ height: 26, marginTop: 4 }}>
                      {isEvt ? (
                        <span key={evt.key} className="af-flash" style={{ fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', color: evt.kind === 'sale' ? T.accentInk : '#fff', background: evt.kind === 'sale' ? T.accentSoft : T.accent, border: evt.kind === 'sale' ? `1px solid ${T.accentLine}` : 'none', padding: '3px 12px', borderRadius: 100 }}>
                          {evt.kind === 'sale' ? 'Sale +1' : 'Call booked'}
                        </span>
                      ) : isBest ? (
                        <span style={{ fontSize: 16, fontWeight: 600, color: T.accentInk, letterSpacing: '0.01em' }}>★ Top closer</span>
                      ) : (
                        <span style={{ fontSize: 16, fontWeight: 400, color: T.ink3, fontStyle: 'italic' }}>Working a lead…</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 22, flexShrink: 0 }}>
                    <MiniStat n={a.sales} label="sales" />
                    <MiniStat n={a.calls} label="calls" accent />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tap-to-start overlay (gesture unlocks mic + audio) ── */}
        {!started && (
          <button
            onClick={() => startRef.current()}
            style={{ position: 'absolute', inset: 0, zIndex: 60, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, background: 'rgba(255,253,251,0.86)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: T.ink, fontFamily: 'inherit' }}
          >
            <Orb size={200} hero speaking={false} />
            <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', color: T.ink }}>Tap to start</div>
            <div style={{ fontSize: 22, fontWeight: 400, color: T.ink3, maxWidth: 620, textAlign: 'center', lineHeight: 1.4 }}>
              Then just talk — ask about today’s numbers out loud, and it answers when you pause.
            </div>
          </button>
        )}

        <style>{`
          @keyframes af-dot { 0%,100% { opacity: 0.55; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.12); } }
          .af-dot, .af-pin { animation: af-dot 1.5s ease-in-out infinite; }

          @keyframes af-orb { 0%,100% { box-shadow: 0 6px 16px rgba(22,164,108,0.22); } 50% { box-shadow: 0 8px 22px rgba(22,164,108,0.34); } }
          .af-orb { animation: af-orb 2.6s ease-in-out infinite; }

          @keyframes af-hero { 0%,100% { box-shadow: 0 24px 60px rgba(22,164,108,0.22), inset 0 10px 34px rgba(255,255,255,0.5); transform: scale(1); } 50% { box-shadow: 0 30px 80px rgba(22,164,108,0.30), inset 0 10px 34px rgba(255,255,255,0.5); transform: scale(1.01); } }
          .af-hero { animation: af-hero 3.6s ease-in-out infinite; }
          .af-hero-on { animation: af-hero 1.05s ease-in-out infinite; }

          @keyframes af-ring { 0% { transform: scale(1.46); opacity: 0; } 35% { opacity: 0.4; } 100% { transform: scale(1); opacity: 0; } }
          .af-ring { position: absolute; width: 300px; height: 300px; border-radius: 50%; border: 3px solid rgba(46,43,38,.30); animation: af-ring 1.9s ease-out infinite; }
          .af-ring2 { animation-delay: 0.95s; }

          @keyframes af-msg { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
          .af-cap { animation: af-cap 0.38s cubic-bezier(0.2,0.7,0.2,1); }
          @keyframes af-cap { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
          @keyframes af-typ { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
          .af-typd { animation: af-typ 0.9s ease-in-out infinite; }

          @keyframes af-flash { 0% { opacity: 0; transform: scale(0.9); } 18% { opacity: 1; transform: scale(1.04); } 100% { opacity: 1; transform: scale(1); } }
          .af-flash { display: inline-block; animation: af-flash 0.45s ease-out both; }
        `}</style>
      </div>
    </main>
  );
}

// ── Realistic waveform: reads a live AnalyserNode (mic or TTS) when present,
// else falls back to layered-sine synthetic motion. Bars are written straight to
// the DOM so the page doesn't re-render per frame. ──
function Waveform({ analyserRef, mode }: { analyserRef: MutableRefObject<AnalyserNode | null>; mode: 'idle' | 'you' | 'ai' }) {
  const N = 44;
  const bars = useRef<Array<HTMLSpanElement | null>>([]);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const params = useMemo(() => {
    const rnd = seeded(99);
    return Array.from({ length: N }, (_, i) => {
      const p = i / (N - 1);
      return {
        env: 0.30 + 0.70 * Math.pow(Math.sin(p * Math.PI), 0.8),
        phase: rnd() * Math.PI * 2,
        w1: 5 + rnd() * 4,
        w2: 11 + rnd() * 7,
        amp: 0.7 + rnd() * 0.5,
      };
    });
  }, []);

  useEffect(() => {
    let raf = 0;
    let t0: number | null = null;
    let level = 0.12;
    const smooth = new Float32Array(N);
    let freq = new Uint8Array(0);
    const clamp = (h: number) => (h < 0.05 ? 0.05 : h > 1 ? 1 : h);
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const t = (now - t0) / 1000;
      const an = analyserRef.current;
      const m = modeRef.current;
      if (an) {
        if (freq.length !== an.frequencyBinCount) freq = new Uint8Array(an.frequencyBinCount);
        an.getByteFrequencyData(freq);
        const maxBin = Math.min(96, an.frequencyBinCount - 3);
        for (let i = 0; i < N; i++) {
          const el = bars.current[i]; if (!el) continue;
          const bin = 2 + Math.floor((i / (N - 1)) * maxBin);
          const target = freq[bin] / 255;
          smooth[i] += (target - smooth[i]) * 0.35;
          el.style.transform = `scaleY(${clamp(0.06 + smooth[i] * (0.55 + 0.45 * params[i].env) * 1.15).toFixed(3)})`;
        }
      } else {
        const target = m === 'ai' ? 1 : m === 'you' ? 0.6 : 0.12;
        level += (target - level) * 0.08;
        const gain = m === 'idle' ? 1 : 0.4 + 0.6 * Math.abs(Math.sin(t * 2.3) * Math.sin(t * 0.85 + 1.3));
        for (let i = 0; i < N; i++) {
          const el = bars.current[i]; if (!el) continue;
          const pr = params[i];
          const osc = 0.55 * Math.sin(t * pr.w1 + pr.phase) + 0.45 * Math.sin(t * pr.w2 + pr.phase * 1.7);
          const h = clamp(0.06 + level * gain * pr.env * pr.amp * (osc * 0.5 + 0.5));
          smooth[i] = h;
          el.style.transform = `scaleY(${h.toFixed(3)})`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [params, analyserRef]);

  const color = mode === 'ai' ? T.accent : T.ink3;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 66 }}>
      {params.map((_, i) => (
        <span
          key={i}
          ref={(el) => { bars.current[i] = el; if (el && el.style.transform === '') el.style.transform = 'scaleY(0.08)'; }}
          style={{ width: 6, height: 66, borderRadius: 3, background: color, transformOrigin: 'center', transition: 'background 0.25s ease' }}
        />
      ))}
    </div>
  );
}

function Transcript({ lines, thinking }: { lines: Line[]; thinking: boolean }) {
  const visible = lines.slice(-3);
  return (
    <div style={{ width: 900, maxWidth: '90%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, transparent 0, #000 76px)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 76px)' }}>
      {visible.map((l, i) => {
        const depth = visible.length - 1 - i;
        const op = depth === 0 ? 1 : depth === 1 ? 0.5 : 0.26;
        const ai = l.who === 'ai';
        return (
          <div key={l.key} className="af-cap" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, opacity: op, transition: 'opacity 0.35s ease' }}>
            <SpeakerTag who={l.who} />
            <span style={{ fontSize: ai ? 29 : 25, fontWeight: ai ? 600 : 500, color: ai ? T.ink : T.ink2, lineHeight: 1.34 }}>{l.text}</span>
          </div>
        );
      })}
      {thinking && (
        <div key="thinking" className="af-cap" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SpeakerTag who="ai" />
          <span style={{ display: 'flex', gap: 9, paddingTop: 6 }}>
            {[0, 1, 2].map((d) => <span key={d} className="af-typd" style={{ width: 11, height: 11, borderRadius: 999, background: T.ink4, animationDelay: `${d * 0.16}s` }} />)}
          </span>
        </div>
      )}
    </div>
  );
}

function SpeakerTag({ who }: { who: 'you' | 'ai' }) {
  const ai = who === 'ai';
  return (
    <span style={{ flexShrink: 0, marginTop: 5, fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', borderRadius: 100, padding: '4px 13px',
      color: ai ? T.accentInk : T.ink3, background: ai ? T.accentSoft : T.surface, border: `1px solid ${ai ? T.accentLine : T.line2}` }}>
      {ai ? 'Lucas AI' : 'You'}
    </span>
  );
}

function Orb({ size, hero, speaking }: { size: number; hero?: boolean; speaking?: boolean }) {
  const cls = hero ? (speaking ? 'af-hero af-hero-on' : 'af-hero') : 'af-orb';
  return <span className={cls} style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'block', background: ORB_GRADIENT }} />;
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1, background: accent ? T.surface : T.surface2, border: `1px solid ${accent ? T.accentLine : T.line}`, borderRadius: 16, padding: '24px 32px', boxShadow: T.shadowSm }}>
      <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: accent ? T.accentInk : T.ink3 }}>{label}</div>
      <div style={{ fontSize: 90, fontWeight: 700, letterSpacing: '-0.03em', color: accent ? T.accentInk : T.ink, lineHeight: 1.0, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 18, fontWeight: 400, color: T.ink4, marginTop: 8 }}>{sub}</div>
    </div>
  );
}

function MiniStat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <span style={{ fontSize: 34, fontWeight: 700, color: accent ? T.accentInk : T.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{n}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: T.ink4, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{label}</span>
    </div>
  );
}
