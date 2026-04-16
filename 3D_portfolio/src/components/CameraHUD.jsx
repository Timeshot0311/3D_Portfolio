// src/components/CameraHUD.jsx
// Desktop camera HUD — rendered OUTSIDE <Canvas> in App.jsx as a normal DOM component.
import { CAMERA_PRESETS } from './FreeCameraControls';

// ── Colour tokens ───────────────────────────────────────────────────────────
const C = {
  cyan:    '#00d4ff',
  pink:    '#ff00aa',
  purple:  '#9b00ff',
  dark:    'rgba(5,10,16,0.92)',
  surface: 'rgba(0,20,40,0.88)',
  border:  'rgba(0,212,255,0.28)',
  borderHi:'rgba(0,212,255,0.72)',
  text:    '#c8f0ff',
  muted:   'rgba(0,212,255,0.5)',
  glow:    '0 0 10px rgba(0,212,255,0.55), 0 0 24px rgba(0,212,255,0.2)',
};

const FONT = "'Courier New', 'Cascadia Code', monospace";

// ── Custom SVG icons ────────────────────────────────────────────────────────
const Icon = {
  Overview: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <ellipse cx="12" cy="12" rx="10" ry="6" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <line x1="2" y1="12" x2="5"  y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  ),
  Desk: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="13" rx="1" />
      <line x1="8"  y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="6"  y1="9"  x2="10" y2="9" />
      <line x1="6"  y1="12" x2="14" y2="12" />
    </svg>
  ),
  LeftMonitor: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="13" rx="1" />
      <line x1="12" y1="21" x2="12" y2="21" />
      <line x1="8"  y1="17" x2="16" y2="17" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="10,8 6,10.5 10,13" />
      <line x1="6" y1="10.5" x2="16" y2="10.5" />
    </svg>
  ),
  RightMonitor: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="13" rx="1" />
      <line x1="8"  y1="17" x2="16" y2="17" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="14,8 18,10.5 14,13" />
      <line x1="8" y1="10.5" x2="18" y2="10.5" />
    </svg>
  ),
  FreeCam: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2"  x2="12" y2="6"  />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2"  y1="12" x2="6"  y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="8" strokeDasharray="4 3" />
    </svg>
  ),
};

const PRESET_ICONS = [Icon.Overview, Icon.Desk, Icon.LeftMonitor, Icon.RightMonitor];

// ── Shared styles ────────────────────────────────────────────────────────────
const base = {
  fontFamily: FONT,
  cursor: 'pointer',
  border: 'none',
  outline: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  transition: 'all 0.18s ease',
};

function PresetBtn({ preset, idx }) {
  const Ico = PRESET_ICONS[idx] ?? Icon.Overview;
  return (
    <button
      data-preset={idx}
      title={`Go to: ${preset.name}`}
      style={{
        ...base,
        padding: '8px 14px',
        background: C.surface,
        color: C.text,
        border: `1px solid ${C.border}`,
        backdropFilter: 'blur(10px)',
        fontSize: 11,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.borderHi;
        e.currentTarget.style.color       = C.cyan;
        e.currentTarget.style.boxShadow   = C.glow;
        e.currentTarget.style.background  = 'rgba(0,60,100,0.72)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.color       = C.text;
        e.currentTarget.style.boxShadow   = 'none';
        e.currentTarget.style.background  = C.surface;
      }}
    >
      <Ico />
      {preset.name}
    </button>
  );
}

function FreeCamBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...base,
        padding: '8px 16px',
        background: 'rgba(155,0,255,0.12)',
        color: '#cc88ff',
        border: `1px solid rgba(155,0,255,0.38)`,
        backdropFilter: 'blur(10px)',
        fontSize: 11,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        clipPath: 'polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background   = 'rgba(155,0,255,0.28)';
        e.currentTarget.style.color        = '#e0aaff';
        e.currentTarget.style.borderColor  = 'rgba(155,0,255,0.7)';
        e.currentTarget.style.boxShadow    = '0 0 10px rgba(155,0,255,0.5), 0 0 24px rgba(155,0,255,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background   = 'rgba(155,0,255,0.12)';
        e.currentTarget.style.color        = '#cc88ff';
        e.currentTarget.style.borderColor  = 'rgba(155,0,255,0.38)';
        e.currentTarget.style.boxShadow    = 'none';
      }}
    >
      <Icon.FreeCam />
      FREE CAM
    </button>
  );
}

const kbdStyle = {
  background: 'rgba(0,212,255,0.08)',
  border: '1px solid rgba(0,212,255,0.25)',
  borderRadius: 3, padding: '2px 7px',
  fontSize: 11, fontFamily: FONT,
  color: C.cyan, letterSpacing: '0.05em',
};

