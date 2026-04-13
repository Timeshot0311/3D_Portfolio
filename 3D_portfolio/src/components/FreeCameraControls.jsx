// src/components/FreeCameraControls.jsx
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA PRESETS
// Adjust these positions/rotations once you've explored the room.
// Press keys 1–4 to jump to a preset. The camera lerps smoothly.
// To find a good position: move to it in-game, then console.log(camera.position)
// ─────────────────────────────────────────────────────────────────────────────
export const CAMERA_PRESETS = [
  {
    name: 'Overview',
    position: new THREE.Vector3(0, 2, 5),
    // Euler in YXZ order (yaw, pitch, roll) — tweak to taste
    rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
  },
  {
    name: 'Desk',
    position: new THREE.Vector3(0, 1.2, 1.5),
    rotation: new THREE.Euler(-0.1, 0, 0, 'YXZ'),
  },
  {
    name: 'Small Monitor',
    position: new THREE.Vector3(-1.5, 1.4, 0.5),
    rotation: new THREE.Euler(-0.05, 0.4, 0, 'YXZ'),
  },
  {
    name: 'Large Monitor',
    position: new THREE.Vector3(1.2, 1.4, 0.5),
    rotation: new THREE.Euler(-0.05, -0.4, 0, 'YXZ'),
  },
];

// Shared ref so MobileControls can also trigger presets
export const activePOV = { index: null };

// ─────────────────────────────────────────────────────────────────────────────

const _targetPos = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();

export default function FreeCameraControls() {
  const { camera } = useThree();
  const direction = useRef(new THREE.Vector3());
  const keys = useRef({});
  const lerpingToPreset = useRef(false);
  const presetTarget = useRef(null);

  // Set initial YXZ euler order so manual rotation feels right
  useEffect(() => {
    camera.rotation.order = 'YXZ';
  }, [camera]);

  // ── Key listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.code] = true;

      // Number keys 1–4 → camera presets
      const presetIndex = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (presetIndex !== -1 && CAMERA_PRESETS[presetIndex]) {
        presetTarget.current = CAMERA_PRESETS[presetIndex];
        lerpingToPreset.current = true;
        activePOV.index = presetIndex;
      }
    };
    const handleKeyUp = (e) => {
      keys.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ── Per-frame update ────────────────────────────────────────────────────
  useFrame((_, delta) => {
    // ── Preset lerp (takes priority, cancels on any WASD input) ──
    if (lerpingToPreset.current && presetTarget.current) {
      const anyMove =
        keys.current['KeyW'] || keys.current['KeyS'] ||
        keys.current['KeyA'] || keys.current['KeyD'] ||
        keys.current['Space'] || keys.current['ControlLeft'];

      if (anyMove) {
        lerpingToPreset.current = false;
      } else {
        const t = Math.min(delta * 6, 1);
        camera.position.lerp(presetTarget.current.position, t);

        _targetQuat.setFromEuler(presetTarget.current.rotation);
        camera.quaternion.slerp(_targetQuat, t);

        // Stop once close enough
        if (camera.position.distanceTo(presetTarget.current.position) < 0.01) {
          camera.position.copy(presetTarget.current.position);
          camera.quaternion.copy(_targetQuat);
          lerpingToPreset.current = false;
        }
        return; // skip free movement while lerping
      }
    }

    // ── Free movement ─────────────────────────────────────────────────
    const speed = keys.current['ShiftLeft'] ? 15 : 5;
    direction.current.set(0, 0, 0);

    if (keys.current['KeyW']) direction.current.z += 1;
    if (keys.current['KeyS']) direction.current.z -= 1;
    if (keys.current['KeyA']) direction.current.x -= 1;
    if (keys.current['KeyD']) direction.current.x += 1;
    if (keys.current['Space']) direction.current.y += 1;
    if (keys.current['ControlLeft']) direction.current.y -= 1;

    direction.current.normalize();
    direction.current.multiplyScalar(speed * delta);

    camera.position.add(
      camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(direction.current.z)
    );
    camera.position.add(
      new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(direction.current.x)
    );
    camera.position.y += direction.current.y;
  });

  return <PointerLockControls />;
}
