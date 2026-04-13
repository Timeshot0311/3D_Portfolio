// src/components/FreeCameraControls.jsx
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// SPAWN POINT — camera starts here when the site loads.
//
// Room world bounds (from GLB): X 1.67–3.76  Y 3.19–4.19  Z 2.68–4.89
// Monitors sit at Z ≈ 2.82.  Bed is at the far / high-Z end.
//
// POSITION: above-bed area, slightly elevated.
// LOOK_AT:  toward the monitor cluster.
//
// To adjust: move in-game, then open browser console and type:
//   window.__camera.position  → copy those values here
// ─────────────────────────────────────────────────────────────────────────────
const SPAWN_POSITION = new THREE.Vector3(2.7, 4.05, 4.6);
const SPAWN_LOOK_AT  = new THREE.Vector3(2.9, 3.55, 2.85);

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA PRESETS — the buttons users click.
// Adjust positions once you've explored the room.
// ─────────────────────────────────────────────────────────────────────────────
export const CAMERA_PRESETS = [
  {
    name: 'Overview',
    position: new THREE.Vector3(2.7, 4.05, 4.6),
    lookAt:   new THREE.Vector3(2.9, 3.55, 2.85),
  },
  {
    name: 'Desk',
    position: new THREE.Vector3(2.7, 3.75, 3.3),
    lookAt:   new THREE.Vector3(2.9, 3.55, 2.85),
  },
  {
    name: 'Left Monitor',
    position: new THREE.Vector3(2.1, 3.65, 3.0),
    lookAt:   new THREE.Vector3(2.4, 3.55, 2.82),
  },
  {
    name: 'Right Monitor',
    position: new THREE.Vector3(3.3, 3.65, 3.0),
    lookAt:   new THREE.Vector3(3.1, 3.55, 2.82),
  },
];

// Expose camera globally so users can find spawn coords in the console
if (typeof window !== 'undefined') window.__cameraPresets = CAMERA_PRESETS;

// ─────────────────────────────────────────────────────────────────────────────

const _targetPos  = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _lookDir    = new THREE.Matrix4();

function quatFromLookAt(position, target) {
  _lookDir.lookAt(position, target, new THREE.Vector3(0, 1, 0));
  const q = new THREE.Quaternion();
  q.setFromRotationMatrix(_lookDir);
  return q;
}

// ─────────────────────────────────────────────────────────────────────────────
// HUD — rendered via portal into document.body
// ─────────────────────────────────────────────────────────────────────────────
function CameraHUD({ mode, onRequestFree, onConfirmFree, onCancelFree, onExitFree }) {
  // ── Confirmation overlay ──
  if (mode === 'confirming') {
    return createPortal(
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000,
      }}>
        <div style={{
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 12,
          padding: '28px 32px',
          maxWidth: 380,
          width: '90vw',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
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
            <button onClick={onCancelFree} style={btnSecondary}>Cancel</button>
            <button onClick={onConfirmFree} style={btnPrimary}>Enter Free Camera</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Free camera mode — persistent tutorial banner + exit button ──
  if (mode === 'free') {
    return createPortal(
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 9999, fontFamily: 'system-ui, sans-serif',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ color: '#64748b', fontSize: 11 }}>FREE CAMERA</span>
          {[
            ['W A S D', 'Move'],
            ['Mouse', 'Look'],
            ['Space / Ctrl', 'Up / Down'],
            ['Shift', 'Sprint'],
            ['Esc', 'Exit'],
          ].map(([key, label]) => (
            <span key={key} style={{ fontSize: 11, color: '#94a3b8' }}>
              <kbd style={kbdStyle}>{key}</kbd> {label}
            </span>
          ))}
        </div>
        <button onClick={onExitFree} style={btnSecondary}>
          ✕ Exit Free Camera
        </button>
      </div>,
      document.body
    );
  }

  // ── Default preset mode — navigation buttons ──
  return createPortal(
    <div style={{
      position: 'fixed', bottom: 20, left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', gap: 8, alignItems: 'center',
      zIndex: 9999, fontFamily: 'system-ui, sans-serif',
      flexWrap: 'wrap', justifyContent: 'center',
      maxWidth: '95vw',
    }}>
      {/* Preset buttons */}
      {CAMERA_PRESETS.map((p, i) => (
        <button
          key={p.name}
          data-preset={i}
          style={{
            ...btnPreset,
            // Active state via dataset (set in useFrame below)
          }}
          title={`Go to: ${p.name}`}
        >
          {p.name}
        </button>
      ))}

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />

      {/* Free camera unlock */}
      <button onClick={onRequestFree} style={btnUnlock}>
        🔓 Free Camera
      </button>
    </div>,
    document.body
  );
}

