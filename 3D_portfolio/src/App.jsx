import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useRef, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import RoomScene from './models/RoomScene';
import VTuberView from './components/VTuberView';
import * as THREE from 'three';

function CameraSetup() {
  const controlsRef = useRef();
  const { camera } = useThree();

  useEffect(() => {
    // Set camera position
    camera.position.set(3.2760149821796496, 9.248895475354395, 3.654510368125121);

    // Set orbit target
    if (controlsRef.current) {
      controlsRef.current.target.set(-2.305980016118677, 6.445352552440664, 0.23337845113867778);
      controlsRef.current.update();
    }
  }, [camera]);

  return <OrbitControls ref={controlsRef} />;
}

export default function App() {
  return (
    <Canvas
      camera={{ fov: 50 }}
      style={{ background: '#111' }}
      gl={{
        outputEncoding: THREE.sRGBEncoding,
        toneMapping: THREE.NoToneMapping,
      }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.0;
      }}
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 10]} intensity={2} />

      <Suspense fallback={null}>
        <RoomScene />
        <VTuberView />
      </Suspense>

      <CameraSetup />
    </Canvas>
  );
}
