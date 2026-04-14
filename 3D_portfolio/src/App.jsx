import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useRef } from 'react';
import { useProgress, useGLTF } from '@react-three/drei';
import RoomScene from './models/RoomScene';
import VTuberView from './components/VTuberView';
import * as THREE from 'three';
import BackgroundMusic from './components/BackgroundMusic';
import Loader from './components/Loader';
import FreeCameraControls from './components/FreeCameraControls';
import MobileControls from './components/MobileControls';
import CameraHUD from './components/CameraHUD';
import MobileHUD from './components/MobileHUD';

useGLTF.preload('/models/VTuber2.vrm');

export default function App() {
  const { progress } = useProgress();
  const [showLoader, setShowLoader]   = useState(true);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [playMusic, setPlayMusic]     = useState(false);

  // Camera mode owned here so HUDs (outside Canvas) and controls (inside Canvas) share it
  const [cameraMode, setCameraMode] = useState('preset');
  const plcLockRef = useRef(null); // set by FreeCameraControls, called by CameraHUD

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
      {showLoader && <Loader progress={progress} onEnter={handleEnter} />}
      {playMusic && <BackgroundMusic />}

      <Canvas
        camera={{ fov: 75 }}
        style={{ background: '#111' }}
        gl={{
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.LinearToneMapping,
          toneMappingExposure: 1.0,
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

        {sceneVisible && (
          <FreeCameraControls
            mode={cameraMode}
            setMode={setCameraMode}
            plcLockRef={plcLockRef}
          />
        )}
        {sceneVisible && (
          <MobileControls
            mode={cameraMode}
            setMode={setCameraMode}
          />
        )}
      </Canvas>

      {/* HUDs rendered outside Canvas — safe DOM territory */}
      {sceneVisible && (
        <CameraHUD
          mode={cameraMode}
          setMode={setCameraMode}
          plcLockRef={plcLockRef}
        />
      )}
      {sceneVisible && (
        <MobileHUD
          mode={cameraMode}
          setMode={setCameraMode}
        />
      )}
    </>
  );
}
