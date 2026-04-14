import React, { useMemo } from "react";
import { useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import FakeOSDesktop from "../components/FakeOSDesktop";
import AboutScreen from "../components/AboutScreen";

// Map GLB mesh names → screen content
// "large monitor screen" → About / terminal info screen
// "small monitor screen" → FakeOS project portfolio
const SCREEN_MAP = {
  "large monitor screen": "about",
  "small monitor screen": "fakeOS",
};

function ScreenHtml({ mesh, type }) {
  const { center, euler, cssW, cssH, pixelScale } = useMemo(() => {
    mesh.updateWorldMatrix(true, false);

    const bbox = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = bbox.getSize(new THREE.Vector3());

    const quat = new THREE.Quaternion();
    const tmp  = new THREE.Vector3();
    mesh.matrixWorld.decompose(tmp, quat, new THREE.Vector3());
    const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');

    const cssW       = 512;
    const cssH       = Math.round((size.y / Math.max(size.x, 0.001)) * cssW);
    const pixelScale = size.x / cssW;

    return { center, euler, cssW, cssH, pixelScale };
  }, [mesh]);

  return (
    <Html
      transform
      position={center}
      rotation={euler}
      scale={pixelScale}
      style={{
        width:         cssW,
        height:        cssH,
        overflow:      'hidden',
        background:    '#000',
        pointerEvents: 'auto',
        userSelect:    'none',
      }}
    >
      {type === "fakeOS" && <FakeOSDesktop />}
      {type === "about"  && <AboutScreen />}
    </Html>
  );
}

export default function RoomScene() {
  const { scene } = useGLTF("/models/timeshot-room2.glb");
  const cloned = useMemo(() => scene.clone(true), [scene]);

  const screens = useMemo(() => {
    const result = [];
    Object.entries(SCREEN_MAP).forEach(([name, type]) => {
      const mesh = cloned.getObjectByName(name);
      if (mesh?.isMesh) {
        mesh.visible = false;
        result.push({ mesh, type });
      }
    });
    return result;
  }, [cloned]);

  return (
    <>
      <primitive object={cloned} />
      {screens.map(({ mesh, type }) => (
        <ScreenHtml key={mesh.uuid} mesh={mesh} type={type} />
      ))}
    </>
  );
}

useGLTF.preload("/models/timeshot-room2.glb");
