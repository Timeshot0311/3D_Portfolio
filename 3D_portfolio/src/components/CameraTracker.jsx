// src/components/CameraTracker.jsx
// Dev overlay — shows live camera position + look-at for tuning presets.
// Reads window.__camera (set by FreeCameraControls) every animation frame.
// Remove from App.jsx when done tuning.
import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const FONT = '"Cascadia Code","Fira Code",monospace';
const C = {
  bg:     'rgba(0,0,0,0.75)',
  border: 'rgba(124,58,237,0.6)',
  accent: '#a78bfa',
  green:  '#4ade80',
  muted:  '#9ca3af',
  text:   '#f3f4f6',
};

const _euler = new THREE.Euler();
const _dir   = new THREE.Vector3();

function fmt(n) { return n.toFixed(3); }
function fmtV(v) { return `${fmt(v.x)}, ${fmt(v.y)}, ${fmt(v.z)}`; }
function fmtVec(v) { return `new THREE.Vector3(${fmt(v.x)}, ${fmt(v.y)}, ${fmt(v.z)})`; }

export default function CameraTracker() {
  const [data, setData] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const cam = window.__camera;
      if (cam) {
        _euler.setFromQuaternion(cam.quaternion, 'YXZ');
        // Compute a lookAt point 1.5 units in front of camera
        _dir.set(0, 0, -1).applyQuaternion(cam.quaternion);
        const lookAt = cam.position.clone().addScaledVector(_dir, 1.5);

        setData({
          pos:    cam.position.clone(),
          lookAt,
          yaw:    THREE.MathUtils.radToDeg(_euler.y).toFixed(1),
          pitch:  THREE.MathUtils.radToDeg(_euler.x).toFixed(1),
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const copy = (text) => navigator.clipboard?.writeText(text).catch(() => {});

  const presetSnippet = data
    ? `{\n  name: 'Custom',\n  position: ${fmtVec(data.pos)},\n  lookAt:   ${fmtVec(data.lookAt)},\n},`
    : '';

  if (!data) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 12,
      right: 12,
      zIndex: 300,
      fontFamily: FONT,
      fontSize: 11,
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: '10px 14px',
      backdropFilter: 'blur(10px)',
      minWidth: 260,
      boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      pointerEvents: 'auto',
    }}>
      {/* Header */}
      <div style={{ color: C.accent, fontWeight: 700, marginBottom: 8, fontSize: 12 }}>
        📷 Camera Tracker
      </div>

      {/* Position */}
      <Row label="pos" value={fmtV(data.pos)} />
      <Row label="lookAt" value={fmtV(data.lookAt)} sub="(1.5 units ahead)" />
      <Row label="yaw"   value={`${data.yaw}°`} />
      <Row label="pitch" value={`${data.pitch}°`} />

      {/* Screen centers if available */}
      {window.__screenCenters && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid rgba(255,255,255,0.1)` }}>
          <div style={{ color: C.muted, fontSize: 10, marginBottom: 4 }}>screen centers</div>
          {Object.entries(window.__screenCenters).map(([k, v]) => (
            <Row key={k} label={k} value={Array.isArray(v) ? v.map(n => n.toFixed(3)).join(', ') : String(v)} />
          ))}
        </div>
      )}

      {/* Copy preset snippet */}
      <button
        onClick={() => copy(presetSnippet)}
        style={{
          marginTop: 10,
          width: '100%',
          padding: '5px 0',
          background: 'rgba(124,58,237,0.25)',
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          color: C.accent,
          fontSize: 11,
          fontFamily: FONT,
          cursor: 'pointer',
        }}
        title={presetSnippet}
      >
        📋 Copy preset snippet
      </button>

      <div style={{ color: C.muted, fontSize: 9, marginTop: 6, lineHeight: 1.5 }}>
        Navigate with Free Camera, position yourself<br />
        facing the target, then copy the snippet.
      </div>
    </div>
  );
}

function Row({ label, value, sub }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 3, alignItems: 'baseline' }}>
      <span style={{ color: '#6b7280', minWidth: 52, fontSize: 10 }}>{label}</span>
      <span style={{ color: '#f9fafb', flex: 1 }}>{value}</span>
      {sub && <span style={{ color: '#6b7280', fontSize: 9 }}>{sub}</span>}
    </div>
  );
}
