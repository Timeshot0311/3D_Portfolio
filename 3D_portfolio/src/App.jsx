import { Canvas } from '@react-three/fiber';
import { Suspense, useState, useRef, useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import RoomScene from './models/RoomScene';
import VTuberView from './components/VTuberView';
import * as THREE from 'three';
import BackgroundMusic from './components/BackgroundMusic';
import Loader from './components/Loader';
import FreeCameraControls from './components/FreeCameraControls';
import MobileControls from './components/MobileControls';
import CameraHUD from './components/CameraHUD';
import MobileHUD from './components/MobileHUD';
import VTuberChat from './components/VTuberChat';

export default function App() {
  const { progress } = useProgress();
  const [showLoader, setShowLoader]   = useState(true);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [playMusic, setPlayMusic]     = useState(false);

  // Camera mode owned here so HUDs (outside Canvas) and controls (inside Canvas) share it
  const [cameraMode, setCameraMode] = useState('preset');
  const plcLockRef = useRef(null); // set by FreeCameraControls, called by CameraHUD

  // isSpeaking is set by VTuberChat TTS callbacks and forwarded to VTuberView for lip sync
  const [isSpeaking,    setIsSpeaking]    = useState(false);
  const [vtuberReady,   setVtuberReady]   = useState(false);
  const [vrmPreloaded,  setVrmPreloaded]  = useState(false);

  // Chat panel open/close — lifted so CameraHUD buttons can toggle it
  const [chatOpen, setChatOpen] = useState(false);
  // Ref exposed by VTuberChat so CameraHUD mic button calls toggleMic directly
  const vtChatControlRef = useRef({ toggleMic: () => {}, isListening: false });
  // VTuberView writes projected screen {x,y} here every frame; VTuberChat RAFs the bubble to it
  const vtuberScreenPosRef = useRef({ x: 120, y: 200 });
  // Emote API — VTuberView fills this in; VTuberChat calls emoteRef.current.play('wave') etc.
  const emoteRef = useRef({ play: () => false, list: () => [] });

  // Preload VRM with VRMLoaderPlugin before the scene opens so "Enter"
  // only unlocks when the model is actually ready to display.
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      '/models/VTuber3.vrm',
      () => setVrmPreloaded(true),
      undefined,
      (err) => {
        console.error('[VTuber] Preload failed:', err?.message ?? err);
        setVrmPreloaded(false);
      }
    );
  }, []);

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
      {showLoader && <Loader progress={progress} vrmPreloaded={vrmPreloaded} onEnter={handleEnter} />}
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
            <VTuberView isSpeaking={isSpeaking} onReady={() => setVtuberReady(true)} screenPosRef={vtuberScreenPosRef} emoteRef={emoteRef} />
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
          chatOpen={chatOpen}
          onChatToggle={() => setChatOpen((o) => !o)}
          onMicToggle={() => vtChatControlRef.current?.toggleMic()}
          micActive={vtChatControlRef.current?.isListening ?? false}
        />
      )}
      {sceneVisible && (
        <MobileHUD
          mode={cameraMode}
          setMode={setCameraMode}
        />
      )}
      {/* VTuber AI chat — bubble top-left (follows VTuber), panel bottom-center */}
      {sceneVisible && (
        <VTuberChat
          onSpeakingChange={setIsSpeaking}
          vtuberReady={vtuberReady}
          open={chatOpen}
          onToggle={() => setChatOpen((o) => !o)}
          controlRef={vtChatControlRef}
          screenPosRef={vtuberScreenPosRef}
          emoteRef={emoteRef}
        />
      )}
    </>
  );
}
