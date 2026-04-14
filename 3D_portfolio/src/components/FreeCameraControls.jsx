// src/components/FreeCameraControls.jsx
// Three.js / R3F logic only — NO DOM rendering.
// DOM HUD lives in CameraHUD.jsx, rendered outside <Canvas> in App.jsx.
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const SPAWN_POSITION = new THREE.Vector3(2.7, 4.05, 4.6);
export const SPAWN_LOOK_AT  = new THREE.Vector3(2.9, 3.55, 2.85);

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

if (typeof window !== 'undefined') window.__cameraPresets = CAMERA_PRESETS;

const _lookDir = new THREE.Matrix4();

export function quatFromLookAt(position, target) {
  _lookDir.lookAt(position, target, new THREE.Vector3(0, 1, 0));
  const q = new THREE.Quaternion();
  q.setFromRotationMatrix(_lookDir);
  return q;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props:
//   mode        — 'preset' | 'confirming' | 'free'  (owned by App)
//   setMode     — setter from App
//   plcLockRef  — ref whose .current will be set to () => plcRef.current.lock()
//                 so CameraHUD can trigger pointer lock without being in Canvas
// ─────────────────────────────────────────────────────────────────────────────
export default function FreeCameraControls({ mode, setMode, plcLockRef }) {
  const { camera } = useThree();
  const plcRef = useRef();

  const presetTarget = useRef(null);
  const lerpingRef   = useRef(false);

  const keys      = useRef({});
  const direction = useRef(new THREE.Vector3());

  // Expose camera globally for coordinate discovery
  useEffect(() => { window.__camera = camera; }, [camera]);

  // Expose pointer-lock trigger to CameraHUD (outside Canvas)
  useEffect(() => {
    if (plcLockRef) plcLockRef.current = () => plcRef.current?.lock?.();
  }, [plcLockRef]);

  // Spawn position + rotation order
  useEffect(() => {
    camera.rotation.order = 'YXZ';
    camera.position.copy(SPAWN_POSITION);
    camera.quaternion.copy(quatFromLookAt(SPAWN_POSITION, SPAWN_LOOK_AT));
  }, [camera]);

  // Unlock pointer when leaving free mode
  useEffect(() => {
    if (mode !== 'free') plcRef.current?.unlock?.();
  }, [mode]);

  // Preset button delegation — CameraHUD buttons carry data-preset attribute
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn) return;
      goToPreset(parseInt(btn.dataset.preset, 10));
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard
  useEffect(() => {
    const dn = (e) => { keys.current[e.code] = true; };
    const up = (e) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup',   up);
    };
  }, []);

  const goToPreset = (idx) => {
    const p = CAMERA_PRESETS[idx];
    if (!p) return;
    presetTarget.current = {
      position:   p.position.clone(),
      quaternion: quatFromLookAt(p.position, p.lookAt),
    };
    lerpingRef.current = true;
  };

  useFrame((_, delta) => {
    if (mode === 'free') {
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

  return mode === 'free' ? (
    <PointerLockControls ref={plcRef} onUnlock={() => setMode('preset')} />
  ) : null;
}
