import React, { useMemo } from "react";
import { useGLTF, RenderTexture } from "@react-three/drei";
import * as THREE from "three";
import FakeOSDesktop from "../components/FakeOSDesktop";
import EmulatorV86 from "../components/EmulatorV86";

// Map node names (must match Blender names exactly) → screen content type
// Verified node names from timeshot-room2.glb:
//   "large monitor screen"  → large display (emulator / future project showcase)
//   "small monitor screen"  → small display (FakeOS portfolio)
const SCREEN_MAP = {
  "large monitor screen": "route",
  "small monitor screen": "fakeOS",
};

// Renders a screen mesh with its original geometry but a live RenderTexture material.
// The original mesh is hidden in the parent clone; this one replaces it visually.
function ScreenMesh({ mesh, type }) {
  const { position, quaternion, scale } = useMemo(() => {
    mesh.updateWorldMatrix(true, false);
    const pos  = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl  = new THREE.Vector3();
    mesh.matrixWorld.decompose(pos, quat, scl);
    return { position: pos, quaternion: quat, scale: scl };
  }, [mesh]);

  return (
    <mesh geometry={mesh.geometry} position={position} quaternion={quaternion} scale={scale}>
      <meshBasicMaterial toneMapped={false}>
        <RenderTexture attach="map" width={1024} height={768}>
          {type === "fakeOS" && <FakeOSDesktop />}
          {type === "route" && <EmulatorV86 />}
        </RenderTexture>
      </meshBasicMaterial>
    </mesh>
  );
}

export default function RoomScene() {
  const { scene } = useGLTF("/models/timeshot-room2.glb");
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Find screen meshes, hide originals so ScreenMesh can take over
  const screens = useMemo(() => {
    const result = [];
    Object.entries(SCREEN_MAP).forEach(([name, type]) => {
      const mesh = cloned.getObjectByName(name);
      if (mesh?.isMesh) {
        mesh.visible = false; // hidden — ScreenMesh renders it instead
        result.push({ mesh, type });
      }
    });
    return result;
  }, [cloned]);

  return (
    <>
      <primitive object={cloned} />
      {screens.map(({ mesh, type }) => (
        <ScreenMesh key={mesh.uuid} mesh={mesh} type={type} />
      ))}
    </>
  );
}

useGLTF.preload("/models/timeshot-room2.glb");
