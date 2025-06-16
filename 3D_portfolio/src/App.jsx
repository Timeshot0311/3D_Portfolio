import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { useProgress, useGLTF } from '@react-three/drei';
import RoomScene from './models/RoomScene';
import VTuberView from './components/VTuberView';
import * as THREE from 'three';
import BackgroundMusic from './components/BackgroundMusic';
import Loader from './components/Loader';
import FreeCameraControls from './components/FreeCameraControls';


useGLTF.preload('/models/VTuber2.vrm');

export default function App() {
  const { progress } = useProgress();
  const [showLoader, setShowLoader] = useState(true);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [playMusic, setPlayMusic] = useState(false);

  const handleEnter = () => {
    const loaderEl = document.getElementById('loading-overlay');
    if (loaderEl) loaderEl.classList.add('fade-out');

    setTimeout(() => {
      setShowLoader(false);
      setSceneVisible(true);
      setPlayMusic(true);
    }, 700);
  };

  return (
    <>
      {showLoader && (
        <Loader progress={progress} onEnter={handleEnter} />
      )}

      {playMusic && <BackgroundMusic />}

      <Canvas
        camera={{ fov: 75 }}
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

        {sceneVisible && (
          <Suspense fallback={null}>
            <RoomScene />
            <VTuberView />
          </Suspense>
        )}

        {sceneVisible && <FreeCameraControls />}
      </Canvas>
    </>
  );
}
