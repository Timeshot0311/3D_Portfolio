// src/components/MobileControls.jsx
// Three.js / R3F logic only — NO DOM rendering.
// DOM overlay lives in MobileHUD.jsx, rendered outside <Canvas> in App.jsx.
import { useThree, useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { quatFromLookAt, CAMERA_PRESETS } from './FreeCameraControls';

export const IS_TOUCH = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// ── Shared module-level state — written by MobileHUD, read by useFrame ───────
export const move = { x: 0, y: 0 };
export const look = { dx: 0, dy: 0 };

// Preset-lerp state — written by MobileHUD.goToPreset, read by useFrame
export const mobilePreset = {
  target:  null,
  lerping: false,
  quat:    new THREE.Quaternion(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Props:
//   mode    — 'preset' | 'confirming' | 'free'
//   setMode — setter from App
// ─────────────────────────────────────────────────────────────────────────────
export default function MobileControls({ mode }) {
  const { camera } = useThree();

  useEffect(() => { camera.rotation.order = 'YXZ'; }, [camera]);

  const LOOK_SENS   = 0.003;
  const PITCH_LIMIT = Math.PI / 2 - 0.05;
  const MOVE_SPEED  = 5;

  useFrame((_, delta) => {
    if (!IS_TOUCH) return;

    // Preset lerp
    if (mobilePreset.lerping && mobilePreset.target) {
      const t = Math.min(delta * 5, 1);
      camera.position.lerp(mobilePreset.target, t);
      camera.quaternion.slerp(mobilePreset.quat, t);
      if (camera.position.distanceTo(mobilePreset.target) < 0.005) {
        camera.position.copy(mobilePreset.target);
        camera.quaternion.copy(mobilePreset.quat);
        mobilePreset.lerping = false;
      }
      return;
    }

    if (mode !== 'free') return;

    // Look
    if (look.dx !== 0 || look.dy !== 0) {
      camera.rotation.y -= look.dx * LOOK_SENS;
      camera.rotation.x -= look.dy * LOOK_SENS;
      camera.rotation.x  = THREE.MathUtils.clamp(camera.rotation.x, -PITCH_LIMIT, PITCH_LIMIT);
      look.dx = 0; look.dy = 0;
    }

    // Move
    if (move.x !== 0 || move.y !== 0) {
      const sp  = MOVE_SPEED * delta;
      const fwd = camera.getWorldDirection(new THREE.Vector3());
      const rgt = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      camera.position.addScaledVector(fwd, -move.y * sp);
      camera.position.addScaledVector(rgt,  move.x * sp);
    }
  });

  return null;
}
