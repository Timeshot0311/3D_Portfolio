// src/components/MobileHUD.jsx
// Mobile touch overlay — rendered OUTSIDE <Canvas> in App.jsx.
// Writes to module-level move/look/mobilePreset shared with MobileControls.jsx.
import { useEffect, useRef } from 'react';
import { IS_TOUCH, move, look, mobilePreset } from './MobileControls';
import { quatFromLookAt, CAMERA_PRESETS } from './FreeCameraControls';
import * as THREE from 'three';

const JOYSTICK_R  = 48;
const KNOB_R      = 20;

function mBtn(bg, color, border = 'none') {
  return {
    background: bg, color, border,
    borderRadius: 8, padding: '8px 16px', fontSize: 12,
    fontFamily: 'system-ui, sans-serif',
    cursor: 'pointer', backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };
}

const goToPreset = (idx) => {
  const p = CAMERA_PRESETS[idx];
  if (!p) return;
  mobilePreset.target  = p.position.clone();
  mobilePreset.quat    = quatFromLookAt(p.position, p.lookAt);
  mobilePreset.lerping = true;
};

// ─────────────────────────────────────────────────────────────────────────────
// Props:
//   mode    — 'preset' | 'confirming' | 'free'
//   setMode — setter from App
// ─────────────────────────────────────────────────────────────────────────────
export default function MobileHUD({ mode, setMode }) {
  const joystickBaseRef = useRef(null);
  const joystickKnobRef = useRef(null);

  // Touch handlers — only active in free mode
  useEffect(() => {
    if (!IS_TOUCH || mode !== 'free') return;

    let joystickId = null, joystickOrigin = { x: 0, y: 0 };
    let lookId = null, lastLook = { x: 0, y: 0 };

    const onStart = (e) => {
      for (const t of e.changedTouches) {
        const left = t.clientX < window.innerWidth / 2;
        if (left && joystickId === null) {
          joystickId = t.identifier;
          joystickOrigin = { x: t.clientX, y: t.clientY };
          if (joystickBaseRef.current) {
            joystickBaseRef.current.style.left    = `${t.clientX - JOYSTICK_R}px`;
            joystickBaseRef.current.style.top     = `${t.clientY - JOYSTICK_R}px`;
            joystickBaseRef.current.style.opacity = '0.75';
          }
        } else if (!left && lookId === null) {
          lookId = t.identifier;
          lastLook = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joystickId) {
          const dx    = t.clientX - joystickOrigin.x;
          const dy    = t.clientY - joystickOrigin.y;
          const dist  = Math.min(Math.hypot(dx, dy), JOYSTICK_R);
          const angle = Math.atan2(dy, dx);
          move.x = (dist / JOYSTICK_R) * Math.cos(angle);
          move.y = (dist / JOYSTICK_R) * Math.sin(angle);
          if (joystickKnobRef.current) {
            joystickKnobRef.current.style.transform =
              `translate(${move.x * JOYSTICK_R}px,${move.y * JOYSTICK_R}px)`;
          }
        } else if (t.identifier === lookId) {
          look.dx += t.clientX - lastLook.x;
          look.dy += t.clientY - lastLook.y;
          lastLook = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joystickId) {
          joystickId = null;
          move.x = 0; move.y = 0;
          if (joystickKnobRef.current)
            joystickKnobRef.current.style.transform = 'translate(0px,0px)';
          if (joystickBaseRef.current)
            joystickBaseRef.current.style.opacity = '0.35';
        } else if (t.identifier === lookId) {
          lookId = null;
        }
      }
    };

    window.addEventListener('touchstart',  onStart, { passive: true });
    window.addEventListener('touchmove',   onMove,  { passive: true });
    window.addEventListener('touchend',    onEnd,   { passive: true });
    window.addEventListener('touchcancel', onEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart',  onStart);
      window.removeEventListener('touchmove',   onMove);
      window.removeEventListener('touchend',    onEnd);
      window.removeEventListener('touchcancel', onEnd);
      move.x = 0; move.y = 0; look.dx = 0; look.dy = 0;
    };
  }, [mode]);

  if (!IS_TOUCH) return null;

  const exitFree = () => { setMode('preset'); move.x = 0; move.y = 0; };

  // ── Confirmation screen ──
  if (mode === 'confirming') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(4px)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 10001,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 12, padding: '24px', maxWidth: 320, width: '88vw', color: '#fff',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🔓 Free Camera?</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
            Left half of screen → joystick to move<br />
            Right half → drag to look around<br />
            Tap "Exit" to return to normal navigation.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode('preset')} style={mBtn('#1e293b', '#94a3b8')}>Cancel</button>
            <button onClick={() => setMode('free')}   style={mBtn('#3b82f6', '#fff')}>Enter</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Free camera overlay ──
  if (mode === 'free') {
    return (
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998 }}>
        {/* Joystick */}
        <div ref={joystickBaseRef} style={{
          position: 'absolute', bottom: 60, left: 40,
          width: JOYSTICK_R * 2, height: JOYSTICK_R * 2,
          borderRadius: '50%', opacity: 0.35, pointerEvents: 'none',
          background: 'rgba(255,255,255,0.12)',
          border: '2px solid rgba(255,255,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div ref={joystickKnobRef} style={{
            width: KNOB_R * 2, height: KNOB_R * 2, borderRadius: '50%',
            background: 'rgba(255,255,255,0.55)', pointerEvents: 'none',
          }} />
        </div>

        {/* Look hint */}
        <div style={{
          position: 'absolute', bottom: 60, right: 40,
          width: 88, height: 88, borderRadius: '50%',
          border: '2px dashed rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.4, pointerEvents: 'none',
        }}>
          <span style={{ color: '#fff', fontSize: 10, textAlign: 'center', lineHeight: 1.4 }}>
            drag<br />to look
          </span>
        </div>

        {/* Exit button */}
        <button
          onTouchStart={(e) => { e.stopPropagation(); exitFree(); }}
          style={{
            position: 'absolute', top: 16, right: 16,
            pointerEvents: 'all',
            background: 'rgba(239,68,68,0.2)', color: '#fca5a5',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 8, padding: '8px 14px', fontSize: 12,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          ✕ Exit Free Camera
        </button>
      </div>
    );
  }

  // ── Preset mode — navigation buttons ──
  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
      zIndex: 9999, maxWidth: '95vw',
    }}>
      {CAMERA_PRESETS.map((p, i) => (
        <button
          key={p.name}
          onTouchStart={(e) => { e.preventDefault(); goToPreset(i); }}
          style={mBtn('#0f172acc', '#e2e8f0', '1px solid rgba(255,255,255,0.15)')}
        >
          {p.name}
        </button>
      ))}
      <button
        onTouchStart={(e) => { e.preventDefault(); setMode('confirming'); }}
        style={mBtn('rgba(59,130,246,0.15)', '#93c5fd', '1px solid rgba(59,130,246,0.3)')}
      >
        🔓 Free Camera
      </button>
    </div>
  );
}
