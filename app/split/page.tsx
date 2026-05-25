'use client';

import { useState, useRef, useEffect } from 'react';

const DEMO_POINTS = [
  { label: 'Start', msgIndex: 0, desc: 'Welcome callout' },
  { label: 'Question', msgIndex: 2, desc: 'Single-select' },
  { label: 'Multi-select', msgIndex: 7, desc: 'Multi-chip picker' },
  { label: 'Callout', msgIndex: 5, desc: 'Social proof card' },
  { label: 'Fit Score', msgIndex: 8, desc: 'Progress ring' },
  { label: 'Near End', msgIndex: 19, desc: 'Multi-select Q13' },
  { label: 'Final', msgIndex: 20, desc: 'Results trigger' },
];

export default function SplitPage() {
  const [key, setKey] = useState(0);
  const [activePoint, setActivePoint] = useState(0);
  const [selectedPoint, setSelectedPoint] = useState(0);
  const [skipPaywallTimer, setSkipPaywallTimer] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel('quiz-split-sync');
    return () => { channelRef.current?.close(); };
  }, []);

  const jumpTo = (index: number) => {
    setActivePoint(index);
    setSelectedPoint(index);
    channelRef.current?.postMessage({
      type: 'jump',
      targetMsgIndex: DEMO_POINTS[index].msgIndex,
    });
  };

  const handleReset = () => {
    setKey(k => k + 1);
    setActivePoint(0);
    setSelectedPoint(0);
  };

  const roleSrc = (role: 'leader' | 'follower') =>
    `/?role=${role}${skipPaywallTimer ? '&skipPaywallTimer=1' : ''}`;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f4f4f5',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          flexShrink: 0,
          background: '#fff',
          borderBottom: '1px solid #e5e5e8',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#2E7D52',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#18181B' }}>
            Split View
          </span>
        </div>

        {/* Demo jump buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {DEMO_POINTS.map((point, i) => (
            <button
              key={point.label}
              onClick={() => jumpTo(i)}
              title={point.desc}
              style={{
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: 500,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                background: activePoint === i ? '#2E7D52' : 'transparent',
                color: activePoint === i ? '#fff' : '#71717a',
              }}
            >
              {point.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <select
            value={selectedPoint}
            onChange={(e) => setSelectedPoint(Number(e.target.value))}
            style={{
              fontSize: '12px',
              padding: '6px 8px',
              borderRadius: '8px',
              border: '1px solid #e5e5e8',
              background: '#fff',
              color: '#18181B',
            }}
            aria-label="Jump to step selector"
          >
            {DEMO_POINTS.map((point, i) => (
              <option key={point.label} value={i}>
                {point.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => jumpTo(selectedPoint)}
            style={{
              background: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Jump
          </button>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#52525b',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={skipPaywallTimer}
              onChange={(e) => {
                setSkipPaywallTimer(e.target.checked);
                setKey((k) => k + 1);
              }}
            />
            Skip 2m Paywall Timer
          </label>
        </div>

        <button
          onClick={handleReset}
          style={{
            background: '#2E7D52',
            color: '#fff',
            border: 'none',
            borderRadius: '9999px',
            padding: '6px 20px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Reset
        </button>
      </div>

      {/* Frames */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '40px',
          padding: '24px',
          overflow: 'hidden',
        }}
      >
        {/* Phone frame */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Phone — 390px
          </span>
          <div
            style={{
              width: '390px',
              height: 'calc(100vh - 140px)',
              maxHeight: '844px',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '2px solid #e5e5e8',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              background: '#fff',
            }}
          >
            <iframe
              key={`phone-${key}-${skipPaywallTimer ? 'skip' : 'normal'}`}
              src={roleSrc('leader')}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        </div>

        {/* Laptop frame */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '1280px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Laptop — 1280px
          </span>
          <div
            style={{
              width: '100%',
              maxWidth: '1280px',
              height: 'calc(100vh - 140px)',
              maxHeight: '800px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid #e5e5e8',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              background: '#fff',
            }}
          >
            <iframe
              key={`laptop-${key}-${skipPaywallTimer ? 'skip' : 'normal'}`}
              src={roleSrc('follower')}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