// ── Inline styles ──────────────────────────────────────────────────────────
const kbdStyle = {
  background: '#1e293b', border: '1px solid #334155',
  borderRadius: 4, padding: '1px 6px', fontSize: 11,
  fontFamily: 'monospace', color: '#e2e8f0',
};
const btnBase = {
  border: 'none', cursor: 'pointer', borderRadius: 8,
  fontFamily: 'system-ui, sans-serif', fontWeight: 500,
  transition: 'all 0.15s',
};
const btnPrimary = {
  ...btnBase, flex: 1,
  background: '#3b82f6', color: '#fff',
  padding: '9px 16px', fontSize: 13,
};
const btnSecondary = {
  ...btnBase,
  background: 'rgba(255,255,255,0.08)',
  color: '#94a3b8',
  border: '1px solid rgba(255,255,255,0.12)',
  padding: '7px 14px', fontSize: 12,
};
const btnPreset = {
  ...btnBase,
  background: 'rgba(15,23,42,0.85)',
  color: '#e2e8f0',
  border: '1px solid rgba(255,255,255,0.15)',
  backdropFilter: 'blur(8px)',
  padding: '8px 16px', fontSize: 12,
};
const btnUnlock = {
  ...btnBase,
  background: 'rgba(59,130,246,0.15)',
  color: '#93c5fd',
  border: '1px solid rgba(59,130,246,0.3)',
  backdropFilter: 'blur(8px)',
  padding: '8px 16px', fontSize: 12,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function FreeCameraControls() {
  const { camera } = useThree();
  const [mode, setMode] = useState('preset'); // 'preset' | 'confirming' | 'free'
  const plcRef = useRef();

  const presetTarget = useRef(null);  // { position, quaternion }
  const lerpingRef   = useRef(false);
  const activePreset = useRef(0);

  const keys = useRef({});
  const direction = useRef(new THREE.Vector3());

  // ── Expose camera globally for coordinate discovery ─────────────────────
  useEffect(() => {
    window.__camera = camera;
  }, [camera]);

  // ── Set spawn point and rotation order ──────────────────────────────────
  useEffect(() => {
    camera.rotation.order = 'YXZ';
    camera.position.copy(SPAWN_POSITION);
    camera.quaternion.copy(quatFromLookAt(SPAWN_POSITION, SPAWN_LOOK_AT));
  }, [camera]);

  // ── Wire preset buttons (event delegation on the HUD) ───────────────────
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.preset, 10);
      goToPreset(idx);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const dn = (e) => {
      keys.current[e.code] = true;
      if (e.code === 'Escape' && mode === 'free') {
        exitFree();
      }
    };
    const up = (e) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
    };
  }, [mode]);

  // ── Mode transitions ──────────────────────────────────────────────────────
  const goToPreset = (idx) => {
    const p = CAMERA_PRESETS[idx];
    if (!p) return;
    presetTarget.current = {
      position:   p.position.clone(),
      quaternion: quatFromLookAt(p.position, p.lookAt),
    };
    lerpingRef.current = true;
    activePreset.current = idx;
  };

  const requestFree  = () => setMode('confirming');
  const cancelFree   = () => setMode('preset');

  const confirmFree  = () => {
    setMode('free');
    // Small delay so the confirm button click doesn't interfere with pointer lock
    setTimeout(() => plcRef.current?.lock?.(), 150);
  };

  const exitFree = () => {
    plcRef.current?.unlock?.();
    setMode('preset');
  };

  // ── Per-frame ─────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (mode === 'free') {
      // ── Free camera WASD ──
      const speed = keys.current['ShiftLeft'] ? 15 : 5;
      direction.current.set(0, 0, 0);
      if (keys.current['KeyW']) direction.current.z += 1;
      if (keys.current['KeyS']) direction.current.z -= 1;
      if (keys.current['KeyA']) direction.current.x -= 1;
      if (keys.current['KeyD']) direction.current.x += 1;
      if (keys.current['Space'])       direction.current.y += 1;
      if (keys.current['ControlLeft']) direction.current.y -= 1;
      direction.current.normalize().multiplyScalar(speed * delta);
      camera.position.add(
        camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(direction.current.z)
      );
      camera.position.add(
        new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(direction.current.x)
      );
      camera.position.y += direction.current.y;
      return;
    }

    // ── Preset lerp (preset mode) ──
    if (lerpingRef.current && presetTarget.current) {
      const t = Math.min(delta * 5, 1);
      camera.position.lerp(presetTarget.current.position, t);
      camera.quaternion.slerp(presetTarget.current.quaternion, t);
      if (camera.position.distanceTo(presetTarget.current.position) < 0.005) {
        camera.position.copy(presetTarget.current.position);
        camera.quaternion.copy(presetTarget.current.quaternion);
        lerpingRef.current = false;
      }
    }
  });

  return (
    <>
      {mode === 'free' && (
        <PointerLockControls
          ref={plcRef}
          onUnlock={exitFree}
        />
      )}
      <CameraHUD
        mode={mode}
        onRequestFree={requestFree}
        onConfirmFree={confirmFree}
        onCancelFree={cancelFree}
        onExitFree={exitFree}
      />
    </>
  );
}