// ── Main component ───────────────────────────────────────────────────────────
export default function CameraHUD({ mode, setMode, plcLockRef }) {
  const confirmFree = () => {
    setMode('free');
    setTimeout(() => plcLockRef.current?.(), 150);
  };

  // ── Confirmation overlay ──
  if (mode === 'confirming') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, fontFamily: FONT,
      }}>
        <div style={{
          background: C.dark,
          border: `1px solid ${C.border}`,
          boxShadow: C.glow,
          borderRadius: 0,
          padding: '32px 36px',
          maxWidth: 400, width: '90vw',
          color: C.text,
          position: 'relative',
        }}>
          {/* Corner accents */}
          {[
            { top: -1,  left: -1,  borderWidth: '2px 0 0 2px' },
            { top: -1,  right: -1, borderWidth: '2px 2px 0 0' },
            { bottom: -1, left: -1,  borderWidth: '0 0 2px 2px' },
            { bottom: -1, right: -1, borderWidth: '0 2px 2px 0' },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'absolute', width: 16, height: 16,
              borderColor: C.cyan, borderStyle: 'solid', ...s,
            }} />
          ))}

          <div style={{ fontSize: 13, letterSpacing: '0.25em', color: C.cyan, marginBottom: 6, textTransform: 'uppercase' }}>
            // FREE CAMERA
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#fff', letterSpacing: '0.05em' }}>
            Enable first-person mode?
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7, marginBottom: 20, letterSpacing: '0.05em' }}>
            Mouse cursor will be locked for FPS navigation.
          </div>

          <div style={{
            background: 'rgba(0,212,255,0.04)',
            border: `1px solid ${C.border}`,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 11, color: C.text, lineHeight: 2.1,
          }}>
            {[
              ['W A S D', 'Move'],
              ['Mouse', 'Look'],
              ['Space / Ctrl', 'Up / Down'],
              ['Shift', 'Sprint'],
              ['Esc', 'Exit'],
            ].map(([key, label]) => (
              <div key={key}><kbd style={kbdStyle}>{key}</kbd>&nbsp;&nbsp;{label}</div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setMode('preset')}
              style={{
                ...base, padding: '9px 20px',
                background: 'transparent', color: C.muted,
                border: `1px solid ${C.border}`, fontSize: 11,
                letterSpacing: '0.15em', textTransform: 'uppercase',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.color = C.cyan; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border;   e.currentTarget.style.color = C.muted; }}
            >
              CANCEL
            </button>
            <button
              onClick={confirmFree}
              style={{
                ...base, flex: 1, justifyContent: 'center', padding: '9px 20px',
                background: 'rgba(0,212,255,0.1)', color: C.cyan,
                border: `1px solid ${C.borderHi}`, fontSize: 11,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                boxShadow: C.glow,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.22)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)';  }}
            >
              <Icon.FreeCam />
              CONFIRM
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Free camera banner ──
  if (mode === 'free') {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.dark, backdropFilter: 'blur(10px)',
        borderTop: `1px solid ${C.border}`,
        padding: '8px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 9999, fontFamily: FONT, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <span style={{ color: C.pink, fontSize: 10, letterSpacing: '0.3em' }}>◈ FREE CAM</span>
          {[
            ['W A S D', 'Move'], ['Mouse', 'Look'],
            ['Space / Ctrl', 'Up / Down'], ['Shift', 'Sprint'], ['Esc', 'Exit'],
          ].map(([key, label]) => (
            <span key={key} style={{ fontSize: 11, color: C.muted, letterSpacing: '0.05em' }}>
              <kbd style={kbdStyle}>{key}</kbd>&nbsp;{label}
            </span>
          ))}
        </div>
        <button
          onClick={() => setMode('preset')}
          style={{
            ...base, padding: '7px 16px',
            background: 'transparent', color: C.muted,
            border: `1px solid ${C.border}`, fontSize: 10,
            letterSpacing: '0.2em', textTransform: 'uppercase',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.color = C.cyan; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border;   e.currentTarget.style.color = C.muted; }}
        >
          ✕ EXIT
        </button>
      </div>
    );
  }

  // ── Preset navigation bar ──
  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6, alignItems: 'center',
      zIndex: 9999, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '95vw',
    }}>
      {CAMERA_PRESETS.map((p, i) => <PresetBtn key={p.name} preset={p} idx={i} />)}
      <div style={{ width: 1, height: 28, background: C.border, margin: '0 4px' }} />
      <FreeCamBtn onClick={() => setMode('confirming')} />
    </div>
  );
}
