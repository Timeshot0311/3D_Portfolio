// src/components/FreeCameraControls.jsx
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function FreeCameraControls() {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const keys = useRef({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      keys.current[e.code] = true;
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

  useFrame((_, delta) => {
    const speed = keys.current['ShiftLeft'] ? 15 : 5;
    direction.current.set(0, 0, 0);

    if (keys.current['KeyW']) direction.current.z -= 1;
    if (keys.current['KeyS']) direction.current.z += 1;
    if (keys.current['KeyA']) direction.current.x -= 1;
    if (keys.current['KeyD']) direction.current.x += 1;
    if (keys.current['Space']) direction.current.y += 1;
    if (keys.current['ControlLeft']) direction.current.y -= 1;

    direction.current.normalize();
    direction.current.multiplyScalar(speed * delta);

    camera.position.add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(direction.current.z));
    camera.position.add(new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(direction.current.x));
    camera.position.y += direction.current.y;
  });

  return <PointerLockControls />;
}
