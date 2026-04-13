// src/components/MobileControls.jsx
//
// Touch controls for mobile:
//   Left half  → virtual joystick  (move forward/back/strafe)
//   Right half → drag to look      (camera yaw + pitch)
//   Buttons 1–4 along the top → camera presets
//
// This component lives inside the R3F <Canvas> so it can use useThree/useFrame,
// but renders its UI into document.body via React.createPortal.

import { createPortal } from 'react-dom';
import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CAMERA_PRESETS } from './FreeCameraControls';

// ── Detect touch device (evaluated once at module load) ────────────────────
const IS_TOUCH = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// ── Constants ──────────────────────────────────────────────────────────────
const JOYSTICK_RADIUS   = 48;   // px — outer ring
const KNOB_RADIUS       = 20;   // px — inner knob
const MOVE_SPEED        = 5;
const LOOK_SENSITIVITY  = 0.003;
const PITCH_LIMIT       = Math.PI / 2 - 0.05;

// ── Shared movement state (written by DOM touch handlers, read by useFrame) ─
const moveState = { x: 0, y: 0 };   // normalized -1..1
const lookDelta = { dx: 0, dy: 0 }; // accumulated since last frame

// ─────────────────────────────────────────────────────────────────────────────
// Inner component — always rendered, but only does work on touch devices
// ─────────────────────────────────────────────────────────────────────────────
function MobileControlsInner() {
  const { camera } = useThree();

  // Refs for joystick DOM elements
  const joystickBaseRef = useRef(null);
  const joystickKnobRef = useRef(null);

  // Lerp targets for camera preset navigation
  const presetTarget = useRef(null);
  const lerpingRef   = useRef(false);
  const _targetQuat  = useRef(new THREE.Quaternion());

  // ── Set camera rotation order once ─────────────────────────────────────
  useEffect(() => {
    camera.rotation.order = 'YXZ';
  }, [camera]);

  // ── Touch handlers ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!IS_TOUCH) return;

    let joystickTouchId  = null;
    let joystickOrigin   = { x: 0, y: 0 };
    let lookTouchId      = null;
    let lastLookPos      = { x: 0, y: 0 };

    const onTouchStart = (e) => {
      for (const touch of e.changedTouches) {
        const isLeftHalf = touch.clientX < window.innerWidth / 2;

        if (isLeftHalf && joystickTouchId === null) {
          joystickTouchId = touch.identifier;
          joystickOrigin  = { x: touch.clientX, y: touch.clientY };
          // Snap joystick base to touch position
          if (joystickBaseRef.current) {
            joystickBaseRef.current.style.left = `${touch.clientX - JOYSTICK_RADIUS}px`;
            joystickBaseRef.current.style.top  = `${touch.clientY - JOYSTICK_RADIUS}px`;
            joystickBaseRef.current.style.opacity = '0.7';
          }
        } else if (!isLeftHalf && lookTouchId === null) {
          lookTouchId  = touch.identifier;
          lastLookPos  = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const onTouchMove = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === joystickTouchId) {
          const dx = touch.clientX - joystickOrigin.x;
          const dy = touch.clientY - joystickOrigin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const clamped = Math.min(dist, JOYSTICK_RADIUS);
          const angle   = Math.atan2(dy, dx);
          const nx = (clamped / JOYSTICK_RADIUS) * Math.cos(angle);
          const ny = (clamped / JOYSTICK_RADIUS) * Math.sin(angle);
          moveState.x = nx;
          moveState.y = ny;
          // Move knob visually
          if (joystickKnobRef.current) {
            joystickKnobRef.current.style.transform =
              `translate(${nx * JOYSTICK_RADIUS}px, ${ny * JOYSTICK_RADIUS}px)`;
          }
        } else if (touch.identifier === lookTouchId) {
          lookDelta.dx += touch.clientX - lastLookPos.x;
          lookDelta.dy += touch.clientY - lastLookPos.y;
          lastLookPos = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const onTouchEnd = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === joystickTouchId) {
          joystickTouchId = null;
          moveState.x = 0;
          moveState.y = 0;
          if (joystickKnobRef.current) {
            joystickKnobRef.current.style.transform = 'translate(0px, 0px)';
          }
          if (joystickBaseRef.current) {
            joystickBaseRef.current.style.opacity = '0.35';
          }
        } else if (touch.identifier === lookTouchId) {
          lookTouchId = null;
        }
      }
    };

    window.addEventListener('touchstart',  onTouchStart, { passive: true });
    window.addEventListener('touchmove',   onTouchMove,  { passive: true });
    window.addEventListener('touchend',    onTouchEnd,   { passive: true });
    window.addEventListener('touchcancel', onTouchEnd,   { passive: true });

    return () => {
      window.removeEventListener('touchstart',  onTouchStart);
      window.removeEventListener('touchmove',   onTouchMove);
      window.removeEventListener('touchend',    onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  // ── Per-frame camera update ───────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!IS_TOUCH) return;

    // ── Preset lerp ──
    if (lerpingRef.current && presetTarget.current) {
      const t = Math.min(delta * 6, 1);
      camera.position.lerp(presetTarget.current.position, t);
      camera.quaternion.slerp(_targetQuat.current, t);
      if (camera.position.distanceTo(presetTarget.current.position) < 0.01) {
        camera.position.copy(presetTarget.current.position);
        camera.quaternion.copy(_targetQuat.current);
        lerpingRef.current = false;
      }
      return;
    }

    // ── Look (right-half drag) ──
    if (lookDelta.dx !== 0 || lookDelta.dy !== 0) {
      camera.rotation.y -= lookDelta.dx * LOOK_SENSITIVITY;
      camera.rotation.x -= lookDelta.dy * LOOK_SENSITIVITY;
      camera.rotation.x  = THREE.MathUtils.clamp(camera.rotation.x, -PITCH_LIMIT, PITCH_LIMIT);
      lookDelta.dx = 0;
      lookDelta.dy = 0;
    }

    // ── Move (joystick) ──
    if (moveState.x !== 0 || moveState.y !== 0) {
      const speed = MOVE_SPEED * delta;
      // y on joystick = forward/back (-y = up on screen = forward)
      const fwd   = camera.getWorldDirection(new THREE.Vector3());
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      camera.position.addScaledVector(fwd,  -moveState.y * speed);
      camera.position.addScaledVector(right,  moveState.x * speed);
    }
  });

  // ── Don't render UI on desktop ────────────────────────────────────────────
  if (!IS_TOUCH) return null;

  // ── Preset button handler ─────────────────────────────────────────────────
  const goToPreset = (index) => {
    const p = CAMERA_PRESETS[index];
    if (!p) return;
    presetTarget.current = p;
    _targetQuat.current.setFromEuler(p.rotation);
    lerpingRef.current = true;
  };

  // ── DOM overlay (portal into body) ──────────────────────────────────────
  const ui = (
    <div style={{
      position: 'fixed', inset: 0,
      pointerEvents: 'none',
      zIndex: 9998,
      userSelect: 'none',
    }}>
      {/* ── Joystick (bottom-left) ── */}
      <div
        ref={joystickBaseRef}
        style={{
          position: 'absolute',
          bottom: 40, left: 40,
          width:  JOYSTICK_RADIUS * 2,
          height: JOYSTICK_RADIUS * 2,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          border: '2px solid rgba(255,255,255,0.35)',
          opacity: 0.35,
          pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'opacity 0.2s',
        }}
      >
        <div
          ref={joystickKnobRef}
          style={{
            width:  KNOB_RADIUS * 2,
            height: KNOB_RADIUS * 2,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            transition: 'transform 0.05s',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── Look hint (bottom-right) ── */}
      <div style={{
        position: 'absolute',
        bottom: 40, right: 40,
        width: 88, height: 88,
        borderRadius: '50%',
        border: '2px dashed rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        opacity: 0.4,
      }}>
        <span style={{ color: '#fff', fontSize: 11, textAlign: 'center', lineHeight: 1.3 }}>
          drag<br/>to look
        </span>
      </div>

      {/* ── Camera preset buttons (top bar) ── */}
      <div style={{
        position: 'absolute',
        top: 16, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: 8,
        pointerEvents: 'all',
      }}>
        {CAMERA_PRESETS.map((p, i) => (
          <button
            key={i}
            onTouchStart={(e) => { e.stopPropagation(); goToPreset(i); }}
            style={{
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public export — wraps inner component, no-ops entirely on desktop
// ─────────────────────────────────────────────────────────────────────────────
export default function MobileControls() {
  return <MobileControlsInner />;
}
