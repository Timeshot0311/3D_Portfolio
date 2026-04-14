// src/components/CameraHUD.jsx
// Desktop camera HUD — rendered OUTSIDE <Canvas> in App.jsx as a normal DOM component.
// No createPortal needed here; position:fixed handles layering.
import { CAMERA_PRESETS } from './FreeCameraControls';

const kbdStyle = {
  background: '#1e293b', border: '1px solid #334155',
  borderRadius: 4, padding: '1px 6px', fontSize: 11,
  fontFamily: 'monospace', color: '#e2e8f0',
};
const btnBase = {
  border: 'none', cursor: 'pointer', borderRadius: 8,
  fontFamily: 'system-ui, sans-serif', fontWeight: 500,
};
const btnPrimary = {
  ...btnBase, flex: 1,
  background: '#3b82f6', color: '#fff',
  padding: '9px 16px', fontSize: 13,
};
const btnSecondary = {
  ...btnBase,
  background: 'rgba(255,255,255,0.08)', color: '#94a3b8',
  border: '1px solid rgba(255,255,255,0.12)',
  padding: '7px 14px', fontSize: 12,
};
const btnPreset = {
  ...btnBase,
  background: 'rgba(15,23,42,0.85)', color: '#e2e8f0',
  border: '1px solid rgba(255,255,255,0.15)',
  backdropFilter: 'blur(8px)',
  padding: '8px 16px', fontSize: 12,
};
const btnUnlock = {
  ...btnBase,
  background: 'rgba(59,130,246,0.15)', color: '#93c5fd',
  border: '1px solid rgba(59,130,246,0.3)',
  backdropFilter: 'blur(8px)',
  padding: '8px 16px', fontSize: 12,
};

// ─────────────────────────────────────────────────────────────────────────────
// Props:
//   mode        — 'preset' | 'confirming' | 'free'
//   setMode     — setter from App
//   plcLockRef  — ref set by FreeCameraControls; call .current() to lock pointer
// ─────────────────────────────────────────────────────────────────────────────
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
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000,
      }}>
        <div style={{
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 12, padding: '28px 32px', maxWidth: 380, width: '90vw',
          color: '#fff', fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            🔓 Enable Free Camera?
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
            This will lock your mouse cursor to the window for first-person exploration.
          </div>
          <div style={{
            background: '#1e293b', borderRadius: 8, padding: '12px 16px',
            marginBottom: 20, fontSize: 12, color: '#cbd5e1', lineHeight: 2,
          }}>
            <div><kbd style={kbdStyle}>W A S D</kbd> &nbsp;Move</div>
            <div><kbd style={kbdStyle}>Mouse</kbd> &nbsp;Look around</div>
            <div><kbd style={kbdStyle}>Space</kbd> / <kbd style={kbdStyle}>Ctrl</kbd> &nbsp;Up / Down</div>
            <div><kbd style={kbdStyle}>Shift</kbd> &nbsp;Sprint</div>
            <div><kbd style={kbdStyle}>Esc</kbd> &nbsp;Exit free camera</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setMode('preset')} style={btnSecondary}>Cancel</button>
            <button onClick={confirmFree}             style={btnPrimary}>Enter Free Camera</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Free camera banner + exit button ──
  if (mode === 'free') {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 9999, fontFamily: 'system-ui, sans-serif',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ color: '#64748b', fontSize: 11 }}>FREE CAMERA</span>
          {[
            ['W A S D', 'Move'], ['Mouse', 'Look'],
            ['Space / Ctrl', 'Up / Down'], ['Shift', 'Sprint'], ['Esc', 'Exit'],
          ].map(([key, label]) => (
            <span key={key} style={{ fontSize: 11, color: '#94a3b8' }}>
              <kbd style={kbdStyle}>{key}</kbd> {label}
            </span>
          ))}
        </div>
        <button onClick={() => setMode('preset')} style={btnSecondary}>
          ✕ Exit Free Camera
        </button>
      </div>
    );
  }

  // ── Default: preset navigation bar ──
  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 8, alignItems: 'center',
      zIndex: 9999, fontFamily: 'system-ui, sans-serif',
      flexWrap: 'wrap', justifyContent: 'center', maxWidth: '95vw',
    }}>
      {CAMERA_PRESETS.map((p, i) => (
        <button key={p.name} data-preset={i} style={btnPreset} title={`Go to: ${p.name}`}>
          {p.name}
        </button>
      ))}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
      <button onClick={() => setMode('confirming')} style={btnUnlock}>
        🔓 Free Camera
      </button>
    </div>
  );
}
