import React, { useMemo } from "react";
import { useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import FakeOSDesktop from "../components/FakeOSDesktop";
import EmulatorV86 from "../components/EmulatorV86";

// Map node names (verified from timeshot-room2.glb) → content type
const SCREEN_MAP = {
  "large monitor screen": "route",   // emulator / future project page
  "small monitor screen": "fakeOS",  // FakeOS portfolio
};

// ─────────────────────────────────────────────────────────────────────────────
// WHY Html INSTEAD OF RenderTexture:
// RenderTexture uses R3F's own fiber reconciler as its rendering context.
// Any HTML element (<button>, <div>, <a> …) passed as its children causes
// R3F to look for THREE.Button / THREE.Div / etc., which don't exist →
// "not part of the THREE namespace" crash + WebGL context loss.
//
// drei's <Html transform> renders real DOM nodes positioned in 3D space via
// CSS transform3d — completely outside the Three.js reconciler — so all
// standard React/DOM/Tailwind content works as normal.
// ─────────────────────────────────────────────────────────────────────────────
function ScreenHtml({ mesh, type }) {
  const { center, euler, cssW, cssH, pixelScale } = useMemo(() => {
    mesh.updateWorldMatrix(true, false);

    // World-space AABB → center position + physical dimensions
    const bbox = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = bbox.getSize(new THREE.Vector3());

    // World-space rotation (for Html to face the same direction as the screen)
    const quat = new THREE.Quaternion();
    const tmp  = new THREE.Vector3();
    mesh.matrixWorld.decompose(tmp, quat, new THREE.Vector3());
    const euler = new THREE.Euler().setFromQuaternion(quat, 'YXZ');

    // Map world units → CSS pixels.
    // We render at 512px wide; scale prop makes 512 CSS px = size.x world units.
    const cssW = 512;
    const cssH = Math.round((size.y / Math.max(size.x, 0.001)) * cssW);
    const pixelScale = size.x / cssW;

    return { center, euler, cssW, cssH, pixelScale };
  }, [mesh]);

  return (
    <Html
      transform
      position={center}
      rotation={euler}
      scale={pixelScale}
      zIndexRange={[1, 0]}
      style={{
        width:    cssW,
        height:   cssH,
        overflow: 'hidden',
        background: '#000',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      {type === "fakeOS" && <FakeOSDesktop />}
      {type === "route"  && <EmulatorV86 />}
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
        mesh.visible = false; // Html overlay replaces this mesh visually
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
